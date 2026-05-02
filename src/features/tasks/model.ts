export type TaskStatus = 'pending' | 'in_progress' | 'resolved' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  site_id: string | null;
  created_at: string;
  due_date: string | null;
}

export interface TaskResolution {
  id: string;
  task_id: string;
  photo_url: string;
  completed_at: string;
  comments: string | null;
}

export type TaskInsert = Omit<Task, 'id' | 'created_at'>;
export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at'>>;
export type ResolutionInsert = Omit<TaskResolution, 'id' | 'completed_at'>;
