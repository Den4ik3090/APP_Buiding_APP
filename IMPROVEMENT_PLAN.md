# 🎯 Improvement Plan — PUTEVI Safety
**Target**: raise overall score from 5/10 to 9/10 (security floor: 4/10 → 8/10)
**Estimated effort**: 10–12 dev-days
**Sprints**: 4

---

## How to Use This Plan

- Tasks are ordered: severity DESC → blast_radius ASC → dependencies resolved
- Each task references finding IDs from `AUDIT_REPORT.md`
- Verification column tells you exactly how to confirm the fix worked
- **Do NOT skip prerequisites** — they are listed for a reason
- After each sprint run: `npx tsc --noEmit` (must stay at 0 errors)

---

## Sprint 1 — Critical Security & Compliance (Week 1)
**Goal**: eliminate all 🔴 CRITICAL findings; product is safe to ship with PII.

---

### Task S1-T01: Secure employee-photos storage bucket
- **Addresses**: F-001
- **Layer**: `supabase/migrations/` + `src/features/employee-crud/services/`
- **Files to change**:
  - New: `supabase/migrations/secure_employee_photos.sql`
  - `src/features/employee-crud/services/employeesService.ts` (switch from `getPublicUrl` to `createSignedUrl`)
- **Effort**: 0.5 dev-days
- **Blast radius**: medium (photo display in EmployeeForm and EmployeeTable)
- **Prerequisites**: none
- **Steps**:
  1. Create `supabase/migrations/secure_employee_photos.sql`:
     ```sql
     UPDATE storage.buckets SET public = false WHERE id = 'employee-photos';

     DROP POLICY IF EXISTS "employee_photos_read"   ON storage.objects;
     DROP POLICY IF EXISTS "employee_photos_write"  ON storage.objects;
     DROP POLICY IF EXISTS "employee_photos_delete" ON storage.objects;

     CREATE POLICY "employee_photos_read" ON storage.objects
       FOR SELECT USING (bucket_id = 'employee-photos' AND auth.role() = 'authenticated');

     CREATE POLICY "employee_photos_write" ON storage.objects
       FOR INSERT WITH CHECK (bucket_id = 'employee-photos' AND auth.role() = 'authenticated');

     CREATE POLICY "employee_photos_delete" ON storage.objects
       FOR DELETE USING (bucket_id = 'employee-photos' AND auth.role() = 'authenticated');
     ```
  2. Apply via `supabase db push` or run directly in Supabase Dashboard SQL Editor.
  3. In `employeesService.ts`, change `uploadEmployeePhoto` to return a signed URL:
     ```ts
     const { data: signedData, error: signError } = await supabase.storage
       .from('employee-photos')
       .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
     if (signError || !signedData) throw new Error('Не удалось создать ссылку на фото');
     return signedData.signedUrl;
     ```
  4. Note: existing `photo_url` values in DB are public URLs — they will become inaccessible after the bucket is made private. Two options: (a) use 1-year signed URLs (simpler, URLs expire eventually); (b) regenerate signed URLs on every employee load (complex). Option (a) is pragmatic for this use case.
- **Acceptance criteria**:
  - [ ] `npx tsc --noEmit` stays at 0 errors
  - [ ] Opening a photo URL in incognito without auth returns 403
  - [ ] Employee photos still visible when logged in
  - [ ] New employee photo upload works
