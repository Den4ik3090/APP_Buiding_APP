import { supabase } from '@/shared/api/supabase';
import type { Employee, AdditionalTraining } from '@/entities/employee';

// FIELDS_BASE: columns used for write-back selects after insert/update/retrain.
// FIELDS: full read columns including is_dismissed + dismissed_at (column required in DB).
const FIELDS_BASE =
  'id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at';
const FIELDS = FIELDS_BASE + ',is_dismissed,dismissed_at';

type DbRow = {
  id: string;
  name: string;
  profession: string;
  birth_date?: string | null;
  training_date: string;
  responsible?: string | null;
  comment?: string | null;
  photo_url?: string | null;
  organization?: string | null;
  additional_trainings?: AdditionalTraining[] | null;
  created_at?: string | null;
  is_dismissed?: boolean | null;
  dismissed_at?: string | null;
};

// Extracts the storage object path from any URL format (public URL, signed URL, or relative path).
// Needed because photo_url in DB may contain either a relative path or an old public/signed URL.
function extractStoragePath(url: string): string {
  if (!url || !url.startsWith('http')) return url;
  const match = url.match(/avatars\/[^?&]+/);
  return match ? match[0] : url;
}

function mapFormToDb(form: Employee) {
  return {
    name: form.name,
    profession: form.profession,
    birth_date: form.birthDate || null,
    training_date: form.trainingDate,
    responsible: form.responsible || null,
    comment: form.comment || null,
    photo_url: form.photo_url ? extractStoragePath(form.photo_url) : null,
    organization: form.organization || null,
    additional_trainings: form.additionalTrainings || [],
  };
}

function formatDataForApp(data: DbRow[]): Employee[] {
  return data.map((emp) => ({
    id: emp.id,
    name: emp.name,
    profession: emp.profession,
    birthDate: emp.birth_date ?? null,
    trainingDate: emp.training_date,
    responsible: emp.responsible ?? '',
    comment: emp.comment ?? '',
    photo_url: emp.photo_url ?? '',
    organization: emp.organization ?? '',
    additionalTrainings: emp.additional_trainings ?? [],
    createdAt: emp.created_at ?? null,
    isDismissed: emp.is_dismissed ?? false,
    dismissedAt: emp.dismissed_at ?? null,
  }));
}

// Resolves signed URLs for all employees that have a photo, in a single batch request.
async function resolvePhotoUrls(employees: Employee[]): Promise<Employee[]> {
  const withPhotos = employees.filter((e) => e.photo_url);
  if (withPhotos.length === 0) return employees;

  const paths = withPhotos.map((e) => extractStoragePath(e.photo_url));

  const { data: signedItems } = await supabase.storage
    .from('employee-photos')
    .createSignedUrls(paths, 3600);

  if (!signedItems) return employees;

  const pathToSignedUrl = new Map(
    signedItems
      .filter((item): item is typeof item & { signedUrl: string } => Boolean(item.signedUrl))
      .map((item) => [item.path, item.signedUrl])
  );

  return employees.map((emp) => {
    if (!emp.photo_url) return emp;
    const cleanPath = extractStoragePath(emp.photo_url);
    const signedUrl = pathToSignedUrl.get(cleanPath);
    return signedUrl ? { ...emp, photo_url: signedUrl } : emp;
  });
}

export async function getEmployeePhotoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const cleanPath = extractStoragePath(path);
  const { data, error } = await supabase.storage
    .from('employee-photos')
    .createSignedUrl(cleanPath, 3600);
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

export async function fetchEmployees(): Promise<Employee[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 30000)
  );

  const primary = supabase
    .from('employees')
    .select(FIELDS)
    .eq('is_dismissed', false)
    .order('name', { ascending: true });

  const primaryResult = await Promise.race([primary, timeout]);

  if (primaryResult.error) throw primaryResult.error;
  return resolvePhotoUrls(formatDataForApp((primaryResult.data ?? []) as unknown as DbRow[]));
}

export async function fetchDismissedEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(FIELDS)
    .eq('is_dismissed', true)
    .order('dismissed_at', { ascending: false });
  if (error) throw error;
  return resolvePhotoUrls(formatDataForApp((data ?? []) as unknown as DbRow[]));
}

export async function dismissEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_dismissed: false, dismissed_at: null })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchOrganizations(): Promise<string[]> {
  const toNames = (rows: { organization: unknown }[]) =>
    [...new Set(rows.map((i) => i.organization).filter(Boolean))].sort() as string[];

  const { data, error } = await supabase
    .from('employees')
    .select('organization')
    .eq('is_dismissed', false);

  if (error) throw new Error(error.message);
  return toNames(data ?? []);
}

export async function createEmployee(formData: Employee): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert([mapFormToDb(formData)])
    .select(FIELDS_BASE)
    .single();
  if (error) throw error;
  return resolvePhotoUrls(formatDataForApp([data as DbRow])).then((r) => r[0]);
}

export async function updateEmployee(formData: Employee): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(mapFormToDb(formData))
    .eq('id', formData.id)
    .select(FIELDS_BASE)
    .single();
  if (error) throw error;
  return resolvePhotoUrls(formatDataForApp([data as DbRow])).then((r) => r[0]);
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

export async function retrainEmployee(id: string): Promise<Employee> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('employees')
    .update({ training_date: today })
    .eq('id', id)
    .select(FIELDS_BASE)
    .single();
  if (error) throw error;
  return resolvePhotoUrls(formatDataForApp([data as DbRow])).then((r) => r[0]);
}

export async function uploadEmployeePhoto(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('employee-photos')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Return a signed URL so the upload preview works immediately in the form.
  // mapFormToDb will extract the clean path before saving to DB.
  const signedUrl = await getEmployeePhotoUrl(filePath);
  return signedUrl ?? filePath;
}
