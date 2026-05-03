import React from "react";
import { memo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Pencil, Image as ImageIcon } from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskResolveModal } from './TaskResolveModal';
import { TaskEditModal } from './TaskEditModal';
import { TaskResolutionViewerModal } from './TaskResolutionViewerModal';
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import type { Task } from '../model';

function getTimeLabel(dueDateIso: string | null): { label: string; cls: string } | null {
  if (!dueDateIso) return null;
  const diff = new Date(dueDateIso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);

  if (diff < 0) {
    return {
      label: days > 0 ? `Просрочено ${days} д` : `Просрочено ${hrs} ч`,
      cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
    };
  }
  if (hrs < 24) {
    return {
      label: `Через ${hrs} ч`,
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    };
  }
  return {
    label: `Через ${days} д`,
    cls: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400',
  };
}

interface TaskCardProps {
  task: Task;
}

export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isOverdue = task.status === 'overdue';
  const isResolved = task.status === 'resolved';
  const timeInfo = getTimeLabel(task.due_date);

  return (
    <>
      <div
        className={`rounded-xl border bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all dark:bg-zinc-900/70 ${isOverdue
            ? 'border-red-300 shadow-red-100 dark:border-red-800 dark:shadow-red-950/30'
            : 'border-zinc-200 dark:border-zinc-700'
          }`}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {task.title}
            </p>
            {task.description && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {task.description}
              </p>
            )}
          </div>
          <TaskStatusBadge status={task.status} />
        </div>

        {/* Meta row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            <Clock size={11} />
            {new Date(task.created_at).toLocaleDateString('ru-RU')}
          </span>

          {timeInfo && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${timeInfo.cls}`}
            >
              {isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
              {timeInfo.label}
            </span>
          )}
        </div>

        {/* Actions row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isResolved && task.status !== 'in_progress' && (
            <button
              onClick={() => updateTask.mutate({ id: task.id, payload: { status: 'in_progress' } })}
              disabled={updateTask.isPending}
              className="rounded-md border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              В работу
            </button>
          )}

          {!isResolved && (
            <button
              onClick={() => setResolveOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <CheckCircle size={13} />
              Закрыть
            </button>
          )}

          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Pencil size={13} />
            Редактировать
          </button>

          <button
            onClick={() => setPhotoOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ImageIcon size={13} />
            Фото
          </button>

          <button
            onClick={() => deleteTask.mutate(task.id)}
            disabled={deleteTask.isPending}
            className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
          >
            Удалить
          </button>
        </div>
      </div>

      <TaskResolveModal task={task} open={resolveOpen} onClose={() => setResolveOpen(false)} />
      <TaskEditModal task={task} open={editOpen} onClose={() => setEditOpen(false)} />
      <TaskResolutionViewerModal task={task} open={photoOpen} onClose={() => setPhotoOpen(false)} />
    </>
  );
});
