# CONVENTIONS
> Generated: 2026-05-16 | Focus: quality

## Summary
The codebase enforces strict TypeScript (0 `as any`, 4 unavoidable `as unknown as`), complete FSD layer separation, and a hybrid styling strategy that varies by area. New code should match the local conventions of the area being edited — do not normalize across areas.

## TypeScript Strictness

- `tsconfig.json`: `strict: true`, `allowJs: true` (JSX files coexist)
- **`as any` is forbidden.** Current count: 0. Do not introduce.
- `as unknown as T` is allowed only for unavoidable Supabase generic limitations. Current count: 4. Do not add more.
- Prefer narrow types. Use `unknown` at system boundaries (user input, external APIs).
- Type assertions (`as SpecificType`) are allowed when unavoidable; never `as any`.
- Verification: `npx tsc --noEmit` must return 0 errors after every change.

## File Extensions

- Hybrid state: `.tsx` (modern) and `.jsx` (legacy) coexist.
- 16 `.jsx` files remain in `orders/`, `permits/`, `prescriptions/`, and `employee-crud/`.
- **Do not convert `.jsx` → `.tsx` unless explicitly requested.** When converting, do one file at a time.
- All new files must be `.tsx` (components) or `.ts` (non-JSX logic).

## Naming Conventions

| Thing | Convention |
|-------|-----------|
| Components | PascalCase, `.tsx` |
| Hooks | `useXxx.ts` |
| Services | `xxxService.ts` |
| Models | `model.ts` (per entity) |
| Constants | `constants.ts` (per entity), `UPPER_SNAKE_CASE` values |
| SCSS Modules | `componentName.module.scss` |
| Barrel exports | `index.ts` in each feature's `components/` |

## FSD Import Rules

- Layers import **downward only**: `pages` → `features`/`widgets` → `entities` → `shared`
- `shared/` has **zero upward dependencies** — no imports from `features/`, `app/`, or `pages/`
- Every feature slice that touches Supabase must have a `services/` subfolder with pure async functions
- Every new feature `components/` folder must have an `index.ts` barrel export
- New feature/widget slices follow: `services/` → `hooks/` → `components/` → `index.ts`

## Supabase Rules

- Import the client from `@/shared/api/supabase` — **never create a second client**
- All Supabase calls go in `services/` files, never in components or hooks directly
- Do not change the `sessionStorage` auth setting (security decision)
- Do not rename Realtime channel strings without coordinated infrastructure change

## Notification Pattern

- In components/hooks that have React context: `useNotificationContext()` → `addNotification(message, type, duration)`
- In `shared/` hooks: receive `addNotification` as a parameter (prevents upward imports)

## Styling Conventions by Area

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

**Match the local strategy — do not normalize across areas.**

## SCSS-Specific Rules

- **`@/` aliases are NOT resolved by sass-loader** — always use relative paths in `.scss` files (e.g. `@use '../../../shared/styles' as s`)
- SCSS Modules: use `styles['hyphenated-class']` bracket notation; use `clsx` for conditionals
- Color operations: use `@use "sass:color"` + `color.adjust()`. **Never** use deprecated `darken()`/`lighten()`
- Never use CSS `filter:` hacks for color manipulation

## Global Button Classes

`btn-primary`, `btn-cancel`, `btn-danger` are defined in `src/shared/styles/modal.css`. Do not redefine them in feature CSS files.

## Component Rules

- Keep changes scoped to the requested feature
- Do not split large components unless the split is required by the task
- Reuse nearby local patterns before introducing new abstractions
- Preserve accessibility semantics and current UX behavior

## Comment Policy

- Default: **write no comments**
- Only add a comment when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug
- Never explain WHAT the code does (good naming does that)
- Never reference the current task, issue number, or caller in comments

## react-window v2 API (v2.2.5)

This project uses react-window **v2**, not v1. The API differs significantly:
- Import: `import { List, RowComponentProps } from "react-window"` — `FixedSizeList` does NOT exist
- Props: `rowCount`, `rowHeight`, `rowComponent`, `rowProps`, `defaultHeight`
- Row renderer type: `RowComponentProps`

## Gaps / Unknowns
- No ESLint configuration found — lint rules are not enforced automatically.
- No Prettier configuration found — formatting is not automated.
