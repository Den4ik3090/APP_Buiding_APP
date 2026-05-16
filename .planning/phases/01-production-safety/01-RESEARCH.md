# Phase 1: Production Safety — Research

**Researched:** 2026-05-16
**Domain:** React 18 SPA production hardening (Sentry, FSD, ExcelJS, DB migration)
**Confidence:** HIGH — all findings verified by reading actual source files and npm registry

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Remove the degraded fallback path in `employeesService.ts` entirely after column is confirmed present. Do NOT patch `console.warn` stripping — fix the root cause. SQL must add `is_dismissed boolean NOT NULL DEFAULT false`.
- **D-02:** Do NOT change `webpack.config.js`. Once fallback is removed, no meaningful warning remains to strip.
- **D-03:** Install `@sentry/react` (ask user before npm install). Edit `src/app/sentry.ts` — do not create a new module. Wire `REACT_APP_SENTRY_DSN`. `ErrorBoundary` must call `Sentry.captureException`. Add `window.addEventListener('unhandledrejection', ...)`.
- **D-04:** Three JSX files must lose their direct `supabase` import. Realtime channel name strings preserved character-for-character. Components remain `.jsx` — no TypeScript conversion. New service functions follow `src/features/tasks/services/tasksService.ts` pattern.
- **D-05:** Replace `xlsx` with `exceljs`. Ask user before npm install/uninstall. Edit `AdditionalTrainingsManager.tsx` dynamic import. Output must be valid `.xlsx`. Do not change trigger, file naming, or UX.

### Claude's Discretion

- Order of sub-tasks within the phase
- Whether to group Sentry init + ErrorBoundary into one task or split
- Exact ExcelJS API translation
- Whether to add `REACT_APP_SENTRY_DSN` to `.env.example` or just document it

### Deferred Ideas (OUT OF SCOPE)

- Converting registry `.jsx` files to `.tsx` — Phase 2
- Adding unit tests for refactored service functions — Phase 2
- OrganizationManager TanStack Query migration — Phase 3
- Removing `@coreui/*` dead packages — Phase 4
- Any new UI or user-visible behavior changes
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROD-01 | `is_dismissed` column exists; `employeesService.ts` removes degraded fallback | SQL migration + before/after code diff documented below |
| PROD-02 | Production builds do not silently suppress `console.warn` for degraded-mode | Resolved by PROD-01: fallback path deleted, warning disappears with it |
| PROD-03 | `src/app/sentry.ts` initializes Sentry with real DSN — `Sentry.init` active | Sentry v10 init API documented; stub shape is compatible |
| PROD-04 | Unhandled React errors caught by `ErrorBoundary` reported to Sentry | `componentDidCatch` hook location identified in `ErrorBoundary.tsx` |
| PROD-05 | Runtime JS errors (unhandled promise rejections, uncaught exceptions) captured | `globalHandlersIntegration` is automatic; `unhandledrejection` listener location in `index.js` identified |
| PROD-06 | `OrdersRegistry.jsx` no longer imports `supabase` directly | Realtime subscription pattern extracted; channel name `orders_registry_changes` confirmed |
| PROD-07 | `PermitsRegistry.jsx` no longer imports `supabase` directly (Realtime included) | Channel name `permits_changes` confirmed; service function pattern documented |
| PROD-08 | `PrescriptionsRegistry.jsx` no longer imports `supabase` directly (Realtime included) | Channel name `prescriptions_registry_changes` confirmed; service function pattern documented |
| PROD-09 | `xlsx` removed from `package.json`, replaced with `exceljs` | Current xlsx usage pattern fully documented; ExcelJS equivalents specified |
| PROD-10 | `additional-trainings` xlsx export continues to work after ExcelJS migration | Exact API translation with `writeBuffer()` async pattern documented |
</phase_requirements>

---

## Summary

Phase 1 addresses four independent production risks in the PUTEVI Safety SPA. Each risk can be implemented as a standalone sub-task with no cross-dependency except that PROD-01 and PROD-02 are coupled (removing the fallback eliminates the console.warn problem automatically).

The research confirms all four areas have clear, non-ambiguous implementation paths. The codebase is already well-structured for the changes: service files exist for all three registries, the Sentry stub has the right shape, the ExcelJS API has a direct equivalent for every xlsx call used, and the DB migration SQL is a single statement.

