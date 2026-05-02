import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ButtonGlowProps {
  text?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ButtonGlow({
  text = 'Отправить отчет',
  onClick,
  disabled = false,
}: ButtonGlowProps) {
  return (
    <div className="relative inline-flex">
      <div className="absolute inset-0 rounded-xl bg-blue-500/40 blur-md dark:bg-blue-400/25" />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-400 dark:hover:to-indigo-400"
      >
        {text}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
