# CLAUDE.md

## Role & Objective
You are an expert Frontend Engineer and Senior UI/UX Designer specializing in building premium, production-ready, dark-themed user interfaces. Your code must be modular, highly performant, and visually flawless.

## Core UI/UX Principles
* **Visual Hierarchy:** Maintain strict spacing tokens, consistent padding/margins, and a clear typographic scale.
* **Premium Dark Theme:** Use deep, cohesive dark palettes (e.g., slate, zinc, or neutral grays) with deliberate contrast ratios that meet WCAG AA standards. Avoid generic, oversaturated gradients.
* **Micro-interactions:** Implement subtle, purposeful animations and transitions (using CSS or Framer Motion) to enhance the user experience without adding bloat.

## Strict Engineering Constraints
* **No Inline Styles:** All styling must be encapsulated using CSS Modules, SCSS, or Tailwind CSS classes depending on the project structure.
* **No Emoji Icons:** Use professional icon libraries (e.g., Lucide React, Radix Icons, Heroicons) for all visual indicators. Never use emojis as iconography.
* **Clean & Scalable Code:** Follow the existing architectural patterns (like Feature-Sliced Design if applicable). Avoid hardcoded values; abstract them into constants or theme tokens.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Profile

PUTEVI Safety — a production React 18 SPA for managing employee training records, safety permits, orders, prescriptions, and tasks for AO PUTEVI. Backend is Supabase (Postgres + Auth + Edge Functions).

- **TypeScript status: 100% strict.** `npx tsc --noEmit` → 0 errors. `as any` count: 0. `as unknown as` count: 4 (unavoidable Supabase generic limitations — do not add more).
- **FSD status: complete.** `src/components/` has been fully deleted. All features live in `src/features/` or `src/widgets/`. Zero `features` → `app` import violations.
- **Test infrastructure: ready.** `jest.config.js`, `babel.config.js`, `jest.setup.ts`, 25 tests in `src/__tests__/`. Run `npm test` after installing deps (requires network).
- **Error monitoring: ready.** `src/app/sentry.ts` — activate by uncommenting `Sentry.init` after `npm install @sentry/react` + `REACT_APP_SENTRY_DSN` in `.env`.
- **CI: active.** `.github/workflows/ci.yml` — runs `tsc --noEmit` + `npm run build` on push/PR. Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` secrets in repo Settings.
- Hybrid file extensions remain: `.jsx` files exist inside feature slices (registry components not yet converted). Do not convert them unless explicitly asked.
- Styling is hybrid: global CSS, SCSS, SCSS Modules, and Tailwind utilities coexist. Do not normalize.

## Commands

```bash
npm start              # webpack-dev-server on port 3000 (hot reload)
npm run build          # production bundle → dist/
npx tsc --noEmit       # typecheck — must stay at 0 errors
npm test               # Jest (requires: npm install deps first)
npm run test:coverage  # Jest with coverage report
```

Environment: copy `.env.example` → `.env`, fill `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY`.

## Architecture

### Layer structure (FSD — migration complete)

```
src/
  app/          # App.tsx (auth gate, theme, QueryClient, ErrorBoundary), router.tsx, providers/
  pages/        # Thin shells per route — lazy-load feature/widget components
  widgets/      # analytics-dashboard/, app-header/, app-nav/, layout/, stats-bar/
  features/     # Business logic slices (see below)
  entities/     # Pure data layer: employee/, permit/, order/, prescription/
  shared/       # Cross-cutting: api/, constants/, hooks/, lib/, styles/, ui/
  auth/         # Isolated auth subsystem (TypeScript, own CSS)