- **Verification commands**:
  ```bash
  grep -n "getPublicUrl\|employee-photos" src/features/employee-crud/services/employeesService.ts
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert the migration by setting `public = true` on the bucket via Dashboard. Revert `employeesService.ts` to `getPublicUrl`.

---

### Task S1-T02: Version-control RLS for core tables
- **Addresses**: F-003
- **Layer**: `supabase/migrations/`
- **Files to change**:
  - New: `supabase/migrations/enable_rls_core_tables.sql`
- **Effort**: 1 dev-day (includes Supabase Dashboard audit time)
- **Blast radius**: low (pure DB-side change; app code unchanged)
- **Prerequisites**: none (can run in parallel with S1-T01)
- **Steps**:
  1. Open Supabase Dashboard → Table Editor for each table: `employees`, `permits`, `orders`, `prescriptions`, `organization_docs`.
  2. For each table, check: "Is RLS enabled?" and "What policies exist?"
  3. **If RLS is already enabled with correct policies**: export the policies into a migration file (copy from Dashboard → SQL Editor → table policy definitions).
  4. **If RLS is not enabled**: create `enable_rls_core_tables.sql` with the following minimum policies (single-tenant, all authenticated users trusted):
     ```sql
     -- employees
     ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "employees_auth" ON employees
       FOR ALL USING (auth.role() = 'authenticated')
       WITH CHECK (auth.role() = 'authenticated');

     -- permits
     ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "permits_auth" ON permits
       FOR ALL USING (auth.role() = 'authenticated')
       WITH CHECK (auth.role() = 'authenticated');

     -- orders
     ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "orders_auth" ON orders
       FOR ALL USING (auth.role() = 'authenticated')
       WITH CHECK (auth.role() = 'authenticated');

     -- prescriptions
     ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "prescriptions_auth" ON prescriptions
       FOR ALL USING (auth.role() = 'authenticated')
       WITH CHECK (auth.role() = 'authenticated');

     -- organization_docs
     ALTER TABLE organization_docs ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "org_docs_auth" ON organization_docs
       FOR ALL USING (auth.role() = 'authenticated')
       WITH CHECK (auth.role() = 'authenticated');
     ```
  5. Commit the migration file to git so the DB state is reproducible.
- **Acceptance criteria**:
  - [ ] All 5 tables have RLS enabled in Dashboard
  - [ ] All 5 tables have at minimum "authenticated users can do all" policies
  - [ ] Migration file committed to `supabase/migrations/`
  - [ ] App CRUD operations still work after applying migration
- **Verification commands**:
  ```bash
  # After applying: try fetching employees via curl without auth header
  curl -H "apikey: $ANON_KEY" "$SUPABASE_URL/rest/v1/employees" | head -50
  # Should return: {"code":"PGRST301","details":null,"hint":null,"message":"JWT must be provided"}
  # or an empty array if RLS policy doesn't include anon role
  npx tsc --noEmit
  ```
- **Rollback plan**: `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;` in Supabase SQL Editor.

---

### Task S1-T03: Fix query-key collision for registry-employees
- **Addresses**: F-002
- **Layer**: `src/features/*/hooks/`
- **Files to change**:
  - `src/features/permits/hooks/usePermits.ts`
  - `src/features/orders/hooks/useOrders.ts`
  - `src/features/prescriptions/hooks/usePrescriptions.ts`
  - `src/features/tasks/hooks/useTasks.ts`
- **Effort**: 0.25 dev-days
- **Blast radius**: low (hook internals only, no component API change)
- **Prerequisites**: none
- **Steps**:
  1. In each hook file, change `queryKey: ['registry-employees']` to a namespaced key:
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
  2. No changes needed to invalidation calls (no hook currently invalidates `registry-employees`).
- **Acceptance criteria**:
  - [ ] `npx tsc --noEmit` stays at 0 errors
  - [ ] Open `/permits` and `/tasks` simultaneously — verify permits employee dropdown shows `profession` and `organization` fields
  - [ ] No regression in task employee picker
- **Verification commands**:
  ```bash
  grep -rn "'registry-employees'" src/features/
  # Should show 4 unique keys: permits, orders, prescriptions, tasks
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert the 4 hook files.

---

## Sprint 2 — Architectural Cleanup (Week 2)
**Goal**: close all 🟠 HIGH FSD/architecture findings; get FSD score to 9/10.

---

### Task S2-T01: Fix features→app FSD violations in 3 Registry components
- **Addresses**: F-004
- **Layer**: `src/features/*/components/`, `src/pages/`
- **Files to change**:
  - `src/features/permits/components/PermitsRegistry.jsx`
  - `src/features/orders/components/OrdersRegistry.jsx`
  - `src/features/prescriptions/components/PrescriptionsRegistry.jsx`
  - `src/pages/permits/PermitsPage.tsx` (pass `addNotification` down)
  - `src/pages/orders/OrdersPage.tsx`
  - `src/pages/prescriptions/PrescriptionsPage.tsx`
- **Effort**: 0.5 dev-days
- **Blast radius**: low (UI behavior unchanged, prop threading only)
- **Prerequisites**: none
- **Steps**:
  1. In each Registry component, remove the import `from "../../../app/providers/NotificationProvider"`.
  2. Add `addNotification` to the component's prop signature:
     ```jsx
     // PermitsRegistry.jsx
     export default function PermitsRegistry({ addNotification }) { ... }
     ```
  3. In the corresponding Page, call `useNotificationContext()` and pass `addNotification` as a prop:
     ```tsx
     // PermitsPage.tsx
     import { useNotificationContext } from '@/app/providers/NotificationProvider';
     export default function PermitsPage() {
       const { addNotification } = useNotificationContext();
       return <PermitsRegistry addNotification={addNotification} />;
     }
     ```
  4. Check that `PermitsPage.tsx` (etc.) already imports `useNotificationContext` — if so, pass the existing reference.
- **Acceptance criteria**:
  - [ ] `grep -r "app/providers/NotificationProvider" src/features/` returns empty
  - [ ] `npx tsc --noEmit` stays at 0 errors
  - [ ] Permits/orders/prescriptions notification toasts still appear
- **Verification commands**:
  ```bash
  grep -rn "app/providers" src/features/
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert the 6 files.

