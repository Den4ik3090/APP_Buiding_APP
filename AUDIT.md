# Technical Audit — PUTEVI Safety OHS Registry
**Date:** 2026-05-03
**Auditor:** Principal Software Architect
**Scope:** Full codebase — pre-production 500k user launch

---

## Executive Summary

The codebase is in active mid-migration: a modern FSD shell (features/tasks, shared/, widgets/, pages/) coexists with an unmodified legacy layer (src/components/ with ~15 JSX files, src/utils/ constants). The task domain is the most mature module and can serve as the template for migrating everything else. Three issues demand immediate attention before any public launch: (1) `fetchTasks()` loads the entire tasks table into the browser and filters client-side — this will collapse Supabase quotas and degrade to seconds of load time at scale; (2) the `tasks` and `task_resolutions` tables have no `created_by` column, making audit trails and correct permission scoping impossible; (3) there are zero automated tests and no CI pipeline, meaning any regression ships silently. The single most important action is to add server-side filtering with pagination to `useTasks` before adding users.

---

## Block 1 — Architecture

### Architecture Type
**Hybrid monolith** — Feature-Sliced Design partially adopted. The `features/tasks` slice is fully FSD-compliant. All other features remain as flat JSX files in `src/components/`.

### Layer Map

| Layer | Path | Status |
|---|---|---|
| App | `src/app/` | ✅ Clean |
| Pages | `src/pages/` | ✅ Thin wrappers |
| Widgets | `src/widgets/` | ✅ 3 widgets |
| Features | `src/features/tasks/` | ✅ Complete FSD slice |
| Features | `src/features/employee-crud/`, `employee-export/`, `employee-retrain/` | ⚠️ Partial — no components/ sub-layer |
| Shared | `src/shared/` | ✅ api/, hooks/, ui/, lib/, constants/ |
| Legacy | `src/components/` | ❌ 15 JSX files, no layer boundaries |
| Legacy | `src/utils/`, `src/style/` | ❌ Not migrated |

### FSD Boundary Violations
- `src/components/utils/helpers.js` — utility inside legacy components folder, not in `shared/`
- `src/features/employee-crud/api.ts` — feature-level API file with no model.ts or types.ts (breaks FSD slice contract)
- `src/features/employee-retrain/api.ts` — same issue
- `AdditionalTrainingsManager.jsx` and `OrganizationManager.jsx` live in `src/components/` but behave as features — no FSD isolation

### Dead Files
- **`src/App.jsx`** — root-level App component superseded by `src/app/App.tsx`. Still present, never imported. Webpack entry is `src/index.js` → `src/app/App.tsx`, so this is orphaned dead code.
- **`src/pages/Login.example.tsx`** — example file committed into the production source tree. Will be included in type-checking and potentially in the bundle if imported by mistake.

### Circular Dependencies
None detected from file structure. FSD import direction (app → pages → widgets → features → shared) appears respected in the modern layer.

### Anti-Patterns
- **God components**: `EmployeeForm.jsx` handles employee creation, editing, photo upload, training management, and multi-tab UI — estimated 600–1000 lines. `AdditionalTrainingsManager.jsx` manages its own data fetching, form state, and table rendering.
- **Prop drilling survivors**: `OrganizationTelegramReport.jsx` appears to receive data props without a context — needs verification but likely a drilling chain.
- **Mixed abstraction levels**: `src/components/OrderRegistry/` contains `OrderForm.jsx`, `OrdersRegistry.jsx`, `OrdersTable.jsx`, and `ResponsiblePersonMultiSelect.jsx` — four different abstraction levels in one flat folder.

### Single Points of Failure
- `src/shared/api/supabase.ts` — throws at module load time if env vars are missing. A misconfigured deploy will crash before React mounts, showing a blank page with no error UI.
- `NotificationProvider` — if this throws, the entire app tree is unmounted.

---

## Block 2 — Code Quality

### Logic Errors

