# Phase 2: Type Safety — Research

**Researched:** 2026-05-16
**Domain:** TypeScript JSX-to-TSX migration, Jest test infrastructure
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Convert all 16 remaining `.jsx` files in `src/features/` to strict `.tsx` — this is the explicit request for all 16 files
- Fix the `setupFilesAfterFramework` typo in `jest.config.js` to the correct Jest key
- Add service-layer unit tests for `tasks/`, `permits/`, `orders/`, `prescriptions/` and entity lib helpers
- `as any` is forbidden — current count: 0, must stay 0 after all conversions
- Do NOT rename channel strings in Realtime subscriptions

### Claude's Discretion
- Order of file conversions within each feature slice
- Test file naming and structure within `src/__tests__/`
- Whether to group tests per-service or per-feature in subdirectories

### Deferred Ideas (OUT OF SCOPE)
- Converting `.jsx` files outside `src/features/` (e.g., `src/pages/component-test-react/NewReactComponent.jsx`)
- Adding E2E tests (Playwright)
- Adding tests for widgets, shared hooks, or `organization-docs/`
- Adding CI gate for `npm test`
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-01 | Convert all remaining .jsx files in feature component dirs to strict .tsx | JSX Inventory section — all 16 files catalogued with complexity ratings |
| TYPE-02 | Converted components retain identical runtime behavior | Risk Register — Realtime subscriptions, TanStack Query, and memo patterns identified |
| TYPE-03 | Fix `setupFilesAfterFramework` typo in jest.config.js | Confirmed: correct key is `setupFilesAfterEnv` (verified via Jest docs) |
| TYPE-04 | Tests for `tasksService.ts` and `useTasks.ts` | Testable Functions section — pure helpers and Supabase-dependent functions listed |
| TYPE-05 | Tests for `permitsService.ts` CRUD functions | Testable Functions section — `shouldAutoClose`, `validatePermitData` identified as pure |
| TYPE-06 | Tests for `ordersService.ts` CRUD functions | Testable Functions section — all functions are Supabase-dependent, mock strategy documented |
| TYPE-07 | Tests for `prescriptionsService.ts` CRUD functions | Testable Functions section — same pattern as orders |
| TYPE-08 | Tests for `entities/employee/lib.ts` and `entities/permit/lib.ts` | Entity Helper Inventory — 12 pure functions identified, all unit-testable |
</phase_requirements>

---

## Summary

Phase 2 has two completely separate workstreams: JSX-to-TSX conversion (16 files, ~5 100 total lines) and test infrastructure build-out. These workstreams are independent and can be parallelized.

The JSX conversion work is mechanical but non-trivial. All 16 files use implicit untyped props — each needs a `Props` interface. The complexity varies significantly: `WorkerTrainingDownloadButton.jsx` (48 lines, 3 props) is a 15-minute task; `PrescriptionForm.jsx` (673 lines, Realtime-adjacent, complex form state) is a half-day task. No file uses `forwardRef`, but four files use `memo()` wrapping and two registry files use `useDeferredValue`. Internal sub-components defined inside the module body (PermitsDashboard, PrescriptionsTable) require `React.ReactNode` for `children` props.

