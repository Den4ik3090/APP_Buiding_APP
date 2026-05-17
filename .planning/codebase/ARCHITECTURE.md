# ARCHITECTURE
> Generated: 2026-05-16 | Focus: arch

## Summary
PUTEVI Safety is a React 18 SPA following Feature-Sliced Design (FSD) with a complete migration — `src/components/` has been deleted and all logic lives in proper FSD layers. Server state is managed exclusively via TanStack Query; there is no global client state beyond auth session. Routing is hash-based with lazy-loaded pages.

## Architectural Pattern: Feature-Sliced Design (FSD)

FSD layers (top to bottom, imports flow downward only):

```
app       → auth gate, QueryClient, providers, router
pages     → thin shells, lazy-load features/widgets
widgets   → composite UI blocks (dashboard, nav, header, layout)
features  → business logic slices (CRUD, exports, tasks, permits, etc.)
entities  → pure data layer (types, constants, lib helpers)
shared    → cross-cutting utilities (api client, hooks, ui, styles, constants)
```

**Hard rule:** `shared/` has zero upward dependencies. No imports from `features/`, `app/`, or `pages/` anywhere in `shared/`.

## State Management

- **Server state:** TanStack Query exclusively — every Supabase-connected feature uses `useXxxQuery()` / `useXxxMutation()` hooks with a 5-minute stale time and 1 retry.
- **No global employee context:** `EmployeeProvider` was removed. Components call `useEmployeesQuery()` directly.
- **Notifications:** `useNotificationContext()` from `src/app/providers/NotificationProvider.tsx`. In `shared/` hooks, `addNotification` is received as a parameter to avoid upward imports.
- **Auth state:** Local `useState` in `App.tsx`, driven by `supabase.auth.onAuthStateChange`.
- **Theme:** Local `useState` in `App.tsx`; synced to `document.documentElement.classList` for Tailwind dark mode.

## Data Flow

```
Component
  ↓ calls
Hook (useXxxQuery / useXxxMutation) — TanStack Query
  ↓ calls
Service (src/features/xxx/services/xxxService.ts) — pure async functions
  ↓ calls
Supabase client (src/shared/api/supabase.ts) — single instance
  ↓
Supabase Postgres / Storage / Realtime / Edge Functions
```

## Routing

- `HashRouter` + react-router-dom v7
- All routes lazy via `React.lazy` + `Suspense` (fallback: `SkeletonLoader`)
- Defined in `src/app/router.tsx`

| Path | Page |
|------|------|
| `/` | EmployeesPage |
| `/analytics` | AnalyticsPage |
| `/organizations` | OrganizationsPage |
| `/additional-trainings` | AdditionalTrainingsPage |
| `/permits` | PermitsPage |
| `/orders` | OrdersPage |
| `/prescriptions` | PrescriptionsPage |
| `/tasks` | TasksPage |
| `/about` | AboutPage |
| `/newcomponent` | NewReactComponent (scratch/dead page) |

## Auth Architecture

- Supabase Auth with `sessionStorage` persistence (intentional security decision — no localStorage).
- `App.tsx` calls `supabase.auth.getSession()` on mount, then subscribes to `onAuthStateChange`.
- Unauthenticated users see `<LoginPage />` from `src/auth/`.
- Auth subsystem is isolated: `src/auth/` has its own CSS, TypeScript, components.

## Dark Mode

- Tailwind `darkMode: "class"` strategy.
- `isDark` state in `App.tsx` → `document.documentElement.classList.toggle("dark", isDark)`.
- All `dark:` variants activate from `<html class="dark">`.

## Key Architectural Decisions

- **FSD over component folders:** Prevents cross-feature spaghetti imports; enforced by import direction rule.
- **Services layer mandatory:** All Supabase calls in `services/` files — components and hooks never call Supabase directly (3 legacy JSX exceptions remain in orders/permits/prescriptions).
- **TanStack Query over Redux/Zustand:** Supabase is the source of truth; server state caching is all that's needed.
- **HashRouter:** Avoids server-side routing config for static hosting.
- **sessionStorage auth:** Security requirement — tokens don't survive browser restarts.

## Gaps / Unknowns
- No server-side rendering or SSR concerns (pure SPA).
- `src/features/component-test-react/` is a scratch page with no clear owner.