**`src/shared/hooks/useNotification.ts:23–29` — Timer mutation race condition**
```typescript
const notification: Notification = { id, message, type, duration };
setNotifications((prev) => [...prev, notification]); // ← passes reference
if (duration > 0) {
  const timer = setTimeout(() => { removeNotification(id); }, duration);
  notification.timer = timer; // ← mutates AFTER setState
}
```
`setNotifications` is called before `timer` is assigned. The state array holds the same object reference, so the mutation lands in time before any render reads it — but this relies on JavaScript reference semantics and React's batched rendering to not race. It violates the React contract that state must not be mutated directly. Under React concurrent features with time-slicing, the render reading the state could execute before the timer assignment. Fix: pass the timer to `setNotifications` directly.

**`src/shared/hooks/useNotification.ts:21` — Suppressed hook dependency lint rule**
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
[]
```
`removeNotification` is called inside `addNotification`'s callback but excluded from deps. Works at runtime because both have stable `[]` deps, but this suppression will mask real issues when hooks change in the future.

**`src/app/App.tsx:30` — `session: any`**
Supabase provides `Session | null` type. Using `any` disables type safety on the entire auth state.

**`src/features/tasks/services/tasksService.ts:106–107` — Debug logs in production path**
```typescript
console.log('createTask payload:', payload);
console.log('createTask safePayload:', safePayload);
```
These leak task contents (including user-identifiable task data) to the browser console in development. Webpack TerserPlugin removes them in production builds (`drop_console: true`), but they still exist in dev builds and make the dev console noisy.

### Readability Score: 6/10
- Modern TS files (tasks feature, auth module): 8/10 — well-structured, typed
- Legacy JSX files (components/): 4/10 — inline styles, no type boundaries, mixed concerns

### React Best Practices
- `App.tsx` calls `useNavigate()` then uses it inside a `useEffect` — this is correct usage but the navigate reference is not in the effect's dep array (line 57). Under React 18 strict mode + concurrent features this can cause navigate to fire twice on mount.
- `EmployeeProvider` wraps only the authenticated subtree — correct isolation.
- All task feature hooks properly use `useCallback` and `useMemo`.

### Dead Code
- `src/App.jsx` — orphaned, never imported
- `src/pages/Login.example.tsx` — example file, never imported by router
- `src/style/styles.css.ts` — Vanilla Extract file; unclear if imported anywhere

---

## Block 3 — Performance

### Critical: Client-Side Filtering in `useTasks`
**`src/features/tasks/hooks/useTasks.ts:23–26`**
```typescript
queryFn: async () => {
  const all = await fetchTasks();        // SELECT * FROM tasks — no limit
  return applyFilters(all, filters);     // filter in browser
},
```
`fetchTasks()` issues `SELECT * FROM tasks ORDER BY created_at DESC` with no `WHERE`, no `LIMIT`, no pagination. At 500 tasks this is tolerable. At 50,000 tasks (a single large construction project), each filter change downloads the entire table, parses the JSON, and re-filters in JS. At 500k users with shared tables, this is a denial-of-service vector.

### Re-render Risks
- `useTasks` re-creates the `filters` object on every render of any consumer that writes `useTasks({ status: 'pending' })` inline — the object literal is a new reference each render, invalidating the TanStack Query cache key every render. Callers must memoize the filters object.
- `NotificationProvider` exposes `addNotification` from `useNotification` — since `addNotification` has suppressed deps, any component consuming `addNotification` from context will not re-render unnecessarily, but the suppression is fragile.

### Bundle Size Risks

| Package | Size (est.) | Notes |
|---|---|---|
| `@coreui/coreui` + `@coreui/react` | ~400 KB | Full Bootstrap-based UI framework |
| `recharts` | ~450 KB | Charting library |
| `chart.js` + `react-chartjs-2` | ~220 KB | Second charting library — likely redundant |
| `xlsx` | ~800 KB | Excel export — loaded globally |
| `@vanilla-extract/css` | ~20 KB | Zero-runtime, fine |
| `framer-motion` | ~150 KB | Listed in Migration.md as potentially dead |

Two charting libraries (`recharts` and `chart.js` + `react-chartjs-2`) are both in the bundle. If only one is actually used, removing the other saves ~250–450 KB.

`xlsx` should be dynamically imported at the call site (download button), not loaded at app startup.

### Lazy Loading
- All 8 routes are lazy-loaded via `React.lazy` — ✅ correct
- Heavy components inside pages (modals, analytics dashboards, virtual tables) are NOT lazy-loaded — they render synchronously on page load even if never opened

### Supabase Query Efficiency
- `fetchTasks()` — no server-side filtering, no pagination, no field selection (`SELECT *` includes all columns including large `description` text)
- `supabase.from('employees').select('id, name')` in `TaskCreateModal.tsx` — ✅ correct (only needed fields)
- `fetchResolutionsByTask` — ✅ correct (filtered by task_id)

### Virtual List Usage
`VirtualEmployeeTable.jsx` uses `react-window` — correct for large employee lists. Cannot confirm row height calculation correctness without reading the file.

### Memory Leaks
- `AuthLayout.tsx` — attaches `change` listener to `window.matchMedia` and removes it on cleanup — ✅ correct
- `App.tsx` — Supabase `onAuthStateChange` subscription is unsubscribed on cleanup — ✅ correct
- `useTaskResolution.ts` — AbortController pattern correctly prevents state updates after unmount
- `useNotification.ts` — `removeAllNotifications` clears all timers; `removeNotification` clears individual timers — ✅ correct

### Animation Performance
- `auth.css` blob animations use `transform` only — ✅ composited, no repaint
- `auth-btn::before` shimmer uses `left` transition — ❌ `left` is not composited; triggers layout. Fix: use `transform: translateX(-100%)` → `translateX(100%)` instead.

---

## Block 4 — Scalability

### `fetchTasks` — Table Scan at Scale
As noted in Block 3: full table scan per render. At 500k users with a shared `tasks` table and no `site_id` filtering in RLS, every authenticated user downloads every task from every site. The `site_id` column exists on tasks but is not enforced in RLS policies — it is filtered only client-side in `useTasks`.

### Multi-Tenant Readiness
- `site_id` column exists on `tasks` — ✅ schema is multi-tenant aware
- RLS policies do NOT filter by `site_id` — all authenticated users can SELECT all tasks regardless of site
- No tenant isolation layer; `useTasks` filters `siteId` client-side only
- At 500k users across N sites, this means user A from site X can read all tasks from site Y

### State Management at Scale
- TanStack Query v5 with appropriate `staleTime` (5 minutes) — ✅ caching is configured
- `queryKey: ['tasks', filters]` — the filters object equality check uses deep comparison in TanStack Query v5 — ✅ correct
- No optimistic updates — every mutation waits for server round-trip before showing result

### Supabase Connection Pooling
- Default Supabase connection pooling (PgBouncer) should handle connection spikes if the project uses the pooler URL
- `supabase/.temp/pooler-url` exists — ✅ pooler is configured
- `storageService.ts` calls `supabase.auth.getUser()` on every photo upload — adds one extra network round-trip; could be cached from session

### Real-Time Subscriptions
None implemented. All data is polled via TanStack Query invalidation. For a compliance SaaS where task status changes need to propagate to field workers promptly, this may be acceptable but should be explicitly documented.

### Horizontal Scaling
Static SPA + Supabase managed backend — inherently horizontally scalable on the frontend. The bottleneck is Supabase database performance and connection limits.

---

## Block 5 — Security

### RLS Coverage

| Table | RLS Enabled | Policy Quality | Issues |
|---|---|---|---|
| `tasks` | ✅ Yes (hardening migration) | ⚠️ Partial | `assigned_to IS NULL` allows any user to UPDATE/DELETE unassigned tasks |
| `task_resolutions` | ✅ Yes (hardening migration) | ⚠️ Partial | INSERT open to all authenticated users regardless of task ownership |
| `employees` | ❓ Not in migrations | Unknown | No migration found for employees table RLS |
| `organizations` | ❓ Not in migrations | Unknown | No migration found |
| Other tables (orders, permits, prescriptions) | ❓ Not in migrations | Unknown | No migrations found for legacy tables |

**Only 2 of an estimated 8+ tables have RLS migrations in the repository.** Legacy component tables (orders, permits, prescriptions, additional_trainings) have no visible RLS. This is the most severe security gap.

### Auth Session Handling
- `storage: window.sessionStorage` in `supabase.ts` — sessions are NOT persisted in localStorage. Tab close = logout. This is a deliberate security choice but creates UX friction and should be documented.
- `App.tsx:44–64` — `getSession()` and `onAuthStateChange` are both called. On page load, `getSession` resolves first, then `onAuthStateChange` fires `INITIAL_SESSION`. If `setSession` is called twice in the same tick, React 18 batches them — ✅ no double-render issue.
- Race condition: `isMounted` guard in the `getSession` cleanup is correct — ✅

### Storage Bucket Security
- Initial migration: bucket `tasks` was `public: true` — any unauthenticated user could read photo evidence
- `security_hardening.sql` sets `public: false` and requires authentication for SELECT — ✅ fixed if migration is applied
- Storage write policy scopes to `auth.uid()` folder: `(storage.foldername(name))[1] = auth.uid()::text` — ✅ prevents path traversal
- `storageService.ts:17` generates path as `${user.id}/${taskId}/${fileId}.jpg` — matches the policy folder expectation — ✅

### File Upload Validation
- **Client-side only**: `TaskResolveModal.tsx` validates magic bytes (JPEG/PNG/WEBP) and file size (20 MB) in the browser
- **No server-side validation**: Supabase Storage does not validate MIME type on insert by default. A malicious user bypassing the UI can upload any file type to the bucket
- `contentType: 'image/jpeg'` is set in the upload call, but Supabase Storage accepts the declared content type without verifying the actual bytes
- Fix: use a Supabase Edge Function as an upload proxy, or use Storage Transform + a server-side hook

### Input Sanitization
- `sanitizeTaskInsert` in `tasksService.ts` validates UUID fields — ✅ prevents invalid UUID injection
- Task `title` and `description` are stored as plain text — no HTML injection risk in a React app (React escapes by default)
- No SQL injection risk — all queries use the Supabase client's parameterized query builder

### Secrets Exposure
- `.env` file is present in the project directory with real Supabase credentials. The key (`sb_publishable_*`) is the anonymous/publishable key — it is embedded in the frontend bundle anyway via `webpack.DefinePlugin`, so exposure is expected. **However**, `.env` should be in `.gitignore` to prevent accidental commit of future secret values.
- Supabase URL is exposed in the bundle — expected and acceptable for client-side Supabase usage
- No service role key detected in client code — ✅ correct

### Telegram Webhook
- `supabase/functions/telegram-webhook/` is marked as protected — not audited per CLAUDE.md
- `supabase/functions/telegram-notify/` — not audited per CLAUDE.md

### XSS Vectors
- All dynamic content is rendered through React JSX — React escapes by default — ✅
- No `dangerouslySetInnerHTML` detected in the audited files
- Telegram message composition (if any) should be audited separately for injection into bot messages

---

## Block 6 — DevOps & Infrastructure

### Build Pipeline
- Webpack 5 with `splitChunks` in production, `eval-cheap-module-source-map` in dev — ✅ reasonable
- `publicPath: isProduction ? undefined : "/"` — `undefined` publicPath in production means Webpack uses relative paths. This works only if the app is served from the domain root. Deployment to a subdirectory (e.g., `https://example.com/safety/`) will break all asset references. Fix: set `publicPath: '/'` explicitly or inject via env var.
- `drop_console: true` in TerserPlugin — ✅ debug logs removed from production build
- `cacheDirectory: true` on babel-loader — ✅ faster rebuilds
- Vanilla Extract webpack plugin configured — ✅

