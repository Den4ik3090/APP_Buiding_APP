// filepath: src/features/tasks/components/TaskStatusBadge.tsx
import React from 'react';
import { CheckCircle, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import type { TaskStatus } from '../types';

// Расширяем конфигурацию, чтобы она включала 'pending' и имела запасной вариант
const CONFIG: Record<string, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
  pending: {
    label: 'В работе',
    icon: <Clock size={12} />,
    style: { background: '#fef9c3', color: '#92400e' },
  },
  open: {
    label: 'Открыта',
    icon: <Clock size={12} />,
    style: { background: '#dbeafe', color: '#1e40af' },
  },
  in_progress: {
    label: 'В процессе',
    icon: <Clock size={12} />,
    style: { background: '#e0f2fe', color: '#075985' },
  },
  resolved: {
    label: 'Решена',
    icon: <CheckCircle size={12} />,
    style: { background: '#dcfce7', color: '#166534' },
  },
  overdue: {
    label: 'Просрочена',
    icon: <AlertTriangle size={12} />,
    style: { background: '#fee2e2', color: '#991b1b' },
  },
};

// Дефолтный конфиг на случай, если статус из базы не совпал ни с одним ключом
const FALLBACK_CONFIG = {
  label: 'Неизвестно',
  icon: <HelpCircle size={12} />,
  style: { background: '#f3f4f6', color: '#374151' },
};

interface TaskStatusBadgeProps {
  status: TaskStatus | string; // Позволяем строку, чтобы избежать падения при деструктуризации
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  // Безопасное получение данных: если статуса нет в CONFIG, берем FALLBACK_CONFIG
  const { label, icon, style } = CONFIG[status as string] || {
    ...FALLBACK_CONFIG,
    label: status || FALLBACK_CONFIG.label // Если статус пришел, но его нет в списке — покажем сам текст статуса
  };

  return (
    <span
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
        border: `1px solid transparent`,
      }}
      className="task-status-badge"
    >
      {icon}
      {label}
    </span>
  );
}