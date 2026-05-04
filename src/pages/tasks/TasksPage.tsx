import React, { lazy, Suspense, useState } from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { TaskFilters } from '@/features/tasks/components/TaskFilters';
import { TaskCreateModal } from '@/features/tasks/components/TaskCreateModal';
import styles from '@/features/tasks/components/tasks.module.scss';

const TaskList = lazy(() =>
  import('@/features/tasks/components/TaskList').then((m) => ({ default: m.TaskList }))
);
const TaskCalendar = lazy(() =>
  import('@/features/tasks/components/TaskCalendar').then((m) => ({ default: m.TaskCalendar }))
);
const TaskDashboard = lazy(() =>
  import('@/features/tasks/components/TaskDashboard').then((m) => ({ default: m.TaskDashboard }))
);

type Tab = 'list' | 'calendar' | 'dashboard';

const TABS: { id: Tab; label: string }[] = [
  { id: 'list',      label: 'Список' },
  { id: 'calendar',  label: 'Календарь' },
  { id: 'dashboard', label: 'Дашборд' },
];

function Fallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 80, borderRadius: 8, background: '#f4f4f5' }} />
      ))}
    </div>
  );
}

export default function TasksPage() {
  const [tab, setTab] = useState<Tab>('list');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className={styles['task-tabs-bar']}>
        <div style={{ display: 'flex' }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(styles['task-tab-btn'], tab === id && styles['task-tab-btn--active'])}
            >
              {label}
            </button>
          ))}
        </div>

        <button className={styles['task-new-btn']} onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Новая задача
        </button>
      </div>

      {tab !== 'dashboard' && <TaskFilters />}

      <Suspense fallback={<Fallback />}>
        {tab === 'list'      && <TaskList />}
        {tab === 'calendar'  && <TaskCalendar />}
        {tab === 'dashboard' && <TaskDashboard />}
      </Suspense>

      <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
