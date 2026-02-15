import React from "react";

export interface LogoProps {
  /** Optional image URL for brand logo */
  logoSrc?: string;
  /** Brand name text (e.g. "Instruction POS") */
  brandName?: string;
  /** Short tagline or subtitle */
  tagline?: string;
  /** Optional extra class for container */
  className?: string;
}

/**
 * Minimal logo block for auth: icon + name + optional tagline.
 * Can be placed in card header or in corner of page.
 */
export const Logo: React.FC<LogoProps> = ({
  logoSrc,
  brandName = "Instruction POS",
  tagline = "Управление инструктажами",
  className = "",
}) => (
  <div className={`flex flex-col items-center gap-2 ${className}`}>
    {logoSrc ? (
      <img
        src={logoSrc}
        alt=""
        className="h-14 w-auto object-contain"
        aria-hidden
      />
    ) : (
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-2xl font-bold text-white shadow-lg"
        aria-hidden
      >
        IN
      </div>
    )}
    <div className="text-center">
      <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
        {brandName}
      </h1>
      {tagline && (
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {tagline}
        </p>
      )}
    </div>
  </div>
);