**Primary recommendation:** Implement in order 1a (is_dismissed), 1b (Sentry), 1c (FSD refactor, three files), 1d (ExcelJS) — each is independently verifiable.

---

## ExcelJS Migration

### Current xlsx Usage Pattern (from AdditionalTrainingsManager.tsx)

The xlsx export is in `handleExportExcel` (lines 260–309). The exact current pattern is:

```typescript
// CURRENT (xlsx 0.18.5) — lines 261-309
const XLSX = await import("xlsx");           // dynamic import

// 1. Build rows array (plain objects with Russian-named keys)
const rows = analytics.filtered.map((t) => ({ "ФИО сотрудника": t.employeeName, ... }));

// 2. Create worksheet from JSON
const worksheet = XLSX.utils.json_to_sheet(rows);

// 3. Set column widths
worksheet["!cols"] = [{ wch: 28 }, { wch: 22 }, ...];

// 4. Create workbook and append sheet
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Обучения");

// 5. Write synchronously → ArrayBuffer
const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

// 6. Blob → file-saver
const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
saveAs(blob, `additional-trainings-${today}.xlsx`);
```

Key observations:
- Dynamic import (`await import("xlsx")`) — ExcelJS uses the same dynamic import pattern
- Column widths set via `worksheet["!cols"]` — ExcelJS uses `worksheet.columns` with `width` property
- Synchronous `XLSX.write` returns ArrayBuffer — ExcelJS uses async `workbook.xlsx.writeBuffer()` returning Promise<Buffer>
- `file-saver` is already in `dependencies` and stays — the Blob+saveAs pattern is preserved

### ExcelJS v4.4.0 Equivalent API [VERIFIED: npm registry]

```typescript
// NEW (exceljs 4.4.0) — replace handleExportExcel body
const ExcelJS = await import("exceljs");     // dynamic import — same pattern

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Обучения");

// Set column headers + widths in one step (ExcelJS requires header definition)
worksheet.columns = [
  { header: "ФИО сотрудника",        key: "name",        width: 28 },
  { header: "Организация",            key: "org",         width: 22 },
  { header: "Профессия",              key: "prof",        width: 22 },
  { header: "Тип обучения",           key: "type",        width: 30 },
  { header: "Дата получения",         key: "date",        width: 18 },
  { header: "Срок действия (мес.)",   key: "expiry",      width: 20 },
  { header: "Часы",                   key: "hours",       width: 12 },
  { header: "Статус",                 key: "status",      width: 18 },
  { header: "Сертификат",             key: "cert",        width: 40 },
];

// Add rows using the key names defined above
analytics.filtered.forEach((t) => {
  worksheet.addRow({
    name:   t.employeeName,
    org:    t.organization,
    prof:   t.profession,
    type:   t.type,
    date:   t.dateReceived ? new Date(t.dateReceived).toLocaleDateString("ru-RU") : "—",
    expiry: t.expiryMonths || "—",
    hours:  t.hours || "—",
    status: t.expired ? "Просрочено" : "Действительно",
    cert:   t.certificate || "",
  });
});

// Async buffer write — key difference from xlsx
const buffer = await workbook.xlsx.writeBuffer();          // returns Promise<ArrayBuffer>

const blob = new Blob([buffer], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
});
const today = new Date().toISOString().slice(0, 10);
saveAs(blob, `additional-trainings-${today}.xlsx`);
```

### Critical API Differences

| xlsx 0.18.5 | ExcelJS 4.4.0 | Note |
|-------------|---------------|------|
| `XLSX.utils.json_to_sheet(rows)` | `workbook.addWorksheet()` + `worksheet.columns` + `worksheet.addRow()` | ExcelJS is OOP, not utility functions |
| `worksheet["!cols"] = [{wch: N}]` | `worksheet.columns = [{width: N}]` | Different property name and location |
| `XLSX.write(wb, {type:"array"})` | `await workbook.xlsx.writeBuffer()` | Async — `handleExportExcel` is already `async`, no signature change |
| `XLSX.utils.book_new()` | `new ExcelJS.Workbook()` | Constructor |
| `XLSX.utils.book_append_sheet(wb, ws, name)` | `workbook.addWorksheet(name)` returns worksheet | Sheet name is set at creation |