---

### Task S2-T02: Move useExpiredCount out of shared/
- **Addresses**: F-005
- **Layer**: `src/shared/hooks/` → `src/features/employee-crud/hooks/`
- **Files to change**:
  - Move `src/shared/hooks/useExpiredCount.ts` → `src/features/employee-crud/hooks/useExpiredCount.ts`
  - Update any imports of `useExpiredCount` (check `EmployeesPage.tsx`)
- **Effort**: 0.25 dev-days
- **Blast radius**: very low
- **Prerequisites**: none
- **Steps**:
  1. Move the file: `mv src/shared/hooks/useExpiredCount.ts src/features/employee-crud/hooks/useExpiredCount.ts`
  2. The new location can freely import from `@/entities/employee` without FSD violation.
  3. Update the import in `EmployeesPage.tsx`:
     ```ts
     import { useExpiredCount } from '@/features/employee-crud/hooks/useExpiredCount';
     ```
- **Acceptance criteria**:
  - [ ] `grep -rn "useExpiredCount" src/shared/` returns empty
  - [ ] `npx tsc --noEmit` stays at 0 errors
- **Verification commands**:
  ```bash
  grep -rn "useExpiredCount" src/
  npx tsc --noEmit
  ```
- **Rollback plan**: Move file back; update import.

---

### Task S2-T03: Add Session type to App.tsx; fix EmployeeForm type cast
- **Addresses**: F-006, F-007
- **Layer**: `src/app/`, `src/entities/permit/`
- **Files to change**:
  - `src/app/App.tsx` (line 28)
  - `src/entities/permit/model.ts` (add `updated_at` or document absence)
  - `src/features/employee-crud/components/EmployeeForm.tsx` (line 642)
