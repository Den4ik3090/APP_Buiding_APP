import { useQuery } from '@tanstack/react-query';
import { fetchTaskStats } from '../services/tasksService';
import type { DateRange, TaskStats } from '../services/tasksService';

export type { DateRange, TaskStats };

export function useTaskStats(siteId: string | undefined, dateRange: DateRange) {
  return useQuery({
    queryKey: ['task-stats', siteId, dateRange],
    queryFn: () => fetchTaskStats(siteId, dateRange),
    enabled: Boolean(dateRange.from && dateRange.to),
  });
}
