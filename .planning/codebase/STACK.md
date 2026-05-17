# Technology Stack
> Generated: 2026-05-16 | Focus: tech

## Summary
PUTEVI Safety is a React 18 SPA built with TypeScript (strict mode, 0 errors enforced) and bundled via Webpack 5. Styling is intentionally hybrid — global CSS, SCSS, SCSS Modules, and Tailwind utilities coexist by area. Server state is managed entirely through TanStack Query v5; there is no global client-side state store.

## Languages

**Primary:**
- TypeScript 5.3 — all `src/**/*.ts` and `src/**/*.tsx` files; strict mode on; `allowJs: true` for legacy `.jsx` coexistence
- JavaScript (JSX) — some feature registry components not yet converted (`permits/`, `orders/`, `prescriptions/` registry files)

**Runtime target:**
- ES2020, `lib: ["ES2020", "DOM", "DOM.Iterable"]`
- `browserslist: > 0.25%, not dead` (polyfilled via core-js 3 + `useBuiltIns: "usage"`)

## Runtime

**Environment:**
- Node.js 20 (pinned in CI via `.github/workflows/ci.yml`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present; CI uses `npm ci`

## Frameworks

**Core:**
- React 18.2 (`react`, `react-dom`) — functional components, hooks throughout
- React Router DOM 7.14 — `HashRouter`; all routes lazy via `React.lazy`; defined in `src/app/router.tsx`

**Animation:**
- Framer Motion 12.38 — used in auth UI and select components

**UI Components:**
- CoreUI React 5.10 (`@coreui/react`, `@coreui/icons-react`, `@coreui/icons`) — used for select/form primitives in some feature slices
- Lucide React 1.14 — icon set used across TSX components
- Custom shared UI in `src/shared/ui/` — Toast, Skeleton, ErrorBoundary, etc.

**Charts / Data Visualization:**
- Recharts 3.8 — used in `src/widgets/analytics-dashboard/ui/AnalyticsDashboard.tsx` and `src/features/additional-trainings/`
- Chart.js 4.5 + react-chartjs-2 5.3 — secondary chart library (coexists with recharts)

**Virtualization:**
- react-window 2.2.5 — IMPORTANT: This is v2, not v1. API differs significantly.
  - Import: `import { List, RowComponentProps } from "react-window"` (no `FixedSizeList`)
  - Props: `rowCount`, `rowHeight`, `rowComponent`, `rowProps`, `defaultHeight`
  - Used in `src/features/employee-crud/components/VirtualEmployeeTable.tsx`
- react-virtualized-auto-sizer 2.0 — paired with react-window for container sizing

**State Management:**
- TanStack Query (React Query) 5.100 — all server state; `QueryClient` instantiated in `src/app/App.tsx` with `staleTime: 5min`, `retry: 1`
- No global client state store (Redux, Zustand, etc.)
- `NotificationProvider` in `src/app/providers/NotificationProvider.tsx` — only global React context (toast notifications)

**Testing:**
- Jest (jsdom environment) — config at `jest.config.js`
- Babel-jest transform — `babel-jest` handles TS/TSX/JS/JSX
- `@playwright/test` 1.59 — installed but E2E test files not confirmed present in `src/`
- 25 tests in `src/__tests__/`; coverage collected from `src/features/**` and `src/entities/**`

## Build Tooling

**Bundler:** Webpack 5.89 — config at `webpack.config.js`
- Entry: `src/index.js`
- Output: `dist/` with content-hash filenames in production
- Loaders: babel-loader (JS/TS), css-loader + postcss-loader + sass-loader (styles), asset/resource (images/fonts), asset/inline (SVG)
- Production: MiniCssExtractPlugin, TerserPlugin (`drop_console: true`, 2 passes), splitChunks (recharts isolated to own chunk)
- Dev: `style-loader`, `eval-cheap-module-source-map`, HMR on port 3000
- Filesystem cache enabled
- Path alias: `@` → `src/`; resolved in webpack AND in `tsconfig.json` paths; NOT available in sass-loader (use relative paths in SCSS)

**TypeScript:** `tsc --noEmit` only (Babel handles transpilation); `moduleResolution: "bundler"`

**Babel Presets:**
- `@babel/preset-env` (useBuiltIns: usage, corejs 3)
- `@babel/preset-react`
- `@babel/preset-typescript`

## Styling

**Strategy is hybrid by area — do not normalize:**

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

**Tools:**
- Tailwind CSS 3.4 — `darkMode: "class"`; custom animation keyframes defined in `tailwind.config.js`; `tailwind-merge` 3.5 for conditional class merging
- Sass 1.97 (Dart Sass) — SCSS Modules use bracket notation `styles['hyphenated-class']`; color ops via `@use "sass:color"` + `color.adjust()` (never `darken()`/`lighten()`)
- PostCSS + Autoprefixer — in loader chain
- `clsx` 2.1 — conditional class assembly

## Key Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.91.1 | Backend client (Postgres, Auth, Storage, Realtime, Edge Functions) |
| `@tanstack/react-query` | ^5.100.7 | Server state management |
| `xlsx` | ^0.18.5 | Excel export (dynamically imported in `additional-trainings`) |
| `file-saver` | ^2.0.5 | Browser file download trigger |
| `compressorjs` | ^1.3.0 | Client-side image compression before upload |
| `framer-motion` | ^12.38.0 | Animations (auth page, transitions) |
| `core-js` | ^3.49.0 | Polyfills for older browsers |

## CI/CD

**Pipeline:** GitHub Actions at `.github/workflows/ci.yml`
- Triggers: push to `main`, `master`, `feature/**`; PR to `main`/`master`
- Steps: `npm ci` → `npx tsc --noEmit` → `npm run build`
- Secrets required: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_KEY` (fallback placeholders allow build without real values)
- Node version: 20

## Gaps / Unknowns

- `@playwright/test` is installed but no E2E test files were confirmed in the source tree — may be unused or in a non-standard location.
- `babel.config.js` referenced in CLAUDE.md but not read — assumed standard presets matching webpack config.
- `jest.setup.ts` key is `setupFilesAfterFramework` (likely a typo for `setupFilesAfterFramework`/`setupFiles`) — may affect test runner bootstrap.
- No `.nvmrc` or `.node-version` file detected; Node 20 is only enforced in CI.