- **Effort**: 0.5 dev-days
- **Blast radius**: very low
- **Steps**:
  1. **App.tsx**: Add proper Session type:
     ```tsx
     import type { Session } from '@supabase/supabase-js';
     const [session, setSession] = useState<Session | null>(null);
     ```
  2. **PermitModel**: Add `updated_at` to interface (or confirm it's managed by DB trigger and never needed in client code):
     ```ts
     export interface Permit {
       // ... existing fields ...
       updated_at?: string; // DB-managed timestamp
     }
     ```
     If DB trigger manages it automatically: remove `updated_at: nowIso` from `autoCloseExpired()` (line 43) and `PermitActions.jsx` (line 79) to avoid redundant writes.
  3. **EmployeeForm.tsx:642**: The `as unknown as Employee` cast happens because `EmployeeFormData` lacks `id` and `createdAt`. The workaround of adding `id: editingEmployee.id` after the cast (line 645) is correct but the cast is still ugly. Proper fix: define a `EmployeePayload` type = `Omit<Employee, 'id' | 'createdAt'>` and use it as the return type of `buildPayload()`, then add `id` at call site.
- **Acceptance criteria**:
  - [ ] `npx tsc --noEmit` stays at 0 errors
  - [ ] No `useState<any>` in the codebase
  - [ ] Employee save/update still works correctly
- **Verification commands**:
  ```bash
  grep -n "useState<any>\|useState<unknown>" src/
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert individually (each change is independent).

---

### Task S2-T04: Fix TaskResolutionViewerModal to use TanStack Query
- **Addresses**: F-008
- **Layer**: `src/features/tasks/components/`, `src/features/tasks/hooks/`
- **Files to change**:
  - `src/features/tasks/components/TaskResolutionViewerModal.tsx`
  - `src/features/tasks/hooks/useTaskResolution.ts` (add cache invalidation)
- **Effort**: 0.5 dev-days
- **Blast radius**: low
- **Prerequisites**: none
- **Steps**:
  1. In `TaskResolutionViewerModal.tsx`, replace the `useEffect` + local state with:
     ```tsx
     import { useQuery } from '@tanstack/react-query';
     import { fetchResolutionsByTask } from '../services/tasksService';
     
     const { data: resolution, isLoading } = useQuery({
       queryKey: ['task-resolutions', task.id],
       queryFn: () => fetchResolutionsByTask(task.id).then(items => items[0] ?? null),
       enabled: open,
     });
     ```
  2. Remove the `useEffect`, local `loading` state, and `resolution` state.
  3. In `useTaskResolution.ts`, add query invalidation:
     ```ts
     onSuccess: (_, variables) => {
       qc.invalidateQueries({ queryKey: ['task-resolutions', variables.taskId] });
       qc.invalidateQueries({ queryKey: ['tasks'] });
     }
     ```
- **Acceptance criteria**:
  - [ ] `npx tsc --noEmit` stays at 0 errors
  - [ ] After resolving a task, the viewer immediately shows the new photo without reopening
  - [ ] Loading state still shown while fetching
- **Verification commands**:
  ```bash
  grep -n "useEffect\|useState.*loading\|useState.*resolution" src/features/tasks/components/TaskResolutionViewerModal.tsx
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert both files.

---

## Sprint 3 — UX & Performance (Week 3)
**Goal**: address all 🟡 MEDIUM findings; improve UI consistency and performance.

---

### Task S3-T01: Replace alert() / window.confirm() with notification system
- **Addresses**: F-011
- **Layer**: `src/features/*/components/`
- **Files to change** (in order of impact):
  - `src/features/employee-crud/components/OrganizationTelegramReport.jsx` (4 alerts)
  - `src/features/employee-crud/components/EmployeeTable.tsx` (2 alerts)
  - `src/features/tasks/components/TaskResolveModal.tsx` (2 alerts)
  - `src/features/additional-trainings/components/AdditionalTrainingsManager.tsx` (1 alert)
  - `src/features/permits/components/PermitActions.jsx` (2 confirms)
  - `src/features/prescriptions/components/PrescriptionsRegistry.jsx` (1 confirm)
  - `src/features/permits/components/PermitsRegistry.jsx` (1 confirm)
  - `src/features/orders/components/OrdersRegistry.jsx` (1 confirm)
  - `src/pages/employees/EmployeesPage.tsx` (1 confirm)
- **Effort**: 1.5 dev-days
- **Blast radius**: medium (touches many components, but changes are isolated)
- **Prerequisites**: S2-T01 (so that `addNotification` is properly available via props)
- **Steps**:
  1. For each `alert(message)` call, replace with `addNotification(message, TOAST_TYPES.SUCCESS/ERROR)` — the `addNotification` function is already available in all these components.
  2. For `window.confirm()` calls, create a lightweight inline confirmation pattern:
     ```jsx
     const [confirmingId, setConfirmingId] = useState(null);
     
     // In JSX, replace the button's onClick:
     onClick={() => setConfirmingId(id)}
     
     // Add inline confirmation UI:
     {confirmingId === id && (
       <span>
         <button onClick={handleConfirmedDelete}>✓ Удалить</button>
         <button onClick={() => setConfirmingId(null)}>✕</button>
       </span>
     )}
     ```
  3. For `OrganizationTelegramReport`, `addNotification` must be passed as a prop (currently it uses `alert()`).
- **Acceptance criteria**:
  - [ ] `grep -rn "window\.confirm\|alert(" src/features/ src/pages/` returns only 0 results
  - [ ] Delete actions still require confirmation (inline confirmation or toast with undo)
  - [ ] Success/error feedback still visible to user
  - [ ] `npx tsc --noEmit` stays at 0 errors
- **Verification commands**:
  ```bash
  grep -rn "window\.confirm\|^[[:space:]]*alert(" src/
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert individual files; `window.confirm` fallback is always safe.

---

### Task S3-T02: Deduplicate training expiry logic
- **Addresses**: F-009
- **Layer**: `src/features/employee-crud/components/`, `src/entities/employee/`
- **Files to change**:
  - `src/entities/employee/lib.ts` (add `daysUntilExpiry` helper)
  - `src/features/employee-crud/components/EmployeeForm.tsx` (remove `checkTrainingStatus`, use lib)
- **Effort**: 0.5 dev-days
- **Blast radius**: low (internal to EmployeeForm rendering)
- **Prerequisites**: none
- **Steps**:
  1. In `entities/employee/lib.ts`, add:
     ```ts
     export const daysUntilExpiry = (
       dateReceived: string | null | undefined,
       expiryMonths: number | string | null | undefined
     ): number => {
       if (!dateReceived || !expiryMonths) return 0;
       const start = new Date(dateReceived);
       const expiry = new Date(start);
       expiry.setMonth(expiry.getMonth() + parseInt(String(expiryMonths), 10));
       return Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
     };
     ```
  2. In `EmployeeForm.tsx`, remove `checkTrainingStatus()` (lines 147–171). Replace with calls to `isTrainingExpired` and `daysUntilExpiry` from `@/entities/employee`.
  3. The `TrainingStatus` component becomes:
     ```tsx
     const daysLeft = daysUntilExpiry(training.dateReceived, training.expiryMonths);
     const isExpired = isTrainingExpired(training.dateReceived, training.expiryMonths);
     const isSoon = !isExpired && daysLeft > 0 && daysLeft <= 30;
     ```
- **Acceptance criteria**:
  - [ ] `checkTrainingStatus` function no longer exists in `EmployeeForm.tsx`
  - [ ] Training status badges still show correct states in employee form
  - [ ] `npx tsc --noEmit` stays at 0 errors
- **Verification commands**:
  ```bash
  grep -n "checkTrainingStatus" src/features/employee-crud/components/EmployeeForm.tsx
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert `EmployeeForm.tsx`; keep `lib.ts` addition (additive).

---

### Task S3-T03: Server-side task filtering
- **Addresses**: F-012
- **Layer**: `src/features/tasks/services/`, `src/features/tasks/hooks/`
- **Files to change**:
  - `src/features/tasks/services/tasksService.ts`
  - `src/features/tasks/hooks/useTasks.ts`
- **Effort**: 0.5 dev-days
- **Blast radius**: low
- **Prerequisites**: none
- **Steps**:
  1. Add `filters` parameter to `fetchTasks` in `tasksService.ts`:
     ```ts
     export async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
       let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
       if (filters?.status) q = q.eq('status', filters.status);
       if (filters?.siteId) q = q.eq('site_id', filters.siteId);
       if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
       const { data, error } = await q;
       if (error) {
         if (isTableMissing(error)) return [];
         throw new Error(error.message);
       }
       return (data ?? []) as Task[];
     }
     ```
  2. In `useTasks.ts`, remove `applyFilters` function and the client-side filter:
     ```ts
     queryFn: () => fetchTasks(filters),
     ```
  3. Update `queryKey` to include filters so different filter combinations have separate caches:
     ```ts
     queryKey: ['tasks', filters],  // Already done ✅
     ```
- **Acceptance criteria**:
  - [ ] `applyFilters` function removed from `useTasks.ts`
  - [ ] DB queries in DevTools show WHERE clauses for non-empty filters
  - [ ] `npx tsc --noEmit` stays at 0 errors
- **Verification commands**:
  ```bash
  grep -n "applyFilters" src/features/tasks/hooks/useTasks.ts
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert both files.

---

### Task S3-T04: Remove email console.log from auth
- **Addresses**: F-010
- **Layer**: `src/auth/`
- **Files to change**:
  - `src/auth/LoginCard.tsx` (line 55)
- **Effort**: 0.1 dev-days (5 minutes)
- **Blast radius**: none
- **Prerequisites**: none
- **Steps**:
  1. Remove line 55 from `LoginCard.tsx`: `console.log("Login attempt:", { email: emailTrim });`
  2. The whole `else` branch is a stub; confirm it's still needed or remove it entirely if `onSubmit` is always provided in production.
- **Acceptance criteria**:
  - [ ] `grep -n "Login attempt" src/auth/LoginCard.tsx` returns empty
  - [ ] Login still works
- **Verification commands**:
  ```bash
  grep -n "console.log" src/auth/
  npx tsc --noEmit
  ```
- **Rollback plan**: Revert line deletion.

---

### Task S3-T05: Add AbortSignal.timeout to telegram-webhook sendMessage
- **Addresses**: F-017
- **Layer**: `supabase/functions/telegram-webhook/`
- **Files to change**:
  - `supabase/functions/telegram-webhook/index.ts`
- **Effort**: 0.25 dev-days
- **Blast radius**: very low
- **Prerequisites**: none
- **Steps**:
  1. In `telegramSendMessage()`, add timeout:
     ```ts
     async function telegramSendMessage(chatId: number, text: string) {
       if (!BOT_TOKEN) return null;
       const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
       const res = await fetch(url, {
         method: "POST",
         headers: { "content-type": "application/json" },
         body: JSON.stringify({
           chat_id: chatId,
           text,
           parse_mode: "Markdown",
           disable_web_page_preview: true,
         }),
         signal: AbortSignal.timeout(10_000),
       });
       return await res.json().catch(() => null);
     }
     ```
  2. Deploy: `supabase functions deploy telegram-webhook`
- **Acceptance criteria**:
  - [ ] Function deploys without errors
  - [ ] Telegram bot still responds to commands
- **Rollback plan**: Remove `signal` line; redeploy.

---

## Sprint 4 — Hygiene & Tech Debt (Week 4)
**Goal**: address all 🟢 LOW findings; codebase ready for new contributors.

---

### Task S4-T01: Convert downloadTrainingsService.js to TypeScript
- **Addresses**: F-014
- **Layer**: `src/features/employee-crud/services/`
- **Files to change**:
  - Rename `downloadTrainingsService.js` → `downloadTrainingsService.ts`
  - Add type annotations
- **Effort**: 0.5 dev-days
- **Blast radius**: very low (only used by `WorkerTrainingDownloadButton`)
- **Prerequisites**: none
- **Steps**:
  1. Read the file; identify all parameters and return values.
  2. Rename to `.ts`; add TypeScript types.
  3. Run `npx tsc --noEmit` — fix any new type errors.
- **Acceptance criteria**:
  - [ ] No `.js` files remain in `src/features/*/services/`
  - [ ] `npx tsc --noEmit` stays at 0 errors
- **Verification commands**:
  ```bash
  find src/features -name "*.js" | grep services
  npx tsc --noEmit
  ```

---

### Task S4-T02: Add type definitions to telegram-webhook
- **Addresses**: F-016
- **Layer**: `supabase/functions/telegram-webhook/`
- **Files to change**:
  - `supabase/functions/telegram-webhook/index.ts`
- **Effort**: 0.5 dev-days
- **Prerequisites**: S3-T05 (already editing this file)
- **Steps**:
  1. Define minimal Telegram types at top of file:
     ```ts
     interface TelegramEntity { type: string; offset: number; length: number; }
     interface TelegramMessage {
       text?: string;
       chat: { id: number };
       entities?: TelegramEntity[];
     }
     interface TelegramUpdate {
       message?: TelegramMessage;
       edited_message?: TelegramMessage;
     }
     ```
  2. Replace all `any` with proper types in `getCommand(msg: TelegramMessage)` and `const update = await req.json() as TelegramUpdate`.
- **Acceptance criteria**:
  - [ ] `grep -n ": any\| as any" supabase/functions/telegram-webhook/index.ts` returns empty
  - [ ] Function deploys without Deno type errors

---

### Task S4-T03: Consolidate tasks/types.ts into model.ts
- **Addresses**: F-018
- **Layer**: `src/features/tasks/`
- **Files to change**:
  - Delete `src/features/tasks/types.ts`
  - Update any imports of `types.ts`
- **Effort**: 0.25 dev-days
- **Prerequisites**: none
- **Steps**:
  1. Read `types.ts` — verify it only re-exports from `model.ts`.
  2. Search: `grep -rn "from.*tasks/types" src/`
  3. Update all found imports to use `from '../model'` or `from '@/features/tasks/model'`.
  4. Delete `types.ts`.
- **Acceptance criteria**:
  - [ ] `types.ts` file no longer exists
  - [ ] `npx tsc --noEmit` stays at 0 errors
- **Verification commands**:
  ```bash
  find src/features/tasks -name "types.ts"
  npx tsc --noEmit
  ```

---

### Task S4-T04: Fix barrel exports and other hygiene items
- **Addresses**: F-015, F-019, F-020
- **Effort**: 0.5 dev-days
- **Steps**:
  1. **F-015 — employee-crud barrel**: Add missing exports to `src/features/employee-crud/components/index.ts`:
     ```ts
     export { default as VirtualEmployeeTable } from './VirtualEmployeeTable';
     export { default as OrganizationTelegramReport } from './OrganizationTelegramReport';
     ```
  2. **F-019 — duplicate alignItems**: In `PermitActions.jsx`, remove the duplicate `alignItems: 'center'` from `btnDelete` style object.
  3. **F-020 — silent truncation**: In `OrganizationTelegramReport.jsx`, add warning when truncating:
     ```jsx
     {employeesList.length > 30 && (
       <p style={{ color: '#ef4444', fontSize: 13 }}>
         Показано 30 из {employeesList.length} сотрудников (лимит Telegram)
       </p>
     )}
     ```
- **Acceptance criteria**:
  - [ ] `npx tsc --noEmit` stays at 0 errors
  - [ ] No duplicate `alignItems` in `btnDelete`
  - [ ] Truncation warning visible in UI when org has >30 employees

---

## Out-of-Scope Items (Parking Lot)

| Item | Reason deferred |
|------|----------------|
| Bundle optimization (F-013) | Requires webpack config changes; `recharts` and `@coreui` are the main offenders. Investigate `splitChunks` — not a blocker for correctness |
| Dark mode for feature CSS files (permits, orders, prescriptions) | Large styling effort; consistent with CLAUDE.md "do not normalize" |
| JSX→TSX conversion for Registry/Form components | CLAUDE.md: "one file at a time, only when explicitly requested" |
| Signed URL TTL for employee-photos | Short-lived signed URLs (vs. long-lived) require URL refresh logic; 1-year TTL is pragmatic for MVP |
| `superClean()` improvements in telegram-webhook | Only 6 char replacements; edge case only |
| Per-role RLS (creator-only updates) | Currently single-tenant with trusted staff; relevant only for multi-user RBAC |
| `AdditionalTraining.[key: string]: unknown` index removal | Requires schema audit; could break existing data parsing |

---

## Manual Validation Checklist

After **Sprint 1**, verify in browser:

- [ ] Employee photos load correctly when logged in
- [ ] Employee photos return 403 in incognito (no auth)
- [ ] All permits/orders/prescriptions CRUD operations work
- [ ] Tasks CRUD operations work
- [ ] Permits responsible person dropdown shows full name + profession + organization
- [ ] No console errors about query key mismatches

After **Sprint 2**, verify:

- [ ] Permits/prescriptions/orders notification toasts fire correctly on create/update/delete
- [ ] No `app/providers` imports in `src/features/`
- [ ] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] After resolving a task, viewer modal shows new photo immediately (no reopen needed)

After **Sprint 3**, verify:

- [ ] Delete actions require confirmation (inline confirm or toast)
- [ ] No native `alert()` dialogs appear anywhere in the app
- [ ] Training expiry dates in employee form show correct status
- [ ] Login form logs no email to console (check DevTools)
- [ ] Telegram bot responds to commands within 10 seconds

After **Sprint 4**, verify:

- [ ] No `.js` files in `src/features/*/services/`
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Telegram bot commands still functional after deploy
- [ ] Org report shows warning when >30 employees in selected org

After **all sprints**:

- [ ] Login flow works in dark mode and light mode
- [ ] Permits registry receives Realtime updates (open two tabs; create a permit in one, verify it appears in the other)
- [ ] Prescriptions registry receives Realtime updates
- [ ] CSV export from employees page works
- [ ] Telegram notifications fire on employee report send
- [ ] `npm run build` compiles with 0 errors (warnings for bundle size are acceptable)
- [ ] No console errors in production build
