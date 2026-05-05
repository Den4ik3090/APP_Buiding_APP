# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Profile

PUTEVI Safety — a production React 18 SPA for managing employee training records, safety permits, orders, prescriptions, and tasks for AO PUTEVI. Backend is Supabase (Postgres + Auth + Edge Functions). No test suite exists.

- Hybrid codebase: `.jsx`, `.js`, `.tsx`, `.ts` coexist intentionally — incremental TS migration in progress.
- Styling is also hybrid: global CSS, SCSS, SCSS Modules, and Tailwind utilities coexist.
- Do not normalize either to a single style unless explicitly asked.

## Commands

```bash
npm start          # webpack-dev-server on port 3000 (hot reload)
npm run build      # production bundle → dist/
npx tsc --noEmit   # typecheck only (10 pre-existing errors in legacy JSX areas — do not introduce new ones)
```

No lint or test scripts are configured. Environment: copy `.env.example` → `.env` and fill `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY`.

## Architecture

### Layer structure (partial FSD — in-progress migration)

```
src/
  app/          # App.tsx (auth gate, theme toggle, QueryClient), router.tsx, providers/
  pages/        # One thin shell per route — lazy-load feature components
  widgets/      # app-header/, app-nav/, stats-bar/ — layout-level components
  features/     # Business logic slices: employee-crud/, employee-export/, employee-retrain/, tasks/
  entities/     # Pure data layer: employee/, permit/, order/, prescription/
  components/   # Legacy feature areas not yet migrated to FSD:
                #   EmployeeForm.jsx, AdditionalTrainingsManager.jsx, VirtualEmployeeTable.jsx
                #   OrderRegistry/, PermitsRegistry/, Prescriptions/
  shared/       # Cross-cutting: api/, constants/, hooks/, lib/, styles/, ui/
  auth/         # Isolated auth subsystem (TypeScript, own CSS)
```

**FSD import rule:** layers import only downward (`pages` → `features` → `entities` → `shared`). `shared/` has zero upward dependencies.

### Routing

`HashRouter` + react-router-dom v7. All routes are lazy via `React.lazy`. Defined in `src/app/router.tsx`:

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

### Supabase

Single client at `src/shared/api/supabase.ts` — uses `sessionStorage` for auth. Import from `@/shared/api/supabase`. Do not create secondary clients. Several registry components (e.g. `PrescriptionsRegistry.jsx`) use Supabase Realtime channels — channel name changes break live updates.

### State management

- **Server state:** TanStack Query — used in `features/tasks/` hooks.
- **Local state:** `useState` / `useReducer` directly in components.
- **Employee context:** `EmployeeProvider` (`src/features/employee-crud/EmployeeProvider.tsx`) wraps the authenticated shell.
- **Notifications:** `useNotificationContext()` from `src/app/providers/NotificationProvider.tsx` — `addNotification(message, type, duration)`.

### Dark mode

Tailwind `darkMode: "class"`. `App.tsx` syncs `isDark` state → `document.documentElement.classList.toggle("dark", isDark)`. All `dark:` variants activate from `<html class="dark">`.

### Styling strategy by area

| Area | Strategy |
|------|----------|
| `src/features/tasks/` | SCSS Modules (`tasks.module.scss`, `tasksModal.module.scss`) |
| `src/auth/` | Plain CSS (`auth.css`) + Tailwind utilities |
| `src/components/PermitsRegistry/` | Plain CSS + one SCSS Module (`PermitsDashboard.module.scss`) |
| `src/components/` (legacy) | Per-component CSS/SCSS files co-located |
| `src/shared/ui/` | Tailwind utilities only |
| Global button utilities | `src/shared/styles/modal.css` (`btn-primary`, `btn-danger`, `btn-cancel`) — imported in `src/index.js` |
| Design tokens / mixins | `src/shared/styles/_tokens.scss`, `_mixins.scss` — `@use '../../../shared/styles' as s` |

SCSS Modules: use `styles['hyphenated-class']` bracket notation; use `clsx` (available) for conditional combinations.

### Entity layer

Each entity (`employee`, `permit`, `order`, `prescription`) exports from its barrel `index.ts`:
- `model.ts` — TypeScript interfaces and `Insert`/`Update` helper types
- `constants.ts` — typed `as const` status maps and display labels
- `lib.ts` — pure helper functions (status derivation, date math)

Legacy `src/components/` files import entities via `@/entities/...` aliases.

## Main Zones

- **`src/features/tasks/`** — fully TypeScript, SCSS Modules, TanStack Query. Most modern area of the codebase.
- **`src/components/PermitsRegistry/`, `OrderRegistry/`, `Prescriptions/`** — legacy JSX feature areas; each has its own CSS; change locally.
- **`src/auth/`** — isolated auth subsystem; ask before changing auth flow.
- **`src/shared/api/supabase.ts`** — single Supabase client; ask before modifying.
- **`supabase/functions/telegram-notify/` and `telegram-webhook/`** — protected Edge Functions; ask before any change.

## Working Style

- Read 2-3 similar local files before editing.
- Prefer minimal diffs.
- Preserve current public behavior unless explicitly asked to change it.
- Do not perform broad cleanup or style normalization as a side effect.
- Do not rename files or symbols broadly unless explicitly requested.

## JavaScript / TypeScript Rules

- Do not propose mass JS→TS migration in routine tasks. Convert one file at a time.
- Prefer types at boundaries: props, hook inputs/outputs, utility functions, API return shapes.
- Avoid `any`; prefer narrow types or `unknown`.
- `tsconfig.json` has `allowJs: true` and `strict: true`. `src/declarations.d.ts` declares asset modules (`*.jpg`, `*.png`, `*.svg`) and `*.module.scss`.

## Styling Rules

- Match the local styling strategy of the area being edited.
- Do not migrate CSS to modules, SCSS, or Tailwind as a side effect of an unrelated task.
- Do not redefine `btn-primary`, `btn-cancel`, `btn-danger` in feature CSS — they come from `src/shared/styles/modal.css`.

## React Rules

- Keep changes scoped to the requested feature.
- Do not split large components unless the split is necessary for the fix.
- Reuse nearby local patterns before introducing new abstractions.
- Preserve accessibility semantics and current UX behavior.

## Supabase Rules

- Import the client from `@/shared/api/supabase` — never create a second client.
- Treat query bugs as: client/context mismatch, query shape issue, null/error handling, or policy/runtime assumption.
- Fix the narrowest root cause; do not rewrite the global client for a local bug.
- Do not widen permissions or suggest insecure shortcuts.

## Telegram / Edge Functions

- `supabase/functions/telegram-notify/` and `supabase/functions/telegram-webhook/` are protected operational code.
- Ask before changing webhook handling, env assumptions, function config, or deploy behavior.
- Do not assume local testing flags are safe for production.

## Safety

- Ask before deleting files.
- Ask before changing auth flow in `src/auth/`.
- Ask before changing `src/shared/api/supabase.ts`.
- Ask before changing files under `supabase/functions/`.
- Ask before installing dependencies.
- Ask before broad renames across multiple feature folders.

## Verification

- After structural changes: `npx tsc --noEmit` — confirm error count does not increase above 10.
- After behavior changes: `npx tsc --noEmit` + visual test in browser.
- Summarize changed files and verification results.

## Compaction Instructions

Preserve:
- active task goal
- touched feature area and changed files
- verification commands already run and their results
- unresolved assumptions about auth, Supabase schema, or Telegram integrations
