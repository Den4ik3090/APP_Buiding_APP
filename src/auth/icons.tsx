import React from "react";

const iconClassName = "h-5 w-5 shrink-0";

export const EmailIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={iconClassName}
    aria-hidden="true"
  >
    <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2.25" />
    <path d="M4.5 7l7.5 6 7.5-6" />
  </svg>
);

export const LockIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={iconClassName}
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
  </svg>
);

export const EyeIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={iconClassName}
    aria-hidden="true"
  >
    <path d="M1.5 12s3.8-6.5 10.5-6.5S22.5 12 22.5 12 18.7 18.5 12 18.5 1.5 12 1.5 12Z" />
    <circle cx="12" cy="12" r="3.25" />
  </svg>
);

export const EyeOffIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={iconClassName}
    aria-hidden="true"
  >
    <path d="M3 3l18 18" />
    <path d="M10.58 10.58A2 2 0 0 0 10 12a2 2 0 0 0 2 2c.53 0 1.02-.21 1.42-.58" />
    <path d="M6.71 6.72C4.58 8.17 3.06 10.5 1.5 12c0 0 3.8 6.5 10.5 6.5 2.08 0 3.91-.62 5.45-1.54" />
    <path d="M14.97 14.97A4 4 0 0 1 9.03 9.03" />
    <path d="M9.88 5.7A10.8 10.8 0 0 1 12 5.5c6.7 0 10.5 6.5 10.5 6.5a18.3 18.3 0 0 1-2.42 3.34" />
  </svg>
);