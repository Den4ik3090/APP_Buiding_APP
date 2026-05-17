import React from 'react';
import { CheckCircle, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import type { TaskStatus } from '../model';

type KnownStatus = TaskStatus | 'open';

interface ConfigEntry {
  label: string;
  icon: React.ReactNode;
  classes: string;
}

const CONFIG: Record<KnownStatus, ConfigEntry> = {
  pending: {
    label: 'Ожидает',
    icon: <Clock size={12} />,
    classes: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
  },
  open: {
    label: 'Открыта',
    icon: <Clock size={12} />,
    classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  in_progress: {
    label: 'В процессе',
    icon: <Clock size={12} />,
    classes: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
  resolved: {
    label: 'Решена',
    icon: <CheckCircle size={12} />,
    classes: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
  },
  overdue: {
    label: 'Просрочена',
    icon: <AlertTriangle size={12} />,
    classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  },
};

const FALLBACK: ConfigEntry = {
  label: 'Неизвестно',
  icon: <HelpCircle size={12} />,
  classes: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
};

interface TaskStatusBadgeProps {
  status: TaskStatus | string;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const entry = CONFIG[status as KnownStatus] ?? { ...FALLBACK, label: status || FALLBACK.label };

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${entry.classes}`}
    >
      {entry.icon}
      {entry.label}
    </span>
  );
}