### Import Change

```typescript
// BEFORE
const XLSX = await import("xlsx");

// AFTER
const ExcelJS = await import("exceljs");
```

The `handleExportExcel` function is already `async` — `writeBuffer()` just adds an `await` inside it. The function signature and the button's `onClick` handler do not change. [VERIFIED: reading AdditionalTrainingsManager.tsx lines 260-309]

---

## Sentry v8 React Setup

### Version Decision

The npm registry shows `@sentry/react` latest is **v10.53.1** [VERIFIED: npm view]. The CONTEXT.md says "v8+ has a different init API" — v10 is the current `latest` tag and is the recommended install. The init API is the same shape from v8 through v10. Install `@sentry/react@latest` (v10.53.1). It supports React 18 via peer dependency `react: '^16.14.0 || 17.x || 18.x || 19.x'`. [VERIFIED: npm view]

### Existing Stub Shape (src/app/sentry.ts) [VERIFIED: reading source]

The existing stub (lines 7-24) is already commented with the correct v7/v8 shape:
- `Sentry.init({ dsn, environment, tracesSampleRate, beforeSend })` — this shape is valid in v10
- The `initSentry()` function export exists and is already called from `src/index.js` line 8

**No structural rewrite needed** — just uncomment the block and add `integrations`.

### Correct Sentry.init for v10 (activating the stub)

```typescript
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return; // skip in dev if DSN not set

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,          // 0 = no performance tracing; errors still captured
    // Replay and BrowserTracing are NOT added — this is error-only monitoring
    beforeSend(event) {
      if (event.user) delete event.user.email;
      return event;
    },
  });
}
```

**Why no integrations array:** `globalHandlersIntegration` (catches `onerror` + `onunhandledrejection`) is one of the 9 default auto-enabled integrations. [VERIFIED: docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/] No explicit registration needed.

**Why no Replay/BrowserTracing:** These are out of scope for this phase (v2 requirements). Not adding them keeps bundle impact minimal.

### ErrorBoundary Wiring (src/shared/ui/ErrorBoundary/ErrorBoundary.tsx) [VERIFIED: reading source]

The existing `ErrorBoundary` is at `src/shared/ui/ErrorBoundary/ErrorBoundary.tsx`. It already has `componentDidCatch(error, info)` on line 27 — currently it only calls `console.error`. The change is to add `Sentry.captureException` there.

```typescript
// BEFORE (ErrorBoundary.tsx line 27-30)
componentDidCatch(error: Error, info: React.ErrorInfo): void {
  console.error("[ErrorBoundary] Caught error:", error);
  console.error("[ErrorBoundary] Component stack:", info.componentStack);
}

// AFTER
componentDidCatch(error: Error, info: React.ErrorInfo): void {
  console.error("[ErrorBoundary] Caught error:", error);
  console.error("[ErrorBoundary] Component stack:", info.componentStack);
  // Dynamic import avoids bundling Sentry in dev when DSN is not set
  import('@/app/sentry').then(({ captureSentryException }) => {
    captureSentryException(error, { componentStack: info.componentStack ?? '' });
  });
}
```

**Simpler alternative:** Export a thin wrapper from `src/app/sentry.ts`:

```typescript
// Add to sentry.ts:
export function captureSentryException(error: Error, context?: Record<string, string>): void {
  try {
    // Only calls Sentry if it was initialized
    import('@sentry/react').then((Sentry) => Sentry.captureException(error, { extra: context }));
  } catch { /* noop if Sentry not loaded */ }
}
```

This keeps the `ErrorBoundary` free of a direct `@sentry/react` import and lets sentry.ts be the single point of contact. [ASSUMED — this is a design choice; the planner may choose direct import instead]

### Unhandled Rejection Capture

Per the Sentry docs, `globalHandlersIntegration` auto-captures `window.onerror` and `window.onunhandledrejection`. [VERIFIED: docs.sentry.io] **No manual listener needed for Sentry's own capture.**

However, CONTEXT.md D-03 explicitly requires: *"Add `window.addEventListener('unhandledrejection', ...)`"*. This listener should be added in `src/app/sentry.ts` as belt-and-suspenders:

```typescript
// Add inside initSentry(), after Sentry.init():
window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});
```

