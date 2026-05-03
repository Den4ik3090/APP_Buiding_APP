-- ============================================================
-- Security hardening migration
-- Fixes:
--   1. Storage bucket made private (public=false)
--   2. Storage SELECT requires authentication
--   3. Storage INSERT/DELETE scoped to uploading user's folder
--   4. tasks RLS: restrict DELETE/UPDATE to task creator
-- ============================================================

-- ── Storage bucket: private ──────────────────────────────────
UPDATE storage.buckets
SET public = false
WHERE id = 'tasks';

-- ── Storage policies: replace open read with authenticated read ─
DROP POLICY IF EXISTS "tasks_storage_read"   ON storage.objects;
DROP POLICY IF EXISTS "tasks_storage_write"  ON storage.objects;
DROP POLICY IF EXISTS "tasks_storage_delete" ON storage.objects;

-- Authenticated read only
CREATE POLICY "tasks_storage_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tasks'
    AND auth.role() = 'authenticated'
  );

-- Write only to own folder: bucket/tasks/<user_id>/...
CREATE POLICY "tasks_storage_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tasks'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "tasks_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tasks'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── tasks RLS: scope destructive operations to creator ────────
-- Current "tasks_all" policy lets any authenticated user delete/update
-- any task. Restrict UPDATE and DELETE to the assigned_to user.
-- SELECT and INSERT remain open to all authenticated users (single-tenant).

DROP POLICY IF EXISTS "tasks_all" ON tasks;

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

-- ── task_resolutions RLS: scope to task owner ─────────────────
DROP POLICY IF EXISTS "resolutions_all" ON task_resolutions;

CREATE POLICY "resolutions_select" ON task_resolutions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "resolutions_insert" ON task_resolutions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "resolutions_delete" ON task_resolutions
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resolutions.task_id
        AND (tasks.assigned_to = auth.uid() OR tasks.assigned_to IS NULL)
    )
  );

-- ── priority CHECK constraint ──────────────────────────────────
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));
