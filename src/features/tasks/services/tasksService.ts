import { supabase } from '@/shared/api/supabase';
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskResolution,
  ResolutionInsert,
} from '../model';

// Supabase returns code "42P01" when table does not exist (PGRST116 / 404 via REST)
function isTableMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST116' ||
    error.code === '42P01' ||
    (error.message ?? '').includes('does not exist')
  );
}

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeUuid(value: unknown) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return isUuid(trimmed) ? trimmed : null;
}

function sanitizeTaskInsert(payload: TaskInsert): TaskInsert {
  const next: TaskInsert = {
    ...payload,
  };

  // ВАЖНО:
  // оставь здесь только те поля, которые в твоей таблице реально имеют тип uuid
  // самые вероятные названия:
  if ('assigned_to' in next) {
    (next as TaskInsert & { assigned_to?: string | null }).assigned_to =
      normalizeUuid((next as TaskInsert & { assigned_to?: string | null }).assigned_to);
  }

  if ('created_by' in next) {
    (next as TaskInsert & { created_by?: string | null }).created_by =
      normalizeUuid((next as TaskInsert & { created_by?: string | null }).created_by);
  }

  if ('employee_id' in next) {
    (next as TaskInsert & { employee_id?: string | null }).employee_id =
      normalizeUuid((next as TaskInsert & { employee_id?: string | null }).employee_id);
  }

  if ('organization_id' in next) {
    (next as TaskInsert & { organization_id?: string | null }).organization_id =
      normalizeUuid((next as TaskInsert & { organization_id?: string | null }).organization_id);
  }

  // Если id генерируется БД как uuid default gen_random_uuid(), не отправляем мусорный id
  if ('id' in next) {
    const rawId = (next as TaskInsert & { id?: string | null }).id;
    const normalizedId = normalizeUuid(rawId);
    if (normalizedId) {
      (next as TaskInsert & { id?: string | null }).id = normalizedId;
    } else {
      delete (next as TaskInsert & { id?: string | null }).id;
    }
  }

  return next;
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (isTableMissing(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as Task[];
}

export async function fetchTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isTableMissing(error)) return null;
    throw new Error(error.message);
  }
  return data as Task;
}

export async function createTask(payload: TaskInsert): Promise<Task> {
  const safePayload = sanitizeTaskInsert(payload);

  console.log('createTask payload:', payload);
  console.log('createTask safePayload:', safePayload);

  const { data, error } = await supabase
    .from('tasks')
    .insert(safePayload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(id: string, payload: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  // maybeSingle returns null when RLS blocks the row or the id doesn't exist
  if (!data) throw new Error('Задача не найдена или недостаточно прав для изменения');
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  // .select('id') makes PostgREST return the deleted rows;
  // empty array means RLS blocked the delete or the task didn't exist
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Задача не найдена или недостаточно прав для удаления');
}

export async function fetchResolutionsByTask(taskId: string): Promise<TaskResolution[]> {
  const { data, error } = await supabase
    .from('task_resolutions')
    .select('*')
    .eq('task_id', taskId)
    .order('completed_at', { ascending: false });

  if (error) {
    if (isTableMissing(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as TaskResolution[];
}

export async function createResolution(payload: ResolutionInsert): Promise<TaskResolution> {
  const { data, error } = await supabase
    .from('task_resolutions')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TaskResolution;
}