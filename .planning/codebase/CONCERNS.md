# CONCERNS
> Generated: 2026-05-16 | Focus: concerns

## Summary
The codebase is structurally sound (0 `as any`, complete FSD migration, no shared-layer violations) but has several meaningful risks: a silent production degraded mode from a pending DB migration, fully stubbed error monitoring, direct Supabase imports in 3 legacy JSX registry components, and near-zero test coverage across 9 of 11 feature slices.

## Critical Concerns

### 1. Silent Degraded Mode — Pending DB Migration
`employeesService.ts` falls back to loading ALL employees (including dismissed) when the `is_dismissed` column is absent. The `console.warn` that signals this failure is stripped by `drop_console: true` in the production Webpack config, making the degraded state completely invisible to operators.

### 2. Sentry Is Fully Stubbed
`src/app/sentry.ts` exports a no-op. All production runtime errors are invisible. Needs: `npm install @sentry/react` + `REACT_APP_SENTRY_DSN` in `.env` + uncomment `Sentry.init`.

### 3. Direct Supabase Imports in 3 Registry Components (FSD Violation)
`OrdersRegistry.jsx`, `PermitsRegistry.jsx`, `PrescriptionsRegistry.jsx` all import `supabase` directly, bypassing the services layer. This violates the FSD rule that only `services/` files may call Supabase. These also host the named Realtime channel subscriptions — renaming those strings requires coordinated infrastructure changes.

### 4. Auth Logging in Production
`LoginCard.tsx` logs the user's email to the console during login. With `drop_console: true` this is stripped in production, but it's a security smell that should be removed from source.

## Technical Debt

- **16 unconverted `.jsx` files** across `orders/` (4), `permits/` (6), `prescriptions/` (4), `employee-crud/` (2). No TypeScript safety in these files.
- **`OrganizationManager.tsx` uses manual `useState`/`useEffect`** for data fetching — inconsistent with every other feature that uses TanStack Query.
- **`xlsx` 0.18.5** is the abandoned community edition with known CVEs and no upstream security fixes. Consider migrating to `exceljs` or similar.
- **All `console.error` calls stripped in production** by `drop_console: true` — errors in JSX components (form saves, deletes) are silently lost without Sentry active.
- **`jest.config.js` has a key typo:** `setupFilesAfterFramework` should be `setupFilesAfterFramework` — may cause `jest.setup.ts` to be silently skipped.

## Missing Coverage

| Layer | Coverage |
|-------|----------|
| `employee-crud/` helpers | Covered (3 test files, ~25 tests) |
| All other 10 feature slices | No tests |
| Entity lib helpers | No tests |
| Shared hooks/lib | No tests |
| Widgets | No tests |
| E2E flows | No tests (`@playwright/test` installed but unused) |
| CI test gate | Missing — CI only runs `tsc` + build |

## Dependency Risks

| Package | Risk |
|---------|------|
| `xlsx` 0.18.5 | Abandoned community edition; known CVEs |
| `@coreui/*` (4 packages) | Zero imports in `src/` — pure dead weight, increases install time |
| `framer-motion` v12 | ~100KB used only in `shared/ui/AnimatedStateIcons/` — high cost for one component |
| `@playwright/test` | Installed but no test files — misleading dependency |
| `react-window` v2.2.5 | Non-standard fork with different API from v1; confusion risk for developers unfamiliar with the fork |

## Architecture Risks

- **`employee-retrain/` and `additional-trainings/` slices are skeletal** — missing required `services/` layer; any future Supabase integration would need to add it.
- **Realtime channel name strings live in untyped JSX files** — typos are not caught at compile time.
- **`component-test-react/` page** — a dead scratch page that adds a route and is lazy-loaded for no purpose.
- **`about/` feature** — appears to be a static info page with no Supabase integration; low risk but adds to bundle.

## Performance Risks

- **3 components over 600 lines:** `AdditionalTrainingsManager.tsx` (702 lines), `EmployeeTable.tsx` (667 lines), `AnalyticsDashboard.tsx` (654 lines) — large files but not necessarily a problem if not re-rendering excessively.
- **Webpack splits only `recharts`** — `framer-motion` and `xlsx` bloat the generic vendors chunk.
- **`xlsx` loaded dynamically** in `additional-trainings` (good) but the base vendors chunk may still be large.

## Gaps / Unknowns

- `tasks`, `task_resolutions`, and `permit_audit_log` table schemas are undocumented — RLS policy coverage unknown.
- Storage bucket configuration (access policy, CORS, size limits) for `employee-photos` and `tasks` buckets is unknown.
- CI GitHub secrets (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_KEY`) may not be configured in the repo — build uses placeholder fallbacks.
- No ESLint or Prettier configuration — code style is unenforced beyond TypeScript.
