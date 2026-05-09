# 🔍 Project Audit Report — PUTEVI Safety
**Date**: 2026-05-09
**Auditor**: Claude Code (autonomous audit mode, read-only)
**Scope**: entire `src/` + `supabase/functions/`

---

## 1. Executive Summary

- **Крепкая архитектура, но с незакрытыми дырами в безопасности.** Функциональность приложения полностью рабочая; FSD-миграция завершена на 90%, TypeScript работает в strict-режиме без ошибок, сборка проходит чисто. Основные риски — операционные, не функциональные.
- **Корзина `employee-photos` (фото сотрудников) не защищена.** Ни одной RLS-политики для этого bucket'а нет ни в одном migration-файле; по умолчанию Supabase-хранилище создаётся публичным. Персональные данные сотрудников (фото) потенциально доступны без авторизации.
- **Отсутствуют подтверждения RLS для таблиц `employees`, `permits`, `orders`, `prescriptions`, `organization_docs`.** Migration-файлы для этих таблиц не существуют. Защита могла быть настроена через Dashboard, но это не задокументировано и не воспроизводимо.
- **Query-ключ `registry-employees` используют 4 разных хука с несовместимыми `queryFn`.** Тот, чья функция загрузилась первой, заполнит кэш — остальные получат данные неправильной формы (ломает автодополнение ответственного в нарядах, предписаниях, приказах).
- **Три Registry-компонента нарушают FSD**, импортируя из `app/`-слоя напрямую. Хук `shared/hooks/useExpiredCount.ts` нарушает FSD, импортируя из `entities/`.

**Текущий health score**: **5/10**
**Release readiness**: **GO-WITH-CAVEATS** — продукт готов к ограниченному (внутреннему) использованию, но требует аудита Supabase Dashboard и исправления query-key коллизии до расширения доступа.
**Оценочные трудозатраты до 9/10**: ~10–12 рабочих дней (4 спринта).

---

## 2. Project Snapshot

### Verified Stack

| Package | Version |
|---------|---------|
| React | 18.2.0 |
| TypeScript | 5.3.0 |
| @supabase/supabase-js | 2.91.1 |
| @tanstack/react-query | 5.100.7 |
| react-router-dom | 7.14.2 |
| react-window | 2.2.5 (v2 API ✅) |
| recharts | 3.8.1 |
| compressorjs | 1.3.0 |
| webpack | 5.89.0 |
| tailwindcss | 3.4.0 |

### FSD Compliance

| Status | Detail |
|--------|--------|
| ✅ `src/components/` | Deleted — FSD fully migrated |
| ✅ Services boundary | All features have `services/` layer; no direct supabase calls in components except Realtime (protected by CLAUDE.md) |
| ✅ `components/index.ts` barrels | All 7 feature component folders have barrel exports |
| ❌ `features/` → `app/` imports | `PermitsRegistry.jsx:17`, `PrescriptionsRegistry.jsx:29`, `OrdersRegistry.jsx:25` import `useNotificationContext` directly from `../../../app/providers/NotificationProvider` |
| ❌ `shared/` → `entities/` import | `src/shared/hooks/useExpiredCount.ts:4-5` imports `DAYS_THRESHOLD, hasExpiredAdditional` from `@/entities/employee` |
| ⚠️ `employee-crud/components/index.ts` | Only exports `EmployeeTable` and `EmployeeForm` — missing `VirtualEmployeeTable`, `OrganizationTelegramReport`, `WorkerTrainingDownloadButton` |

### TypeScript Strict Status

```
npx tsc --noEmit → EXIT 0 (0 errors) ✅
as any count → 0 ✅
```

Notable: `App.tsx:28` uses `useState<any>(null)` for session (not `as any` cast, but equivalent type loss).

### Build Status

```
npm run build → compiled with 2 warnings ✅
```
Warnings are size-limit warnings only (not errors):
- `js/vendors.d7a2d243.js` → **1.29 MiB** (exceeds 500 KiB recommended)
- Total entrypoint → **1.68 MiB**

