-- Drop existing objects if re-running
DROP TABLE IF EXISTS task_resolutions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TYPE  IF EXISTS task_status CASCADE;

-- Enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'resolved', 'overdue');

-- tasks
CREATE TABLE tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  assigned_to uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status      task_status NOT NULL DEFAULT 'pending',
  site_id     uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  due_date    timestamptz
);

-- task_resolutions
CREATE TABLE task_resolutions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  photo_url    text        NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  comments     text
);

-- RLS: authenticated users can do everything
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all" ON tasks
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE task_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resolutions_all" ON task_resolutions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket: public read, authenticated write
INSERT INTO storage.buckets (id, name, public)
  VALUES ('tasks', 'tasks', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tasks_storage_read"   ON storage.objects;
DROP POLICY IF EXISTS "tasks_storage_write"  ON storage.objects;
DROP POLICY IF EXISTS "tasks_storage_delete" ON storage.objects;

CREATE POLICY "tasks_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'tasks');

CREATE POLICY "tasks_storage_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tasks' AND auth.role() = 'authenticated');

CREATE POLICY "tasks_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'tasks' AND auth.role() = 'authenticated');
