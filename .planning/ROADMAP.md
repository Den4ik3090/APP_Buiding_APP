# Roadmap — PUTEVI Safety Technical Debt Remediation

> Milestone: Technical Debt & Architecture Remediation
> Generated: 2026-05-16
> Granularity: Standard
> Requirements: 28 v1 requirements across 4 phases

## Overview

Four sequenced phases eliminate the highest-risk production issues first (silent failures, invisible errors, known CVEs), then harden the type system and test coverage, then normalize architectural patterns, and finally clean up dead dependencies and close the CI gap. Every change is remediation — no new features.

## Phases

- [ ] **Phase 1: Production Safety** — Eliminate silent degraded mode, activate Sentry error monitoring, move 3 registry JSX components to the services layer, replace xlsx with ExcelJS
- [ ] **Phase 2: Type Safety** — Convert 16 legacy .jsx files to strict .tsx, add unit/integration test coverage for 9 untested feature slices
- [ ] **Phase 3: Architecture Consistency** — Migrate OrganizationManager to TanStack Query, add services/ layer to employee-retrain and additional-trainings skeletal slices
- [ ] **Phase 4: Dependency Hygiene + CI** — Remove unused @coreui/* packages, audit framer-motion, add npm test to CI, document GitHub secrets, write Playwright E2E tests

---

## Phase Details

### Phase 1: Production Safety
**Goal**: The production system fails loudly — no silent degraded modes, no invisible runtime errors, no known-CVE dependencies, no direct Supabase calls bypassing the services layer
**Depends on**: Nothing (first phase)
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07, PROD-08, PROD-09, PROD-10
**Success Criteria** (what must be TRUE):
  1. Loading the employee list in production shows only active employees — no dismissed employees appear due to a missing DB column, and no console.warn is silently stripped
  2. A runtime error thrown in any React component (or an unhandled promise rejection) appears in the Sentry dashboard within seconds
  3. Opening OrdersPage, PermitsPage, or PrescriptionsPage triggers no direct supabase import in the registry JSX files — all data flows through the feature service layer
  4. The additional-trainings xlsx export produces a valid .xlsx file after the migration to ExcelJS — xlsx 0.18.5 is gone from package.json
**Plans**: 4 plans
- [x] 01-01-PLAN.md — is_dismissed fallback removal (PROD-01, PROD-02)
- [ ] 01-02-PLAN.md — Sentry activation + DefinePlugin + ErrorBoundary wiring (PROD-03, PROD-04, PROD-05)
- [ ] 01-03-PLAN.md — FSD registry refactor for orders/permits/prescriptions (PROD-06, PROD-07, PROD-08)
- [ ] 01-04-PLAN.md — xlsx → ExcelJS migration (PROD-09, PROD-10)
**UI hint**: no

### Scope

**1a — is_dismissed migration (PROD-01, PROD-02)**
- Add `is_dismissed` column to `employees` Supabase table (migration SQL)
- Edit `src/features/employee-crud/services/employeesService.ts`: remove the fallback path that loads all employees when the column is absent
- Verify the `drop_console: true` Webpack config no longer strips a meaningful warning (once the fallback is gone, the warning is moot)

**1b — Sentry activation (PROD-03, PROD-04, PROD-05)**
- `npm install @sentry/react` (ask user before installing)
- Edit `src/app/sentry.ts`: uncomment `Sentry.init`, wire `REACT_APP_SENTRY_DSN`
- Edit `src/app/App.tsx` `ErrorBoundary` usage: call `Sentry.captureException` in the error handler
- Add `Sentry.init` global error handlers for unhandled promise rejections

**1c — FSD registry refactor (PROD-06, PROD-07, PROD-08)**
- `src/features/orders/services/ordersService.ts`: add any missing query functions currently called directly in OrdersRegistry
- `src/features/permits/services/permitsService.ts`: add any missing query functions + Realtime subscription helpers
- `src/features/prescriptions/services/prescriptionsService.ts`: same pattern
- Edit `src/features/orders/components/OrdersRegistry.jsx`: remove direct supabase import, call service functions
- Edit `src/features/permits/components/PermitsRegistry.jsx`: remove direct supabase import, call service functions (preserve Realtime channel name strings exactly)
- Edit `src/features/prescriptions/components/PrescriptionsRegistry.jsx`: same pattern

**1d — xlsx → ExcelJS migration (PROD-09, PROD-10)**
- `npm uninstall xlsx` / `npm install exceljs` (ask user)
- Edit `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx`: replace dynamic `import('xlsx')` with dynamic `import('exceljs')`; adapt workbook/sheet API calls to ExcelJS equivalents
- Verify export produces a valid file

### Key Files
- `src/features/employee-crud/services/employeesService.ts`
- `src/app/sentry.ts`
- `src/app/App.tsx`
- `src/features/orders/components/OrdersRegistry.jsx`
- `src/features/orders/services/ordersService.ts`
- `src/features/permits/components/PermitsRegistry.jsx`
- `src/features/permits/services/permitsService.ts`
- `src/features/prescriptions/components/PrescriptionsRegistry.jsx`
- `src/features/prescriptions/services/prescriptionsService.ts`
- `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx`
- `package.json`

---

### Phase 2: Type Safety
**Goal**: Every file in src/features/ is strict TypeScript with no as any, and the nine previously untested feature slices have at least service-layer unit tests
**Depends on**: Phase 1
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, TYPE-07, TYPE-08
**Success Criteria** (what must be TRUE):
  1. `npx tsc --noEmit` exits 0 after all 16 .jsx conversions — as any count remains 0
  2. `npm test` exits 0 with tests for tasks, permits, orders, prescriptions feature slices and for entity lib helpers
  3. The converted registry components (orders/4, permits/6, prescriptions/4, employee-crud/2) retain identical runtime behavior after conversion — no regressions visible in the browser
**Plans**: TBD
**UI hint**: no

### Scope

**2a — JSX to TSX conversion (TYPE-01, TYPE-02)**
- Convert `src/features/orders/components/` — 4 files (OrdersRegistry + 3 others)
- Convert `src/features/permits/components/` — 6 files (PermitsRegistry + 5 others)
- Convert `src/features/prescriptions/components/` — 4 files (PrescriptionsRegistry + 3 others)
- Convert `src/features/employee-crud/components/` — 2 remaining JSX files
- Each conversion: rename .jsx → .tsx, add prop interfaces, fix TypeScript errors; no `as any`

**2b — Test coverage (TYPE-03 through TYPE-08)**
- Fix `jest.config.js` typo: `setupFilesAfterFramework` → `setupFilesAfterEach` (verify correct key name)
- `src/__tests__/tasks/` — test `tasksService.ts` helper functions and `useTasks.ts` hook behavior
- `src/__tests__/permits/` — test `permitsService.ts` CRUD functions
- `src/__tests__/orders/` — test `ordersService.ts` CRUD functions
- `src/__tests__/prescriptions/` — test `prescriptionsService.ts` CRUD functions
- `src/__tests__/entities/` — test `src/entities/employee/lib.ts` and `src/entities/permit/lib.ts` helpers

### Key Files
- `src/features/orders/components/*.jsx` → `*.tsx` (4 files)
- `src/features/permits/components/*.jsx` → `*.tsx` (6 files)
- `src/features/prescriptions/components/*.jsx` → `*.tsx` (4 files)
- `src/features/employee-crud/components/*.jsx` → `*.tsx` (2 files)
- `jest.config.js`
- `src/__tests__/` (new test files)

---

### Phase 3: Architecture Consistency
**Goal**: Every feature slice follows the same data-fetching pattern — TanStack Query hooks calling service functions — with no manual useState/useEffect data fetching and no skeletal slices missing a services/ layer
**Depends on**: Phase 2
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05
**Success Criteria** (what must be TRUE):
  1. OrganizationsPage loads data via a TanStack Query hook — no useState/useEffect data fetch remains in OrganizationManager.tsx
  2. src/features/employee-retrain/ has a services/employeeRetrainService.ts following the tasksService.ts pattern — no Supabase calls in components
  3. src/features/additional-trainings/ has a services/additionalTrainingsService.ts following the tasksService.ts pattern
  4. `npx tsc --noEmit` exits 0 after all architecture changes
**Plans**: TBD
**UI hint**: no

### Scope

**3a — OrganizationManager TanStack Query migration (ARCH-01)**
- `src/features/organization-docs/hooks/`: create `useOrganizationDocsQuery.ts` using `useQuery` from TanStack Query
- `src/features/organization-docs/components/OrganizationManager.tsx`: replace `useState`/`useEffect` data fetch with `useOrganizationDocsQuery()` call
- Keep mutation patterns consistent with `useTasks.ts` reference

**3b — Services layer for skeletal slices (ARCH-02, ARCH-03, ARCH-04)**
- Create `src/features/employee-retrain/services/employeeRetrainService.ts`: extract any Supabase calls, follow `tasksService.ts` pattern
- Create `src/features/additional-trainings/services/additionalTrainingsService.ts`: same pattern; move any Supabase logic out of `AdditionalTrainingsManager.tsx`
- Verify barrel `index.ts` exports in both feature slices

### Key Files
- `src/features/organization-docs/components/OrganizationManager.tsx`
- `src/features/organization-docs/hooks/useOrganizationDocsQuery.ts` (new)
- `src/features/employee-retrain/services/employeeRetrainService.ts` (new)
- `src/features/additional-trainings/services/additionalTrainingsService.ts` (new)
- `src/features/tasks/services/tasksService.ts` (reference pattern)

---

### Phase 4: Dependency Hygiene + CI
**Goal**: The dependency tree contains no abandoned, CVE-laden, or unused packages, the CI pipeline enforces tests, and the golden-path user journey is covered by automated E2E tests
**Depends on**: Phase 3
**Requirements**: DEP-01, DEP-02, DEP-03, DEP-04, DEP-05
**Success Criteria** (what must be TRUE):
  1. `npm install` no longer installs @coreui/react, @coreui/coreui, @coreui/icons, or @coreui/icons-react — no import of these packages exists in src/
  2. framer-motion usage is documented with a keep/replace decision — if replaced, shared/ui/AnimatedStateIcons/ uses CSS transitions instead
  3. The CI pipeline (.github/workflows/ci.yml) runs npm test and fails the build if tests fail
  4. A contributor can configure GitHub Actions secrets by following documented steps (in README or a CI doc)
  5. At least 2 Playwright E2E tests pass: login flow succeeds, employee list loads, navigation to tasks works
**Plans**: TBD
**UI hint**: no

### Scope

**4a — Remove dead @coreui/* packages (DEP-01)**
- Confirm zero imports: `grep -r "@coreui" src/` returns nothing
- Remove from package.json: `@coreui/react`, `@coreui/coreui`, `@coreui/icons`, `@coreui/icons-react`
- Run `npm install` and `npx tsc --noEmit` to verify

**4b — framer-motion audit (DEP-02)**
- Locate all framer-motion usages: `grep -r "framer-motion" src/`
- Expected: only `src/shared/ui/AnimatedStateIcons/`
- Decision: document keep justification OR replace with CSS `transition`/`@keyframes` equivalent
- If replaced: remove framer-motion from package.json

**4c — CI test gate (DEP-03)**
- Edit `.github/workflows/ci.yml`: add `npm test -- --watchAll=false` step after build step
- Ensure CI job fails if any test fails

**4d — GitHub secrets documentation (DEP-04)**
- Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` setup instructions to README or a new `.github/CI_SETUP.md`
- Include: where to find values in Supabase dashboard, how to add them in GitHub repo Settings → Secrets → Actions

**4e — Playwright E2E tests (DEP-05)**
- Create `e2e/` directory at project root
- Write `e2e/golden-path.spec.ts`: test login → employee list visible → navigate to /tasks → task list visible
- Configure `playwright.config.ts` pointing at `http://localhost:3000`
- Confirm `@playwright/test` is already installed

### Key Files
- `package.json`
- `.github/workflows/ci.yml`
- `src/shared/ui/AnimatedStateIcons/` (framer-motion audit)
- `e2e/golden-path.spec.ts` (new)
- `playwright.config.ts` (new or update)
- `README.md` or `.github/CI_SETUP.md` (new)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Production Safety | 1/4 | In Progress|  |
| 2. Type Safety | 0/TBD | Not started | - |
| 3. Architecture Consistency | 0/TBD | Not started | - |
| 4. Dependency Hygiene + CI | 0/TBD | Not started | - |
