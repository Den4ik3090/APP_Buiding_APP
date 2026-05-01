import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import type { TaskStatus } from '../model';

function SkeletonRow() {
  return (
    <div style={{ height: 80, borderRadius: 8, background: '#f4f4f5', animation: 'pulse 1.5s ease-in-out infinite' }} />
  );
}

export function TaskList() {
  const [params] = useSearchParams();
  const statusParam = params.get('status') as TaskStatus | null;
  const siteId = params.get('siteId') ?? undefined;

  const { data: tasks, isLoading, isError, error } = useTasks({
    status: statusParam ?? undefined,
    siteId,
  });

  // Guard: loading
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TaskFilters />
        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  // Guard: error (renders inline — no throw, no removeChild crash)
  if (isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TaskFilters />
        <div style={{
          border: '1px solid #fca5a5',
          borderRadius: 8,
          background: '#fff1f2',
          padding: '12px 16px',
          fontSize: 13,
          color: '#991b1b',
        }}>
          <strong>Ошибка загрузки задач.</strong>{' '}
          {(error as Error).message.includes('does not exist')
            ? 'Таблица tasks не найдена — запустите миграцию в Supabase.'
            : (error as Error).message}
        </div>
      </div>
    );
  }

  // Guard: empty
  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TaskFilters />
        <div style={{
          border: '1px dashed #d4d4d8',
          borderRadius: 8,
          padding: '40px 16px',
          textAlign: 'center',
          fontSize: 13,
          color: '#a1a1aa',
        }}>
          Задачи не найдены
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TaskFilters />
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
