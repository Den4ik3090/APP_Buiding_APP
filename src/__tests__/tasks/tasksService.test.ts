jest.mock('@/shared/api/supabase', () => {
  const chain: Record<string, jest.Mock> = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };
  return { supabase: chain };
});

import { supabase } from '@/shared/api/supabase';
import type { TaskInsert } from '@/features/tasks/model';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchResolutionsByTask,
} from '@/features/tasks/services/tasksService';

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockReturnValue(supabase);
  (supabase.select as jest.Mock).mockReturnValue(supabase);
  (supabase.insert as jest.Mock).mockReturnValue(supabase);
  (supabase.update as jest.Mock).mockReturnValue(supabase);
  (supabase.delete as jest.Mock).mockReturnValue(supabase);
  (supabase.eq as jest.Mock).mockReturnValue(supabase);
  (supabase.order as jest.Mock).mockReturnValue(supabase);
  (supabase.limit as jest.Mock).mockReturnValue(supabase);
});

const mockTask = {
  id: 'task-uuid-1',
  title: 'Test Task',
  description: null,
  assigned_to: null,
  status: 'pending' as const,
  priority: 'medium' as const,
  site_id: null,
  due_date: null,
};

describe('fetchTasks', () => {
  it('fetches all tasks when no filters passed (terminal is .limit)', async () => {
    (supabase.limit as jest.Mock).mockResolvedValueOnce({ data: [mockTask], error: null });
    const result = await fetchTasks();
    expect(result).toEqual([mockTask]);
    expect(supabase.from).toHaveBeenCalledWith('tasks');
  });

  it('applies siteId filter via .eq when provided', async () => {
    (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: [mockTask], error: null });
    const result = await fetchTasks({ siteId: 'site-uuid-1' });
    expect(result).toEqual([mockTask]);
    expect(supabase.eq).toHaveBeenCalledWith('site_id', 'site-uuid-1');
  });

  it('applies status filter via .eq when provided', async () => {
    (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
    await fetchTasks({ status: 'resolved' });
    expect(supabase.eq).toHaveBeenCalledWith('status', 'resolved');
  });

  it('returns empty array when table is missing (PGRST116)', async () => {
    (supabase.limit as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'does not exist' },
    });
    const result = await fetchTasks();
    expect(result).toEqual([]);
  });

  it('throws on generic Supabase error', async () => {
    (supabase.limit as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    await expect(fetchTasks()).rejects.toThrow('DB error');
  });
});

describe('createTask', () => {
  it('returns created task on success', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockTask, error: null });
    const payload: TaskInsert = {
      title: 'Test Task',
      description: null,
      assigned_to: null,
      status: 'pending',
      priority: 'medium',
      site_id: null,
      due_date: null,
    };
    const result = await createTask(payload);
    expect(result).toEqual(mockTask);
    expect(supabase.insert).toHaveBeenCalled();
  });

  it('normalizes non-UUID assigned_to to null via sanitizeTaskInsert', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockTask, error: null });
    const payload = {
      title: 'Test',
      description: null,
      assigned_to: 'not-a-uuid',
      status: 'pending' as const,
      priority: 'medium' as const,
      site_id: null,
      due_date: null,
    };
    await createTask(payload);
    const insertedPayload = (supabase.insert as jest.Mock).mock.calls[0][0];
    expect(insertedPayload.assigned_to).toBeNull();
  });

  it('preserves valid UUID assigned_to', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockTask, error: null });
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const payload: TaskInsert = {
      title: 'Test',
      description: null,
      assigned_to: validUuid,
      status: 'pending',
      priority: 'medium',
      site_id: null,
      due_date: null,
    };
    await createTask(payload);
    const insertedPayload = (supabase.insert as jest.Mock).mock.calls[0][0];
    expect(insertedPayload.assigned_to).toBe(validUuid);
  });

  it('throws on Supabase error', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'insert error' } });
    const payload: TaskInsert = {
      title: 'Test',
      description: null,
      assigned_to: null,
      status: 'pending',
      priority: 'medium',
      site_id: null,
      due_date: null,
    };
    await expect(createTask(payload)).rejects.toThrow('insert error');
  });
});

describe('updateTask', () => {
  it('returns updated task on success', async () => {
    (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({ data: mockTask, error: null });
    const result = await updateTask('task-uuid-1', { title: 'Updated' });
    expect(result).toEqual(mockTask);
  });

  it('throws when data is null (RLS blocked or not found)', async () => {
    (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({ data: null, error: null });
    await expect(updateTask('task-uuid-1', { title: 'Updated' })).rejects.toThrow();
  });

  it('throws on Supabase error', async () => {
    (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'update error' } });
    await expect(updateTask('task-uuid-1', { title: 'Updated' })).rejects.toThrow('update error');
  });
});

describe('deleteTask', () => {
  it('resolves when deleted row is returned', async () => {
    (supabase.select as jest.Mock).mockResolvedValueOnce({ data: [{ id: 'task-uuid-1' }], error: null });
    await expect(deleteTask('task-uuid-1')).resolves.toBeUndefined();
  });

  it('throws when data is empty array (RLS blocked or not found)', async () => {
    (supabase.select as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
    await expect(deleteTask('task-uuid-1')).rejects.toThrow();
  });

  it('throws on Supabase error', async () => {
    (supabase.select as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'delete error' } });
    await expect(deleteTask('task-uuid-1')).rejects.toThrow('delete error');
  });
});

describe('fetchResolutionsByTask', () => {
  it('returns resolutions on success', async () => {
    const mockResolutions = [{ id: 'r-1', task_id: 'task-uuid-1', photo_url: '', completed_at: '' }];
    (supabase.order as jest.Mock).mockResolvedValueOnce({ data: mockResolutions, error: null });
    const result = await fetchResolutionsByTask('task-uuid-1');
    expect(result).toEqual(mockResolutions);
  });

  it('returns empty array when table is missing', async () => {
    (supabase.order as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'does not exist' },
    });
    const result = await fetchResolutionsByTask('task-uuid-1');
    expect(result).toEqual([]);
  });
});
