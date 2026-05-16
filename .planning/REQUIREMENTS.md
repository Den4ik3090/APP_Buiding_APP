# Requirements — PUTEVI Safety Technical Debt Remediation

> Milestone: Technical Debt & Architecture Remediation
> Generated: 2026-05-16
> Status: Active

---

## v1 Requirements

### Phase 1 — Production Safety

- [ ] **PROD-01**: The `is_dismissed` column exists in the `employees` Supabase table and `employeesService.ts` no longer uses the degraded fallback path
- [ ] **PROD-02**: Production builds do not silently suppress `console.warn` for degraded-mode conditions — warning is either surfaced via Sentry or the fallback path is eliminated
- [x] **PROD-03**: `src/app/sentry.ts` initializes Sentry with a real DSN — `Sentry.init` is active, not commented out
- [x] **PROD-04**: Unhandled React errors caught by `ErrorBoundary` are reported to Sentry in production builds
- [x] **PROD-05**: Runtime JS errors (unhandled promise rejections, uncaught exceptions) are captured by Sentry in production
- [x] **PROD-06**: `OrdersRegistry.jsx` no longer imports `supabase` directly — all Supabase calls route through `ordersService`
- [x] **PROD-07**: `PermitsRegistry.jsx` no longer imports `supabase` directly — all Supabase calls route through `permitsService` (Realtime subscription included)
- [x] **PROD-08**: `PrescriptionsRegistry.jsx` no longer imports `supabase` directly — all Supabase calls route through `prescriptionsService` (Realtime subscription included)
- [ ] **PROD-09**: The `xlsx` package is removed from `package.json` and replaced with `exceljs`
- [ ] **PROD-10**: The `additional-trainings` xlsx export continues to work correctly after the migration to ExcelJS

### Phase 2 — Type Safety

- [ ] **TYPE-01**: All 16 `.jsx` files in `src/features/` are converted to `.tsx` with strict TypeScript — `npx tsc --noEmit` stays at 0 errors
- [ ] **TYPE-02**: Converted files use no `as any` — existing count of 0 is preserved
- [ ] **TYPE-03**: Unit tests exist for `src/features/tasks/` — at minimum `tasksService.ts` helper functions and `useTasks.ts` hook behavior
- [ ] **TYPE-04**: Unit tests exist for `src/features/permits/` — at minimum service layer functions
- [ ] **TYPE-05**: Unit tests exist for `src/features/orders/` — at minimum service layer functions
- [ ] **TYPE-06**: Unit tests exist for `src/features/prescriptions/` — at minimum service layer functions
- [ ] **TYPE-07**: Unit tests exist for `src/entities/` lib helpers (at minimum `employee/lib.ts`, `permit/lib.ts`)
- [ ] **TYPE-08**: `npm test` exits 0 with all tests passing

### Phase 3 — Architecture Consistency

- [ ] **ARCH-01**: `OrganizationManager.tsx` fetches data via TanStack Query (`useOrganizationDocsQuery`) instead of manual `useState`/`useEffect` with direct service calls
- [ ] **ARCH-02**: `src/features/employee-retrain/` has a `services/employeeRetrainService.ts` — no Supabase calls in components or hooks
- [ ] **ARCH-03**: `src/features/additional-trainings/` has a `services/additionalTrainingsService.ts` — no Supabase calls in components or hooks
- [ ] **ARCH-04**: Both new service files follow the pattern in `src/features/tasks/services/tasksService.ts`
- [ ] **ARCH-05**: `npx tsc --noEmit` stays at 0 errors after all architecture changes

### Phase 4 — Dependency Hygiene + CI

- [ ] **DEP-01**: `@coreui/react`, `@coreui/coreui`, `@coreui/icons`, `@coreui/icons-react` are removed from `package.json` — verified no imports exist in `src/`
- [ ] **DEP-02**: `framer-motion` usage is audited — either kept with justification documented, or replaced with a CSS transition equivalent in `shared/ui/AnimatedStateIcons/`
- [ ] **DEP-03**: CI pipeline (`.github/workflows/ci.yml`) runs `npm test` in addition to `tsc` and `build`
- [ ] **DEP-04**: GitHub Actions secrets `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` are documented with setup instructions (in README or CI docs)
- [ ] **DEP-05**: At least 2 Playwright E2E tests exist covering the golden path: login → employee list loads → navigate to tasks

---

## v2 Requirements (Deferred)

- Complete Playwright E2E suite covering all major routes (permits, orders, prescriptions, organizations)
- Supabase RLS policy audit and documentation
- Storage bucket CORS/access policy documentation
- Bundle size analysis and optimization (recharts, framer-motion, xlsx → exceljs chunk splitting)
- ESLint + Prettier configuration to enforce code style automatically
- Sentry performance tracing (in addition to error tracking)

---

## Out of Scope

- New user-facing features — this milestone is remediation only
- Auth flow changes (`src/auth/`) — protected, requires separate planning
- Supabase schema changes beyond `is_dismissed` — requires coordinated infrastructure work
- Telegram edge function changes (`supabase/functions/`) — protected
- `sessionStorage` auth setting change — intentional security decision
- React 19 upgrade — separate milestone
- Webpack → Vite migration — separate milestone

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PROD-01 | Phase 1 | Pending |
| PROD-02 | Phase 1 | Pending |
| PROD-03 | Phase 1 | Complete |
| PROD-04 | Phase 1 | Complete |
| PROD-05 | Phase 1 | Complete |
| PROD-06 | Phase 1 | Complete |
| PROD-07 | Phase 1 | Complete |
| PROD-08 | Phase 1 | Complete |
| PROD-09 | Phase 1 | Pending |
| PROD-10 | Phase 1 | Pending |
| TYPE-01 | Phase 2 | Pending |
| TYPE-02 | Phase 2 | Pending |
| TYPE-03 | Phase 2 | Pending |
| TYPE-04 | Phase 2 | Pending |
| TYPE-05 | Phase 2 | Pending |
| TYPE-06 | Phase 2 | Pending |
| TYPE-07 | Phase 2 | Pending |
| TYPE-08 | Phase 2 | Pending |
| ARCH-01 | Phase 3 | Pending |
| ARCH-02 | Phase 3 | Pending |
| ARCH-03 | Phase 3 | Pending |
| ARCH-04 | Phase 3 | Pending |
| ARCH-05 | Phase 3 | Pending |
| DEP-01 | Phase 4 | Pending |
| DEP-02 | Phase 4 | Pending |
| DEP-03 | Phase 4 | Pending |
| DEP-04 | Phase 4 | Pending |
| DEP-05 | Phase 4 | Pending |
