// Sentry error monitoring — activated.
// Set REACT_APP_SENTRY_DSN in .env to enable; without it, initSentry() is a no-op.

import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return; // skip in dev / when DSN not configured

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Errors only — performance tracing is out of scope for Phase 1 (v2 requirement).
    tracesSampleRate: 0,
    beforeSend(event) {
      // Strip user PII before sending (single-operator app; defensive scrubbing per T-02).
      if (event.user) delete event.user.email;
      return event;
    },
  });

  // D-03: explicit listener in addition to globalHandlersIntegration default.
  // The existing src/index.js HMR listener calls e.preventDefault() only for chunk-load errors,
  // so this listener still receives all other rejections.
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason);
  });
}

export function captureSentryException(
  error: Error,
  context?: Record<string, string>
): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