No code paths in `dist/` that would break production. Static assets referenced correctly.

### Forbidden-Pattern Scan

| Pattern | Count | Files |
|---------|-------|-------|
| `as any` | 0 | — |
| Direct supabase in components (non-Realtime) | 0 | — |
| Direct supabase in hooks | 0 | — |
| Multiple Supabase clients | 0 | — |
| `console.log` (non-error) | 1 | `auth/LoginCard.tsx:55` |
| `console.error` in production paths | 22 | various |
| `alert()` / `window.confirm()` | 14 | various |
| Upward FSD import (features→app) | 3 | PermitsRegistry, PrescriptionsRegistry, OrdersRegistry |
| Upward FSD import (shared→entities) | 1 | `shared/hooks/useExpiredCount.ts` |

---

## 3. Threat Model

| Trust Boundary | Risk Level | Notes |
|---|---|---|
| Browser ↔ Supabase (REST/DB) | 🔴 HIGH | No confirmed RLS on `employees`, `permits`, `orders`, `prescriptions`, `organization_docs` — relies on anon key + Dashboard config (unverified, unversioned) |
| Browser ↔ Edge Functions | 🟡 MEDIUM | `telegram-notify` requires JWT auth ✅. `telegram-webhook` validates `x-telegram-bot-api-secret-token` ✅. CORS origin fallback fixed to `*` (broader than ideal but functional). |
| User ↔ Forms | 🟡 MEDIUM | Input validation in forms is client-side only (name/profession required). No server-side constraint validation visible in migrations. `file.type.startsWith("image/")` in EmployeeForm and magic-bytes check in TaskResolveModal ✅. |
| Browser ↔ Storage (employee-photos) | 🔴 HIGH | No RLS migration for `employee-photos` bucket. Likely public or has no READ restriction. |
| Browser ↔ Storage (tasks) | 🟢 LOW | `security_hardening.sql` migration makes bucket private, scopes write/delete to user's folder ✅. Signed URL (1h TTL) used for reads ✅. |
| Realtime Channels | 🟢 LOW | Named channels in `REALTIME_CHANNELS` constant. Subscriptions only invalidate TanStack Query cache, no data processed from channel payload. ✅ |
| Telegram Webhook | 🟡 MEDIUM | `WEBHOOK_SECRET` validated on each request ✅. `ALLOWED_CHAT_IDS` allowlist enforced ✅. Uses `SERVICE_ROLE_KEY` — read-only employees query only, no writes from webhook ✅. No `AbortSignal` on `telegramSendMessage` calls (can hang). |

---

## 4. Findings by Severity

---

### 🔴 CRITICAL (release blockers)

---

**F-001**
- **File**: `supabase/functions/` (migration gap) + `src/features/employee-crud/services/employeesService.ts:111-127`
- **Category**: security
- **Issue**: The `employee-photos` storage bucket has zero RLS policies defined in any migration file, meaning employee photos are likely publicly readable without authentication.
- **Why it matters**: Employee photos are personal data (ФИО + фото = PII). If the bucket is public, any person with a guessed URL can access them. The `tasks` bucket went through `security_hardening.sql` which explicitly set it to private — `employee-photos` has no equivalent.
- **Reproduction**: In Supabase Dashboard → Storage → employee-photos → Policies: there should be no policies if none were created manually. Alternatively, try opening a photo URL (without `Bearer` header) in an incognito browser.
- **Proposed fix**: Create a migration `supabase/migrations/secure_employee_photos.sql`:
  ```sql
  UPDATE storage.buckets SET public = false WHERE id = 'employee-photos';

  DROP POLICY IF EXISTS "employee_photos_read" ON storage.objects;
  DROP POLICY IF EXISTS "employee_photos_write" ON storage.objects;
  DROP POLICY IF EXISTS "employee_photos_delete" ON storage.objects;

  CREATE POLICY "employee_photos_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'employee-photos' AND auth.role() = 'authenticated');

  CREATE POLICY "employee_photos_write" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'employee-photos' AND auth.role() = 'authenticated');

  CREATE POLICY "employee_photos_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'employee-photos' AND auth.role() = 'authenticated');
  ```
  Then change `employeesService.ts:uploadEmployeePhoto` to use `createSignedUrl` instead of `getPublicUrl`, since the bucket will no longer be public.