The test infrastructure is blocked by a single critical fix: `jest.config.js` uses `setupFilesAfterFramework` which is not a valid Jest key. The correct key is `setupFilesAfterEnv`. [VERIFIED: jestjs.io/docs/configuration] Additionally, Jest itself and its peer dependencies (`jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `identity-obj-proxy`, `babel-jest`) are **not present in `package.json`** — they must be added before any test can run. The existing 3 test files test only pure functions and do not mock Supabase at all. The new service tests will need a `jest.mock('@/shared/api/supabase')` pattern.

**Primary recommendation:** Fix jest.config.js and add test deps in Wave 0 of plan 2b. Convert JSX files in dependency-safe order (leaves before parents): shared select components first, then tables, then forms, then registries.

---

## JSX Inventory

### Complete File List with Complexity

| File Path | Lines | Complexity | TypeScript Work Needed |
|-----------|-------|------------|------------------------|
| `src/features/employee-crud/components/WorkerTrainingDownloadButton.jsx` | 48 | Low | 3-prop interface (`workerId: string`, `workerName: string`, `addNotification: AddNotificationFn`); no children, no refs |
| `src/features/permits/components/PermitStatusBadge.jsx` | 51 | Low | 3-prop interface (`permit: Partial<Permit>`, `showDays?: boolean`, `statusOverride?: string`); no children, no refs |
| `src/features/orders/components/OrdersTable.jsx` | 350 | Medium | 4-prop interface; `memo(OrdersTable)` — add explicit `React.memo<OrdersTableProps>`; internal helper functions need return-type annotations; no children |
| `src/features/permits/components/PermitForm.jsx` | 249 | Medium | 6-prop interface; all types already exist in `@/entities/permit` (`Permit`, `PermitInsert`); employees array uses existing `RegistryEmployee` from `permitsService.ts` |
| `src/features/orders/components/OrderForm.jsx` | 516 | Medium | 5-prop interface; employees array uses `RegistryEmployee` from `ordersService.ts`; `useId()` already typed in React 18 |
| `src/features/orders/components/ResponsiblePersonMultiSelect.jsx` | 357 | Medium | 7-prop interface; `useRef<HTMLDivElement>` and `useRef<HTMLInputElement>`; `useDeferredValue<string>`; `memo` wrapper |
| `src/features/permits/components/PermitsTable.jsx` | 271 | Medium | 6-prop interface; imports `PermitStatusBadge` and `PermitActions` sub-components (convert those first); internal `toggleSort` callback types |
| `src/features/prescriptions/components/ResponsiblePersonSelect.jsx` | 329 | Medium | 7-prop interface (single-select variant of multi-select); `useRef<HTMLDivElement>` and `useRef<HTMLInputElement>`; `useDeferredValue<string>`; `memo` wrapper |
| `src/features/prescriptions/components/PrescriptionsTable.jsx` | 479 | Medium | 4-prop interface; `memo` wrapper; two internal sub-components (`StatusBadge`, `DeadlineCell`) defined inline — each needs typed props; `Intl.DateTimeFormat` already typed |
| `src/features/employee-crud/components/OrganizationTelegramReport.jsx` | 240 | Medium | 3-prop interface; `employees: Employee[]` (from `@/entities/employee`); `getDaysDifference: (date: string) => number`; `addNotification: AddNotificationFn`; `Set<string>` requires `useMemo` return-type annotation |
| `src/features/permits/components/PermitActions.jsx` | 385 | Medium-High | 6-prop interface; complex internal function `buildStatusCandidates(kind: 'close' \| 'extend')`; `confirmingAction` state is `'extend' \| 'close' \| null`; audit logging async chain |
| `src/features/permits/components/PermitsDashboard.jsx` | 180 | Medium-High | 2-prop interface; 4 inline sub-components (`Card`, `CardHeader`, `CardTitle`, `CardContent`) all need `{ children: React.ReactNode; className?: string }` typed props; recharts `CustomTooltip` needs `TooltipProps` from recharts |
| `src/features/permits/components/PermitsRegistry.jsx` | 186 | Medium-High | 1-prop interface; Realtime subscription via `subscribeToPermits` — channel name must NOT change; `useRef<number \| null>` for `previousExpiredCountRef`; TanStack Query hook types flow through |
| `src/features/orders/components/OrdersRegistry.jsx` | 335 | Medium-High | 1-prop interface; `useDeferredValue<string>`; Realtime subscription via `subscribeToOrders`; `editingOrder` state is `Order \| null`; collator constant typed `Intl.Collator` |
| `src/features/prescriptions/components/PrescriptionsRegistry.jsx` | 477 | High | 1-prop interface; `useDeferredValue<string>`; Realtime subscription via `subscribeToPrescriptions`; imports `PrescriptionForm.jsx` and `PrescriptionsTable.jsx` by explicit `.jsx` extension — those extensions must be removed after rename; `editingPrescription` state is `Prescription \| null` |
| `src/features/prescriptions/components/PrescriptionForm.jsx` | 673 | High | 5-prop interface; imports `ResponsiblePersonSelect.jsx` by explicit extension; complex form state with `responsible_person_id: string \| null`; `useId()`, `useRef<HTMLInputElement>`, `useCallback` chains |

**Total lines to convert:** 5 126

### Shared AddNotification Type

Multiple files receive `addNotification` as a prop. The correct type is already established in `useNotification.ts`:

```typescript
// [VERIFIED: src/shared/hooks/useNotification.ts pattern]
type AddNotificationFn = (message: string, type?: string, duration?: number) => void;
```

This should be defined once and imported — consider `src/shared/types/notifications.ts` or inline in each file. The FSD rule prohibits importing from `app/` layer in features, but the type itself can be inlined without importing context.

---

## Test Infrastructure State

### jest.config.js Critical Typo — VERIFIED

```javascript
// CURRENT (BROKEN):
setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],

// CORRECT: [VERIFIED: jestjs.io/docs/configuration]
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
```

`setupFilesAfterFramework` is not a recognized Jest configuration key. Jest silently ignores unknown keys — `jest.setup.ts` (which imports `@testing-library/jest-dom`) is never loaded. This means `toBeInTheDocument()` and other jest-dom matchers are unavailable, causing the two existing component tests to fail even when jest is installed. [VERIFIED: jestjs.io/docs/configuration]

### Missing Dependencies — BLOCKING

Jest and all test peer dependencies are absent from `package.json`. They must be installed before any test can run:

```bash
npm install --save-dev \
  jest \
  jest-environment-jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  identity-obj-proxy \
  babel-jest
