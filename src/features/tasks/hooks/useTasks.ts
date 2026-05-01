import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskStatus, Task, TaskInsert, TaskUpdate } from '../model';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/tasksService';

export interface TaskFilters {
  status?: TaskStatus;
  siteId?: string;
  assignedTo?: string;
}

function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.siteId && t.site_id !== filters.siteId) return false;
    if (filters.assignedTo && t.assigned_to !== filters.assignedTo) return false;
    return true;
  });
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[], Error>({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const all = await fetchTasks();
      return applyFilters(all, filters);
    },
    // Never retry on 404 — table may not exist yet
    retry: (failureCount, error) => {
      if (error.message.includes('404') || error.message.includes('does not exist')) return false;
      return failureCount < 2;
    },
    // Return empty array as fallback so components always get an array, never undefined
    placeholderData: [],
    // Don't propagate to nearest error boundary — let components handle it inline
    throwOnError: false,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskInsert) => createTask(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaskUpdate }) => updateTask(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
    },
  });
}