### Environment Variable Handling
- `process.env.REACT_APP_SUPABASE_URL` validated at module load — throws if missing — a missing env var shows a blank page with no error message to the user. Better: validate in a separate init check and show a friendly error boundary.
- `.env.example` exists with placeholder values — ✅ good developer onboarding

### Error Boundaries
- **Zero error boundaries in the component tree**
- If `EmployeeForm.jsx`, `OrdersRegistry.jsx`, or any async component throws, the entire app unmounts with a blank white screen
- `React.lazy` routes are wrapped in `<Suspense>` for loading — ✅ — but NOT in an `<ErrorBoundary>` for errors
- Any unhandled promise rejection in a query will propagate to `throwOnError: false` in `useTasks` but other hooks may not have this protection

### Logging Strategy
- No structured logging
- `console.log` in `tasksService.ts` (dev only — removed by Terser in prod)
- No Sentry, DataDog, LogRocket, or equivalent error monitoring configured
- At 500k users, silent JS errors are invisible — production incidents will be discovered by users, not engineers

### Monitoring and Alerting
- No frontend error monitoring
- No performance monitoring (Web Vitals, Lighthouse CI)
- Telegram alerting exists for some events (via Edge Functions) — scope unclear

### CI/CD Pipeline
- **No CI configuration detected** (no `.github/workflows/`, `.gitlab-ci.yml`, etc.)
- Every deploy is manual
- No automated lint, typecheck, or build verification before deployment
- No staging environment mentioned

