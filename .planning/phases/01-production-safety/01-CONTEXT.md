# Phase 1: Production Safety - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Source:** Direct conversation — user provided explicit scope

<domain>
## Phase Boundary

Phase 1 eliminates the four highest-risk open issues in the PUTEVI Safety production app:
1. Silent degraded mode from missing `is_dismissed` DB column
2. Zero error visibility (Sentry stub is a no-op)
3. Three FSD violations where JSX registry components bypass the services layer
4. Known-CVE xlsx 0.18.5 dependency still in use

This phase touches no UI. All changes are under the hood: services, configuration, dependency replacement. Existing UX behavior must be preserved exactly.

</domain>

<decisions>
## Implementation Decisions

### D-01: is_dismissed — Remove fallback, don't extend it
- **Locked:** Remove the degraded fallback path in `employeesService.ts` entirely after the column is confirmed present in Supabase. Do NOT patch the console.warn stripping as a workaround — fix the root cause.
- The Supabase migration SQL must add `is_dismissed boolean NOT NULL DEFAULT false` to the `employees` table.
- After migration, `employeesService.ts` filters `is_dismissed = false` unconditionally (no fallback branch).

### D-02: drop_console + warning strategy
- **Locked:** Once the fallback is removed, there is no meaningful warning to strip — the `drop_console: true` concern resolves itself. Do NOT change the webpack config.
- If any other critical `console.warn` calls exist in services, surface them via Sentry instead of fighting webpack config.

### D-03: Sentry — @sentry/react, activate existing stub
- **Locked:** Install `@sentry/react` (ask user before npm install). Do NOT create a new sentry module — edit `src/app/sentry.ts` which already has the stub.
- Wire `REACT_APP_SENTRY_DSN` environment variable (add to `.env.example` if not present).
- Sentry must be initialized in `src/app/sentry.ts` using `Sentry.init`.
- `ErrorBoundary` in `src/app/App.tsx` must call `Sentry.captureException` in its error handler.
- Add `window.addEventListener('unhandledrejection', ...)` for promise rejections.

### D-04: FSD registry refactor — services layer, preserve Realtime channel names
- **Locked:** Three files must lose their direct `supabase` import:
  - `src/features/orders/components/OrdersRegistry.jsx`
  - `src/features/permits/components/PermitsRegistry.jsx`
  - `src/features/prescriptions/components/PrescriptionsRegistry.jsx`
- All Supabase calls (queries + Realtime subscriptions) move to the respective `services/` file.
- **CRITICAL:** Realtime channel name strings must be preserved character-for-character. Renaming them would require coordinated Supabase infrastructure changes. Copy them verbatim into the service layer.
- The refactored components remain `.jsx` — do NOT convert to TypeScript in this phase (that's Phase 2).
- Service functions added in this phase must follow the pattern in `src/features/tasks/services/tasksService.ts`.

### D-05: xlsx → ExcelJS
- **Locked:** Replace `xlsx` (0.18.5, abandoned, CVE) with `exceljs` (actively maintained).
- Ask user before running `npm uninstall xlsx && npm install exceljs`.
- Edit `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx`: the dynamic `import('xlsx')` becomes `import('exceljs')`.
- The ExcelJS API differs from xlsx.utils — adapt the workbook/worksheet/cell writing calls to ExcelJS equivalents.
- The output file must be a valid `.xlsx` that opens in Excel/LibreOffice.
- Do NOT change the trigger (button click), file naming, or user-visible behavior.

### Claude's Discretion
- Order of sub-tasks within the phase (1a → 1d is recommended sequencing but planner can reorder)
- Whether to group Sentry init + ErrorBoundary into one plan or split
- Exact ExcelJS API translation (planner should read AdditionalTrainingsManager.tsx and write the exact new API calls)
- Whether to add `REACT_APP_SENTRY_DSN` to `.env.example` or just document it

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Service layer pattern
- `src/features/tasks/services/tasksService.ts` — The reference service file. All new service functions must follow this exact pattern (pure async functions, typed params, Supabase client from `@/shared/api/supabase`).

### Sentry scaffold
- `src/app/sentry.ts` — Existing stub. Activate, don't rewrite.
- `src/app/App.tsx` — ErrorBoundary wiring location.

### FSD violation files (to fix)
- `src/features/orders/components/OrdersRegistry.jsx` — Has direct `supabase` import to remove
- `src/features/orders/services/ordersService.ts` — Receives extracted Supabase calls
- `src/features/permits/components/PermitsRegistry.jsx` — Has direct `supabase` import + Realtime channels
- `src/features/permits/services/permitsService.ts` — Receives extracted Supabase calls + Realtime helpers
- `src/features/prescriptions/components/PrescriptionsRegistry.jsx` — Has direct `supabase` import + Realtime channels
- `src/features/prescriptions/services/prescriptionsService.ts` — Receives extracted calls

### xlsx file to migrate
- `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx` — ~702 lines; has the dynamic xlsx import

### Codebase constraints
- `CLAUDE.md` — Project rules (FSD import direction, no `as any`, service layer mandatory, Realtime channel rename warning)
- `.planning/codebase/CONCERNS.md` — Full list of concerns surfaced during mapping

</canonical_refs>

<specifics>
## Specific Ideas

- The `is_dismissed` fallback in `employeesService.ts` is likely wrapped in a try/catch or a conditional — find and delete the entire branch, not just the warning.
- Sentry DSN comes from environment: `process.env.REACT_APP_SENTRY_DSN` (webpack exposes `REACT_APP_*` vars).
- `@sentry/react` v8+ has a different init API than v7 — planner must check current latest API before writing init code.
- ExcelJS uses a streaming or promise-based API (`workbook.xlsx.writeBuffer()` → Blob → download link) rather than xlsx's synchronous `XLSX.write()`. The planner must read `AdditionalTrainingsManager.tsx` to understand the current download mechanism.
- The three registry JSX files may share a Realtime channel naming pattern — check all three before writing service wrappers to avoid duplication.

</specifics>

<deferred>
## Deferred Ideas

- Converting registry `.jsx` files to `.tsx` — Phase 2 (Type Safety)
- Adding unit tests for the refactored service functions — Phase 2 (Type Safety)
- OrganizationManager TanStack Query migration — Phase 3 (Architecture Consistency)
- Removing `@coreui/*` dead packages — Phase 4 (Dependency Hygiene)
- Any new UI or user-visible behavior changes — out of scope for this milestone

</deferred>

---

*Phase: 01-production-safety*
*Context gathered: 2026-05-16 from direct conversation*
