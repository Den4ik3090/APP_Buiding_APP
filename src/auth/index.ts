/**
 * Auth module: production-ready login page (React + TypeScript + Tailwind).
 *
 * Usage in App (when no session):
 *   import { LoginPage } from './auth';
 *   import { supabase } from './supabaseClient';
 *
 *   <LoginPage
 *     logoSrc={logo}
 *     onSuccess={() => {}}
 *     onError={(msg) => addNotification(msg, 'error')}
 *     signIn={async (email, password) => {
 *       const { error } = await supabase.auth.signInWithPassword({ email, password });
 *       if (error) throw new Error(error.message);
 *     }}
 *   />
 */

export { AuthLayout } from "./AuthLayout";
export { AnimatedBackground } from "./AnimatedBackground";
export { Logo } from "./Logo";
export { TextField } from "./TextField";
export { PasswordField } from "./PasswordField";
export { PrimaryButton } from "./PrimaryButton";
export { LoginCard } from "./LoginCard";
export { LoginPage } from "./LoginPage";