### Supabase Edge Function Safety
- Protected per CLAUDE.md — not evaluated

---

## Block 7 — Issues Table

| # | Severity | Block | File(s) | Description | Risk |
|---|---|---|---|---|---|
| 1 | CRITICAL | Scalability | `useTasks.ts`, `tasksService.ts` | `fetchTasks()` loads entire tasks table with no pagination, no server-side filtering, no LIMIT. At scale this exhausts Supabase row limits and degrades to seconds. | Performance / crash |
| 2 | CRITICAL | Security | `supabase/migrations/tasks_schema.sql` + all legacy tables | RLS is only applied to `tasks` and `task_resolutions`. Employees, orders, permits, prescriptions, organizations tables have no visible RLS migrations. Any authenticated user can read/write all rows. | Security breach |
| 3 | CRITICAL | Security | `supabase/migrations/security_hardening.sql` | `assigned_to IS NULL` in UPDATE/DELETE policies lets any authenticated user modify or delete any unassigned task. | Data loss |
| 4 | CRITICAL | Architecture | — | `tasks` and `task_resolutions` tables have no `created_by` column. Audit trail is impossible. Permission model relies solely on `assigned_to`, which breaks when tasks are reassigned or created without an assignee. | Data loss / compliance |
| 5 | CRITICAL | DevOps | — | Zero automated tests. Zero CI pipeline. Any regression ships silently to production. | Crash / data loss |
| 6 | HIGH | Architecture | `src/App.jsx` | Dead root-level `App.jsx` alongside `src/app/App.tsx`. If accidentally imported, it will render a stale app version with no context providers. | Crash |
| 7 | HIGH | Performance | `auth.css:152–162` | `.auth-btn::before` shimmer uses `left` property transition — triggers layout recalculation on every animation frame. Should use `transform: translateX`. | Performance |
| 8 | HIGH | Scalability | `useTasks.ts` | `filters` object passed inline at call sites creates a new object reference every render, causing TanStack Query to see a new cache key every render and re-fetch. | Performance |
| 9 | HIGH | Code Quality | `useNotification.ts:23–29` | `notification.timer` is set after `setNotifications` call — direct state mutation. Works today due to reference semantics, breaks under React concurrent rendering. | Crash |
| 10 | HIGH | Security | `storageService.ts` | File type validation is client-side only. Server has no MIME enforcement. A user bypassing the browser UI can upload arbitrary files to the `tasks` storage bucket. | Security breach |
| 11 | HIGH | Code Quality | `tasksService.ts:106–107` | `console.log` of full task payload in `createTask`. Removed by Terser in prod but exposes task data in dev. Remove or use a structured logger. | UX / data leak (dev) |
| 12 | HIGH | DevOps | — | No error boundaries anywhere in the component tree. Any thrown error shows a blank white screen. | Crash / UX |
| 13 | HIGH | DevOps | `webpack.config.js:17` | `publicPath: undefined` in production. Deploying to any non-root path breaks all asset URLs. | Crash |
| 14 | HIGH | Scalability | `tasks_schema.sql` + `security_hardening.sql` | `site_id` is stored but not enforced in any RLS policy. Users from site A can read, update, and delete tasks from site B. | Security breach |
| 15 | MEDIUM | Code Quality | `App.tsx:30` | `session: any` — disables type safety on the central auth state object. | Reliability |
| 16 | MEDIUM | Performance | `package.json` | `chart.js` + `react-chartjs-2` AND `recharts` both in dependencies — two charting libraries. Estimated 300–450 KB wasted bundle weight. | Performance |
| 17 | MEDIUM | Performance | `package.json` | `xlsx` loaded at app startup — ~800 KB library used only on export button click. Should be a dynamic import. | Performance |
| 18 | MEDIUM | Architecture | `src/pages/Login.example.tsx` | Example file committed to production source tree. TypeScript checks it, it counts toward bundle analysis, and it can be accidentally imported. | Reliability |
| 19 | MEDIUM | Code Quality | `useNotification.ts:21` | `eslint-disable-next-line react-hooks/exhaustive-deps` suppresses a valid warning. The pattern is coincidentally safe but fragile — any future change to `removeNotification` deps will introduce a stale closure silently. | Reliability |
| 20 | MEDIUM | Scalability | `supabase.ts` | `storage: window.sessionStorage` — sessions expire on tab close. At 500k users in field conditions (mobile browsers, backgrounded tabs), frequent re-auth will cause data loss mid-form. | UX |
| 21 | MEDIUM | DevOps | — | No structured logging or error monitoring (Sentry/DataDog). Production errors at 500k users are invisible until users report them. | Reliability |
| 22 | MEDIUM | Architecture | `src/components/utils/helpers.js` | Utility functions inside legacy components folder — not accessible to FSD layers without crossing layer boundaries. | Architecture debt |
| 23 | LOW | Code Quality | `useNotification.ts:11` | `type: string` in `Notification` interface instead of a union type like `'success' | 'error' | 'warning' | 'info'`. Type safety lost at notification creation sites. | Reliability |
| 24 | LOW | Architecture | `src/features/employee-crud/api.ts`, `employee-retrain/api.ts` | Feature slices without `model.ts` or `types.ts` — incomplete FSD contract; types and API shapes are not co-located with the feature. | Architecture debt |
| 25 | LOW | Security | `supabase.ts` | Supabase anon key is embedded in the bundle via `DefinePlugin`. This is expected behavior for public Supabase projects but should be documented — any operator who reads the bundle source can make authenticated API calls as the anonymous role. | Security (by design) |