**Note:** `src/index.js` already has a `window.addEventListener('unhandledrejection', ...)` listener (lines 31-37) — it only handles HMR chunk errors and calls `e.preventDefault()` for those. The Sentry listener is a separate concern and will not conflict. [VERIFIED: reading src/index.js]

### CRITICAL: webpack DefinePlugin Gap [VERIFIED: reading webpack.config.js]

The `webpack.config.js` `DefinePlugin` only exposes two vars:
```js
"process.env.REACT_APP_SUPABASE_URL": JSON.stringify(process.env.REACT_APP_SUPABASE_URL),
"process.env.REACT_APP_SUPABASE_KEY": JSON.stringify(process.env.REACT_APP_SUPABASE_KEY),
```

`REACT_APP_SENTRY_DSN` is **not** in the `DefinePlugin`. Without adding it, `process.env.REACT_APP_SENTRY_DSN` will be `undefined` at runtime even if set in `.env`. The implementation must add this line to `DefinePlugin`:

```js
"process.env.REACT_APP_SENTRY_DSN": JSON.stringify(process.env.REACT_APP_SENTRY_DSN),
```

**This is NOT a violation of D-02** — D-02 says "Do NOT change the webpack config" to avoid fighting `drop_console`. Adding a new env var to DefinePlugin is a different concern and is required for Sentry DSN to work.

### DSN Exposure Note

