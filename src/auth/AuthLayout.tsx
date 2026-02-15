import React, { ReactNode, useEffect } from "react";
import { AnimatedBackground } from "./AnimatedBackground";

export interface AuthLayoutProps {
  children: ReactNode;
  /** Optional: add auth-motion-reduced to reduce animation intensity */
  reducedMotion?: boolean;
}

/**
 * Wraps auth page with full-screen animated background and centered content.
 * Syncs dark mode class with system preference (prefers-color-scheme).
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  reducedMotion = false,
}) => {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle("dark", media.matches);
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <div
      className={`auth-page relative min-h-screen w-full overflow-auto ${
        reducedMotion ? "auth-motion-reduced" : ""
      }`}
    >
      <AnimatedBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