---

## Block 8 — Improvement Roadmap

### Phase 1 — Quick Wins (< 1 day each)

| Action | File(s) | Effort | Impact | Expected Effect |
|---|---|---|---|---|
| Add server-side filters to `fetchTasks` — pass `status`, `siteId`, `assignedTo` as `.eq()` clauses; add `.limit(100)` with cursor pagination | `tasksService.ts`, `useTasks.ts` | 2h | CRITICAL | Eliminates full table scan; query time drops from O(n) to O(1) |
| Remove `console.log` from `createTask` | `tasksService.ts:106–107` | 5min | HIGH | Stops data leakage; clean production logs |
| Delete `src/App.jsx` and `src/pages/Login.example.tsx` | both files | 5min | HIGH | Removes confusion and TypeScript noise |
| Add `publicPath: '/'` to production webpack output | `webpack.config.js:17` | 5min | HIGH | Fixes asset loading on any subdirectory deployment |
| Fix `auth-btn::before` shimmer: replace `left` transition with `transform: translateX` | `auth.css:152–168` | 15min | HIGH | Converts to composited animation, eliminates layout recalc |
| Add `created_by uuid REFERENCES auth.users(id)` to `tasks` migration + populate via `auth.uid()` on INSERT | new migration file | 1h | CRITICAL | Enables audit trail; correct permission model |
| Wrap `<AppRouter>` in an `<ErrorBoundary>` component; add a second boundary around `<NotificationProvider>` | `src/app/App.tsx`, new `ErrorBoundary.tsx` | 2h | HIGH | Blank screen on error becomes a user-friendly error page |
| Fix `useNotification.ts` timer mutation: pass `timer` inside the `setNotifications` updater function | `useNotification.ts` | 30min | HIGH | Eliminates state mutation anti-pattern |
| Fix `NotificationProvider` type: `type: string` → `'success' | 'error' | 'warning' | 'info'` union | `useNotification.ts`, `constants/toast.ts` | 30min | MEDIUM | Full type safety on notification creation |
| Fix `App.tsx:30` session type: `session: any` → `Session \| null` from `@supabase/supabase-js` | `App.tsx` | 15min | MEDIUM | Type safety on auth state |

