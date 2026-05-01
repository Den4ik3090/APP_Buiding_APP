import imageCompression from 'browser-image-compression';

const OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
} as const;

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, OPTIONS);
}
