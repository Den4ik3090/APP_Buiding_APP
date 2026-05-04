import type { Permit } from './model';

const DAY_MS = 1000 * 60 * 60 * 24;

function normalizeStatus(status: string | null | undefined): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function toStartOfDay(input: Date | string | null | undefined): Date | null {
  const date = new Date(input as string);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getPermitTargetDate(permit: Partial<Permit>): Date | null {
  const rawDate =
    permit.is_extended && permit.extended_date
      ? permit.extended_date
      : permit.expiry_date;
  return toStartOfDay(rawDate);
}

function getDiffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

// ─── Exported helpers ─────────────────────────────────────────

export function generatePermitNumber(
  issueDate: string,
  existingPermits: Array<{ issue_date: string }>,
): string {
  const date = new Date(issueDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const sameDay = existingPermits.filter((p) => {
    const pd = new Date(p.issue_date);
    return pd.toDateString() === date.toDateString();
  });

  return `${day}-${month}-${sameDay.length + 1}`;
}

export function calculateExpiryDate(issueDate: string): Date {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + 15);
  return date;
}

export function calculateExtendedDate(expiryDate: string): Date {
  const date = new Date(expiryDate);
  date.setDate(date.getDate() + 15);
  return date;
}

export function isClosedStatus(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'закрыт';
}

export function getPermitStatus(permit: Partial<Permit>): string {
  if (isClosedStatus(permit.status)) return 'Закрыт';

  const today = toStartOfDay(new Date());
  const targetDate = getPermitTargetDate(permit);
  if (!today || !targetDate) return permit.is_extended ? 'Продлен' : 'Активен';

  if (today > targetDate) return 'Просрочен';
  if (permit.is_extended) return 'Продлен';
  return 'Активен';
}

export function canExtend(permit: Partial<Permit>): boolean {
  const extensionCount = Number(permit.extension_count ?? 0);
  return !permit.is_extended && extensionCount < 1 && !isClosedStatus(permit.status);
}

export function needsWarning(permit: Partial<Permit>): boolean {
  if (isClosedStatus(permit.status)) return false;
  const today = toStartOfDay(new Date());
  const targetDate = getPermitTargetDate(permit);
  if (!today || !targetDate) return false;
  const days = getDiffInDays(today, targetDate);
  return days <= 3 && days >= 0;
}

export function getDaysUntilExpiry(permit: Partial<Permit>): number {
  const today = toStartOfDay(new Date());
  const targetDate = getPermitTargetDate(permit);
  if (!today || !targetDate) return 0;
  return getDiffInDays(today, targetDate);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date as string);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

export function formatDateInput(date: string | Date | null | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  return new Date(date as string).toISOString().slice(0, 10);
}

export function validatePermitData(form: Record<string, unknown>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!form.permit_type) errors.permit_type = 'Тип наряда обязателен';
  if (!form.issue_date) errors.issue_date = 'Дата выдачи обязательна';
  if (!form.responsible_person_id) errors.responsible_person_id = 'Нужно выбрать ответственного';
  if (!form.organization || String(form.organization).trim().length < 2) {
    errors.organization = 'Организация обязательна';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
