import React, { useState } from "react";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
  id: string;
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  inputClassName?: string;
  wrapperClassName?: string;
}

/** Eye icon for show/hide password */
const EyeIcon = ({ show }: { show: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {show ? (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
        <path d="m2 2 20 20" />
      </>
    )}
  </svg>
);

/**
 * Password input with show/hide toggle and full a11y.
 * Use autoComplete="current-password" for login.
 */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  error,
  leftIcon,
  inputClassName = "",
  wrapperClassName = "",
  ...inputProps
}) => {
  const [show, setShow] = useState(false);

  return (
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
          type={show ? "text" : "password"}
          className={`auth-input w-full rounded-xl border border-slate-300 bg-white/90 py-3 pr-12 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-400 ${
            leftIcon ? "pl-11" : "pl-4"
          } ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""} ${inputClassName}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="auth-btn absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          tabIndex={-1}
        >
          <EyeIcon show={show} />
        </button>
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
};