```

**FSD import rule:** layers import only downward (`pages` → `features`/`widgets` → `entities` → `shared`). `shared/` has zero upward dependencies — no imports from `features/`, `app/`, or `pages/`.

### Feature slices

| Slice | Has service layer | Has hooks (TanStack Query) | Notes |
|-------|-------------------|----------------------------|-------|
| `employee-crud/` | `services/employeesService.ts` | `hooks/useEmployees.ts` | Full TSX |
| `employee-export/` | — | — | `exportToCSV.ts` only |
| `employee-retrain/` | — | — | Thin |
| `tasks/` | `services/tasksService.ts` | `hooks/useTasks.ts` | Most modern; SCSS Modules |
| `permits/` | `services/permitsService.ts` | `hooks/usePermits.ts` | JSX components |
| `orders/` | `services/ordersService.ts` | `hooks/useOrders.ts` | JSX components |
| `prescriptions/` | `services/prescriptionsService.ts` | `hooks/usePrescriptions.ts` | JSX components |
| `organization-docs/` | `services/organizationDocsService.ts` | — | Full TSX; exports `OrgDoc`, `DocsStatus` |
| `additional-trainings/` | — | — | `AdditionalTrainingsManager.tsx`; uses recharts + dynamic xlsx |

### Widgets

| Widget | Notes |
|--------|-------|
| `analytics-dashboard/ui/AnalyticsDashboard.tsx` | Strict TSX; recharts + react-window v2; props-only (no Supabase) |
| `stats-bar/StatsBar.tsx` | Reads from `useEmployeesQuery` |
| `app-nav/AppNav.tsx` | Navigation shell |
| `app-header/` | Header shell |
| `layout/` | Page layout wrapper |

### Routing

`HashRouter` + react-router-dom v7. All routes lazy via `React.lazy`. Defined in `src/app/router.tsx`:

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

Single client at `src/shared/api/supabase.ts` — `sessionStorage` auth (intentional security decision). Import from `@/shared/api/supabase`. Never create secondary clients.

Realtime channels: `PermitsRegistry.jsx` and `PrescriptionsRegistry.jsx` subscribe to named channels. **Do not rename channel strings without a coordinated Supabase infrastructure change.**

### State management

- **Server state:** TanStack Query — all features with Supabase data use `useXxxQuery()` / `useXxxMutation()` hooks.
- **No global employee context:** `EmployeeProvider` was removed. Call `useEmployeesQuery()` directly in any component that needs employee data.
- **Notifications:** `useNotificationContext()` from `src/app/providers/NotificationProvider.tsx` — `addNotification(message, type, duration)`. In `shared/` hooks, receive `addNotification` as a parameter instead of importing the context.

### Dark mode

Tailwind `darkMode: "class"`. `App.tsx` syncs `isDark` → `document.documentElement.classList.toggle("dark", isDark)`. All `dark:` variants activate from `<html class="dark">`.

### Styling strategy by area

| Area | Strategy |
|------|----------|
| `src/features/tasks/` | SCSS Modules (`tasks.module.scss`, `tasksModal.module.scss`) |
| `src/auth/` | Plain CSS (`auth.css`) + Tailwind utilities |
| `src/features/permits/components/` | Plain CSS + `PermitsDashboard.module.scss` |
| `src/features/orders/components/` | Plain CSS co-located |
| `src/features/prescriptions/components/` | Plain CSS co-located |
| `src/widgets/analytics-dashboard/` | Tailwind utilities only |
| `src/shared/ui/` | Tailwind utilities only |
| `src/shared/ui/ErrorBoundary/` | SCSS Module (`ErrorBoundary.module.scss`) |
| Global button utilities | `src/shared/styles/modal.css` — `btn-primary`, `btn-danger`, `btn-cancel` |
| Design tokens / mixins | `src/shared/styles/_tokens.scss`, `_mixins.scss` |

SCSS Modules: use `styles['hyphenated-class']` bracket notation; use `clsx` for conditionals.

**SCSS sass-loader constraint:** `@/` aliases are NOT resolved by sass-loader. Always use relative paths in SCSS files (e.g. `@use '../../../shared/styles' as s`). Use `@use "sass:color"` + `color.adjust()` for color manipulation — never CSS `filter:` hacks.

### Entity layer

Each entity (`employee`, `permit`, `order`, `prescription`) exports from its barrel `index.ts`:
- `model.ts` — TypeScript interfaces and `Insert`/`Update` helper types
- `constants.ts` — typed `as const` status maps and display labels
- `lib.ts` — pure helper functions (status derivation, date math)

### react-window v2 API (v2.2.5)

This project uses react-window **v2**, not v1. The API is different:
- Import: `import { List, RowComponentProps } from "react-window"` — `FixedSizeList` does NOT exist.
- Props: `rowCount`, `rowHeight`, `rowComponent`, `rowProps`, `defaultHeight` — not `itemCount`/`itemSize`/`children`/`height`.
- Row renderer type: `RowComponentProps` (not `ListChildComponentProps`).

## Reference Files

| Purpose | File |
|---------|------|
| Service layer pattern | `src/features/tasks/services/tasksService.ts` |
| TanStack Query hook pattern | `src/features/tasks/hooks/useTasks.ts` |
| Entity model pattern | `src/entities/employee/model.ts` |
| Strict TSX component | `src/features/employee-crud/components/EmployeeTable.tsx` |
| Widget with strict types | `src/widgets/analytics-dashboard/ui/AnalyticsDashboard.tsx` |
| Service with exported types | `src/features/organization-docs/services/organizationDocsService.ts` |
| SCSS Module usage | `src/features/tasks/components/tasks.module.scss` |
| Component split pattern | `src/features/employee-crud/components/employeeFormTypes.ts` + `employeeFormHelpers.ts` |
| Test pattern | `src/__tests__/employeeFormHelpers.test.ts` |

## TypeScript Rules

- **`as any` is forbidden.** Current count: 0. Do not introduce any.
- Prefer narrow types. Use `unknown` at system boundaries. Avoid type assertions unless unavoidable — if needed, use `as SpecificType`, never `as any`.
- `tsconfig.json`: `allowJs: true`, `strict: true`. `src/declarations.d.ts` declares asset modules and `*.module.scss`.
- Convert `.jsx` → `.tsx` only when explicitly requested; one file at a time.

## FSD Rules

- Every feature slice that touches Supabase **must** have a `services/` subfolder with pure async functions. No direct `supabase` calls in components or hooks.
- Every feature `components/` folder **must** have an `index.ts` barrel export (public API).
- Every new feature or widget slice must follow the same pattern: `services/` → `hooks/` → `components/` → `index.ts`.
- `shared/` must have zero upward dependencies. If a `shared/` hook needs notification access, receive `addNotification` as a parameter.
- New imports into `shared/` from `features/`, `app/`, or `pages/` are a hard FSD violation.

## Styling Rules

- Match the local styling strategy of the area being edited.
- Do not migrate CSS to modules, SCSS, or Tailwind as a side effect of an unrelated task.
- Do not redefine `btn-primary`, `btn-cancel`, `btn-danger` in feature CSS — they come from `src/shared/styles/modal.css`.
- For SCSS color operations: use `@use "sass:color"` and `color.adjust()`. Never use deprecated `darken()`/`lighten()`.

## React Rules

- Keep changes scoped to the requested feature.
- Do not split large components unless the split is required.
- Reuse nearby local patterns before introducing abstractions.
- Preserve accessibility semantics and current UX behavior.

## Supabase Rules

- Import the client from `@/shared/api/supabase` — never create a second client.
- All Supabase calls go in `services/` files, not in components or hooks directly.
- Do not change `sessionStorage` auth setting in `supabase.ts` without explicit request — this is a security decision.
- Do not change Realtime channel name strings without a coordinated infrastructure change.

## Telegram / Edge Functions

- `supabase/functions/telegram-notify/` and `supabase/functions/telegram-webhook/` are protected.
- Ask before changing webhook handling, env assumptions, function config, or deploy behavior.

## Safety

- Ask before deleting files.
- Ask before changing auth flow in `src/auth/`.
- Ask before changing `src/shared/api/supabase.ts`.
- Ask before changing files under `supabase/functions/`.
- Ask before installing dependencies.
- Ask before broad renames across multiple feature folders.

## Verification

- After any change: `npx tsc --noEmit` — must stay at **0 errors**.
- After behavior changes: `npx tsc --noEmit` + visual test in browser.
- Summarize changed files and verification result.

## Compaction Instructions

Preserve:
- active task goal
- touched feature area and changed files
- verification commands already run and their results
- unresolved assumptions about auth, Supabase schema, or Telegram integrations

### AI-Workflow Tools
- **Autonomous Audit**: Use `.claude/skills/sbt-autonomous-audit` for deep project scans.
- **Verification Gates**: All features must pass `npx tsc --noEmit` and RLS check before completion.
- **Reporting**: Always update `AUDIT_REPORT.md` and `IMPROVEMENT_PLAN.md` after architectural changes.

## AI Orchestration & Sub-Agents
When handling complex tasks, use the specialized skills in `.claude/skills/`:

1. **Audit & Health**: Use `sbt-autonomous-audit` for deep scans and `AUDIT_REPORT.md` updates.
2. **Feature Building**: Use `sbt-feature-architect` to scaffold new FSD slices.
3. **UI/UX Integrity**: Use `sbt-ui-registry-review` when modifying lists or data grids.
4. **Performance**: Use `sbt-performance-audit` to check for rendering bottlenecks.

**Workflow Enforcement**:
- Always run `npx tsc --noEmit` before declaring a task finished.
- Never bypass the `services/` layer for direct Supabase calls in components.
- If a task involves security, trigger the `security-audit` skill automatically.