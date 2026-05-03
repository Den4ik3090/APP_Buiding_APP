import React from "react";

export interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Primary CTA: gold gradient, shimmer hover, optional loading spinner.
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}) => (
  <button
    type="submit"
    className={`auth-btn flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide uppercase active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${className}`}
    style={{
      background: 'linear-gradient(135deg, #D4983A 0%, #E8B04B 100%)',
      boxShadow: '0 4px 16px rgba(212, 152, 58, 0.3)',
    }}
    disabled={disabled || loading}
    aria-busy={loading}
    {...props}
  >
    {loading ? (
      <>
        <svg
          className="h-5 w-5 animate-spin text-[#0A0F1E]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Входим...</span>
      </>
    ) : (
      children
    )}
  </button>
);