### Phase 2 — Medium Term (1–5 days each)

| Action | File(s) | Effort | Impact | Expected Effect |
|---|---|---|---|---|
| Write RLS migrations for all legacy tables: `employees`, `orders`, `permits`, `prescriptions`, `organizations`, `additional_trainings` — enforce `site_id` isolation | new migration files | 2 days | CRITICAL | Eliminates cross-tenant data access; required for multi-tenant launch |
| Add `site_id` to RLS policies on `tasks`: `USING (site_id = current_setting('app.site_id')::uuid OR auth.role() = 'service_role')` or via a join | `security_hardening.sql` (new migration) | 1 day | CRITICAL | Prevents cross-site data leakage |
| Move file upload validation server-side: create a Supabase Edge Function that receives the file, validates magic bytes, compresses, and writes to storage | new Edge Function | 3 days | HIGH | Closes server-side file type bypass |
| Remove duplicate charting library: audit `AnalyticsDashboard.jsx` — if using only one of chart.js or recharts, remove the other | `package.json`, `AnalyticsDashboard.jsx` | 1 day | MEDIUM | ~300–450 KB bundle reduction |
| Dynamic import for `xlsx`: wrap the download function in `import('xlsx').then(...)` | `exportToCSV.ts`, download button component | 2h | MEDIUM | ~800 KB removed from initial bundle |
| Set up a GitHub Actions CI pipeline: lint + `tsc --noEmit` + `npm run build` on every PR | `.github/workflows/ci.yml` | 4h | HIGH | Regressions caught before merge |
| Add Sentry (or equivalent) for error monitoring: wrap `createRoot` render with `Sentry.init`, add `Sentry.ErrorBoundary` | `src/index.js` | 4h | HIGH | Production errors become visible within seconds |
| Migrate `auth.sessionStorage` → `localStorage` with explicit session timeout via a custom `signOut` timer, or document the sessionStorage choice and add a "you will be logged out on tab close" UX affordance | `supabase.ts`, `AuthLayout.tsx` | 1 day | MEDIUM | Either better UX for field workers or documented security decision |
| Paginate `fetchTasks` with infinite scroll or "load more": TanStack Query `useInfiniteQuery` + Supabase `range()` | `useTasks.ts`, `TaskList.tsx` | 2 days | HIGH | Scales to 100k+ tasks |
| Memoize filter objects at all `useTasks` call sites | all `useTasks` consumers | 2h | HIGH | Stops unnecessary cache key invalidation |