```

[ASSUMED] Exact versions compatible with React 18 and the current Babel config — install latest compatible versions; do not pin unless CI failures occur.

**Note:** `babel.config.js` is already correct for test transpilation (`@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`). No changes needed there.

### What jest.setup.ts Provides

`jest.setup.ts` contains exactly one line:

```typescript
import '@testing-library/jest-dom';
```

This extends Jest's `expect` with DOM matchers (`toBeInTheDocument`, `toHaveClass`, `toHaveAttribute`, etc.). Currently silently skipped because of the typo. After the fix, all existing component tests can use these matchers.

### Supabase Mock Strategy

The existing tests (`employeeFormHelpers.test.ts`, `EmployeeFormGeneralField.test.tsx`, `EmployeeFormTrainingStatus.test.tsx`) test **pure functions and pure React components** — they never touch Supabase at all. No `jest.mock` appears anywhere in the existing test suite.

For the new service tests, Supabase must be mocked. The required pattern:

```typescript
// At top of each service test file:
jest.mock('@/shared/api/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));
```

Then per-test: `(supabase.from as jest.Mock).mockReturnValue(...)` with terminal chain returning `{ data: [...], error: null }`.

[ASSUMED] This chained mock pattern works with the Supabase JS v2 API structure — the service functions use builder chains ending in `.single()`, `.maybeSingle()`, or direct await. The mock must match the terminal method of each call.

### Module Name Mapper

`jest.config.js` already maps `@/` → `<rootDir>/src/` — all `@/shared/...` imports resolve correctly in tests without any additional setup. [VERIFIED: jest.config.js line 4-6]

---

## Testable Functions Per Service

### `src/features/tasks/services/tasksService.ts`

| Function | Type | Test Approach |
|----------|------|---------------|
| `isTableMissing(error)` | Pure helper (not exported) | Test indirectly via `fetchTasks` mock |
| `isUuid(value)` | Pure helper (not exported) | Test indirectly via `sanitizeTaskInsert` |
| `normalizeUuid(value)` | Pure helper (not exported) | Test indirectly via `sanitizeTaskInsert` |
| `sanitizeTaskInsert(payload)` | Pure helper (not exported) | Test indirectly via `createTask` mock |
| `fetchTasks(filters?)` | Supabase-dependent | Mock supabase, test filter branching and error handling |
| `fetchTaskById(id)` | Supabase-dependent | Mock supabase, test null return on missing table |
| `createTask(payload)` | Supabase-dependent | Mock supabase, verify `sanitizeTaskInsert` is called |
| `updateTask(id, payload)` | Supabase-dependent | Mock supabase, verify null data throws |
| `deleteTask(id)` | Supabase-dependent | Mock supabase, verify empty array throws |
| `fetchResolutionsByTask(taskId)` | Supabase-dependent | Mock supabase |
| `createResolution(payload)` | Supabase-dependent | Mock supabase |
| `fetchRegistryEmployees()` | Supabase-dependent | Mock supabase |
| `fetchTaskStats(siteId, dateRange)` | Supabase-dependent (complex) | Mock supabase for two sequential queries |

**Priority tests for tasks:** `fetchTasks` filter branching, `deleteTask` empty-array error, `updateTask` null-data error, `sanitizeTaskInsert` UUID normalization (via `createTask`).

### `src/features/permits/services/permitsService.ts`

| Function | Type | Test Approach |
|----------|------|---------------|
| `shouldAutoClose(permit)` | Pure helper (not exported) | Test indirectly via `fetchPermits` mock |
| `fetchPermits()` | Supabase-dependent + side effect | Mock `fetchRawPermits`, verify auto-close triggers |
| `fetchRegistryEmployees()` | Supabase-dependent | Mock supabase |
| `getCurrentUserId()` | Supabase auth call | Mock `supabase.auth.getUser` |
| `updatePermitWithStatus(id, payload, candidates)` | Supabase-dependent (retry loop) | Mock with CHECK constraint error `23514` to test fallback |
| `logPermitAudit(...)` | Supabase-dependent | Mock supabase |
| `createPermit(payload)` | Supabase-dependent | Mock supabase |
| `updatePermit(id, payload)` | Supabase-dependent | Mock supabase |
| `deletePermit(permitId)` | Supabase-dependent (retry with FK cleanup) | Mock with FK error `23503` to test audit-log cleanup path |
| `subscribeToPermits(onUpdate)` | Realtime (channel) | Mock channel builder, verify channel name stays `REALTIME_CHANNELS.PERMITS` |

**Priority tests for permits:** `shouldAutoClose` logic (via `fetchPermits`), `updatePermitWithStatus` retry behavior, `deletePermit` FK-cleanup path.

### `src/features/orders/services/ordersService.ts`

| Function | Type | Test Approach |
|----------|------|---------------|
| `fetchOrders()` | Supabase-dependent | Mock supabase, test error propagation |
| `fetchRegistryEmployees()` | Supabase-dependent | Mock supabase |
| `createOrder(payload)` | Supabase-dependent | Mock supabase |
| `updateOrder(id, payload)` | Supabase-dependent | Mock supabase |
| `deleteOrder(id)` | Supabase-dependent | Mock supabase |
| `subscribeToOrders(onUpdate)` | Realtime (channel) | Mock channel builder |

**Note:** `ordersService.ts` is the simplest service — all functions are thin wrappers. Tests primarily verify error propagation and that the correct Supabase table/columns are queried.

### `src/features/prescriptions/services/prescriptionsService.ts`

| Function | Type | Test Approach |
|----------|------|---------------|
| `fetchPrescriptions()` | Supabase-dependent | Mock supabase |
| `fetchRegistryEmployees()` | Supabase-dependent | Mock supabase |
| `createPrescription(payload)` | Supabase-dependent | Mock supabase |
| `updatePrescription(id, payload)` | Supabase-dependent | Mock supabase |
| `deletePrescription(id)` | Supabase-dependent | Mock supabase |
| `subscribeToPrescriptions(onUpdate)` | Realtime (channel) | Mock channel builder |

**Note:** Same structure as ordersService. Can share mock setup pattern.

---

## Entity Helper Inventory

### `src/entities/employee/lib.ts` — All Pure Functions

| Function | Signature | Test Scenarios |
|----------|-----------|----------------|
| `getDaysDifference(date: string): number` | Returns days since date | Past date → positive; future date → negative; today → ~0 |
| `getStatusKey(days: number): StatusKey` | Returns `'expired' \| 'warning' \| 'valid'` | `days >= 90` → expired; `days >= 75` → warning; `days < 75` → valid |
| `isTrainingExpired(dateReceived, expiryMonths): boolean` | Pure date math | Null inputs → false; expired → true; future → false; string months coerced |
| `hasExpiredAdditional(trainings): boolean` | Array check | Empty array → false; one expired → true; all valid → false |

Constants referenced: `DAYS_THRESHOLD = 90`, `WARNING_THRESHOLD = 75` [VERIFIED: constants.ts].

### `src/entities/permit/lib.ts` — All Pure Functions

| Function | Signature | Test Scenarios |
|----------|-----------|----------------|
| `generatePermitNumber(issueDate, existingPermits): string` | Generates `DD-MM-N` pattern | No existing permits → `-1`; 2 same-day → `-3` |
| `calculateExpiryDate(issueDate: string): Date` | Adds 15 days | Standard date math |
| `calculateExtendedDate(expiryDate: string): Date` | Adds 15 days to expiry | Standard date math |
| `isClosedStatus(status): boolean` | Normalizes and compares | `'Закрыт'` → true; `'Закрыт '` (trailing space) → true; `null` → false; `'Активен'` → false |
| `getPermitStatus(permit): string` | Derives display status | Closed → 'Закрыт'; today > targetDate → 'Просрочен'; is_extended → 'Продлен'; else 'Активен' |
| `canExtend(permit): boolean` | Checks extension eligibility | `is_extended: true` → false; `extension_count >= 1` → false; closed → false |
| `needsWarning(permit): boolean` | 3-day warning window | `days <= 3 && days >= 0` → true; outside window → false; closed → false |
| `getDaysUntilExpiry(permit): number` | Days until expiry/extended date | Uses `is_extended` to pick target date |
| `formatDate(date): string` | `DD.MM.YYYY` format | Null → empty string; valid date → formatted |
| `formatDateInput(date): string` | ISO `YYYY-MM-DD` format | Null → today's date; valid → formatted |
| `validatePermitData(form): { valid, errors }` | Form validation | Missing required fields → errors object; all filled → `{ valid: true, errors: {} }` |

**Note:** `normalizeStatus`, `toStartOfDay`, `getPermitTargetDate`, `getDiffInDays` are internal (unexported) — tested indirectly through exported functions.

---

## Barrel Export Impact

### Which index.ts Files Have .jsx Extension References

The four barrel `index.ts` files use **extension-free imports**:

```typescript
// orders/components/index.ts — no extension
export { default as OrdersRegistry } from './OrdersRegistry';
// permits/components/index.ts — no extension
export { default as PermitsRegistry } from './PermitsRegistry';
// prescriptions/components/index.ts — no extension
export { default as PrescriptionsRegistry } from './PrescriptionsRegistry';
// employee-crud/components/index.ts — no extension
export { default as OrganizationTelegramReport } from './OrganizationTelegramReport';
```

[VERIFIED: all four index.ts files] The barrel files do NOT need updating after rename — TypeScript's `moduleResolution: "bundler"` resolves `./OrdersRegistry` to `OrdersRegistry.tsx` automatically.

### Explicit .jsx Extension Imports — MUST UPDATE

Two files import siblings with explicit `.jsx` extensions and MUST have those changed to `.tsx` (or extension-free) after rename:

| File | Line | Import to Update |
|------|------|-----------------|
| `prescriptions/components/PrescriptionsRegistry.jsx` | 28–29 | `from "./PrescriptionForm.jsx"` → `from "./PrescriptionForm"` |
| `prescriptions/components/PrescriptionsRegistry.jsx` | 29 | `from "./PrescriptionsTable.jsx"` → `from "./PrescriptionsTable"` |
| `prescriptions/components/PrescriptionForm.jsx` | 23 | `from "./ResponsiblePersonSelect.jsx"` → `from "./ResponsiblePersonSelect"` |

[VERIFIED: `grep -rn "from.*\.jsx" src/` output]

### tsconfig.json Scope

`tsconfig.json` `include` array lists `src/**/*.ts` and `src/**/*.tsx` — after rename, converted files are automatically included in TypeScript compilation. The existing JSX files are only type-checked if they are in the `include` array or transitively imported from `.tsx` files, which they are via barrel exports. [VERIFIED: tsconfig.json]

---

## Conversion Order

Conversion must follow dependency order — leaf components first so that when parent components import sub-components, the sub-components are already `.tsx` and TypeScript can check the prop interfaces.

### Recommended Sequence (dependency-safe)

**Wave 1 — Standalone leaf components (no internal JSX imports):**
1. `WorkerTrainingDownloadButton.jsx` (48 lines — simplest possible)
2. `PermitStatusBadge.jsx` (51 lines)
3. `PermitsTable.jsx` (271 lines — imports PermitStatusBadge and PermitActions; convert those first or simultaneously)
4. `PermitActions.jsx` (385 lines — standalone)
5. `OrdersTable.jsx` (350 lines — standalone)
6. `PrescriptionsTable.jsx` (479 lines — standalone)
7. `ResponsiblePersonSelect.jsx` (329 lines — imported by PrescriptionForm)
8. `ResponsiblePersonMultiSelect.jsx` (357 lines — imported by OrderForm)

**Wave 2 — Forms (depend on Wave 1 selects):**
9. `PermitForm.jsx` (249 lines)
10. `OrderForm.jsx` (516 lines) — imports `ResponsiblePersonMultiSelect` (done in Wave 1)
11. `PrescriptionForm.jsx` (673 lines) — imports `ResponsiblePersonSelect` (done in Wave 1)

**Wave 3 — Dashboards and registries (depend on Wave 1 + 2):**
12. `PermitsDashboard.jsx` (180 lines)
13. `PermitsRegistry.jsx` (186 lines) — imports PermitsDashboard, PermitsTable, PermitForm
14. `OrdersRegistry.jsx` (335 lines) — imports OrderForm, OrdersTable
15. `PrescriptionsRegistry.jsx` (477 lines) — imports PrescriptionForm, PrescriptionsTable (update explicit `.jsx` extensions)
16. `OrganizationTelegramReport.jsx` (240 lines) — independent of other JSX files

**Note:** PermitsTable imports PermitStatusBadge and PermitActions. All three should be converted before PermitsRegistry to allow TypeScript to verify the prop interfaces end-to-end.

---

## Risk Register

### Files Requiring Special Handling

| File | Risk | Mitigation |
|------|------|------------|
| `PrescriptionForm.jsx` (673 lines) | Largest file; imports sibling by `.jsx` extension | Convert `ResponsiblePersonSelect` first; update import extension in same commit |
| `PrescriptionsRegistry.jsx` (477 lines) | Two explicit `.jsx` extension imports; Realtime subscription | Remove `.jsx` extensions when renaming; do NOT change channel name string |
| `OrdersRegistry.jsx` (335 lines) | Realtime subscription; `useDeferredValue` | Channel name `REALTIME_CHANNELS.ORDERS` must remain unchanged |
| `PermitsRegistry.jsx` (186 lines) | Realtime subscription; `useRef<number \| null>` for previous count | Channel name `REALTIME_CHANNELS.PERMITS` must remain unchanged |
| `PermitsDashboard.jsx` (180 lines) | 4 inline sub-components with `children` props | Each sub-component needs `{ children: React.ReactNode; className?: string }` — or extract `PropsWithChildren<{className?: string}>` |
| `PermitActions.jsx` (385 lines) | Complex state union type; async audit chain | `confirmingAction` state: `useState<'extend' \| 'close' \| null>(null)` |
| `PrescriptionsTable.jsx` (479 lines) | Two inline typed sub-components (`StatusBadge`, `DeadlineCell`) | `StatusBadge` needs `{ status: PrescriptionStatusValue }` — type exists in `@/entities/prescription` |
| `OrganizationTelegramReport.jsx` (240 lines) | `getDaysDifference` is a function prop; `Set<string>` in useMemo | Explicit callback type in props interface |

### Realtime Channel Safety

Three registry files subscribe via service layer (`subscribeToOrders`, `subscribeToPermits`, `subscribeToPrescriptions`) — the channel name strings live in `src/shared/constants/realtimeChannels.ts` (already TypeScript). The JSX-to-TSX rename does NOT touch channel strings. [VERIFIED: registry imports use service functions, not direct supabase calls]

### memo() Typing Pattern

Four files use `export default memo(Component)`. After conversion:

```typescript
// Pattern for memo-wrapped components:
export default memo(OrdersTable) as React.FC<OrdersTableProps>;
// OR (preferred — avoids explicit cast):
const OrdersTableMemo = memo<OrdersTableProps>(OrdersTable);
export default OrdersTableMemo;
```

[ASSUMED] `memo<Props>` generic syntax is supported in React 18 types — this is standard usage.

### recharts CustomTooltip Typing

`PermitsDashboard.jsx` defines `CustomTooltip` receiving recharts `active` and `payload` props. The correct type:

```typescript
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

type CustomTooltipProps = TooltipProps<ValueType, NameType>;
```

[ASSUMED] recharts v3 ships its own TypeScript types — verify `TooltipProps` export path when implementing.

---

## Common Pitfalls

### Pitfall 1: Typing `children` in Inline Sub-Components
**What goes wrong:** `PermitsDashboard.jsx` has `Card`, `CardHeader`, `CardTitle`, `CardContent` defined inline. Without explicit props typing, TypeScript infers `children` as `unknown` or errors on JSX.
**Why it happens:** Implicit props with `children` don't have a default type in TSX without `React.PropsWithChildren` or explicit `children: React.ReactNode`.
**How to avoid:** For each inline sub-component, add: `type CardProps = { children: React.ReactNode; className?: string }`.
**Warning signs:** `'children' does not exist in type '{}'` TypeScript error.

### Pitfall 2: `memo` Generic vs Assertion
**What goes wrong:** `export default memo(OrdersTable)` — TypeScript loses the prop type from `memo()`'s return if the wrapped function has no explicit generic.
**Why it happens:** `React.memo` return type is `React.MemoExoticComponent<T>` which preserves props only when `T` is explicit.
**How to avoid:** Use `memo<OrdersTableProps>(OrdersTable)` or annotate the export explicitly.
**Warning signs:** Parent component can't see prop errors when using memoized component.

### Pitfall 3: Explicit `.jsx` Extension Imports Survive Rename
**What goes wrong:** File is renamed to `.tsx` but import still says `from "./ResponsiblePersonSelect.jsx"` — TypeScript resolver fails.
**Why it happens:** Unlike barrel exports (which are extension-free), these three sibling imports use explicit extensions.
**How to avoid:** When renaming `ResponsiblePersonSelect.jsx` → `.tsx`, simultaneously update the import in `PrescriptionForm.jsx`. Convert in dependency order.
**Warning signs:** `Cannot find module './ResponsiblePersonSelect.jsx'` TypeScript error.

### Pitfall 4: Supabase Chained Mock Must Match Terminal Call
**What goes wrong:** Service function awaits `.single()` but mock only returns value from `.from()` — test throws `TypeError: supabase.from(...).select is not a function`.
**Why it happens:** Supabase uses method chaining; each chained method must be a jest mock that returns the mock object.
**How to avoid:** Build the chainable mock object once in a `beforeEach` and configure the terminal call per test.
**Warning signs:** `TypeError: ... is not a function` in test output.

### Pitfall 5: jest.setup.ts Not Loading Without setupFilesAfterEnv Fix
**What goes wrong:** `toBeInTheDocument` not found after installing `@testing-library/jest-dom` — tests fail with `expect(...).toBeInTheDocument is not a function`.
**Why it happens:** The `setupFilesAfterFramework` key in `jest.config.js` is silently ignored; `jest.setup.ts` never runs.
**How to avoid:** Fix the key to `setupFilesAfterEnv` as Wave 0 of the test plan.
**Warning signs:** All component test matchers fail even after installing `@testing-library/jest-dom`.

---

## Architecture Patterns

### TSX Conversion Pattern (Reference: EmployeeTable.tsx)

```typescript
// Source: src/features/employee-crud/components/EmployeeTable.tsx

// 1. Props interface above component
interface OrdersTableProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  hasFilters?: boolean;
}