---

**F-002**
- **File**: `src/features/permits/hooks/usePermits.ts:23`, `src/features/orders/hooks/useOrders.ts:23`, `src/features/prescriptions/hooks/usePrescriptions.ts:23`, `src/features/tasks/hooks/useTasks.ts:42`
- **Category**: logic
- **Issue**: Four hooks share the query key `['registry-employees']` but each calls a different `fetchRegistryEmployees` with a different shape — whoever populates the cache first wins silently; others may receive a mismatched array.
- **Why it matters**: If `useTaskEmployeesQuery` (returns `{id, name}`) runs before `usePermitEmployeesQuery` (returns `{id, name, profession, organization}`), the permits/orders/prescriptions forms will have employees without `profession` and `organization`, causing blank dropdowns or silent UI failures.
- **Reproduction**: Open `/permits` and `/tasks` in the same session. The first query to settle will populate `registry-employees`. On the permits form, the responsible person dropdown may show employees with missing profession/organization.
- **Proposed fix**: Namespace query keys per feature:
  ```ts
  // usePermits.ts
  queryKey: ['registry-employees', 'permits'],

  // useOrders.ts
  queryKey: ['registry-employees', 'orders'],

  // usePrescriptions.ts
  queryKey: ['registry-employees', 'prescriptions'],

  // useTasks.ts
  queryKey: ['registry-employees', 'tasks'],
  ```
  Longer-term: consolidate into a single `useRegistryEmployeesQuery` in `shared/` or `entities/employee/` with the full shape.

---

**F-003**
- **File**: `supabase/migrations/` (absent)
- **Category**: security
- **Issue**: No RLS migrations exist for tables `employees`, `permits`, `orders`, `prescriptions`, `organization_docs` — their access policies are either unset (full public access) or only configured via Supabase Dashboard (unversioned, not reproducible, not auditable).
- **Why it matters**: This is a safety compliance system storing real PII and work-permit data. Any authenticated user could potentially read or modify any record (IDOR/BOLA). If a new environment is deployed from code alone, all tables will be unprotected.
- **Reproduction**: Check Supabase Dashboard → Table Editor → each table → RLS Policies. If enabled and policies exist, document them into migrations.
- **Proposed fix**: Audit Dashboard RLS status. Create migrations for at minimum:
  ```sql
  -- employees: read/write for authenticated
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "employees_select" ON employees FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "employees_update" ON employees FOR UPDATE USING (auth.role() = 'authenticated');
  CREATE POLICY "employees_delete" ON employees FOR DELETE USING (auth.role() = 'authenticated');
  -- (repeat pattern for permits, orders, prescriptions, organization_docs)
  ```

---

### 🟠 HIGH

---

**F-004**
- **File**: `src/features/permits/components/PermitsRegistry.jsx:17`, `src/features/orders/components/OrdersRegistry.jsx:25`, `src/features/prescriptions/components/PrescriptionsRegistry.jsx:29`
- **Category**: architecture
- **Issue**: Three feature components import `useNotificationContext` directly from `../../../app/providers/NotificationProvider` — an upward FSD violation (features → app layer).
- **Why it matters**: If `NotificationProvider` is ever moved or renamed, these three files break. Violates the established FSD contract documented in CLAUDE.md.
- **Reproduction**: `grep -r "app/providers/NotificationProvider" src/features/`
- **Proposed fix**: Pass `addNotification` as a prop from the parent Page (same pattern used in `PermitActions`, `PermitForm`, `OrderForm`, etc., which already receive it as a prop). The parent pages already call `useNotificationContext()` themselves. The Registry components get the function passed down:
  ```jsx
  // In PermitsPage.tsx
  const { addNotification } = useNotificationContext();
  <PermitsRegistry addNotification={addNotification} />
  ```

---

