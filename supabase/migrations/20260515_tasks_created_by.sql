-- ============================================================
-- Add created_by to tasks table
-- Tracks which authenticated user created the task.
-- NULL for rows created before this migration.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