// 2. Typed function component
function OrdersTable({ orders = [], onEdit, onDelete, hasFilters = false }: OrdersTableProps) {
  // ...
}

// 3. memo with type preserved
export default memo<OrdersTableProps>(OrdersTable);
```

### Service Test Pattern (Reference: employeeFormHelpers.test.ts style + Supabase mock)

```typescript
// Source: established pattern from existing tests + mock strategy
jest.mock('@/shared/api/supabase', () => {
  const chainMock = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),       // terminal — configure per test
    maybeSingle: jest.fn(),  // terminal — configure per test
  };
  return { supabase: chainMock };
});

import { supabase } from '@/shared/api/supabase';

describe('fetchOrders', () => {
  it('returns data on success', async () => {
    const mockOrders = [{ id: '1', order_number: 'P-001' }];
    (supabase.from('orders').select().order as jest.Mock).mockResolvedValue({
      data: mockOrders,
      error: null,
    });
    // ... assert
  });
});
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type for `children` prop | Custom recursive children type | `React.ReactNode` | Covers all valid React children |
| Memo with generic | `memo(Comp) as React.FC<Props>` | `memo<Props>(Comp)` | Preserves full type inference |
| Test chainable mock | Per-method mock factories | Shared `chainMock` pattern in `beforeEach` | Duplicated setup breaks on API changes |
| Import `addNotification` type | Inline `(msg: string, type?: string, duration?: number) => void` everywhere | Define `AddNotificationFn` in one shared types file | DRY — used in 5+ components |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `export default function Comp(props: any)` | `function Comp(props: CompProps)` | Full TypeScript checking |
| `setupFilesAfterFramework` (invalid) | `setupFilesAfterEnv` | jest.setup.ts actually runs |
| No jest/test deps in package.json | Add jest + testing-library | Tests can execute |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All test/build tasks | Yes | v20.20.2 | — |
| TypeScript (npx tsc) | TYPE-01, TYPE-02 verification | Yes | ^5.3.0 (in node_modules) | — |
| jest | TYPE-03 through TYPE-08 | No | Not in package.json | Must install via npm |
| @testing-library/react | Component tests | No | Not installed | Must install via npm |
| @testing-library/jest-dom | `toBeInTheDocument` matchers | No | Not installed | Must install via npm |
| identity-obj-proxy | CSS module mocking in jest | No | Not installed | Must install via npm |
| babel-jest | TS/TSX transpilation in tests | No | Not installed | Must install via npm |