**F-005**
- **File**: `src/shared/hooks/useExpiredCount.ts:4-5`
- **Category**: architecture
- **Issue**: `shared/hooks/useExpiredCount.ts` imports `DAYS_THRESHOLD` and `hasExpiredAdditional` from `@/entities/employee` — `shared/` importing upward from `entities/` violates FSD.
- **Why it matters**: CLAUDE.md rule: "`shared/` must have zero upward dependencies. If a `shared/` hook needs notification access, receive `addNotification` as a parameter." Same principle applies to entity constants.
- **Reproduction**: `grep -n "entities" src/shared/hooks/useExpiredCount.ts`
- **Proposed fix**: Move `useExpiredCount` to `src/features/employee-crud/hooks/useExpiredCount.ts` (it is only called from `EmployeesPage`), or pass `DAYS_THRESHOLD` and the `hasExpiredAdditional` function as parameters:
  ```ts
  export function useExpiredCount(
    filteredEmployees: Employee[],
    getDaysDiff: (date: string) => number,
    addNotification: AddNotification,
    daysThreshold: number,
    hasExpiredAdditional: (trainings: ...) => boolean
  ): number
  ```

---

**F-006**
- **File**: `src/app/App.tsx:28`
- **Category**: type-safety
- **Issue**: `const [session, setSession] = useState<any>(null)` — using `any` as the session type bypasses all TypeScript checks on session access throughout the auth flow.
- **Why it matters**: While `tsc --noEmit` passes (it's a type param, not a cast), any downstream access on `session` is untyped. The Supabase SDK exports `Session | null` from `@supabase/supabase-js`.
- **Reproduction**: Look at App.tsx:28 — the type is `any`, not `Session | null`.
- **Proposed fix**:
  ```tsx
  import type { Session } from '@supabase/supabase-js';
  const [session, setSession] = useState<Session | null>(null);
  ```

---

**F-007**
- **File**: `src/features/permits/services/permitsService.ts:40-46` and `src/entities/permit/model.ts:1-18`
- **Category**: type-safety / logic
- **Issue**: `Permit` interface has no `updated_at` field; `PermitUpdate` (derived from `Permit`) therefore has no `updated_at`. However, `autoCloseExpired()` and `updatePermitWithStatus()` both pass `updated_at: nowIso` inside raw Supabase `.update()` calls outside the typed payload. This bypasses TypeScript checks.
- **Why it matters**: If the DB column `updated_at` has a trigger-based default (common in Supabase), the manual timestamp is redundant. If it doesn't, and the column is renamed/removed, the code silently stops setting timestamps with no compiler warning.
- **Reproduction**: Note that `PermitUpdate = Partial<PermitInsert>` and `PermitInsert = Omit<Permit, 'id' | 'created_at'>`. The `updated_at` property does not appear anywhere in `Permit`, yet `permitsService.ts` passes it to Supabase.
- **Proposed fix**: Either (a) add `updated_at?: string` to the `Permit` interface so it's tracked; or (b) remove the manual `updated_at` calls and rely on a DB-level `DEFAULT now()` trigger. If option (b), also remove the redundant field from `PermitActions.jsx:79`.

---

**F-008**
- **File**: `src/features/tasks/components/TaskResolutionViewerModal.tsx:22-48`
- **Category**: architecture
- **Issue**: `TaskResolutionViewerModal` fetches `fetchResolutionsByTask` directly in a `useEffect` instead of using TanStack Query, bypassing the cache.
- **Why it matters**: After a task resolution is created (`useTaskResolution` mutation), the viewer won't reflect the new data until the modal is reopened. The Query cache is invalidated by `useTaskResolution` but the viewer doesn't participate.
- **Reproduction**: Create a task resolution, then immediately open the viewer — it will show the old data if modal was already open.
- **Proposed fix**: Replace local `useEffect` fetch with a proper `useQuery`:
  ```tsx
  const { data: resolution, isLoading } = useQuery({
    queryKey: ['task-resolutions', task.id],
    queryFn: () => fetchResolutionsByTask(task.id).then(items => items[0] ?? null),
    enabled: open,
  });
  ```
  Then in `useTaskResolution.ts`, add `qc.invalidateQueries({ queryKey: ['task-resolutions', taskId] })`.

---

### 🟡 MEDIUM

---

**F-009**
- **File**: `src/features/employee-crud/components/EmployeeForm.tsx:147-171` and `src/entities/employee/lib.ts:15-23`
- **Category**: logic
- **Issue**: `checkTrainingStatus()` in `EmployeeForm.tsx` and `isTrainingExpired()` in `entities/employee/lib.ts` implement the same "months-based expiry" calculation independently — two sources of truth for the same logic.
- **Why it matters**: If the business rule changes (e.g., "expiry = 11 months"), it must be updated in two places. Risk of silent divergence.
- **Proposed fix**: `EmployeeForm.tsx` should import and call `isTrainingExpired` + a `daysUntilExpiry` helper from `entities/employee/lib.ts`. The `checkTrainingStatus` function can be removed.

---

**F-010**
- **File**: `src/auth/LoginCard.tsx:55`
- **Category**: security / hygiene
- **Issue**: `console.log("Login attempt:", { email: emailTrim })` leaks user email to browser DevTools console in production.
- **Why it matters**: Anyone with DevTools open (e.g., helpdesk, shared laptop) can see the email being submitted. The `if (onSubmit)` guard means this fires only in the "stub mode" (no `onSubmit` prop), but the production wiring in `App.tsx:96-102` always provides `signIn` via the `onSubmit` prop — so this log will not fire in production. However, it is dead code in the real app and could be confusing.
- **Proposed fix**: Remove the `console.log("Login attempt: ...")` from the `else` branch (the stub). If stub mode is needed for testing, the log should not include the email.

---

**F-011**
- **File**: Multiple: `OrganizationTelegramReport.jsx:31,114,116,120`, `TaskResolveModal.tsx:148,158`, `EmployeeTable.tsx:133,135`, `AdditionalTrainingsManager.tsx:346`
- **Category**: ui-ux
- **Issue**: 10+ places use `alert()` or `window.confirm()` for user feedback and destructive action confirmation.
- **Why it matters**: `alert()` and `confirm()` block the JS thread, are visually inconsistent with the rest of the UI, fail in some embedded contexts, and are not accessible. The project already has a `addNotification` system.
- **Proposed fix**: Replace `alert()` with `addNotification(...)` calls. Replace `window.confirm()` with inline `<ConfirmDialog>` or an `isConfirming` state toggle in each component. A lightweight `useConfirm` hook would eliminate all 6 occurrences of `window.confirm`.

---

**F-012**
- **File**: `src/features/tasks/hooks/useTasks.ts:21-37`
- **Category**: performance
- **Issue**: `useTasks(filters)` fetches ALL tasks from Supabase and performs client-side filtering for `siteId`, `assignedTo`, `status`.
- **Why it matters**: As the task backlog grows, this fetches data that's never displayed. For a multi-site deployment this could fetch thousands of rows.
- **Proposed fix**: Move filters to the server-side query in `fetchTasks`:
  ```ts
  export async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
    let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.siteId) q = q.eq('site_id', filters.siteId);
    if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
    ...
  }
  ```

---

**F-013**
- **File**: `js/vendors.d7a2d243.js (1.29 MiB)` (build output)
- **Category**: performance
- **Issue**: Total bundle is 1.68 MiB, vendor bundle alone is 1.29 MiB. All routes load synchronously despite `React.lazy` wrapping in `router.tsx`.
- **Why it matters**: Initial page load on slow connections (3G, mobile) will be slow.
- **Proposed fix**: Check `webpack.config.js` for `optimization.splitChunks` settings. Consider extracting `recharts`, `xlsx`, `@coreui` into separate chunks. Verify that `React.lazy` routes are actually creating split points.

---

**F-014**
- **File**: `src/features/employee-crud/services/downloadTrainingsService.js`
- **Category**: architecture / hygiene
- **Issue**: `downloadTrainingsService.js` is a plain `.js` file (no TypeScript) inside a `.ts` feature slice — the only JS service file in the entire `features/` layer.
- **Why it matters**: Bypasses type checking for that service's API surface; inconsistent with CLAUDE.md rule "100% strict TypeScript."
- **Proposed fix**: Convert to `.ts`. Since CLAUDE.md says "Convert .jsx → .tsx only when explicitly requested; one file at a time," this is explicitly a `.js` service file (not component) and should be converted.

---

### 🟢 LOW

---

**F-015**
- **File**: `src/features/employee-crud/components/index.ts`
- **Category**: hygiene
- **Issue**: Barrel only exports `EmployeeTable` and `EmployeeForm`, omitting `VirtualEmployeeTable`, `OrganizationTelegramReport`, `WorkerTrainingDownloadButton`.
- **Proposed fix**: Add missing exports to the barrel.

---

**F-016**
- **File**: `supabase/functions/telegram-webhook/index.ts` (multiple `any` annotations)
- **Category**: type-safety
- **Issue**: `getCommand()` uses `(e: any)` and `(msg: any)` — the Deno function is not in strict TypeScript even though it's a TypeScript file.
- **Proposed fix**: Define a `TelegramUpdate`, `TelegramMessage`, `TelegramEntity` interface matching the Telegram Bot API shapes.

---

**F-017**
- **File**: `supabase/functions/telegram-webhook/index.ts` (telegramSendMessage, no timeout)
- **Category**: logic / performance
- **Issue**: `telegramSendMessage()` has no `AbortSignal` — a slow or hung Telegram API response will hold the Deno function open until the platform's own timeout kills it.
- **Proposed fix**: Add `signal: AbortSignal.timeout(10_000)` to the `fetch()` call inside `telegramSendMessage()`.

---

**F-018**
- **File**: `src/features/tasks/model.ts` + `src/features/tasks/types.ts`
- **Category**: hygiene
- **Issue**: Tasks feature has two type-definition files: `model.ts` and `types.ts`. This duplicates the pattern from other features (which use only `model.ts`) and adds ambiguity about which to import from.
- **Proposed fix**: Consolidate into `model.ts`. `types.ts` only re-exports `Task` from `model.ts` currently.

---

**F-019**
- **File**: `src/features/permits/components/PermitActions.jsx:314` (inline styles object)
- **Category**: hygiene
- **Issue**: `btnDelete` style object has duplicate `alignItems` key: `alignItems: 'center'` appears twice. Second one overrides first silently.
- **Proposed fix**: Remove the duplicate `alignItems` entry.

---

**F-020**
- **File**: `src/features/employee-crud/components/OrganizationTelegramReport.jsx:96`
- **Category**: ui-ux
- **Issue**: Report is silently truncated to 30 employees with no visual indication to the user.
- **Proposed fix**: Show a warning when `employeesList.length > 30`: `"Показано 30 из ${total} сотрудников"`.

---

## 5. Category Scorecard (current state)

| Category | Score | Reasoning |
|----------|-------|-----------|
| 🏛️ FSD / Architecture | 6/10 | Services boundary complete; barrels present. Deducted for 3×feature→app FSD violations (F-004), 1×shared→entities violation (F-005), and query-key collision (F-002). |
| 🔒 Security | 4/10 | `employee-photos` bucket almost certainly public (F-001); no versioned RLS for 5 core tables (F-003); `console.log` email in auth (F-010); no AbortSignal on webhook fetch (F-017). Tasks bucket and Edge Functions are properly secured. |
| 🧮 Logic Correctness | 7/10 | Core business logic (expiry dates, permit auto-close, status derivation) is correct. Deducted for query-key collision causing silent data mismatch (F-002), duplicated expiry logic (F-009), `updated_at` not in Permit model (F-007), and viewer not using Query cache (F-008). |
| 🎨 UI/UX States | 6/10 | Loading states present on all pages. Error state on EmployeesPage. Deducted for 10+ `alert()`/`confirm()` native dialogs (F-011), silent Telegram truncation (F-020), no dark-mode support in feature CSS files. |
| ⚡ Performance | 6/10 | GPU-composited scroll in EmployeeForm, `useDeferredValue` in registries, signed URLs for storage. Deducted for 1.68 MiB bundle (F-013), client-side task filtering fetching all rows (F-012). |
| 🧪 Type Safety | 7/10 | 0 `tsc` errors, 0 `as any`. Deducted for `useState<any>` in App.tsx (F-006), `as unknown as Employee` in EmployeeForm (side-effect of no `id` in form type), loose `[key: string]: unknown` index in `AdditionalTraining`, `any` in telegram-webhook (F-016). |
| 📚 Hygiene | 7/10 | No dead code, FSD migration complete, CLAUDE.md up-to-date. Deducted for `downloadTrainingsService.js` not TypeScript (F-014), `types.ts` duplicate in tasks (F-018), duplicate `alignItems` in PermitActions (F-019), missing barrel exports (F-015). |

**Final score (min)**: **4/10** (security floor)

---

## 6. RLS / Supabase Action Items

Items that **cannot** be fixed in code — require Supabase Dashboard or DB migration:

### Immediate (Blockers)

1. **`employee-photos` storage bucket** — Verify in Dashboard → Storage → Buckets:
   - Is `employee-photos` set to `public: false`? If not, set it.
   - Are there SELECT policies requiring `auth.role() = 'authenticated'`? If not, create them.
   - Add migration `secure_employee_photos.sql` to version-control the state. (See F-001 for SQL.)

2. **`employees` table RLS** — Verify Dashboard → Table Editor → employees → RLS:
   - If RLS is disabled: enable it and create authenticated-read/write policies.
   - If RLS is enabled but policies were created in Dashboard only: export them into a migration file.

3. **`permits`, `orders`, `prescriptions`, `organization_docs` tables** — Same as above. These are the core compliance tables; unprotected access is the highest business risk.

### Important

4. **`permit_audit_log` table** — `logPermitAudit()` in `permitsService.ts` inserts into this table. Verify RLS allows INSERT from authenticated users but not DELETE (audit trail must be immutable).

5. **Service-role exposure** — `telegram-webhook` uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS entirely. Confirm in Dashboard that this function only reads `employees` (no writes). Currently the code only does a SELECT — no risk, but worth documenting.

---

## 7. Edge Functions Findings

### `telegram-notify/index.ts`
**Verdict**: ✅ Secure and functional after recent fixes.

- JWT authentication: required and verified via `supabase.auth.getUser()` ✅
- CORS origin fallback: `ALLOWED_ORIGIN || "*"` ✅ (was `|| "null"` — fixed)
- Telegram timeout: `AbortSignal.timeout(10_000)` ✅
- Error responses: use `description` field (matches Telegram API format) ✅
- No token logged ✅
- Message length capped at 4096 chars ✅

**Minor concern**: CORS fallback is `"*"` — consider setting `NOTIFY_ALLOWED_ORIGIN` to the actual production domain in Supabase Secrets to tighten this.

---

### `telegram-webhook/index.ts`
**Verdict**: ⚠️ Functional but has type-safety and robustness gaps.

- Webhook secret validation: ✅ validated on every request
- Chat ID allowlist: ✅ `ALLOWED_CHAT_IDS` enforced before any DB query
- Service-role key: ✅ used server-side only, not exposed to browser
- Missing `AbortSignal` on `telegramSendMessage`: ⚠️ F-017 — no timeout on outgoing Telegram API calls
- `any` types throughout: ⚠️ F-016 — `msg: any`, `e: any` in `getCommand()`
- `superClean()` latin→cyrillic substitution: only replaces 6 chars (`c→с, a→а, e→е, b→в, p→р, o→о`). Incomplete for mixed-script input but low priority.
- No error handling if `employees` table is empty or DB times out during `/stats` command.
- The `rows` variable in the `/new` command uses `employees` (raw, unfiltered) while other commands use `rows` (filtered by `training_date`) — this inconsistency is intentional (shows new employees regardless of training date) but should be commented.
