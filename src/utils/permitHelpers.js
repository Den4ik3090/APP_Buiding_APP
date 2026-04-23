//PermitsHelpers

//Генерация номера наряда
export function generatePermitNumber(issueDate, existingPermits) {
  const date = new Date(issueDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const sameDay = existingPermits.filter((p) => {
    const pd = new Date(p.issue_date);
    return pd.toDateString() === date.toDateString();
  });

  const nextNum = sameDay.length + 1;
  return `${day}-${month}-${nextNum}`;
}

// Расчет даты окончания (+15 дней)
export function calculateExpiryDate(issueDate) {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + 15);
  return date;
}

// Продление (+15 дней к expiry_date)
export function calculateExtendedDate(expiryDate) {
  const date = new Date(expiryDate);
  date.setDate(date.getDate() + 15);
  return date;
}

// Работа со статусами
function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е");
}
//Проверяет закрыт ли наряд
export function isClosedStatus(status) {
  return normalizeStatus(status) === "закрыт";
}

const DAY_MS = 1000 * 60 * 60 * 24;

function toStartOfDay(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getPermitTargetDate(permit) {
  const rawDate =
    permit?.is_extended && permit?.extended_date
      ? permit.extended_date
      : permit?.expiry_date;
  return toStartOfDay(rawDate);
}

function getDiffInDays(fromDate, toDate) {
  return Math.round((toDate - fromDate) / DAY_MS);
}

// Определение статуса
export function getPermitStatus(permit) {
  if (isClosedStatus(permit?.status)) return "Закрыт";

  const today = toStartOfDay(new Date());
  const targetDate = getPermitTargetDate(permit);
  if (!today || !targetDate) return permit?.is_extended ? "Продлен" : "Активен";

  if (today > targetDate) return "Просрочен";
  if (permit?.is_extended) return "Продлен";
  return "Активен";
}

// Можно ли продлить?
export function canExtend(permit) {
  const extensionCount = Number(permit?.extension_count || 0);
  return (
    !permit.is_extended && extensionCount < 1 && !isClosedStatus(permit.status)
  );
}

// Нужно ли уведомление?
export function needsWarning(permit) {
  if (isClosedStatus(permit?.status)) return false;
  const today = toStartOfDay(new Date());
  const targetDate = getPermitTargetDate(permit);
  if (!today || !targetDate) return false;

  const days = getDiffInDays(today, targetDate);
  return days <= 3 && days >= 0;
}

// Сколько дней до истечения
export function getDaysUntilExpiry(permit) {
  const today = toStartOfDay(new Date());
  const targetDate = getPermitTargetDate(permit);
  if (!today || !targetDate) return 0;

  return getDiffInDays(today, targetDate);
}

// Формат для отображения (ДД.ММ.ГГГГ)
export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Формат для <input type="date"> (ГГГГ-ММ-ДД)
export function formatDateInput(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// Простая валидация данных наряда
export function validatePermitData(form) {
  const errors = {};

  if (!form.permit_type) {
    errors.permit_type = "Тип наряда обязателен";
  }

  if (!form.issue_date) {
    errors.issue_date = "Дата выдачи обязательна";
  }

  if (!form.responsible_person_id) {
    errors.responsible_person_id = "Нужно выбрать ответственного";
  }

  if (!form.organization || form.organization.trim().length < 2) {
    errors.organization = "Организация обязательна";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
