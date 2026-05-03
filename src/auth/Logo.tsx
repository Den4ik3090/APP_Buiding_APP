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
        className="flex h-14 w-14 items-center justify-center rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #D4983A 0%, #E8B04B 100%)',
          boxShadow: '0 8px 24px rgba(212, 152, 58, 0.35)',
        }}
        aria-hidden
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0A0F1E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L3 7v6c0 5 3.9 9.5 9 11 5.1-1.5 9-6 9-11V7l-9-5z" />
        </svg>
      </div>
    )}
    <div className="text-center">
      <h1 className="text-base font-bold tracking-wide uppercase text-slate-800 dark:text-[#D4983A]">
        {brandName}
      </h1>
      {tagline && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {tagline}
        </p>
      )}
    </div>
  </div>
);