`REACT_APP_SENTRY_DSN` will be embedded in the production bundle (it's a public DSN by design — Sentry DSNs are always public). This is standard practice and not a security risk: the DSN only allows sending error events to the project, not reading them. Rate limiting and project auth protect the backend. [CITED: docs.sentry.io — "Your DSN is safe to expose publicly"]

### .env.example Update

Add `REACT_APP_SENTRY_DSN=` to `.env.example` so future developers know to set it. [ASSUMED: Claude's Discretion per CONTEXT.md]

---

## Supabase Realtime Service Pattern

### Channel Names (verified from source) [VERIFIED: reading realtimeChannels.ts and all three JSX files]

```typescript
// src/shared/constants/realtimeChannels.ts — must be preserved verbatim
export const REALTIME_CHANNELS = {
  PERMITS:       'permits_changes',
  PRESCRIPTIONS: 'prescriptions_registry_changes',
  ORDERS:        'orders_registry_changes',
} as const;
```

All three registry JSX files import from this constant — the service functions must use the same constant (not hardcode strings).

### Current Direct supabase Usage in Each Registry [VERIFIED: reading source files]

**OrdersRegistry.jsx** (lines 53-68): One Realtime subscription only. No direct query calls (queries go through `useOrdersQuery`, `useOrderEmployeesQuery`).

**PermitsRegistry.jsx** (lines 63-78): One Realtime subscription only. No direct query calls.

**PrescriptionsRegistry.jsx** (lines 58-73): One Realtime subscription only. No direct query calls.

All three follow identical pattern:
```javascript
useEffect(() => {
  const subscription = supabase
    .channel(REALTIME_CHANNELS.ORDERS)  // or PERMITS/PRESCRIPTIONS
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    })
    .subscribe();

  return () => { subscription.unsubscribe(); };
}, [queryClient]);
```

### Service Function Pattern for Realtime

The service function must return the channel object so the component can call `.unsubscribe()` in cleanup. Pattern (follows tasksService.ts style — pure function, supabase import at top, typed):

```typescript
// Add to ordersService.ts
import { REALTIME_CHANNELS } from '@/shared/constants/realtimeChannels';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToOrders(onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel(REALTIME_CHANNELS.ORDERS)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onUpdate)
    .subscribe();
}
```

```typescript
// Add to permitsService.ts
export function subscribeToPermits(onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel(REALTIME_CHANNELS.PERMITS)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'permits' }, onUpdate)
    .subscribe();
}
```

```typescript
// Add to prescriptionsService.ts
export function subscribeToPrescriptions(onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel(REALTIME_CHANNELS.PRESCRIPTIONS)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, onUpdate)
    .subscribe();
}
```

### Component useEffect After Refactor

```javascript
// In OrdersRegistry.jsx (replaces lines 53-68):
import { subscribeToOrders } from '@/features/orders/services/ordersService';
// (remove: import { supabase } from "@/shared/api/supabase")

useEffect(() => {
  const channel = subscribeToOrders(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  });
  return () => { channel.unsubscribe(); };
}, [queryClient]);
```

Same pattern for permits and prescriptions with their respective service functions.

### Why the service function takes a callback (not queryClient)

The service layer must be pure: no React context, no TanStack Query dependency. The `onUpdate` callback keeps the service decoupled. The component passes the invalidation logic in. This matches the tasksService pattern (pure async functions, caller decides what to do with results). [VERIFIED: reading tasksService.ts]

### Import to Remove from Each JSX File

```javascript
// DELETE this line from all three files:
import { supabase } from "@/shared/api/supabase";
```

After removal, verify no other `supabase` usage exists in those files. [VERIFIED: reading source — no direct supabase calls other than the channel subscription in all three files]

### RealtimeChannel type import

`RealtimeChannel` is exported from `@supabase/supabase-js` — already in `dependencies`. No new package needed. The service files are `.ts` so they can use the type import.

---

## is_dismissed Migration

### Exact SQL Migration

```sql
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_dismissed boolean NOT NULL DEFAULT false;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
```

`IF NOT EXISTS` makes it safe to run twice. `DEFAULT false` ensures existing rows get `false` (active employees). `dismissed_at` is nullable (no default needed — null means never dismissed).

### Where the Fallback Lives [VERIFIED: reading employeesService.ts]

Two functions have fallback paths:

**1. `fetchEmployees()` (lines 106-137)** — The primary path tries `FIELDS` (includes `is_dismissed`) with `.eq('is_dismissed', false)`. If that errors (not timeout), it falls back to `FIELDS_BASE` (no filter). The fallback block is lines 128-136.

**2. `fetchOrganizations()` (lines 165-178)** — Primary tries `.eq('is_dismissed', false)`. Fallback (lines 176-178) runs unfiltered if primary errors.

### Exact Code Change — fetchEmployees [VERIFIED: reading source]

```typescript
// BEFORE (lines 106-137):
export async function fetchEmployees(): Promise<Employee[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 30000)
  );

  const primary = supabase
    .from('employees')
    .select(FIELDS)
    .eq('is_dismissed', false)
    .order('name', { ascending: true });

  const primaryResult = await Promise.race([primary, timeout]);

  if (!primaryResult.error) {
    return resolvePhotoUrls(formatDataForApp((primaryResult.data ?? []) as unknown as DbRow[]));
  }

  if (primaryResult.error.message === 'timeout') {
    throw primaryResult.error;
  }

  // Degraded mode: migration not yet applied — load all rows without dismissed filter.
  console.warn('[fetchEmployees] Degraded mode: is_dismissed column missing. Run migration: ...');
  const { data: fallback, error: fbErr } = await supabase
    .from('employees')
    .select(FIELDS_BASE)
    .order('name', { ascending: true });
  if (fbErr) throw fbErr;
  return resolvePhotoUrls(formatDataForApp((fallback ?? []) as DbRow[]));
}

// AFTER (remove fallback, keep timeout guard):
export async function fetchEmployees(): Promise<Employee[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 30000)
  );

  const primary = supabase
    .from('employees')
    .select(FIELDS)
    .eq('is_dismissed', false)
    .order('name', { ascending: true });

  const primaryResult = await Promise.race([primary, timeout]);

  if (primaryResult.error) throw primaryResult.error;
  return resolvePhotoUrls(formatDataForApp((primaryResult.data ?? []) as unknown as DbRow[]));
}
```

### Exact Code Change — fetchOrganizations [VERIFIED: reading source]

```typescript
// BEFORE (lines 165-178):
export async function fetchOrganizations(): Promise<string[]> {
  const toNames = (rows: { organization: unknown }[]) =>
    [...new Set(rows.map((i) => i.organization).filter(Boolean))].sort() as string[];

  const { data, error } = await supabase
    .from('employees')
    .select('organization')
    .eq('is_dismissed', false);

  if (!error && data) return toNames(data);

  const { data: fallback } = await supabase.from('employees').select('organization');
  return fallback ? toNames(fallback) : [];
}

// AFTER:
export async function fetchOrganizations(): Promise<string[]> {
  const toNames = (rows: { organization: unknown }[]) =>
    [...new Set(rows.map((i) => i.organization).filter(Boolean))].sort() as string[];

  const { data, error } = await supabase
    .from('employees')
    .select('organization')
    .eq('is_dismissed', false);

  if (error) throw new Error(error.message);
  return toNames(data ?? []);
}
```

### Constants Cleanup

After the migration is confirmed, `FIELDS_BASE` is still used by `createEmployee`, `updateEmployee`, and `retrainEmployee` (they select only `FIELDS_BASE` for write-back). Do NOT remove `FIELDS_BASE` — it remains valid. Only `FIELDS_BASE` usage in the fallback paths (now deleted) goes away.

The comment block at lines 6-8 can be cleaned up to remove the "requires migration" note. [VERIFIED: reading source lines 6-8]

---

## Validation Architecture

### Test Framework [VERIFIED: reading package.json]

| Property | Value |
|----------|-------|
| Framework | Jest (via `npm test`) |
| Config file | `jest.config.js` (existing) |
| Quick run | `npm test -- --testPathPattern=<file>` |
| Full suite | `npm test` |
| TypeCheck | `npx tsc --noEmit` (must stay at 0 errors) |

### Per Sub-task Verification

**Sub-task 1a — is_dismissed migration**
```bash
# Verify fallback lines are gone from service:
grep -n "Degraded mode\|FIELDS_BASE.*fallback\|console.warn.*is_dismissed" \
  src/features/employee-crud/services/employeesService.ts
# Expected: no output

# TypeCheck:
npx tsc --noEmit
# Expected: 0 errors

# Manual: load app → employee list loads without error → dismissed employees absent
```

**Sub-task 1b — Sentry activation**
```bash
# Verify initSentry is no longer a no-op:
grep -n "no-op\|// no-op" src/app/sentry.ts
# Expected: no output

# Verify DefinePlugin includes DSN:
grep -n "REACT_APP_SENTRY_DSN" webpack.config.js
# Expected: one match

# Verify .env.example has the key:
grep "SENTRY" .env.example

# TypeCheck:
npx tsc --noEmit

# Manual: open browser console, confirm no Sentry init error.
# Confirm ErrorBoundary triggers Sentry: temporarily throw in a component, check Sentry dashboard.
```

**Sub-task 1c — FSD registry refactor (three files)**
```bash
# Verify no direct supabase import in registry components:
grep -rn "from.*@/shared/api/supabase" \
  src/features/orders/components/OrdersRegistry.jsx \
  src/features/permits/components/PermitsRegistry.jsx \
  src/features/prescriptions/components/PrescriptionsRegistry.jsx
# Expected: no output

# Verify subscribe functions exist in service files:
grep -n "subscribeToOrders\|subscribeToPermits\|subscribeToPrescriptions" \
  src/features/orders/services/ordersService.ts \
  src/features/permits/services/permitsService.ts \
  src/features/prescriptions/services/prescriptionsService.ts

# Verify channel names unchanged:
grep -n "orders_registry_changes\|permits_changes\|prescriptions_registry_changes" \
  src/features/orders/services/ordersService.ts \
  src/features/permits/services/permitsService.ts \
  src/features/prescriptions/services/prescriptionsService.ts

# TypeCheck:
npx tsc --noEmit

# Manual: navigate to Orders, Permits, Prescriptions pages.
# Create/edit a record in another tab — confirm Realtime still updates the list.
```

**Sub-task 1d — ExcelJS migration**
```bash
# Verify xlsx is removed:
grep '"xlsx"' package.json
# Expected: no output

# Verify exceljs is present:
grep '"exceljs"' package.json
# Expected: one match

# Verify no xlsx import remains:
grep -rn "from.*xlsx\|import.*xlsx\|require.*xlsx" src/
# Expected: no output

# TypeCheck:
npx tsc --noEmit

# Manual: open Additional Trainings page → click "Экспорт Excel"
# Verify: file downloads, opens in Excel/LibreOffice, 9 columns with Russian headers,
# data matches the filtered view.
```

### Phase Gate

All four sub-tasks complete when:
1. `npx tsc --noEmit` exits 0
2. All four grep checks pass
3. Manual smoke: employees load, Realtime works on orders/permits/prescriptions, Excel export downloads valid file
4. No `as any` introduced (current count: 0, must remain 0)

---

## Security Threat Model

### ASVS L1 Categories for This Phase

| ASVS Category | Applies | Assessment |
|---------------|---------|------------|
| V2 Authentication | No | Phase does not touch auth |
| V3 Session Management | No | Phase does not touch session |
| V4 Access Control | Partial | Realtime subscriptions moved to service layer — no RLS change |
| V5 Input Validation | No | No new user input surfaces |
| V6 Cryptography | No | No crypto changes |
| V2.4 Error Handling | Yes | Sentry activation is the primary concern |

### Threat Analysis

**T-01: Sentry DSN exposure in bundle (V2.4 / Information Leakage)**
- Risk: `REACT_APP_SENTRY_DSN` is embedded in the production JS bundle. Anyone who downloads the bundle can extract it.
- Severity: LOW — Sentry DSNs are intentionally public. They allow only event ingestion, not data exfiltration. Sentry provides rate limiting and inbound filter controls per-project.
- Mitigation: Standard practice. No action needed beyond the CONTEXT.md requirement to strip PII via `beforeSend`.
- PII stripping: The existing stub already has `if (event.user) delete event.user.email` — preserve this.

**T-02: Error event PII leakage to Sentry (V2.4 / Data Exposure)**
- Risk: Stack traces or breadcrumbs could contain employee names or other personal data.
- Severity: MEDIUM — this is a single-operator app (AO PUTEVI internal tool), not a multi-tenant SaaS.
- Mitigation: `beforeSend` hook strips `event.user.email`. The planner should note this is in place. For this phase, no additional scrubbing is needed per CONTEXT.md scope.

**T-03: Realtime subscription moved to service layer (V4 Access Control)**
- Risk: Moving `supabase.channel(...)` from component to service — does this change auth context?
- Assessment: No. The Supabase client is a singleton from `@/shared/api/supabase`. The channel is created with the same authenticated client session regardless of where in the codebase it is called. RLS policies apply at the DB level, not the channel creation point.
- Conclusion: The FSD refactor is security-neutral. [VERIFIED: Supabase client is singleton per CLAUDE.md]

**T-04: ExcelJS supply chain (xlsx CVE replacement)**
- The `xlsx` package (SheetJS CE) has known CVEs and is no longer maintained by the original author. The last npm release was 0.18.5 in 2023. [CITED: npmjs.com/package/xlsx — no updates since 2023]
- `exceljs` 4.4.0 is actively maintained (latest release verified via npm view). [VERIFIED: npm registry]
- ExcelJS does not evaluate formulas from untrusted input — this SPA only writes, never reads user-supplied xlsx files. The export path (`writeBuffer`) is write-only, so there is no formula injection surface.
- Conclusion: ExcelJS migration eliminates the supply-chain risk. No new attack surface introduced.

**T-05: drop_console strips console.warn in production (V2.4 / Silent Failure)**
- Current risk: The `fetchEmployees` degraded-mode `console.warn` is stripped by webpack Terser `drop_console: true` in production. So the warning never surfaces in production, leading to a silent degraded mode.
- Resolution: PROD-01 removes the fallback path entirely. Once done, there is no warning to strip, and this threat disappears. PROD-02 is a direct consequence of PROD-01.
- Webpack config does not change (D-02 locked).

---

## Standard Stack for This Phase

| Package | Current Version | Action | Why |
|---------|----------------|--------|-----|
| `xlsx` | 0.18.5 | Remove | Abandoned, CVE |
| `exceljs` | 4.4.0 (latest) | Install | Actively maintained, full xlsx write support |
| `@sentry/react` | Not installed | Install | Error monitoring; v10.53.1 is current latest |

```bash
# User must approve before running:
npm uninstall xlsx
npm install exceljs @sentry/react
```

---

## Architecture Patterns

### Realtime Service Function Pattern (new pattern this phase)

All three service files follow the same shape:

```typescript
// Return type: RealtimeChannel (from @supabase/supabase-js)
// Caller is responsible for calling .unsubscribe() on cleanup
export function subscribeToXxx(onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel(REALTIME_CHANNELS.XXX)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'xxx' }, onUpdate)
    .subscribe();
}
```

This is a new pattern (not present in tasksService.ts) but is the minimal change that removes the FSD violation while preserving the Realtime behavior.

### Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Excel export | Custom CSV/binary writer | ExcelJS `workbook.xlsx.writeBuffer()` |
| Error monitoring | Custom error handler + logging | Sentry (already has ErrorBoundary, globalHandlers, breadcrumbs) |
| Realtime subscriptions | Polling | Supabase Realtime (already used — just move to service layer) |

---

## Open Questions

1. **Sentry DSN availability**
   - What we know: The DSN must come from environment. The stub already checks `if (!dsn) return`.
   - What's unclear: The user may not have a Sentry project yet. The plan should note that PROD-03 requires the user to create a Sentry project and provide the DSN — without it, `initSentry()` remains a no-op even after code changes.
   - Recommendation: Plan step should explicitly say "user must provide DSN before verifying PROD-03 in production."

2. **DB migration execution**
   - What we know: The SQL is straightforward. Supabase supports running migrations via Dashboard SQL editor or Supabase CLI.
   - What's unclear: Whether the `is_dismissed` column already exists in the production DB (the fallback code suggests it doesn't yet, but may have been added since).
   - Recommendation: Plan step should say "verify column exists with `SELECT column_name FROM information_schema.columns WHERE table_name='employees' AND column_name='is_dismissed'` before removing fallback."

3. **ExcelJS TypeScript types**
   - What we know: ExcelJS ships its own types in the package (`exceljs/index.d.ts`).
   - What's unclear: Whether `import('exceljs')` with a dynamic import needs type annotation to avoid `any`.
   - Recommendation: Use `const ExcelJS = await import('exceljs')` — TypeScript will infer the module type automatically from the package's bundled declarations. No `as any` needed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding `REACT_APP_SENTRY_DSN` to DefinePlugin is not prohibited by D-02 | Sentry / webpack | If user considers this a webpack config change, must find another approach (e.g., Babel plugin) |
| A2 | ExcelJS dynamic import (`await import('exceljs')`) works with webpack 5 code splitting | ExcelJS Migration | If webpack can't split exceljs chunk, bundle size increases; fix: add `/* webpackChunkName: "exceljs" */` comment |
| A3 | `captureSentryException` wrapper in sentry.ts is preferred over direct `@sentry/react` import in ErrorBoundary | Sentry ErrorBoundary | Both approaches work; this is a style preference |

---

## Sources

### Primary (HIGH confidence)
- `src/features/employee-crud/services/employeesService.ts` — exact fallback code verified
- `src/app/sentry.ts` — existing stub structure verified
- `src/shared/ui/ErrorBoundary/ErrorBoundary.tsx` — componentDidCatch location verified
- `src/features/orders/components/OrdersRegistry.jsx` — supabase usage pattern verified
- `src/features/permits/components/PermitsRegistry.jsx` — supabase usage + channel name verified
- `src/features/prescriptions/components/PrescriptionsRegistry.jsx` — supabase usage + channel name verified
- `src/shared/constants/realtimeChannels.ts` — channel name strings verified
- `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx` — xlsx API calls verified
- `src/index.js` — initSentry call location and existing unhandledrejection listener verified
- `webpack.config.js` — DefinePlugin scope verified (SENTRY_DSN not present)
- `package.json` — current dependencies verified
- npm registry (`npm view exceljs version`) — ExcelJS 4.4.0 is current latest [VERIFIED]
- npm registry (`npm view @sentry/react`) — v10.53.1 is current latest, supports React 18 [VERIFIED]

### Secondary (MEDIUM confidence)
- docs.sentry.io/platforms/javascript/guides/react/ — Sentry.init API shape, ErrorBoundary pattern [CITED]
- docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/ — default integrations list including globalHandlersIntegration [CITED]

---

## Metadata

**Confidence breakdown:**
- is_dismissed migration: HIGH — source code read directly, SQL is standard PostgreSQL
- Sentry activation: HIGH — stub shape compatible, current API verified via docs
- FSD Realtime refactor: HIGH — all three files read, pattern is mechanical extraction
- ExcelJS migration: HIGH — both APIs read from source and npm, translation is direct
- webpack DefinePlugin gap: HIGH — verified by reading webpack.config.js
- Security threat model: HIGH — threats are structural, not speculative

**Research date:** 2026-05-16
**Valid until:** 2026-08-16 (stable libraries; ExcelJS and Sentry versions should be re-verified if > 90 days)