### Phase 3 — Long Term (strategic)

| Action | Effort | Impact | Expected Effect |
|---|---|---|---|
| Complete FSD migration: move `src/components/` features into proper FSD slices (`features/employees`, `features/permits`, `features/prescriptions`, `features/orders`) — one feature per sprint | 4–6 weeks | HIGH | Uniform architecture, easier onboarding, testable boundaries |
| Add a test suite: unit tests for utility functions and hooks (Vitest), integration tests for critical user flows (Playwright) — target 60% coverage on business logic | 3–4 weeks | HIGH | Regressions caught before QA; required for 500k launch confidence |
| Implement real-time task updates via Supabase Realtime subscriptions — replace polling with `channel().on('postgres_changes', ...)` | 1 week | MEDIUM | Field workers see task status changes without refreshing |
| Introduce a proper multi-tenant model: `organizations` table with `org_id` on all entities; RLS uses `auth.jwt() ->> 'org_id'` via a custom JWT claim set on login | 2–3 weeks | CRITICAL | Required for selling to multiple construction companies |
| Move all charting to a single library (recharts recommended — tree-shakeable) and remove chart.js + @coreui charting components | 1 week | MEDIUM | 300–450 KB bundle reduction; single rendering model |
| Consolidate CSS to two systems: Tailwind (auth module, new features) + SCSS modules (migrated legacy) — eliminate plain CSS files in `src/style/` | 2–3 weeks | LOW | Removes 5 parallel CSS systems; predictable specificity |

