import React from "react";

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  id: string;
  label: string;
  error?: string;
  /** Left icon (e.g. email icon) */
  leftIcon?: React.ReactNode;
  inputClassName?: string;
  wrapperClassName?: string;
}

/**
 * Accessible text input with label, optional icon, error state.
 * Use autoComplete="email" for login email field.
 */
export const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  error,
  leftIcon,
  inputClassName = "",
  wrapperClassName = "",
  ...inputProps
}) => (
  <div className={`w-full ${wrapperClassName}`}>
    <label
      htmlFor={id}
      className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
    >
      {label}
    </label>
    <div className="relative">
      {leftIcon && (
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          aria-hidden
        >
          {leftIcon}
        </div>
      )}
      <input
        id={id}
        className={`auth-input w-full rounded-xl border border-slate-300 bg-white/90 py-3 pr-4 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-400 ${
          leftIcon ? "pl-11" : "pl-4"
        } ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""} ${inputClassName}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
    </div>
    {error && (
      <p
        id={`${id}-error`}
        className="mt-1.5 text-sm text-red-600 dark:text-red-400"
        role="alert"
      >
        {error}
      </p>
    )}
  </div>
);
