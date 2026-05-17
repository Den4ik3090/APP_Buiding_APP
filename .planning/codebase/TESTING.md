# TESTING
> Generated: 2026-05-16 | Focus: quality

## Summary
Test infrastructure is set up but coverage is minimal — only 3 test files covering `employee-crud` helper functions. 9 of 11 feature slices have zero tests. Playwright is installed but no E2E tests exist. CI runs TypeScript check and build but not the test suite.

## Test Framework

- **Jest** + **jsdom** test environment
- **Babel** transform via `babel-jest` (handles TS, TSX, JS, JSX)
- **identity-obj-proxy** for CSS/SCSS Modules
- **File mocks** for images/assets (`src/__mocks__/fileMock.js`)

## Running Tests

```bash
npm test                 # Run all tests (requires: npm install deps first)
npm run test:coverage    # Jest with coverage report
```

Note: Jest dependencies may not be installed in all environments — run `npm install` first.

## Test Location

All tests in `src/__tests__/`:

| File | What it covers |
|------|----------------|
| `employeeFormHelpers.test.ts` | `checkTrainingStatus`, `getTodayDateValue`, `createInitialFormData` pure functions |
| `EmployeeFormGeneralField.test.tsx` | `EmployeeFormGeneralField` component rendering/behavior |
| `EmployeeFormTrainingStatus.test.tsx` | `EmployeeFormTrainingStatus` component rendering/behavior |

All 3 files test `employee-crud` only. Total: ~25 tests.

## Test Patterns

From `employeeFormHelpers.test.ts`:
- Plain `describe`/`it` blocks
- Pure function testing — no mocking needed
- Date math tested with relative offsets from today

From component tests:
- React Testing Library assumed (standard for JSX component tests)
- `@/` alias resolved via `moduleNameMapper` in `jest.config.js`

## Coverage Configuration

`jest.config.js` collects coverage from:
- `src/features/**/*.{ts,tsx}`
- `src/entities/**/*.{ts,tsx}`
- Excludes test files themselves

## CI Pipeline (`.github/workflows/ci.yml`)

Triggers on: push to `main`, `master`, `feature/**`; PRs to `main`/`master`.

Steps:
1. Checkout
2. Setup Node 20 + npm cache
3. `npm ci`
4. `npx tsc --noEmit` (TypeScript check)
5. `npm run build` (with placeholder Supabase env vars if secrets not set)

**Tests are NOT run in CI.** Only TypeScript check + build.

## What's NOT Tested (Gaps)

| Feature Slice | Test Status |
|--------------|-------------|
| `tasks/` | No tests |
| `permits/` | No tests |
| `orders/` | No tests |
| `prescriptions/` | No tests |
| `organization-docs/` | No tests |
| `additional-trainings/` | No tests |
| `employee-export/` | No tests |
| `employee-retrain/` | No tests |
| Entities (model/lib helpers) | No tests |
| Widgets | No tests |
| Shared hooks/lib | No tests |

## E2E Testing

- `@playwright/test` is installed as a dev dependency
- **Zero E2E test files exist** — the dependency is unused

## Gaps / Unknowns
- `jest.config.js` has a typo: `setupFilesAfterFramework` (should be `setupFilesAfterFramework` → `setupFilesAfterFramework`). The correct key is `setupFilesAfterFramework` — verify this doesn't silently skip `jest.setup.ts`.
- No integration tests for Supabase service layer (would require real Supabase instance or mock).
- CI does not run the test suite — test regressions won't block merges.
