import React, { useState, FormEvent } from "react";
import { Logo } from "./Logo";
import { TextField } from "./TextField";
import { PasswordField } from "./PasswordField";
import { PrimaryButton } from "./PrimaryButton";
import { EmailIcon, LockIcon } from "./icons";

export interface LoginCardProps {
  logoSrc?: string;
  brandName?: string;
  tagline?: string;
  /** Called on successful login (e.g. redirect or parent state update) */
  onSuccess?: () => void;
  /** Called with error message on auth failure */
  onError?: (message: string) => void;
  /** Async login handler: (email, password) => Promise<void>. Throw or call onError on failure. */
  onSubmit?: (email: string, password: string) => Promise<void>;
}

/**
 * Glassmorphism login card: logo, form (email + password), CTA, forgot link, policy, social placeholders.
 */
export const LoginCard: React.FC<LoginCardProps> = ({
  logoSrc,
  brandName,
  tagline,
  onSuccess,
  onError,
  onSubmit,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldError({});

    const emailTrim = email.trim();
    if (!emailTrim) {
      setFieldError((prev) => ({ ...prev, email: "Введите email" }));
      return;
    }
    if (!password) {
      setFieldError((prev) => ({ ...prev, password: "Введите пароль" }));
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(emailTrim, password);
        onSuccess?.();
      } else {
        // Stub for demo: just log and simulate delay
        console.log("Login attempt:", { email: emailTrim });
        await new Promise((r) => setTimeout(r, 1200));
        onSuccess?.();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка входа";
      setGlobalError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-card w-full max-w-[440px] rounded-2xl border border-white/20 bg-white/80 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-600/30 dark:bg-slate-900/80 sm:p-10"
      role="article"
      aria-labelledby="login-title"
    >
      <Logo
        logoSrc={logoSrc}
        brandName={brandName}
        tagline={tagline}
        className="mb-8"
      />

      <h2
        id="login-title"
        className="mb-6 text-center text-lg font-bold text-slate-800 dark:text-slate-100"
      >
        Вход в систему
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {globalError && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
            role="alert"
          >
            {globalError}
          </div>
        )}

        <TextField
          id="login-email"
          type="email"
          label="Email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          error={fieldError.email}
          leftIcon={<EmailIcon />}
          required
          disabled={loading}
        />

        <PasswordField
          id="login-password"
          label="Пароль"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          error={fieldError.password}
          leftIcon={<LockIcon />}
          required
          disabled={loading}
        />

        <div className="flex justify-end">
          <a
            href="#forgot"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            onClick={(e) => {
              e.preventDefault();
              // Placeholder: open forgot-password flow
            }}
          >
            Забыли пароль?
          </a>
        </div>

        <PrimaryButton type="submit" loading={loading}>
          Войти
        </PrimaryButton>

        {/* Social login placeholders (mock) */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-3 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              или войти через
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/60 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
            disabled
            aria-label="Войти через Google (скоро)"
          >
            <span className="opacity-60">Google</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/60 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
            disabled
            aria-label="Войти через GitHub (скоро)"
          >
            <span className="opacity-60">GitHub</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Входя в систему, вы соглашаетесь с{" "}
          <a href="#terms" className="underline hover:text-slate-700 dark:hover:text-slate-300">
            условиями использования
          </a>{" "}
          и{" "}
          <a href="#policy" className="underline hover:text-slate-700 dark:hover:text-slate-300">
            политикой конфиденциальности
          </a>
          .
        </p>
      </form>
    </div>
  );
};
