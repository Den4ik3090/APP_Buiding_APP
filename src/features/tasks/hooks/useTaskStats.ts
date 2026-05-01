import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import type { Task, TaskResolution } from '../types';

export interface DateRange {
  from: string;
  to: string;
}

export interface TaskStats {
  total: number;
  resolvedPercent: number;
  avgResolutionHours: number;
  safetyScore: number;
}

async function fetchTaskStats(
  siteId: string | undefined,
  dateRange: DateRange
): Promise<TaskStats> {
  let q = supabase
    .from('tasks')
    .select('id, status, created_at, site_id')
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to);

  if (siteId) q = q.eq('site_id', siteId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const tasks = (data ?? []) as Pick<Task, 'id' | 'status' | 'created_at' | 'site_id'>[];
  const total = tasks.length;

  if (total === 0) {
    return { total: 0, resolvedPercent: 0, avgResolutionHours: 0, safetyScore: 100 };
  }

  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;
  const resolvedTasks = tasks.filter((t) => t.status === 'resolved');
  const resolvedPercent = Math.round((resolvedTasks.length / total) * 100);
  const safetyScore = Math.round(100 - (overdueCount / total) * 100);

  let avgResolutionHours = 0;
  if (resolvedTasks.length > 0) {
    const resolvedIds = resolvedTasks.map((t) => t.id);
    const { data: resolutions, error: resError } = await supabase
      .from('task_resolutions')
      .select('task_id, completed_at')
      .in('task_id', resolvedIds);
    if (resError) throw new Error(resError.message);

    const createdAtById = Object.fromEntries(resolvedTasks.map((t) => [t.id, t.created_at]));
    const hours = (resolutions as Pick<TaskResolution, 'task_id' | 'completed_at'>[])
      .map((r) => {
        const created = createdAtById[r.task_id];
        if (!created) return null;
        const diff = (new Date(r.completed_at).getTime() - new Date(created).getTime()) / 3_600_000;
        return diff >= 0 ? diff : null;
      })
      .filter((h): h is number => h !== null);

    if (hours.length > 0) {
      avgResolutionHours =
        Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
    }
  }

  return { total, resolvedPercent, avgResolutionHours, safetyScore };
}

export function useTaskStats(siteId: string | undefined, dateRange: DateRange) {
  return useQuery({
    queryKey: ['task-stats', siteId, dateRange],
    queryFn: () => fetchTaskStats(siteId, dateRange),
    enabled: Boolean(dateRange.from && dateRange.to),
  });
}
