import React from "react";

export interface TextFieldProps {
  id: string;
  label?: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  error,
  leftIcon,
  required = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`group ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span
            className="
              pointer-events-none absolute inset-y-0 left-0 z-10
              flex w-11 items-center justify-center
              text-slate-400 transition-colors
              group-focus-within:text-[#D4983A]
              dark:text-slate-500 dark:group-focus-within:text-[#E8B04B]
            "
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            block w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-slate-900
            placeholder:text-slate-400 shadow-sm outline-none transition
            ${leftIcon ? "pl-11" : ""}
            ${error
              ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 dark:border-red-800/60"
              : "border-slate-300/70 focus:border-[#D4983A]/60 focus:ring-4 focus:ring-[#D4983A]/10 dark:border-white/10"
            }
            disabled:cursor-not-allowed disabled:opacity-60
            dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500
          `}
        />

        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 dark:ring-white/5" />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
};