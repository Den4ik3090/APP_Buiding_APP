import { supabase } from '@/shared/api/supabase';

const BUCKET = 'tasks';

export async function uploadResolutionPhoto(
  taskId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const path = `${taskId}/resolution_${timestamp}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteResolutionPhoto(photoUrl: string): Promise<void> {
  const url = new URL(photoUrl);
  const parts = url.pathname.split(`/object/public/${BUCKET}/`);
  if (parts.length < 2) throw new Error(`Cannot parse storage path from URL: ${photoUrl}`);
  const storagePath = parts[1];

  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(error.message);
}
