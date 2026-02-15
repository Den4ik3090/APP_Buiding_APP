import React from "react";

/**
 * Full-page animated gradient + floating blur orbs.
 * Uses CSS-only animation; intensity can be reduced via .auth-motion-reduced on parent.
 */
export const AnimatedBackground: React.FC = () => (
  <div
    className="auth-bg-gradient fixed inset-0 min-h-screen w-full"
    aria-hidden
  >
    <div className="auth-blob auth-blob--1" />
    <div className="auth-blob auth-blob--2" />
    <div className="auth-blob auth-blob--3" />
  </div>
);
