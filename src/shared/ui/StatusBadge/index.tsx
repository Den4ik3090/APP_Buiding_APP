import React from 'react';

export type StatusTone = 'valid' | 'warning' | 'expired';

export interface StatusBadgeProps {
  tone: StatusTone;
  days: number;
}

const CLASSES: Record<StatusTone, string> = {
  valid:
    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  warning:
    'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  expired:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
};

const LABELS: Record<StatusTone, string> = {
  valid:   '🟢 Актуален',
  warning: '🟡 Скоро истекает',
  expired: '🔴 Просрочен',
};

export default function StatusBadge({ tone, days }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${CLASSES[tone]}`}
    >
      {LABELS[tone]} ({days} дн.)
    </span>
  );
}
