import { supabase } from '@/shared/api/supabase';
import { PERMIT_STATUSES } from '@/entities/permit';
import type { Permit } from '@/entities/permit';

export interface RegistryEmployee {
  id: string;
  name: string;
  profession: string;
  organization: string;
}

export interface PermitWithEmployee extends Permit {
  responsible_person: RegistryEmployee | null;
}

function shouldAutoClose(permit: PermitWithEmployee): boolean {
  if (!permit || ['Закрыт', 'Продлен'].includes(permit.status)) return false;
  if (permit.is_extended) return false;
  if (!permit.expiry_date) return false;

  const expiryDate = new Date(permit.expiry_date);
  if (Number.isNaN(expiryDate.getTime())) return false;

  const deadline = new Date(expiryDate);
  deadline.setDate(deadline.getDate() + 15);
  return new Date() > deadline;
}

async function autoCloseExpired(permits: PermitWithEmployee[]): Promise<boolean> {
  const toClose = permits.filter(shouldAutoClose);
  if (toClose.length === 0) return false;

  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const results = await Promise.all(
    toClose.map((permit) =>
      supabase
        .from('permits')
        .update({
          status: PERMIT_STATUSES.CLOSED,
          closed_date: permit.closed_date || today,
          updated_at: nowIso,
        })
        .eq('id', permit.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error('Ошибка авто-закрытия нарядов:', failed.error);
    return false;
  }
  return true;
}

async function fetchRawPermits(): Promise<PermitWithEmployee[]> {
  const { data, error } = await supabase
    .from('permits')
    .select(`
      *,
      responsible_person:employees!responsible_person_id (
        id,
        name,
        profession,
        organization
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PermitWithEmployee[];
}

export async function fetchPermits(): Promise<PermitWithEmployee[]> {
  const permits = await fetchRawPermits();
  const hasAutoClosed = await autoCloseExpired(permits);
  if (hasAutoClosed) return fetchRawPermits();
  return permits;
}

export async function fetchRegistryEmployees(): Promise<RegistryEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, profession, organization')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as RegistryEmployee[];
}

export async function deletePermit(permitId: string): Promise<void> {
  const doDelete = () =>
    supabase.from('permits').delete().eq('id', permitId).select('id');

  let { data, error } = await doDelete();

  if (error && (error.code === '23503' || /foreign key/i.test(error.message ?? ''))) {
    const { error: auditErr } = await supabase
      .from('permit_audit_log')
      .delete()
      .eq('permit_id', permitId);

    if (auditErr && auditErr.code !== '42P01') throw new Error(auditErr.message);

    ({ data, error } = await doDelete());
  }

  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Наряд не удален. Возможны ограничения доступа (RLS) или отсутствует право DELETE.');
  }
}
