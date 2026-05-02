import React, { useEffect, memo } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: number;
  message: string;
  type?: ToastType;
  onRemove: (id: number) => void;
}

const VARIANT: Record<ToastType, { classes: string; icon: string; title: string }> = {
  success: {
    classes: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/70',
    icon: '✅',
    title: 'Успех',
  },
  error: {
    classes: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/70',
    icon: '❌',
    title: 'Ошибка',
  },
  warning: {
    classes: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/70',
    icon: '⚠️',
    title: 'Внимание',
  },
  info: {
    classes: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/70',
    icon: 'ℹ️',
    title: 'Информация',
  },
};

const Toast = memo(function Toast({ id, message, type = 'info', onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const variant = VARIANT[type] ?? VARIANT.info;

  return (
    <div
      className={`flex w-80 items-start gap-3 rounded-xl border p-4 shadow-lg ${variant.classes}`}
      translate="no"
      role="alert"
    >
      <span className="mt-0.5 shrink-0 text-base leading-none">{variant.icon}</span>

      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {variant.title}
        </strong>
        <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-300">
          {message}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onRemove(id)}
        aria-label="Закрыть уведомление"
        className="shrink-0 rounded p-0.5 text-lg leading-none text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        ×
      </button>
    </div>
  );
});

export default Toast;
