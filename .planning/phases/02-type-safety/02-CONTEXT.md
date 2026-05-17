---
phase: 2
name: Type Safety
status: planning
created: 2026-05-16
depends_on: [1]
requirements: [TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, TYPE-07, TYPE-08]
---

# Phase 2 Context: Type Safety

## Goal
Every file in src/features/ is strict TypeScript with no `as any`, and the nine previously untested feature slices have at least service-layer unit tests.

## Success Criteria
1. `npx tsc --noEmit` exits 0 after all 16 .jsx conversions — as any count remains 0
2. `npm test` exits 0 with tests for tasks, permits, orders, prescriptions feature slices and for entity lib helpers
3. The converted registry components (orders/4, permits/6, prescriptions/4, employee-crud/2) retain identical runtime behavior after conversion — no regressions visible in the browser

## Requirements

### TYPE-01: JSX → TSX conversion for orders/permits/prescriptions/employee-crud
Convert all remaining .jsx files in feature component directories to strict .tsx. Each file must compile with 0 errors, add proper prop interfaces, and introduce no `as any`.

### TYPE-02: No regression in converted components
Converted registry components retain identical runtime behavior — Realtime subscriptions, TanStack Query invalidation, form handling all work the same.

### TYPE-03: Jest config fix
Fix the `setupFilesAfterFramework` typo in jest.config.js to the correct Jest key.

### TYPE-04: tasks/ service tests
Tests for `tasksService.ts` helper functions and `useTasks.ts` hook behavior.

### TYPE-05: permits/ service tests
Tests for `permitsService.ts` CRUD functions.

### TYPE-06: orders/ service tests
Tests for `ordersService.ts` CRUD functions.

### TYPE-07: prescriptions/ service tests
Tests for `prescriptionsService.ts` CRUD functions.

### TYPE-08: entity lib tests
Tests for `src/entities/employee/lib.ts` and `src/entities/permit/lib.ts` helper functions.

## Scope

### 2a — JSX to TSX conversion (TYPE-01, TYPE-02)
- Convert `src/features/orders/components/` — 4 files (OrdersRegistry + others)
- Convert `src/features/permits/components/` — 6 files (PermitsRegistry + others)
- Convert `src/features/prescriptions/components/` — 4 files (PrescriptionsRegistry + others)
- Convert `src/features/employee-crud/components/` — 2 remaining JSX files
- Each conversion: rename .jsx → .tsx, add prop interfaces, fix TypeScript errors; no `as any`

### 2b — Test coverage (TYPE-03 through TYPE-08)
- Fix `jest.config.js` typo: `setupFilesAfterFramework` → correct key
- `src/__tests__/tasks/` — test `tasksService.ts` + hook behavior
- `src/__tests__/permits/` — test `permitsService.ts` CRUD
- `src/__tests__/orders/` — test `ordersService.ts` CRUD
- `src/__tests__/prescriptions/` — test `prescriptionsService.ts` CRUD
- `src/__tests__/entities/` — test entity lib helpers

## Key Files
- `src/features/orders/components/*.jsx` → `*.tsx` (4 files)
- `src/features/permits/components/*.jsx` → `*.tsx` (6 files)
- `src/features/prescriptions/components/*.jsx` → `*.tsx` (4 files)
- `src/features/employee-crud/components/*.jsx` → `*.tsx` (2 files)
- `jest.config.js`
- `src/__tests__/` (new test files)

## Reference Patterns
- Strict TSX component: `src/features/employee-crud/components/EmployeeTable.tsx`
- Test pattern: `src/__tests__/employeeFormHelpers.test.ts`
- Service layer: `src/features/tasks/services/tasksService.ts`
- Hook pattern: `src/features/tasks/hooks/useTasks.ts`

## Constraints
- `as any` is forbidden — current count: 0, must stay 0
- Do NOT rename channel strings in Realtime subscriptions (Phase 1 CLAUDE.md constraint preserved)
- CLAUDE.md "Convert .jsx → .tsx only when explicitly requested; one file at a time" — Phase 2 is the explicit request for all 16 files
- All converted files must pass `npx tsc --noEmit` 0 errors
- Tests must mock Supabase (not hit real DB) — existing jest.setup.ts pattern
