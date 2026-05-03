import { supabase } from '@/shared/api/supabase';

const BUCKET = 'tasks';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_URL_TTL = 60 * 60; // 1 hour

// crypto.randomUUID() requires a secure context (HTTPS or localhost).
// When accessed via a local IP the API is undefined — fall back to
// getRandomValues() which is available in all contexts since Chrome 11.
function randomUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

export async function uploadResolutionPhoto(
  taskId: string,
  file: File
): Promise<string> {
  if (!UUID_RE.test(taskId)) throw new Error('Invalid taskId');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileId = randomUUID();
  const path = `${user.id}/${taskId}/${fileId}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data) throw new Error('Failed to create signed URL');

  return data.signedUrl;
}

export async function deleteResolutionPhoto(photoUrl: string): Promise<void> {
  // Handle both legacy public URLs and new signed URLs
  const url = new URL(photoUrl);
  const publicPart = url.pathname.split(`/object/public/${BUCKET}/`);
  const signedPart = url.pathname.split(`/object/sign/${BUCKET}/`);

  let storagePath: string | undefined;
  if (publicPart.length >= 2) storagePath = publicPart[1];
  else if (signedPart.length >= 2) storagePath = signedPart[1].split('?')[0];

  if (!storagePath) throw new Error(`Cannot parse storage path from URL: ${photoUrl}`);

  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(error.message);
}

export async function getResolutionPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error || !data) throw new Error('Failed to create signed URL');
  return data.signedUrl;
}