**Missing dependencies blocking test execution:**
- `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `identity-obj-proxy`, `babel-jest`
- These must be added to `package.json` devDependencies in Wave 0 of the test plan (TYPE-03 task)
- CLAUDE.md requires "Ask before installing dependencies" — the plan must include an explicit install step that the executor confirms with the user

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (not yet installed — Wave 0 task) |
| Config file | `jest.config.js` (exists, has typo to fix) |
| Setup file | `jest.setup.ts` (imports jest-dom — works after key fix) |
| Quick run command | `npx jest --testPathPattern="src/__tests__" --passWithNoTests` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-03 | `setupFilesAfterEnv` key fix | manual (config edit) | `npm test` | ❌ Wave 0 |
| TYPE-04 | tasksService helper functions | unit | `npx jest src/__tests__/tasks/ -x` | ❌ Wave 0 |
| TYPE-05 | permitsService CRUD + shouldAutoClose | unit | `npx jest src/__tests__/permits/ -x` | ❌ Wave 0 |
| TYPE-06 | ordersService CRUD | unit | `npx jest src/__tests__/orders/ -x` | ❌ Wave 0 |
| TYPE-07 | prescriptionsService CRUD | unit | `npx jest src/__tests__/prescriptions/ -x` | ❌ Wave 0 |
| TYPE-08 | employee/lib.ts + permit/lib.ts helpers | unit | `npx jest src/__tests__/entities/ -x` | ❌ Wave 0 |
| TYPE-01 | TSX compiles without errors | typecheck | `npx tsc --noEmit` | ✅ (command exists) |
| TYPE-02 | No regression in converted components | manual browser test | N/A (manual) | N/A |

### Sampling Rate
- **Per task commit (conversions):** `npx tsc --noEmit` — must stay at 0 errors after each file converted
- **Per task commit (tests):** `npx jest src/__tests__/[feature]/ -x` — new tests must pass
- **Phase gate:** `npx tsc --noEmit` (0 errors) + `npm test` (all tests green) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Install jest + peer deps: `npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event identity-obj-proxy babel-jest`
- [ ] Fix `jest.config.js`: `setupFilesAfterFramework` → `setupFilesAfterEnv`
- [ ] `src/__tests__/tasks/tasksService.test.ts`
- [ ] `src/__tests__/permits/permitsService.test.ts`
- [ ] `src/__tests__/orders/ordersService.test.ts`
- [ ] `src/__tests__/prescriptions/prescriptionsService.test.ts`
- [ ] `src/__tests__/entities/employeeLib.test.ts`
- [ ] `src/__tests__/entities/permitLib.test.ts`

---

## Security Domain

This phase is a refactoring and test-coverage phase. It introduces no new data flows, authentication paths, or user-facing features.

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | No auth changes |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | No access control changes |
| V5 Input Validation | No | No new user inputs — existing form validation logic is copied, not changed |
| V6 Cryptography | No | No cryptographic operations |

**One preservation requirement:** Realtime channel name strings in `REALTIME_CHANNELS` constants must NOT be modified during conversion. [VERIFIED: CLAUDE.md explicit constraint]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Jest devDependencies install cleanly at latest compatible versions with React 18 | Environment Availability | Tests fail; need to pin specific versions |
| A2 | `memo<Props>(Component)` syntax preserves prop types in React 18 types | Risk Register | TypeScript errors on memo-wrapped exports; use `React.FC<Props>` cast instead |
| A3 | recharts v3 exports `TooltipProps` from `'recharts'` directly | Code Examples | TypeScript error; may need to import from recharts internal path |
| A4 | Supabase chained mock pattern covers all builder method chains used in services | Test Infrastructure | Tests throw TypeError on methods not mocked; add missing methods to chainMock |
| A5 | `AddNotificationFn` type can be inlined per component without importing from `app/` layer | Architecture Patterns | No risk — inline type definition is always safe |

---

## Open Questions

1. **jest dependency installation requires user confirmation (CLAUDE.md "Ask before installing dependencies")**
   - What we know: jest and all test peer deps are absent from package.json
   - What's unclear: Whether the user has already pre-approved installation as part of Phase 2 scope, or whether each `npm install` still requires confirmation during execution
   - Recommendation: The plan should include an explicit "confirm with user before running npm install" gate

2. **recharts TooltipProps exact import path for v3**
   - What we know: recharts is at ^3.8.1; `PermitsDashboard.jsx` uses a custom tooltip
   - What's unclear: Whether `TooltipProps` exports directly from `'recharts'` in v3 or requires a subpath import
   - Recommendation: Check `import type { TooltipProps } from 'recharts'` first; fall back to `recharts/types/...` if needed

3. **`AddNotificationFn` — shared type location**
   - What we know: 5+ components accept `addNotification` as a prop; currently untyped
   - What's unclear: Whether to define the type once in `src/shared/types/notifications.ts` (new file) or inline it in each converting file
   - Recommendation: Inline for now to avoid introducing a new shared file as a side effect of conversion; FSD allows inlining types within a feature slice

---

## Recommended Plan Breakdown

### Plan A: Jest Infrastructure (TYPE-03)
**Scope:** Fix `jest.config.js` typo + install jest devDependencies + verify 3 existing tests pass
**Files:** `jest.config.js`, `package.json`
**Verification:** `npm test` exits 0 with all 25 existing tests green
**Prerequisite for:** All test plans

### Plan B: Entity Lib Tests (TYPE-08)
**Scope:** Write tests for `employee/lib.ts` (4 functions) and `permit/lib.ts` (11 exported functions)
**Files:** `src/__tests__/entities/employeeLib.test.ts`, `src/__tests__/entities/permitLib.test.ts`
**No mocking required** — all pure functions
**Can run immediately after Plan A**

### Plan C: Service Tests — Orders + Prescriptions (TYPE-06, TYPE-07)
**Scope:** Write Supabase-mocked tests for `ordersService.ts` and `prescriptionsService.ts`
**Files:** `src/__tests__/orders/ordersService.test.ts`, `src/__tests__/prescriptions/prescriptionsService.test.ts`
**Establish the chainMock pattern here** — simpler services, no retry logic

### Plan D: Service Tests — Permits + Tasks (TYPE-04, TYPE-05)
**Scope:** Write Supabase-mocked tests for `permitsService.ts` (retry logic, FK cleanup) and `tasksService.ts` (UUID normalization, stats calc)
**Files:** `src/__tests__/permits/permitsService.test.ts`, `src/__tests__/tasks/tasksService.test.ts`
**More complex** — relies on chainMock pattern from Plan C

### Plan E: JSX Conversion — Wave 1 + 2 (TYPE-01, TYPE-02 partial)
**Scope:** Convert 11 leaf/form files (WorkerTrainingDownloadButton through PrescriptionForm per conversion order above)
**Verification:** `npx tsc --noEmit` after each file; 0 errors throughout
**No barrel changes needed**; update explicit `.jsx` extensions in PrescriptionForm

### Plan F: JSX Conversion — Wave 3 Registries (TYPE-01, TYPE-02 complete)
**Scope:** Convert 5 remaining files (PermitsDashboard, PermitsRegistry, OrdersRegistry, PrescriptionsRegistry, OrganizationTelegramReport)
**Update:** Remove `.jsx` extensions from imports in PrescriptionsRegistry
**Verification:** `npx tsc --noEmit` after each file + full browser smoke test of each registry page

---

## Sources

### Primary (HIGH confidence)
- `jest.config.js` in project root — typo identified by direct inspection [VERIFIED]
- All 16 `.jsx` files — read directly, props catalogued [VERIFIED]
- `src/features/tasks/services/tasksService.ts` — function inventory [VERIFIED]
- `src/features/permits/services/permitsService.ts` — function inventory [VERIFIED]
- `src/features/orders/services/ordersService.ts` — function inventory [VERIFIED]
- `src/features/prescriptions/services/prescriptionsService.ts` — function inventory [VERIFIED]
- `src/entities/employee/lib.ts` — all pure functions listed [VERIFIED]
- `src/entities/permit/lib.ts` — all exported functions listed [VERIFIED]
- All four `components/index.ts` barrel files — extension-free imports confirmed [VERIFIED]
- `grep -rn "from.*\.jsx"` — explicit extension imports found in 3 locations [VERIFIED]
- `tsconfig.json` — `moduleResolution: "bundler"` confirmed [VERIFIED]
- [jestjs.io/docs/configuration](https://jestjs.io/docs/configuration) — `setupFilesAfterEnv` is the correct key [CITED]

### Secondary (MEDIUM confidence)
- `.planning/codebase/TESTING.md` — test gap inventory, jest dependency status [CITED: project planning docs]
- `.planning/codebase/CONCERNS.md` — FSD violation history (resolved in Phase 1) [CITED]

### Tertiary (LOW confidence / ASSUMED)
- `memo<Props>` generic pattern in React 18 types [ASSUMED: standard React TypeScript pattern]
- recharts v3 `TooltipProps` export path [ASSUMED: verify during implementation]

---

## Metadata

**Confidence breakdown:**
- JSX inventory: HIGH — all 16 files read directly, line counts and props catalogued
- Test infrastructure state: HIGH — jest.config.js read directly, correct key verified via official docs
- Testable functions: HIGH — all service files read in full
- Entity helpers: HIGH — both lib.ts files read in full
- Barrel export impact: HIGH — all four index.ts files read, grep verified
- Conversion order: HIGH — dependency graph derived from actual imports
- Risk register: MEDIUM — TypeScript specifics (recharts types, memo generics) are ASSUMED

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (stable domain; Jest and React 18 APIs are not fast-moving)