---

## Block 9 — Final Scorecard

| Dimension | Score /10 | Key Risk |
|---|---|---|
| Architecture | 5/10 | Two-tier codebase — FSD island surrounded by legacy JSX; dead files |
| Code quality | 6/10 | Good in tasks feature; console.log, `any`, state mutation in shared layer |
| Performance | 5/10 | Full table scan on every filter; two charting libs; no pagination |
| Scalability | 3/10 | No server-side filtering, no site_id RLS enforcement, no pagination |
| Security | 4/10 | Only 2 of ~8 tables have RLS; no site isolation; client-only file validation |
| DevOps / infra | 3/10 | No CI, no tests, no error monitoring, no error boundaries |
| TypeScript health | 6/10 | tasks feature excellent; `session: any`, `type: string`, suppressed lint |
| Test coverage | 0/10 | Zero tests |
| **OVERALL** | **4/10** | |

**System maturity: 4/10**
**Scale readiness: NOT READY**

### Top 3 Risks Before 500k Launch

1. **No RLS on legacy tables + no site isolation** — every authenticated user can read and modify every other user's compliance records (orders, permits, prescriptions, employees). This is a data breach at first multi-tenant customer. Fix: write and deploy RLS migrations for all 6+ tables with site_id isolation *before* any second organization is onboarded.

2. **Full table scan in `useTasks` with no pagination** — at 10,000 tasks the UI freezes; at 100,000 tasks the Supabase free/pro tier hits row-read billing limits within days. Fix: server-side filtering with `.eq()` and cursor pagination must be in place before beta.

3. **Zero tests + zero CI** — the codebase has no automated verification layer. A single bad merge (wrong RLS migration, broken auth flow, broken task creation) ships directly to all users with no signal until users complain. Fix: GitHub Actions with `tsc --noEmit` + build check + at minimum smoke tests on critical flows before launch.

---

## Implementation Checklist

- [ ] **CRITICAL** `created_by` column added to `tasks` table
- [ ] **CRITICAL** Server-side filtering + pagination implemented in `useTasks` / `fetchTasks`
- [ ] **CRITICAL** RLS migrations written and deployed for all tables (employees, orders, permits, prescriptions, organizations, additional_trainings)
- [ ] **CRITICAL** `site_id` enforced in RLS on all tables
- [ ] **CRITICAL** `assigned_to IS NULL` clause reviewed and tightened in tasks UPDATE/DELETE policy
- [ ] **HIGH** Error boundaries added around `<AppRouter>` and `<NotificationProvider>`
- [ ] **HIGH** `console.log` removed from `tasksService.ts`
- [ ] **HIGH** `src/App.jsx` and `src/pages/Login.example.tsx` deleted
- [ ] **HIGH** `publicPath: '/'` set in production webpack config
- [ ] **HIGH** `auth-btn::before` shimmer changed to `transform: translateX`
- [ ] **HIGH** CI pipeline running `tsc --noEmit` + `npm run build` on every PR
- [ ] **HIGH** Error monitoring (Sentry or equivalent) connected
- [ ] **MEDIUM** Duplicate charting library removed
- [ ] **MEDIUM** `xlsx` converted to dynamic import
- [ ] **MEDIUM** `session: any` typed correctly in `App.tsx`
- [ ] **MEDIUM** `Notification.type` narrowed to union type
- [ ] **MEDIUM** `useNotification` timer mutation refactored
- [ ] Security checklist passed (all tables have RLS verified in staging)
- [ ] Performance baseline measured (Lighthouse, bundle size report)
- [ ] Build verified: `npm run build` passes with no warnings
- [ ] TypeCheck verified: `tsc --noEmit` passes
