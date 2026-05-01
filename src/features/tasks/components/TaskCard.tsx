import React, { memo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Pencil,
  Image as ImageIcon,
} from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskResolveModal } from './TaskResolveModal';
import { TaskEditModal } from './TaskEditModal';
import { TaskResolutionViewerModal } from './TaskResolutionViewerModal';
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import type { Task } from '../model';
import './tasks.css';

function getTimeLabel(dueDateIso: string | null): { label: string; cls: string } | null {
  if (!dueDateIso) return null;
  const diff = new Date(dueDateIso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);

  if (diff < 0) {
    return {
      label: days > 0 ? `Просрочено ${days} д` : `Просрочено ${hrs} ч`,
      cls: 'task-time-badge--overdue',
    };
  }
  if (hrs < 24) {
    return { label: `Через ${hrs} ч`, cls: 'task-time-badge--soon' };
  }
  return { label: `Через ${days} д`, cls: 'task-time-badge--ok' };
}

interface TaskCardProps {
  task: Task;
}

const btn: React.CSSProperties = {
  padding: '5px 14px',
  borderRadius: 7,
  border: '1.5px solid #e4e4e7',
  background: 'rgba(255,255,255,0.8)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

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
      <div className={`task-card${isOverdue ? ' task-card--overdue' : ''}`}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                margin: 0,
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#111',
              }}
            >
              {task.title}
            </p>

            {task.description && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.4,
                }}
              >
                {task.description}
              </p>
            )}
          </div>

          <TaskStatusBadge status={task.status} />
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: '#9ca3af',
            }}
          >
            <Clock size={11} />
            {new Date(task.created_at).toLocaleDateString('ru-RU')}
          </span>

          {timeInfo && (
            <span className={`task-time-badge ${timeInfo.cls}`}>
              {isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
              {timeInfo.label}
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {!isResolved && task.status !== 'in_progress' && (
            <button
              style={btn}
              onClick={() =>
                updateTask.mutate({
                  id: task.id,
                  payload: { status: 'in_progress' },
                })
              }
              disabled={updateTask.isPending}
            >
              В работу
            </button>
          )}

          {!isResolved && (
            <button
              style={{
                ...btn,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              onClick={() => setResolveOpen(true)}
            >
              <CheckCircle size={13} />
              Закрыть
            </button>
          )}

          <button
            style={{
              ...btn,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={13} />
            Редактировать
          </button>

          <button
            style={{
              ...btn,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => setPhotoOpen(true)}
          >
            <ImageIcon size={13} />
            Фото
          </button>

          <button
            style={{
              ...btn,
              marginLeft: 'auto',
              color: '#dc2626',
              border: 'none',
              background: 'transparent',
              padding: '5px 8px',
            }}
            onClick={() => deleteTask.mutate(task.id)}
            disabled={deleteTask.isPending}
          >
            Удалить
          </button>
        </div>
      </div>

      <TaskResolveModal
        task={task}
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
      />

      <TaskEditModal
        task={task}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <TaskResolutionViewerModal
        task={task}
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
      />
    </>
  );
});