import React from "react";
import { AuthLayout } from "./AuthLayout";
import { LoginCard } from "./LoginCard";

export interface LoginPageProps {
  /** Logo image URL (e.g. from App) */
  logoSrc?: string;
  /** Called after successful login */
  onSuccess?: () => void;
  /** Called with error message when auth fails */
  onError?: (message: string) => void;
  /** Optional: pass your auth handler; if not set, LoginCard uses stub (console.log + delay) */
  signIn?: (email: string, password: string) => Promise<void>;
  /** Reduce background animation intensity */
  reducedMotion?: boolean;
}

/**
 * Full login page: animated background + glass card.
 * Usage: render when !session; pass signIn (e.g. Supabase signInWithPassword) and onSuccess/onError.
 */
export const LoginPage: React.FC<LoginPageProps> = ({
  logoSrc,
  onSuccess,
  onError,
  signIn,
  reducedMotion = false,
}) => (
  <AuthLayout reducedMotion={reducedMotion}>
    <LoginCard
      logoSrc={logoSrc}
      brandName="Instruction POS"
      tagline="Управление инструктажами"
      onSuccess={onSuccess}
      onError={onError}
      onSubmit={signIn}
    />
  </AuthLayout>
);
