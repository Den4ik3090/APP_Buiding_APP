-- ============================================================
-- Make employee-photos storage bucket private
-- The service already uses createSignedUrls — this migration
-- ensures the bucket config matches (public=false).
-- ============================================================

-- ── Bucket: private ──────────────────────────────────────────
UPDATE storage.buckets
  SET public = false
  WHERE id = 'employee-photos';

-- If bucket doesn't exist yet (first deploy), create it private
INSERT INTO storage.buckets (id, name, public)
  VALUES ('employee-photos', 'employee-photos', false)
  ON CONFLICT (id) DO NOTHING;

-- ── Storage policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "employee_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "employee_photos_write"  ON storage.objects;
DROP POLICY IF EXISTS "employee_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "employee_photos_update" ON storage.objects;

-- Authenticated users can read (signed URLs work client-side)
CREATE POLICY "employee_photos_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-photos'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can upload
CREATE POLICY "employee_photos_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-photos'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can replace (upsert)
CREATE POLICY "employee_photos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employee-photos'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete
CREATE POLICY "employee_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-photos'
    AND auth.role() = 'authenticated'
  );
