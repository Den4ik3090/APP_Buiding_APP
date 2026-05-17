import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadResolutionPhoto } from '../services/storageService';
import { createResolution, updateTask } from '../services/tasksService';
import type { TaskResolution } from '../model';

export interface ResolveTaskPayload {
  taskId: string;
  photo: File;
  comments?: string;
}

async function resolveTask({ taskId, photo, comments }: ResolveTaskPayload): Promise<TaskResolution> {
  const photoUrl = await uploadResolutionPhoto(taskId, photo);
  const resolution = await createResolution({
    task_id: taskId,
    photo_url: photoUrl,
    comments: comments ?? null,
  });
  await updateTask(taskId, { status: 'resolved' });
  return resolution;
}

export function useTaskResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolveTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
      qc.invalidateQueries({ queryKey: ['task-resolutions'] });
    },
  });
}
