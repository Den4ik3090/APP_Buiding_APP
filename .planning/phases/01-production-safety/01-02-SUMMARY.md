---
plan: 01-02
phase: 1
status: complete
completed_at: 2026-05-16
subsystem: error-monitoring
tags: [sentry, error-boundary, webpack, env]
requires: []
provides: [sentry-error-monitoring]
affects: [src/app, src/shared/ui/ErrorBoundary, webpack.config.js]
tech-stack-added: ["@sentry/react ^10.53.1"]
tech-stack-patterns: [dynamic-import-fsd-workaround, defineplugin-env-passthrough]
key-files-created: []
key-files-modified:
  - src/app/sentry.ts
  - webpack.config.js
  - .env.example
  - src/shared/ui/ErrorBoundary/ErrorBoundary.tsx
decisions:
  - "Dynamic import used in ErrorBoundary.componentDidCatch to avoid static upward FSD dependency (shared/ -> app/)"
  - "tracesSampleRate=0: errors only, no performance tracing in Phase 1"
  - "beforeSend strips event.user.email as defensive PII scrubbing (T-1-02b)"
  - "REACT_APP_SENTRY_DSN exposed in bundle — accepted risk per T-1-02 (Sentry DSNs are intentionally public)"
duration: ~10min
---

# Phase 1 Plan 02 Summary: Activate Sentry Error Monitoring

**One-liner:** Sentry.init activated with DSN guard, unhandledrejection listener, PII scrubbing, and dynamic ErrorBoundary wiring using @sentry/react v10.

## Files Changed

- `src/app/sentry.ts`: Replaced no-op stub with active `Sentry.init` + `captureSentryException` + `unhandledrejection` listener. +35 lines.
- `webpack.config.js`: Added `REACT_APP_SENTRY_DSN` to DefinePlugin block so the DSN env var reaches the client bundle at build time. +1 line.
- `.env.example`: Added `REACT_APP_SENTRY_DSN=` slot with comment explaining DSN public exposure is intentional. +2 lines.
- `src/shared/ui/ErrorBoundary/ErrorBoundary.tsx`: `componentDidCatch` now dynamically imports `captureSentryException` and forwards the error with `componentStack` context. +10 lines.

## Package Info

- @sentry/react version installed: ^10.53.1 (pre-installed, Task 1 checkpoint skipped per instructions)

## DSN Exposure Note (T-1-02)

Sentry DSNs are intentionally public per docs.sentry.io — they allow only event ingestion, not data exfiltration. Rate limiting at Sentry project level mitigates abuse. Disposition: accept.

## Important Note

PROD-03/04/05 are only end-to-end verifiable in production once the user provides a real `REACT_APP_SENTRY_DSN`. In dev with no DSN, `initSentry()` is intentionally a no-op. To activate: add the DSN to `.env`, restart dev server, throw a test error, verify event appears in Sentry dashboard within 30 seconds.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or wired-but-empty states introduced.

## Threat Flags

None — no new network endpoints or auth paths introduced. The REACT_APP_SENTRY_DSN exposure in the client bundle is pre-analysed in the plan's threat model (T-1-02, disposition: accept).

## Self-Check: PASSED

- src/app/sentry.ts: FOUND
- webpack.config.js REACT_APP_SENTRY_DSN entry: FOUND (grep returned 1)
- .env.example REACT_APP_SENTRY_DSN slot: FOUND (grep returned 1)
- src/shared/ui/ErrorBoundary/ErrorBoundary.tsx captureSentryException: FOUND (2 occurrences: destructure + call)
- No static @sentry/react import in ErrorBoundary: CONFIRMED (grep returned 0)
- initSentry in src/index.js: CONFIRMED (2 occurrences: import + call, unchanged)
- drop_console: true in webpack.config.js: CONFIRMED unchanged
- Commit 6e4963e: FOUND
