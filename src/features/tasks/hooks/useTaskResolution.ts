import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compressImage } from '../utils/imageCompression';
import { uploadResolutionPhoto } from '../services/storageService';
import { createResolution, updateTask } from '../services/tasksService';
import type { TaskResolution } from '../types';

export interface ResolveTaskPayload {
  taskId: string;
  photo: File;
  comments?: string;
}

async function resolveTask({ taskId, photo, comments }: ResolveTaskPayload): Promise<TaskResolution> {
  const compressed = await compressImage(photo);
  const photoUrl = await uploadResolutionPhoto(taskId, compressed);
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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
      qc.invalidateQueries({ queryKey: ['task-resolutions', variables.taskId] });
    },
  });
}
