# LearnProject — Part 2: Advanced Patterns & Developer Mindset

> **Continuation of [LearnProject.md](./LearnProject.md)**
> Part 1 covered FSD architecture, the Service→Hook→Component pipeline, and code standards.
> Part 2 goes deeper: advanced real-world patterns, the app shell, developer thinking, and daily workflow.

---

## Table of Contents

1. [Advanced Pattern: Supabase Realtime](#1-advanced-pattern-supabase-realtime)
2. [Advanced Pattern: Filtering in Hooks vs. the Database](#2-advanced-pattern-filtering-in-hooks-vs-the-database)
3. [Advanced Pattern: Defensive Error Handling in Services](#3-advanced-pattern-defensive-error-handling-in-services)
4. [Advanced Pattern: Constants as Type Sources](#4-advanced-pattern-constants-as-type-sources)
5. [The App Shell — How It All Starts](#5-the-app-shell--how-it-all-starts)
6. [Routing — Lazy Loading Pages](#6-routing--lazy-loading-pages)
7. [Developer Mindset — Why We Made These Choices](#7-developer-mindset--why-we-made-these-choices)
8. [Day-to-Day Workflow](#8-day-to-day-workflow)
9. [Debugging Guide](#9-debugging-guide)
10. [Conclusion](#10-conclusion)

---

## 1. Advanced Pattern: Supabase Realtime

Some features need to update automatically when another user makes a change — without the current user refreshing the page. This is called **Realtime**.

The permits registry uses it. Here is how it works:

```javascript
// src/features/permits/components/PermitsRegistry.jsx (simplified)
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";
import { REALTIME_CHANNELS } from "@/shared/constants/realtimeChannels";

export default function PermitsRegistry() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Open a Supabase Realtime channel subscribed to ALL changes
    // on the 'permits' table (insert, update, delete)
    const permitsSubscription = supabase
      .channel(REALTIME_CHANNELS.PERMITS)       // named channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "permits" },
        () => {
          // When any change arrives, tell TanStack Query to refetch
          queryClient.invalidateQueries({ queryKey: ['permits'] });
        }
      )
      .subscribe();

    // Cleanup: unsubscribe when the component unmounts
    return () => {
      permitsSubscription.unsubscribe();
    };
  }, [queryClient]);
}
```

The channel name comes from a constant:

```typescript
// src/shared/constants/realtimeChannels.ts
export const REALTIME_CHANNELS = {
  PERMITS: 'permits_changes',
  PRESCRIPTIONS: 'prescriptions_registry_changes',
  ORDERS: 'orders_registry_changes',
} as const;
```

**Why a constant instead of a string literal?**

The string `'permits_changes'` is tied to your Supabase infrastructure. If someone types it in two places and one has a typo (`'permit_changes'`), the live update silently breaks — no error, no warning. With a constant, a typo becomes a TypeScript compile error.

**The contract between Realtime and TanStack Query:**

```
DATABASE change
      │
      ▼
Supabase Realtime pushes an event to the browser
      │
      ▼
Component's subscription handler fires
      │
      ▼
queryClient.invalidateQueries({ queryKey: ['permits'] })
      │
      ▼
TanStack Query marks the 'permits' cache as stale and refetches
      │
      ▼
Every component using usePermitsQuery() re-renders with fresh data
```

The component never needs to know *what* changed. It just re-fetches. This is intentionally simple.

---

## 2. Advanced Pattern: Filtering in Hooks vs. the Database

The tasks feature has an interesting decision: where to filter data?

**Option A — Filter in the browser (current approach):**

```typescript
// src/features/tasks/hooks/useTasks.ts

function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.siteId && t.site_id !== filters.siteId) return false;
    if (filters.assignedTo && t.assigned_to !== filters.assignedTo) return false;
    return true;
  });
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[], Error>({
    queryKey: ['tasks', filters],   // ← filters are part of the cache key
    queryFn: async () => {
      const all = await fetchTasks();          // fetch ALL tasks
      return applyFilters(all, filters);       // filter in the browser
    },
  });
}
```

**Why `filters` is in the `queryKey`:**

TanStack Query caches by key. If you call `useTasks({ status: 'pending' })` and `useTasks({ status: 'resolved' })`, they are two separate cache entries. Each gets its own cached result. Without filters in the key, they'd overwrite each other.

```
queryKey: ['tasks']                    ← all tasks (no filter)
queryKey: ['tasks', { status: 'pending' }]  ← pending only
queryKey: ['tasks', { status: 'resolved' }] ← resolved only
```

**Option B — Filter on the server (future improvement from Migration.md):**

```typescript
// Future: push filtering to Supabase
export const fetchTasks = async (filters: TaskFilters) => {
  let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (filters.status)     q = q.eq('status', filters.status);
  if (filters.siteId)     q = q.eq('site_id', filters.siteId);
  if (filters.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
  return q.limit(200);
};
```

Server-side filtering is better at scale (less data transferred, faster response).
Browser-side filtering is simpler and works fine when the dataset is small (< a few thousand rows).

The key lesson: **both approaches are valid patterns in this codebase**. Use the one appropriate for the scale of the feature.

---

## 3. Advanced Pattern: Defensive Error Handling in Services

The tasks service has production-grade defensive code worth studying.

**Problem: tables may not exist yet**

During development or in a fresh deployment, a Supabase table may not exist yet. A normal query returns an error. Without handling this, the app crashes on first load.

```typescript
// src/features/tasks/services/tasksService.ts

// Detects "table does not exist" errors from Supabase / PostgREST
function isTableMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST116' ||
    error.code === '42P01' ||
    (error.message ?? '').includes('does not exist')
  );
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (isTableMissing(error)) return [];  // graceful fallback: empty list
    throw new Error(error.message);         // real errors still propagate
  }
  return (data ?? []) as Task[];
}
```

**Problem: invalid UUIDs crashing inserts**

Supabase requires UUID-formatted strings for UUID columns. If a user somehow passes an empty string or garbage value, the insert fails at the database level.

```typescript
// Validates UUID format before sending to Supabase
function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeUuid(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isUuid(trimmed) ? trimmed : null;  // return null instead of invalid value
}

// Sanitizes a task payload before insert — replaces invalid UUIDs with null
function sanitizeTaskInsert(payload: TaskInsert): TaskInsert {
  const next = { ...payload };
  if ('assigned_to' in next) {
    next.assigned_to = normalizeUuid(next.assigned_to);
  }
  // ... other UUID fields
  return next;
}

export async function createTask(payload: TaskInsert): Promise<Task> {
  const safePayload = sanitizeTaskInsert(payload);  // sanitize first
  const { data, error } = await supabase.from('tasks').insert(safePayload).select().single();
  if (error) throw new Error(error.message);
  return data as Task;
}
```

**Problem: RLS blocking operations silently**

Supabase Row Level Security (RLS) can block a `DELETE` and return no error — it just returns an empty array. Without checking the returned data, the app shows "success" when nothing was actually deleted.

```typescript
export async function deleteTask(id: string): Promise<void> {
  // .select('id') makes PostgREST return deleted rows
  // If RLS blocks the delete or id doesn't exist, data will be empty
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  // Explicit check: empty result means RLS blocked it or id was wrong
  if (!data || data.length === 0) {
    throw new Error('Задача не найдена или недостаточно прав для удаления');
  }
}
```

**When to apply these patterns:**

| Pattern | When to use |
|---------|------------|
| `isTableMissing` check | Any feature whose table might not exist in all environments |
| `normalizeUuid` sanitization | Any INSERT with a UUID field sourced from user input or URL params |
| `.select('id')` after DELETE | Any critical delete where you need to confirm something was actually removed |

---

## 4. Advanced Pattern: Constants as Type Sources

This project uses a powerful TypeScript pattern: deriving types directly from constant objects.

```typescript
// src/shared/constants/toast.ts

export const TOAST_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
} as const;   // ← "as const" makes TypeScript remember the exact literal values

// This creates the type: "success" | "error" | "warning" | "info"
// TypeScript derives it from the object — you don't write the union manually.
export type NotificationType = typeof TOAST_TYPES[keyof typeof TOAST_TYPES];
```

The same pattern appears in the tasks model:

```typescript
// src/features/tasks/model.ts

// Written manually as a union — both approaches are valid
export type TaskStatus = 'pending' | 'in_progress' | 'resolved' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
```

**Why `as const` + derived type is better than just a string union:**

```typescript
// Union type only — no runtime value
type NotificationType = "success" | "error" | "warning" | "info";

// With as const — you have BOTH the runtime values AND the type
addNotification("Saved", TOAST_TYPES.SUCCESS);    // autocomplete works
addNotification("Saved", "succes");               // ← TypeScript error: typo caught
```

If you add a new toast type to `TOAST_TYPES`, the `NotificationType` type automatically expands — you don't need to update the union separately.

**How to add a new constant safely:**

```typescript
// Adding a new status to REALTIME_CHANNELS:

// src/shared/constants/realtimeChannels.ts
export const REALTIME_CHANNELS = {
  PERMITS: 'permits_changes',
  PRESCRIPTIONS: 'prescriptions_registry_changes',
  ORDERS: 'orders_registry_changes',
  HELMETS: 'helmets_changes',   // ← add here
} as const;

// Now use it in your feature:
supabase.channel(REALTIME_CHANNELS.HELMETS).on(...)
```

---

## 5. The App Shell — How It All Starts

When the app loads, `App.tsx` is the entry point. Understanding its structure explains how everything connects.

```typescript
// src/app/App.tsx — annotated

// 1. QueryClient is created ONCE, at the top level.
//    staleTime: 5 minutes — data is considered fresh for 5 minutes
//    retry: 1 — retry failed requests once before giving up
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  // 2. Auth state — null = not logged in, object = logged in
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 3. Dark mode — reads the OS preference on first load
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // 4. Subscribe to Supabase auth changes
  //    This fires on login, logout, and token refresh
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      if (event === "SIGNED_OUT") navigate("/");
    });

    return () => data?.subscription?.unsubscribe();
  }, []);

  // 5. Sync dark mode with the <html> element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    // 6. QueryClientProvider wraps EVERYTHING — all hooks access the same cache
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <ToastContainer ... />

        {authLoading ? (
          // 7. Show skeleton while checking session
          <SkeletonLoader rows={8} />
        ) : !session ? (
          // 8. Show login if not authenticated
          <LoginPage ... />
        ) : (
          // 9. Show the full app shell when authenticated
          <>
            <AppHeader ... />
            <StatsBar />
            <AppNav />
            {/* 10. ErrorBoundary catches crashes in any page below */}
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </>
        )}
      </div>
    </QueryClientProvider>
  );
}
```

**The three states of the app:**

```
App loads
    │
    ▼
authLoading = true  →  Show SkeletonLoader (blank loading screen)
    │
    ▼
getSession() resolves
    │
    ├── session = null   →  Show LoginPage
    │
    └── session = {...}  →  Show full app (Header + StatsBar + Nav + Router)
```

**Why `QueryClientProvider` wraps everything:**

TanStack Query stores its cache inside the `QueryClient`. The `QueryClientProvider` makes that cache accessible to every hook in the component tree via React context. Without it, `useQuery` would crash. It must be at the top, above any component that uses `useQuery` or `useMutation`.

---

## 6. Routing — Lazy Loading Pages

All pages are loaded lazily — their JavaScript bundle is only downloaded when the user first navigates to that route.

```typescript
// src/app/router.tsx

// React.lazy: tells the bundler to split this into a separate JS chunk
const EmployeesPage = lazy(() => import("@/pages/employees/EmployeesPage"));
const AnalyticsPage = lazy(() => import("@/pages/analytics/AnalyticsPage"));
const PermitsPage   = lazy(() => import("@/pages/permits/PermitsPage"));
// ... etc.

export function AppRouter() {
  return (
    // Suspense shows the fallback while the lazy chunk is downloading
    <Suspense fallback={<SkeletonLoader rows={8} />}>
      <Routes>
        <Route path="/"                   element={<EmployeesPage />} />
        <Route path="/analytics"          element={<AnalyticsPage />} />
        <Route path="/organizations"      element={<OrganizationsPage />} />
        <Route path="/additional-trainings" element={<AdditionalTrainingsPage />} />
        <Route path="/permits"            element={<PermitsPage />} />
        <Route path="/orders"             element={<OrdersPage />} />
        <Route path="/prescriptions"      element={<PrescriptionsPage />} />
        <Route path="/tasks"              element={<TasksPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Why lazy loading matters:**

Without lazy loading, all 8 pages load upfront. A user who only uses the Employees page downloads the Charts library, the Permits forms, the Task editor — everything — on first load. With lazy loading, they only download what they visit.

**The `HashRouter` choice:**

The app uses `HashRouter` (URLs look like `/#/permits`) instead of `BrowserRouter` (URLs look like `/permits`). This is because the app is served as a static file deployment — there's no server to handle route rewrites. A `HashRouter` works without any server configuration.

**Adding a new route:**

```typescript
// Step 1: Create the page file
// src/pages/helmets/HelmetsPage.tsx
export default function HelmetsPage() {
  return <HelmetDashboard />;
}

// Step 2: Add the lazy import in router.tsx
const HelmetsPage = lazy(() => import("@/pages/helmets/HelmetsPage"));

// Step 3: Add the route
<Route path="/helmets" element={<HelmetsPage />} />

// Step 4: Add the nav link in AppNav.tsx
```

---

## 7. Developer Mindset — Why We Made These Choices

This chapter explains the "why" behind the major architectural decisions. Understanding the reasoning helps you make consistent decisions in new situations.

---

### 7.1 Why FSD instead of organizing by type?

Many React projects are organized like this:

```
src/
  components/   ← ALL components
  hooks/        ← ALL hooks
  services/     ← ALL services
  types/        ← ALL types
```

This seems logical until the project grows. Then you have `components/EmployeeTable.tsx`, `components/PermitsRegistry.tsx`, `components/TaskCalendar.tsx` — 40 files in one folder with no relationship between them. To understand what code touches "permits", you grep across all four folders.

FSD organizes by **business domain** instead:

```
features/permits/
  services/    ← only permits services
  hooks/       ← only permits hooks
  components/  ← only permits components
```

Everything about permits lives in one place. You can delete the permits feature by deleting one folder. You can understand it by reading one folder.

---

### 7.2 Why TanStack Query instead of `useState` + `useEffect`?

Early in the project, data fetching looked like this:

```typescript
// The old pattern — still visible in OrganizationManager.tsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  supabase.from('table').select('*').then(({ data }) => {
    setData(data);
    setLoading(false);
  });
}, []);
```

This has hidden problems:
- **No caching.** Navigate to the page, leave, come back — it fetches again from the database
- **No deduplication.** If three components need the same data, three database requests are made
- **No background refresh.** If the data changes on the server, the user sees stale data until they reload
- **Manual loading/error state.** Every component reinvents the same `isLoading`, `isError` pattern
- **No invalidation.** After a mutation, you must manually update local state or re-fetch

TanStack Query solves all of these. It is not just a "fancy fetch wrapper" — it is a **server state management library**. The distinction matters: server state (data in Supabase) is fundamentally different from UI state (is this modal open?). TanStack Query handles server state. `useState` handles UI state.

---

### 7.3 Why `sessionStorage` for auth instead of `localStorage`?

```typescript
// src/shared/api/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage,  // intentional
  },
});
```

`localStorage` persists across browser sessions — close the browser, open it tomorrow, you're still logged in. `sessionStorage` only persists for the current tab. Close the tab or the browser, the session ends.

For a safety management application tracking real employees at a construction site, having sessions automatically expire when the browser closes is the **correct security behavior**. This was an explicit security decision and must not be changed without a full security review.

---

### 7.4 Why strict TypeScript with zero `any`?

A TypeScript project with `any` scattered through it provides weaker guarantees than plain JavaScript — because developers feel safe but TypeScript isn't actually checking anything.

The discipline of zero `any` means:
- Every function's inputs and outputs are documented in code
- Renaming a database column cascades through TypeScript errors to every consumer
- You can refactor confidently — if it compiles, the types are consistent

The `formatDataForApp` pattern in `employeesService.ts` is the key example: the database returns `birth_date`, the app expects `birthDate`. Without types, a misnamed field would silently return `undefined` in the UI — a runtime bug. With strict types, it's a compile-time error.

---

### 7.5 Why no `EmployeeProvider` Context anymore?

The original app used a React Context to share employee data across components:

```typescript
// OLD — removed from the codebase
const EmployeeContext = createContext(...)

function EmployeeProvider({ children }) {
  const [employees, setEmployees] = useState([]);
  // ...fetch on mount, pass to context
  return <EmployeeContext.Provider value={employees}>{children}</EmployeeContext.Provider>;
}
```

Problems with this approach:
- If any component in the tree called `setEmployees`, it re-rendered every Context consumer
- The data was only fetched once on mount — navigating away and back got stale data
- The Provider had to wrap the entire authenticated shell — it was global, not feature-scoped
- Mutations required passing `setEmployees` as a callback *into* the API functions (anti-pattern)

The replacement is simple: any component that needs employees calls `useEmployeesQuery()` directly. TanStack Query handles deduplication, caching, and re-rendering. No Provider needed.

---

## 8. Day-to-Day Workflow

### Starting the Dev Server

```bash
# Copy env file if you haven't yet
cp .env.example .env
# Fill in REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY

# Start the dev server
npm start
# Opens at http://localhost:3000
```

### Before Every Change

```bash
# Check the TypeScript baseline
npx tsc --noEmit
# Must output nothing (0 errors)
```

### After Every Change

```bash
# Verify you haven't broken types
npx tsc --noEmit
# Must still output nothing

# Build to check for bundle issues
npm run build
# Must end with "compiled with 0 errors" (warnings about bundle size are OK)
```

### Finding Where Something Lives

```bash
# Find which file defines a component
grep -rn "export default function PermitsRegistry" src/

# Find all places that use a hook
grep -rn "useEmployeesQuery" src/

# Find all files that import from a specific path
grep -rn "from '@/features/permits" src/

# Check if any as any crept back in
grep -rn "as any" src/ --include="*.ts" --include="*.tsx"

# Check for FSD violations (shared importing upward)
grep -rn "from.*features\|from.*app/providers" src/shared/
```

### Understanding an Unfamiliar Feature

1. Start at the page: `src/pages/[feature]/[Feature]Page.tsx` — see what it imports
2. Go to the hook: `src/features/[feature]/hooks/use[Feature].ts` — see `queryKey` and `queryFn`
3. Go to the service: `src/features/[feature]/services/[feature]Service.ts` — see the DB calls
4. Check the entity: `src/entities/[entity]/model.ts` — understand the data shape

Following this chain top-down gives you the complete picture in about 5 minutes.

---

## 9. Debugging Guide

### Problem: Component shows no data, no error

```
Checklist:
1. Open browser DevTools → Network tab
   - Is the Supabase request being made?
   - If no request: useQuery may be disabled (check 'enabled' option)
   - If request fails: check the response body for the Supabase error

2. Is the queryKey correct?
   - useEmployeesQuery has queryKey: ['employees']
   - If you call invalidateQueries({ queryKey: ['employee'] }), the cache never refreshes
   - Keys must match EXACTLY (including nesting)

3. Is the component inside QueryClientProvider?
   - If you see "No QueryClient set, use QueryClientProvider" — move the component
     inside the App's QueryClientProvider tree
```

### Problem: TypeScript error after editing a service

```
Most common cause: you changed a function's return type but haven't updated
all its consumers.

Run: npx tsc --noEmit
The error message will show exactly which file on which line needs to be updated.
```

### Problem: SCSS styles not applying

```
Checklist:
1. Are you using relative paths, not @/?
   @use '../../styles' as s;   ← correct
   @use '@/shared/styles' as s; ← broken

2. Are you using bracket notation for hyphenated names?
   styles['my-class']   ← correct
   styles.my-class      ← TypeScript error (hyphens aren't valid identifiers)

3. Did you import the SCSS module in the component?
   import styles from './MyComponent.module.scss';
```

### Problem: Realtime updates not arriving

```
Checklist:
1. Is the channel name correct?
   Use REALTIME_CHANNELS.PERMITS — don't type the string manually
   grep -rn "\.channel(" src/ to find all subscriptions

2. Is Realtime enabled for this table in Supabase?
   Supabase Dashboard → Database → Replication → check the table is listed

3. Is the component unmounting too early?
   Check that the useEffect cleanup returns the unsubscribe function
```

### Problem: Mutation succeeds but the UI doesn't update

```
Most common cause: the invalidateQueries queryKey doesn't match.

Example of the bug:
  // mutation invalidates:
  qc.invalidateQueries({ queryKey: ['employee'] });   ← singular

  // but the query uses:
  queryKey: ['employees'],                            ← plural

Fix: make sure the string in invalidateQueries exactly matches
the string in queryKey.
```

---

## 10. Conclusion

You now have a complete map of the PUTEVI Safety codebase. Let's summarize the three principles that govern every decision:

---

**Principle 1 — Layers go one direction.**

Code flows downward: pages use widgets, widgets use features, features use entities, entities use shared. If you ever find yourself importing "upward" — a feature importing from a page, or a shared hook importing from a feature — stop. Restructure the code so the dependency flows down.

This rule is what makes features deletable, testable, and understandable in isolation.

---

**Principle 2 — Separate what changes from what doesn't.**

The database schema changes rarely. The UI changes often. The TypeScript types are a contract between them.

This is why service functions exist: they absorb the schema knowledge so components stay clean. When a column is renamed in Supabase, you change one function in the service — not forty component files.

---

**Principle 3 — Make invalid states impossible.**

`as any` makes invalid states possible. Returning `undefined` from a function that promised `Employee[]` makes invalid states possible. A `queryKey` that doesn't match its invalidation makes invalid states possible.

The TypeScript strictness, the explicit return types, the `as const` constant patterns — all of these are mechanisms to make the compiler catch problems before they reach production.

Construction sites have safety protocols not because workers are careless, but because the consequences of accidents are severe. Code standards exist for the same reason.

---

### The Files That Matter Most

| File | Why it matters |
|------|---------------|
| `src/shared/api/supabase.ts` | The single database connection — never duplicate |
| `src/entities/employee/model.ts` | The core data contract of the entire app |
| `src/features/employee-crud/services/employeesService.ts` | The reference implementation of a service layer |
| `src/features/employee-crud/hooks/useEmployees.ts` | The reference implementation of a hook layer |
| `src/features/tasks/services/tasksService.ts` | Shows advanced defensive patterns |
| `src/app/App.tsx` | The root — auth, QueryClient, dark mode, ErrorBoundary |
| `src/app/router.tsx` | All routes with lazy loading |
| `src/shared/constants/realtimeChannels.ts` | Why constants matter for infrastructure strings |

---

### What's Not Yet Done (Honest Assessment)

A few things in the codebase are marked for future improvement in `Migration.md`:

| Item | Location | Why it's OK for now |
|------|----------|---------------------|
| `OrganizationManager.tsx` uses local state instead of TanStack Query | `features/organization-docs/` | Works correctly; TanStack Query migration would improve background refresh |
| `fetchTasks()` fetches all rows, filters in browser | `features/tasks/` | Fine for small datasets; server-side filtering would improve at scale |
| `xlsx` imported statically | `features/employee-export/` | Adds ~800KB to initial bundle; dynamic import would improve load time |
| `AppLayout.module.scss` dead file | `src/` | No code references it; safe to delete |

These are known trade-offs, not mistakes. The codebase is production-ready as-is. These are quality-of-life improvements for later.

---

*End of LearnProject Part 2.*
*For the full architecture reference, see [CLAUDE.md](./CLAUDE.md).*
*For the migration history, see [Migration.md](./Migration.md).*
