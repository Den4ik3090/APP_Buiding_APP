-- Allow any authenticated user to update and delete tasks
-- Single-tenant deployment: all users are trusted staff
-- TODO: tighten per-role when multi-user access is introduced

DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (auth.role() = 'authenticated');
