# Architecture Audit & Refactoring Plan — PUTEVI Safety
**Date:** 2026-05-03
**Stack:** React 18 + TypeScript + Tailwind + SCSS + Vanilla Extract + Supabase
**Target:** Production-ready, 500k users, 2026 quality standards
**Auditor role:** Principal Software Architect, 15+ years, Google / Airbnb / Netflix scale

---

## Executive Summary

The codebase is a mid-migration hybrid application with a clear split between a legacy
monolithic zone (`src/App.jsx`, `src/components/`) and a partially completed modern zone
(`src/app/`, `src/features/tasks/`, `src/shared/`, `src/widgets/`, `src/pages/`).
The modern zone follows Feature-Sliced Design (FSD) and is genuinely well-structured.
The legacy zone remains unreformed.

**Critical blockers for 500k-user launch:**
1. Dead god-component `src/App.jsx` (700 lines, never imported) coexists with `src/app/App.tsx`
2. Five parallel CSS strategies active simultaneously — VE, SCSS, CSS Modules, plain CSS, Tailwind
3. `entities/` layer is entirely absent — domain types live in wrong layers
4. `useTasks` performs a full table scan; every filter change fetches all rows
5. Zero tests, zero CI, zero error boundaries outside of auth flow

**Estimated migration effort to production-grade:** 12–18 focused development days.
Each step below leaves the app running after completion.

---

## Block 1 — Current Structure Audit

### Complete File Tree (as-is)

```
src/
├── App.jsx                                ← DEAD. 700-line god component, never imported
├── AppLayout.module.scss                  ← SCSS Module at root level, not in a component
├── app/
│   ├── App.tsx                            ← Active entry point (120 lines)
│   ├── providers/
│   │   └── NotificationProvider.tsx
│   ├── router.tsx
│   └── theme.css.ts                       ← Vanilla Extract theme #1
├── assets/
│   └── img/
│       ├── GrishaveDenis.jpg
│       └── logo_PUTEVI.jpg
├── auth/                                  ← Isolated subsystem ✓
│   ├── AnimatedBackground.tsx
│   ├── AuthLayout.tsx
│   ├── LoginCard.tsx
│   ├── LoginPage.tsx
│   ├── Logo.tsx
│   ├── PasswordField.tsx
│   ├── PrimaryButton.tsx
│   ├── README.md
│   ├── TextField.tsx
│   ├── auth.css                           ← Plain CSS (only place in auth/ — intentional)
│   ├── icons.tsx
│   └── index.ts                           ← Barrel export ✓
├── components/                            ← Legacy zone (mixed JSX+CSS+SCSS)
│   ├── AdditionalTrainingsManager.css
│   ├── AdditionalTrainingsManager.jsx
│   ├── AnalyticsDashboard.jsx
│   ├── AnalyticsDashboard.scss
│   ├── EmployeeForm.jsx
│   ├── EmployeeForm.scss
│   ├── OrganizationManager.jsx
│   ├── OrganizationTelegramReport.jsx
│   ├── VirtualEmployeeTable.jsx
│   ├── WorkerTrainingDownloadButton.jsx
│   ├── OrderRegistry/                     ← PascalCase folder name
│   │   ├── OrderForm.jsx
│   │   ├── OrdersRegistry.css
│   │   ├── OrdersRegistry.jsx
│   │   ├── OrdersTable.jsx
│   │   └── ResponsiblePersonMultiSelect.jsx
│   ├── PermitsRegistry/                   ← PascalCase folder name
│   │   ├── PermitActions.jsx
│   │   ├── PermitForm.jsx
│   │   ├── PermitStatusBadge.jsx
│   │   ├── PermitsDashboard.jsx
│   │   ├── PermitsDashboard.module.scss   ← CSS Module mixed into plain-CSS folder
│   │   ├── PermitsRegistry.css
│   │   ├── PermitsRegistry.jsx
│   │   └── PermitsTable.jsx
│   ├── Prescriptions/                     ← PascalCase, no "Registry" suffix
│   │   ├── PrescriptionForm.jsx
│   │   ├── PrescriptionsRegistry.jsx
│   │   ├── PrescriptionsRegistryStyle.css
│   │   ├── PrescriptionsTable.jsx
│   │   └── ResponsiblePersonSelect.jsx
│   └── utils/                             ← Utility subfolder inside components — VIOLATION
│       └── helpers.js
├── features/
│   ├── employee-crud/                     ← kebab-case ✓ but no model.ts, no barrel
│   │   ├── EmployeeProvider.tsx           ← PascalCase file in feature — inconsistent
│   │   └── api.ts
│   ├── employee-export/                   ← Single-file "feature" — should be in entity
│   │   └── exportToCSV.ts
│   ├── employee-retrain/                  ← Single-file "feature" — should be in entity
│   │   └── api.ts
│   └── tasks/                             ← Complete FSD slice ✓
│       ├── components/
│       │   ├── TaskCalendar.tsx
│       │   ├── TaskCard.tsx
│       │   ├── TaskCreateModal.tsx
│       │   ├── TaskDashboard.tsx
│       │   ├── TaskEditModal.tsx
│       │   ├── TaskFilters.tsx
│       │   ├── TaskList.tsx
│       │   ├── TaskResolutionViewerModal.tsx
│       │   ├── TaskResolveModal.tsx
│       │   ├── TaskStatusBadge.tsx
│       │   ├── tasks.css                  ← Plain CSS inside TSX feature folder
│       │   └── tasksModal.scss            ← SCSS inside TSX feature folder
│       ├── hooks/
│       │   ├── useTaskResolution.ts
│       │   ├── useTaskStats.ts
│       │   └── useTasks.ts
│       ├── model.ts                       ← Domain model ✓
│       ├── services/
│       │   ├── storageService.ts
│       │   └── tasksService.ts
│       └── types.ts                       ← Re-export from model (redundant)
├── index.css                              ← Global styles at src/ root
├── index.js                               ← Entry: imports App.tsx, not App.jsx
├── pages/                                 ← Lazy-loaded routes ✓
│   ├── Login.example.tsx                  ← DEAD example file
│   ├── additional-trainings/
│   │   └── AdditionalTrainingsPage.tsx
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   ├── employees/
│   │   └── EmployeesPage.tsx
│   ├── orders/
│   │   └── OrdersPage.tsx
│   ├── organizations/
│   │   └── OrganizationsPage.tsx
│   ├── permits/
│   │   └── PermitsPage.tsx
│   ├── prescriptions/
│   │   └── PrescriptionsPage.tsx
│   └── tasks/
│       └── TasksPage.tsx
├── shared/
│   ├── api/
│   │   ├── supabase.ts                    ← Singleton client ✓
│   │   └── telegram.ts
│   ├── constants/
│   │   └── toast.ts
│   ├── hooks/
│   │   ├── useExpiredCount.ts             ← VIOLATION: imports from @/components/utils
│   │   └── useNotification.ts
│   ├── lib/
│   │   └── analytics.ts
│   └── ui/
│       ├── ButtonGlow/
│       │   └── index.tsx                  ← Tailwind-only component
│       ├── Skeleton/
│       │   └── index.tsx
│       ├── StatusBadge/
│       │   └── index.tsx
│       ├── Table/
│       │   └── index.tsx
│       ├── Toast/
│       │   ├── Toast.tsx
│       │   └── ToastContainer.tsx
│       └── Wrapper/
│           └── index.tsx
├── style/                                 ← Orphan styles folder at src/ root
│   ├── OrganizationManager.css
│   ├── Skeleton.css
│   ├── WorkerTrainingDownloadButton.scss
│   ├── modal.css
│   ├── styles.css.ts                      ← Vanilla Extract theme #2 (DUPLICATE, appears unused)
│   ├── toast.css
│   └── validation.css
├── utils/                                 ← Second utils folder (duplication)
│   ├── constants.js
│   ├── downloadWorkerTrainings.js
│   ├── permitConstants.js
│   └── permitHelpers.js
└── widgets/
    ├── app-header/
    │   └── AppHeader.tsx                  ← Props mismatch with App.tsx call site
    ├── app-nav/
    │   └── AppNav.tsx
    └── stats-bar/
        └── StatsBar.tsx
```

### Area Ratings

| Area | Score /10 | Problem | Risk |
|------|-----------|---------|------|
| `src/App.jsx` | 1/10 | 700-line dead god component — never imported, duplicates all logic in `app/App.tsx` and `features/employee-crud/api.ts`. Contains inline Supabase calls, CSV export, auth bootstrap, filter logic, CRUD — all in one place. | HIGH: confuses new engineers, may be imported accidentally |
| `src/app/` | 7/10 | Well-structured but `App.tsx` still holds auth session state and `QueryClientProvider` that belongs in a provider. `theme.css.ts` uses Vanilla Extract while no other app-level code does. | MEDIUM |
| `src/components/` | 3/10 | PascalCase folders (`OrderRegistry`, `PermitsRegistry`, `Prescriptions`) with inconsistent naming. Mixed JSX+CSS+SCSS+CSS Modules within same folders. No barrel exports. Contains `utils/` subfolder that violates separation. 0% TypeScript. | HIGH: hardest area to navigate and extend |
| `src/features/tasks/` | 8/10 | Best-structured area. Proper FSD: model, types, services, hooks, components. Minor issues: `tasks.css` + `tasksModal.scss` should be SCSS Modules; `types.ts` is a redundant re-export. | LOW |
| `src/features/employee-*` | 4/10 | Split into 3 micro-features (`employee-crud`, `employee-export`, `employee-retrain`) that should be one entity + one feature. `EmployeeProvider.tsx` is PascalCase in a kebab-case folder. No `model.ts`, no barrel export. `api.ts` accepts React setState callbacks — business logic entangled with UI. | HIGH |
| `src/pages/` | 7/10 | Lazy loading implemented correctly. `Login.example.tsx` is dead. `EmployeesPage.tsx` imports from both `@/components/` and `@/shared/` without consistency. | LOW |
| `src/shared/` | 6/10 | Good structure. `useExpiredCount.ts` imports from `@/components/utils/helpers` — a hard FSD violation (shared must have zero upward dependencies). `shared/lib/analytics.ts` has no callers — dead code suspected. | MEDIUM |
| `src/widgets/` | 5/10 | `AppHeader.tsx` prop interface declares only `{ onLogout }` but `App.tsx` passes `onLogout`, `onToggleTheme`, `isDark` — the extra props are silently dropped. `AppNav.tsx` combines navigation + org filter + status filter in one 113-line component (SRP violation). | MEDIUM |
| `src/style/` | 2/10 | Orphan folder at `src/` root. 7 files with no naming system. `styles.css.ts` is a second Vanilla Extract theme (duplicate of `app/theme.css.ts`). `OrganizationManager.css` belongs next to its component. | MEDIUM |
| `src/utils/` | 3/10 | Flat JS files, no types. `constants.js` mixes business constants with status-key logic. Duplicated by `src/components/utils/helpers.js`. `permitConstants.js` and `permitHelpers.js` belong in a `permit` entity. | MEDIUM |
| CSS strategy overall | 2/10 | 5 simultaneous strategies: plain CSS, SCSS, CSS Modules, Vanilla Extract (2 separate files!), Tailwind. No shared tokens. No documented choice. Every new file picks a strategy at random. | CRITICAL |
| TypeScript coverage | 5/10 | `strict: true` in tsconfig but `allowJs: true` means legacy JSX bypasses all checks. `AnyEmployee = Record<string, any>` in the primary employee service. `session: any` in App.tsx. Entities layer absent → no shared domain types. | HIGH |
| Test coverage | 0/10 | Zero test files found anywhere in the codebase. | CRITICAL |
| Scalability | 3/10 | `useTasks` fetches ALL rows then filters in JS — O(n) on every filter interaction. `EmployeeProvider` holds all employees in React state (no TanStack Query for employees). No pagination anywhere. | HIGH |

---

## Block 2 — What Is Done Well

**1. `features/tasks/` is a textbook FSD slice.**
`model.ts` is the single source of truth for domain types. `types.ts` re-exports for backward compat. Services (`tasksService.ts`, `storageService.ts`) contain only Supabase calls with no UI concerns. Hooks (`useTasks.ts`, `useTaskStats.ts`, `useTaskResolution.ts`) wrap TanStack Query correctly, exposing clean interfaces to components. This is the template for every other feature.

**2. Router with `React.lazy` + `Suspense` on every route.**
`src/app/router.tsx` lazy-loads all 8 page components. Combined with Webpack's `splitChunks`, this produces one chunk per route. Correct implementation.

**3. Supabase client singleton in `shared/api/supabase.ts`.**
Single `createClient` call, guarded by env-var validation that throws clearly at startup. `sessionStorage` (not `localStorage`) chosen deliberately — correct for a multi-session compliance environment where shared computers are common.

**4. `shared/ui/` follows folder-per-component convention with `index.tsx` barrels.**
`ButtonGlow`, `Skeleton`, `StatusBadge`, `Table`, `Toast`, `Wrapper` are all self-contained, importable from their folder. No circular dependencies.

**5. Webpack config is production-grade.**
Content-hashed filenames, `splitChunks`, `TerserPlugin` with `drop_console: true`, `cache: filesystem`, `performance.hints`, differential dev/prod source maps. This is correct.

**6. TanStack Query configured with sane defaults.**
`staleTime: 5min`, `retry: 1`, and the `useTasks` hook's custom retry that skips 404 (table-not-exist guard during development) is genuinely thoughtful defensive coding.

**7. `auth/` is fully isolated with its own README, barrel export, and zero legacy dependencies.**
The redesigned industrial dark theme, animated background, and composited-only CSS transitions make it a clean, demo-quality subsystem that can be extracted and published independently.

---

## Block 3 — CSS Strategy Decision & Recommendation

### Option A — Tailwind CSS Only

**Pros for this project:**
- Already partially adopted in `auth/` (LoginCard, PasswordField) and `shared/ui/ButtonGlow`
- Eliminates all CSS file maintenance overhead
- Zero specificity wars
- PurgeCSS built-in — smallest possible CSS bundle

**Cons for this project:**
- Industrial dark theme with `#D4983A` gold accent, glassmorphism card, animated grid overlay require long `className` strings: `className="bg-[#0A0F1E] border border-[rgba(212,152,58,0.3)] backdrop-blur-xl after:content-[''] after:absolute after:inset-0..."`
- Complex `@keyframes` (overdue pulse, modal enter, shimmer, blob float) cannot be expressed in Tailwind without custom config and `arbitrary values`
- `backdrop-filter` and pseudo-element animations require Tailwind plugins or arbitrary variants — rapidly becomes unreadable
- 5 existing CSS/SCSS/VE files cannot be deleted while app runs — migration is non-trivial
- framer-motion integration is style-file-free already; that's the right tool for complex animations

**Migration effort:** HIGH. Every component in `src/components/` is JSX with class-based CSS. Must convert JSX→TSX and CSS→Tailwind simultaneously. Risk of visual regression on every step.

### Option B — SCSS Modules Only

**Pros for this project:**
- Native `@keyframes`, `@mixin`, `@use` — perfect for complex animations and the glass/glow effect library
- CSS Modules scoping eliminates all specificity conflicts
- No build plugin required beyond `sass-loader` (already installed)
- Design tokens as SCSS variables are straightforward and explicit
- Composited-only animations in pure CSS (transform/opacity) are first-class
- Directly readable in DevTools without class name hashing lookup

**Cons for this project:**
- Layout and spacing utilities (flex, gap, padding) still require writing CSS for each component
- No utility-based rapid prototyping
- Auth subsystem already uses Tailwind — requires a second migration pass or permanent exception

**Migration effort:** MEDIUM. Auth stays as-is (hybrid acceptable). Remaining CSS → SCSS Modules one folder at a time.

### Option C — Hybrid: Tailwind for layout/spacing + SCSS Modules for complex styles

**Pros for this project:**
- Tailwind handles what it is genuinely good at: layout (`flex`, `grid`, `gap`, `p-*`, `rounded-*`, `text-sm`) without configuration
- SCSS Modules handle what Tailwind struggles with: `@keyframes`, glassmorphism mixins, custom pseudo-element patterns, complex state variants
- Auth subsystem stays as-is (already hybrid, already working)
- `ButtonGlow` stays Tailwind (it's already correct)
- Vanilla Extract is removed entirely — zero remaining benefit, adds VanillaExtractPlugin build dep
- Incremental: one folder at a time, app always runs

**Cons for this project:**
- Engineers must know the rule clearly or they will default to one strategy and ignore the other
- Two mental models to maintain

**Migration effort:** LOW-MEDIUM. No wholesale rewrites. Vanilla Extract removed (2 files). Plain CSS files converted to SCSS Modules incrementally.

---

### RECOMMENDATION: **Option C — Hybrid**

**Ruling:**

Tailwind CSS handles layout and spacing utilities. SCSS Modules handle all component-specific visual logic — animations, themed states, glassmorphism, pseudo-elements, industrial-dark token application.

**The rule:**

> **Use Tailwind when:** you are composing layout (flex/grid), applying spacing (padding/margin/gap), setting text size/weight, or applying a standard radius. These are structural decisions with no design-system specificity.
>
> **Use SCSS Module when:** you need `@keyframes`, a pseudo-element (`::before`, `::after`), a glassmorphism or glow effect, a component-specific themed state (`:hover`, `--active`, `--overdue`), or any color from the design token system (`#D4983A`, `#0A0F1E`). These are visual decisions that belong in the design system.
>
> **Never:** plain `.css` files, Vanilla Extract, inline `style={}` beyond truly dynamic values.

---

### SCSS Shared Styles Foundation

**Directory:** `src/shared/styles/`

```
src/shared/styles/
├── _tokens.scss       # Design tokens — single source of truth for all values
├── _typography.scss   # Font scale, weights, letter-spacing
├── _animations.scss   # @keyframes library — reused across features
├── _mixins.scss       # glass(), glow(), gold-border(), industrial-card()
├── _breakpoints.scss  # Responsive breakpoints
└── index.scss         # @forward all partials
```

**`_tokens.scss`** — Design token definitions based on actual values in the codebase:

```scss
// ─── Brand Colors ───────────────────────────────────────────
$gold:          #D4983A;
$gold-light:    #E8B04B;
$gold-dark:     #C2852A;
$gold-muted:    rgba(212, 152, 58, 0.12);
$navy:          #0A0F1E;
$navy-mid:      #111827;
$navy-surface:  #1a2235;

// ─── Semantic / Status ──────────────────────────────────────
$status-valid:    #22c55e;
$status-warning:  #f59e0b;
$status-expired:  #dc2626;
$status-info:     #2563eb;

// ─── Neutral Surface Scale ───────────────────────────────────
$surface-0:  #ffffff;
$surface-1:  #f9fafb;
$surface-2:  #f3f4f6;
$border-std: #e5e7eb;
$border-mid: #e4e4e7;

// ─── Spacing ─────────────────────────────────────────────────
$radius-sm:   8px;
$radius-md:  10px;
$radius-lg:  14px;
$radius-xl:  16px;
$radius-2xl: 24px;

// ─── Shadow Scales ───────────────────────────────────────────
$shadow-card:  0 1px 4px rgba(0, 0, 0, 0.06);
$shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.18);
$shadow-gold:  0 8px 24px rgba(212, 152, 58, 0.35);

// ─── Z-index Ladder ──────────────────────────────────────────
$z-sticky:  20;
$z-modal: 1000;
$z-toast:  9999;
```

**`_animations.scss`** — Keyframe library (all composited — transform/opacity only):

```scss
@keyframes fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes modal-enter {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}

@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

@keyframes overdue-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.72; }
}

@keyframes blob-float {
  0%, 100% { transform: translate(0,    0)    scale(1); }
  33%       { transform: translate(30px, -50px) scale(1.1); }
  66%       { transform: translate(-20px, 20px) scale(0.9); }
}

@keyframes gold-shift {
  0%   { background-position: 0%   50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0%   50%; }
}
```

**`_mixins.scss`** — Visual pattern library:

```scss
@use 'tokens' as t;

// Glassmorphism card — for auth card only (position: fixed context)
// Do NOT use on scroll children — forces GPU recomposite per scroll frame
@mixin glass($blur: 20px, $bg-opacity: 0.08) {
  background: rgba(255, 255, 255, $bg-opacity);
  backdrop-filter: blur($blur);
  -webkit-backdrop-filter: blur($blur);
}

// Gold glow — use on pseudo-elements, never on the element itself (avoid repaint)
@mixin glow($color: t.$gold, $intensity: 0.3) {
  box-shadow: 0 0 20px rgba($color, $intensity), 0 0 60px rgba($color, $intensity * 0.5);
}

// Gold left-border accent for overdue/alert states
@mixin gold-border($width: 4px) {
  border-left: $width solid t.$gold;
}

// Standard industrial card — solid, no glass
@mixin industrial-card {
  background: t.$surface-0;
  border: 1px solid t.$border-std;
  border-radius: t.$radius-lg;
  box-shadow: t.$shadow-card;
}

// Focus ring — composited via outline, not box-shadow
@mixin focus-ring($color: t.$status-info, $opacity: 0.45) {
  border-color: transparent;
  outline: 2px solid rgba($color, $opacity);
  outline-offset: 0;
}

// Hover shadow lift — uses ::after pseudo + opacity (composited, no repaint)
@mixin hover-lift {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  &:hover::after { opacity: 1; }
}

// Text truncation
@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Status badge base
@mixin status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
```

**`_breakpoints.scss`:**

```scss
$bp-sm:  640px;
$bp-md:  768px;
$bp-lg: 1024px;
$bp-xl: 1280px;

@mixin sm  { @media (max-width: #{$bp-sm})  { @content; } }
@mixin md  { @media (max-width: #{$bp-md})  { @content; } }
@mixin lg  { @media (max-width: #{$bp-lg})  { @content; } }
@mixin xl  { @media (max-width: #{$bp-xl})  { @content; } }
@mixin motion-ok { @media (prefers-reduced-motion: no-preference) { @content; } }
@mixin motion-reduce { @media (prefers-reduced-motion: reduce) { @content; } }
```

---

## Block 4 — Target Structure (file tree)

```
src/
│
├── app/                          # App initialization: providers, router, global config
│   ├── App.tsx                   # Root component — only providers and layout shell
│   ├── providers/
│   │   ├── AuthProvider.tsx      # Auth session state (extracted from App.tsx)
│   │   ├── QueryProvider.tsx     # QueryClientProvider
│   │   └── NotificationProvider.tsx
│   ├── router.tsx
│   └── theme.css.ts              # REMOVE — replaced by shared/styles/_tokens.scss
│
├── pages/                        # One file per route. Thin shells only — no logic.
│   ├── employees/
│   │   └── EmployeesPage.tsx
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   ├── organizations/
│   │   └── OrganizationsPage.tsx
│   ├── additional-trainings/
│   │   └── AdditionalTrainingsPage.tsx
│   ├── permits/
│   │   └── PermitsPage.tsx
│   ├── orders/
│   │   └── OrdersPage.tsx
│   ├── prescriptions/
│   │   └── PrescriptionsPage.tsx
│   └── tasks/
│       └── TasksPage.tsx
│
├── widgets/                      # Page-level composites. Can import features+entities+shared.
│   ├── app-header/
│   │   ├── AppHeader.tsx
│   │   └── AppHeader.module.scss
│   ├── app-nav/
│   │   ├── AppNav.tsx            # Split: navigation tabs + org/status filters
│   │   ├── OrgFilter.tsx         # Extracted from AppNav (SRP)
│   │   └── AppNav.module.scss
│   └── stats-bar/
│       └── StatsBar.tsx
│
├── features/                     # Use-case slices. One folder per entity action group.
│   ├── employee-crud/
│   │   ├── index.ts              # Barrel: exports EmployeeProvider, hooks
│   │   ├── EmployeeProvider.tsx
│   │   ├── useEmployeeCrud.ts    # Extracted from EmployeeProvider
│   │   └── employeeService.ts    # Rename: api.ts → employeeService.ts
│   ├── employee-export/
│   │   ├── index.ts
│   │   └── exportToCSV.ts
│   ├── employee-retrain/
│   │   ├── index.ts
│   │   └── retrainService.ts     # Rename: api.ts → retrainService.ts
│   ├── permit-crud/              # Rename: PermitsRegistry → permit-crud feature
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── PermitForm.tsx
│   │   │   ├── PermitsRegistry.tsx
│   │   │   ├── PermitsTable.tsx
│   │   │   ├── PermitActions.tsx
│   │   │   ├── PermitStatusBadge.tsx
│   │   │   ├── PermitsDashboard.tsx
│   │   │   └── PermitsDashboard.module.scss
│   │   └── services/
│   │       └── permitService.ts
│   ├── order-crud/               # Rename: OrderRegistry → order-crud feature
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrdersRegistry.tsx
│   │   │   ├── OrdersTable.tsx
│   │   │   └── ResponsiblePersonMultiSelect.tsx
│   │   └── services/
│   │       └── orderService.ts
│   ├── prescription-crud/        # Rename: Prescriptions → prescription-crud feature
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── PrescriptionForm.tsx
│   │   │   ├── PrescriptionsRegistry.tsx
│   │   │   ├── PrescriptionsTable.tsx
│   │   │   └── ResponsiblePersonSelect.tsx
│   │   └── services/
│   │       └── prescriptionService.ts
│   └── tasks/                    # Already correct — keep as-is
│       ├── index.ts              # Add barrel
│       ├── components/
│       │   ├── TaskCalendar.tsx
│       │   ├── TaskCard.tsx
│       │   ├── TaskCard.module.scss
│       │   ├── TaskCreateModal.tsx
│       │   ├── TaskCreateModal.module.scss
│       │   ├── TaskDashboard.tsx
│       │   ├── TaskEditModal.tsx
│       │   ├── TaskFilters.tsx
│       │   ├── TaskList.tsx
│       │   ├── TaskResolutionViewerModal.tsx
│       │   ├── TaskResolveModal.tsx
│       │   └── TaskStatusBadge.tsx
│       ├── hooks/
│       │   ├── useTaskResolution.ts
│       │   ├── useTaskStats.ts
│       │   └── useTasks.ts
│       ├── model.ts
│       └── services/
│           ├── storageService.ts
│           └── tasksService.ts
│
├── entities/                     # Domain models, types, constants. Zero business logic.
│   ├── employee/
│   │   ├── index.ts
│   │   ├── model.ts              # Employee interface, EmployeeInsert, EmployeeUpdate
│   │   ├── constants.ts          # DAYS_THRESHOLD, WARNING_THRESHOLD, ADDITIONAL_TRAINING_TYPES
│   │   └── lib.ts                # getStatusKey, getDaysDifference, hasExpiredAdditional
│   ├── permit/
│   │   ├── index.ts
│   │   ├── model.ts              # Permit interface
│   │   └── constants.ts          # permitConstants.js content
│   ├── order/
│   │   ├── index.ts
│   │   └── model.ts
│   ├── prescription/
│   │   ├── index.ts
│   │   └── model.ts
│   └── task/                     # Re-export from features/tasks/model for entity layer
│       ├── index.ts
│       └── model.ts              # Symlink or re-export of features/tasks/model
│
├── shared/                       # Zero business logic. Zero upward imports.
│   ├── api/
│   │   ├── supabase.ts
│   │   └── telegram.ts
│   ├── constants/
│   │   └── toast.ts
│   ├── hooks/
│   │   ├── useExpiredCount.ts    # Fix: import from entities/employee, not components/utils
│   │   └── useNotification.ts
│   ├── lib/
│   │   ├── analytics.ts
│   │   └── uuid.ts               # Extract randomUUID fallback from storageService
│   ├── styles/                   # SCSS design system — new
│   │   ├── _tokens.scss
│   │   ├── _typography.scss
│   │   ├── _animations.scss
│   │   ├── _mixins.scss
│   │   ├── _breakpoints.scss
│   │   └── index.scss
│   └── ui/
│       ├── ButtonGlow/
│       │   └── index.tsx
│       ├── Skeleton/
│       │   └── index.tsx
│       ├── StatusBadge/
│       │   └── index.tsx
│       ├── Table/
│       │   └── index.tsx
│       ├── Toast/
│       │   ├── Toast.tsx
│       │   └── ToastContainer.tsx
│       └── Wrapper/
│           └── index.tsx
│
├── auth/                         # Keep as-is. Isolated subsystem.
│   ├── AnimatedBackground.tsx
│   ├── AuthLayout.tsx
│   ├── LoginCard.tsx
│   ├── LoginPage.tsx
│   ├── Logo.tsx
│   ├── PasswordField.tsx
│   ├── PrimaryButton.tsx
│   ├── README.md
│   ├── TextField.tsx
│   ├── auth.css                  # Keep — auth subsystem has its own CSS strategy
│   ├── icons.tsx
│   └── index.ts
│
├── assets/
│   └── img/
│       ├── logo_PUTEVI.jpg
│       └── GrishaveDenis.jpg
│
├── index.css                     # Global resets + app-shell styles only
└── index.js                      # Entry point — unchanged
│
│ ── FILES TO DELETE ──────────────────────────────────────────
│   src/App.jsx                   ← Dead. All logic migrated.
│   src/AppLayout.module.scss     ← Orphan. Move to widget or delete.
│   src/app/theme.css.ts          ← Replaced by shared/styles/_tokens.scss
│   src/style/styles.css.ts       ← Duplicate VE theme. Delete.
│   src/style/                    ← Migrate all files then delete folder
│   src/utils/                    ← Migrate to entities/ then delete folder
│   src/components/utils/         ← Migrate to entities/employee/lib.ts then delete
│   src/pages/Login.example.tsx   ← Dead example file
│   src/features/tasks/types.ts   ← Redundant re-export. Delete.
```

---

## Block 5 — Architecture Principles

### Layer Rules — Dependency Direction

```
         app
          │
          ▼
        pages
          │
          ▼
       widgets
          │
          ▼
       features
          │
          ▼
       entities
          │
          ▼
        shared
          │
          ▼
         auth    ← isolated, imports only from shared
```

**Allowed imports (downward only):**

| Layer | May import from |
|-------|----------------|
| `app` | `pages`, `widgets`, `features`, `entities`, `shared`, `auth` |
| `pages` | `widgets`, `features`, `entities`, `shared` |
| `widgets` | `features`, `entities`, `shared` |
| `features` | `entities`, `shared` |
| `entities` | `shared` only |
| `shared` | nothing from this project (only npm packages) |
| `auth` | `shared` only |

**Forbidden (enforced by convention, future ESLint rule):**

- `shared` → `components`, `features`, `entities`, `widgets`, `pages` — FORBIDDEN
- `features/tasks` → `features/employee-crud` — FORBIDDEN (cross-feature import)
- `entities` → `features` — FORBIDDEN
- `pages` → other `pages` — FORBIDDEN
- Any layer → `src/App.jsx`, `src/style/`, `src/utils/` (legacy) — FORBIDDEN after migration

**Where business logic lives:**

| Logic type | Correct location |
|------------|-----------------|
| Supabase queries | `features/*/services/` or `entities/*/api.ts` |
| Domain transformations (mapFormToDb) | `entities/*/lib.ts` |
| Domain constants (thresholds, types) | `entities/*/constants.ts` |
| Cross-feature aggregation | `widgets/` |
| Cache management (invalidateQueries) | `features/*/hooks/` |
| UI state (open/close modal) | Component-local `useState` |
| URL-based filter state | Page-level `useSearchParams` |
| Notification side-effects | `shared/hooks/useNotification.ts` |

**Supabase calls are allowed ONLY in:**
- `features/*/services/*.ts`
- `shared/api/supabase.ts` (client only, no queries)

Not allowed in: components, hooks, pages, widgets, entities.

---

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Folders (all layers) | `kebab-case` | `employee-crud/`, `task-list/` |
| React components | `PascalCase.tsx` | `TaskCard.tsx`, `PermitForm.tsx` |
| Hooks | `useCamelCase.ts` | `useTasks.ts`, `useExpiredCount.ts` |
| Services | `camelCaseService.ts` | `tasksService.ts`, `permitService.ts` |
| Domain lib files | `camelCase.ts` | `lib.ts`, `helpers.ts` |
| Type interfaces | `PascalCase` | `Employee`, `TaskInsert`, `PermitResponse` |
| Type suffixes | `Props`, `State`, `Response`, `Insert`, `Update` | `TaskCardProps`, `PermitInsert` |
| SCSS Modules | `ComponentName.module.scss` | `TaskCard.module.scss` |
| Constants files | `constants.ts` (kebab-case folders, `camelCase` export names) | |
| Barrel files | `index.ts` always | |

---

### File Rules

| Rule | Value |
|------|-------|
| Max lines per component | 300 (split if exceeded) |
| Max lines per hook | 150 |
| Max lines per service | 200 |
| Split a component when | it has ≥2 distinct visual sections OR ≥3 local state variables unrelated to each other |
| Create new feature vs extend | new feature when the entity changes (permit vs order); extend existing when the action changes (add export to employee-export) |
| Promote to `shared/ui` when | used in ≥3 separate feature folders |
| Promote to `entities/` when | a type or constant is referenced by ≥2 features |

---

## Block 6 — Refactoring Plan

> Each step leaves the application running and visually identical after completion.
> Execute steps in order. Do not skip.

---

### Step 1 — Create `src/shared/styles/` SCSS design system

**What:** Create `src/shared/styles/` with `_tokens.scss`, `_animations.scss`, `_mixins.scss`, `_breakpoints.scss`, `_typography.scss`, `index.scss`. No existing files are changed.

**Why:** Every subsequent step depends on having tokens and mixins available. This step is additive only.

**Risk:** LOW — new files only, nothing imported yet.

**Validation:**
```bash
npx tsc --noEmit
# Expected: 0 errors
```

**Claude Code prompt:**
```
Create src/shared/styles/ with the following files from ARCHITECTURE.md Block 3:
_tokens.scss, _animations.scss, _mixins.scss, _breakpoints.scss, _typography.scss, index.scss.
Use @forward in index.scss to expose all partials.
Do NOT modify any existing file.
Do NOT import the new files anywhere yet.
Verify: find src/shared/styles -type f — should list 6 files.
```

---

### Step 2 — Delete dead and duplicate files

**What:** Delete `src/App.jsx`, `src/pages/Login.example.tsx`, `src/style/styles.css.ts` (duplicate Vanilla Extract theme). Verify nothing imports them first.

**Why:** Dead code creates navigation confusion and risks accidental re-import.

**Risk:** LOW — verify imports before deleting.

**Validation:**
```bash
grep -r "App.jsx\|Login.example\|styles.css.ts" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
# Expected: 0 results before deleting
npm run build 2>&1 | tail -20
```

**Claude Code prompt:**
```
Before deleting, run:
  grep -r "from.*App.jsx\|require.*App.jsx" src/
  grep -r "Login.example" src/
  grep -r "styles.css.ts" src/
If any result is found, report it and stop. Do not delete.
If 0 results: delete src/App.jsx, src/pages/Login.example.tsx, src/style/styles.css.ts.
Run: npx tsc --noEmit && npm run build
Report result.
DO NOT TOUCH: src/app/App.tsx, src/auth/, src/shared/, src/features/
```

---

### Step 3 — Create `entities/employee/` — extract domain types and helpers

**What:**
- Create `src/entities/employee/model.ts` with `Employee`, `EmployeeInsert`, `EmployeeUpdate` interfaces
- Create `src/entities/employee/constants.ts` — move `DAYS_THRESHOLD`, `WARNING_THRESHOLD`, `ADDITIONAL_TRAINING_TYPES`, `STORAGE_KEY` from `src/utils/constants.js`
- Create `src/entities/employee/lib.ts` — move `getStatusKey`, `isTrainingExpired`, `hasExpiredAdditional`, `getDaysDifference` from `src/utils/constants.js` and `src/components/utils/helpers.js`
- Create `src/entities/employee/index.ts` barrel

**Why:** Domain types and constants currently split across 3 files in wrong layers. `shared/hooks/useExpiredCount.ts` imports `hasExpiredAdditional` from `@/components/utils/helpers` — a hard FSD violation. This step fixes the import source without changing behavior.

**Risk:** MEDIUM — update all import sites after moving.

**Validation:**
```bash
grep -r "from.*utils/constants\|from.*components/utils" src/ --include="*.ts" --include="*.tsx"
# Expected: 0 results after migration
npx tsc --noEmit
```

**Claude Code prompt:**
```
Create src/entities/employee/ with model.ts, constants.ts, lib.ts, index.ts.
Move (copy then update imports, then delete originals):
  - DAYS_THRESHOLD, WARNING_THRESHOLD, ADDITIONAL_TRAINING_TYPES, STORAGE_KEY → entities/employee/constants.ts
  - getStatusKey → entities/employee/lib.ts
  - isTrainingExpired, hasExpiredAdditional → entities/employee/lib.ts
  - getDaysDifference → entities/employee/lib.ts
After moving, update all import sites:
  - src/shared/hooks/useExpiredCount.ts
  - src/pages/employees/EmployeesPage.tsx
  - src/widgets/stats-bar/StatsBar.tsx (if it imports from constants)
  - src/features/employee-crud/api.ts (if it imports helpers)
Run: npx tsc --noEmit
DO NOT TOUCH: src/utils/constants.js until all imports are updated. Delete originals only after 0 TS errors.
```

---

### Step 4 — Fix `shared/hooks/useExpiredCount.ts` FSD violation

**What:** Change import `from "@/components/utils/helpers"` to `from "@/entities/employee"`. This step depends on Step 3 completing successfully.

**Why:** `shared` importing from `components` breaks the dependency direction rule. `shared` must have zero upward dependencies.

**Risk:** LOW — single file, one import line change.

**Validation:**
```bash
grep -r "components/utils" src/shared/
# Expected: 0 results
npx tsc --noEmit
```

---

### Step 5 — Fix `AppHeader.tsx` props mismatch

**What:** `src/app/App.tsx` passes `onToggleTheme` and `isDark` to `AppHeader`, but `AppHeader.tsx` declares only `{ onLogout }` — extra props are silently dropped. Add `onToggleTheme?: () => void` and `isDark?: boolean` to the `AppHeaderProps` interface and implement a theme toggle button.

**Why:** Silent prop mismatch. The theme toggle feature is wired at the call site but does nothing. This is a functional bug.

**Risk:** LOW — additive change to a widget.

**Validation:**
```bash
npx tsc --noEmit
# Expected: 0 errors — the previously-hidden type mismatch should be caught, then fixed
```

**Claude Code prompt:**
```
In src/widgets/app-header/AppHeader.tsx:
1. Read current interface: { onLogout: () => void }
2. Add: onToggleTheme?: () => void; isDark?: boolean
3. Add a theme toggle button (icon button, sun/moon) that calls onToggleTheme when provided
4. Render isDark to show correct icon
In src/app/App.tsx: verify all 3 props are passed.
Run: npx tsc --noEmit
DO NOT change the logout button behavior or header layout.
```

---

### Step 6 — Create `entities/permit/`, `entities/order/`, `entities/prescription/`

**What:**
- Move `src/utils/permitConstants.js` → `src/entities/permit/constants.ts`
- Move `src/utils/permitHelpers.js` → `src/entities/permit/lib.ts`
- Create model interfaces for `Permit`, `Order`, `Prescription` from Supabase column inspection
- Create barrel `index.ts` for each

**Why:** Domain constants currently in `src/utils/` with no type safety. `permitConstants.js` and `permitHelpers.js` are orphaned from their domain.

**Risk:** LOW — no existing imports to update (these utils appear unimported in modern code).

**Validation:**
```bash
grep -r "permitConstants\|permitHelpers" src/ --include="*.ts" --include="*.tsx" --include="*.jsx"
npx tsc --noEmit
```

---

### Step 7 — Migrate `src/features/tasks/` CSS to SCSS Modules

**What:**
- Delete `src/features/tasks/components/tasks.css` and `tasksModal.scss`
- Create `src/features/tasks/components/TaskCard.module.scss`
- Create `src/features/tasks/components/TaskCreateModal.module.scss`
- Update components to use `import styles from './TaskCard.module.scss'` pattern
- Use `@use '../../../shared/styles' as s` and apply tokens/mixins

**Why:** The tasks feature is already TypeScript — SCSS Modules are the correct pairing. Plain `.css` global classes risk colliding with legacy names.

**Risk:** MEDIUM — visual regression possible; test in browser after each component.

**Validation:**
```bash
npx tsc --noEmit
npm run build 2>&1 | grep -i "error\|warn"
# Visual: open the app, navigate to /tasks, verify all card states, modal open/close
```

---

### Step 8 — Remove Vanilla Extract entirely

**What:**
- Remove `@vanilla-extract/css` and `@vanilla-extract/webpack-plugin` references
- Remove `VanillaExtractPlugin` from `webpack.config.js`
- Delete `src/app/theme.css.ts` (one real VE file remains after Step 2 deleted the duplicate)
- Remove Vanilla Extract theme class application from `src/app/App.tsx`
- Replace with a CSS `data-theme` attribute approach or Tailwind `dark:` variants if dark mode is desired

**Why:** Vanilla Extract adds a build plugin, a runtime import, and a class-switching pattern for a theme contract with only 3 tokens that are never actually used by any component (the generated `lightThemeClass`/`darkThemeClass` are applied to a wrapper div but no child component reads `vars.color.primary`). The theme contract was scaffolded but never completed.

**Risk:** MEDIUM — affects the theme toggle feature. Confirm that `isDark` and `darkThemeClass` have no actual visual effect before removing. If they do, migrate to `data-theme="dark"` + CSS custom properties.

**Validation:**
```bash
grep -r "vanilla-extract\|themeClass\|lightThemeClass\|darkThemeClass\|vars\." src/ --include="*.ts" --include="*.tsx"
# Expected: 0 results after migration
npm run build 2>&1 | grep -v "warn"
```

---

### Step 9 — Consolidate `src/utils/` and `src/style/` (cleanup)

**What:** After Steps 3–6, `src/utils/` should contain no remaining callers. Delete the folder. Migrate remaining files in `src/style/` to their component's SCSS Module or to `shared/styles/`.

- `src/style/modal.css` → consolidate into relevant feature SCSS Modules
- `src/style/toast.css` → move to `src/shared/ui/Toast/Toast.module.scss`
- `src/style/Skeleton.css` → move to `src/shared/ui/Skeleton/Skeleton.module.scss`
- `src/style/validation.css` → move to relevant form components
- `src/style/OrganizationManager.css` → move to feature component
- `src/style/WorkerTrainingDownloadButton.scss` → move next to component
- Update `src/index.js` global imports accordingly

**Why:** `src/style/` and `src/utils/` are legacy catch-alls that no longer have a defined role. Removing them eliminates the last two ambiguous destinations for new files.

**Risk:** LOW (after earlier steps) — each file has exactly one consumer.

**Validation:**
```bash
ls src/utils/ src/style/ 2>/dev/null
# Expected: no such file or directory (both deleted)
npm run build
```

---

## Block 7 — 2026 Quality Standards Gap Analysis

| Standard | Current | Target | Gap |
|----------|---------|--------|-----|
| TypeScript strict coverage | ~40% (legacy JSX excluded by `allowJs`) | 95% | 55% |
| Component size discipline | 3/10 (App.jsx 700 lines, dead; App.tsx 120 lines, ok; PermitsRegistry untested) | 10/10 | 7 |
| CSS strategy consistency | 2/10 (5 parallel strategies) | 9/10 | 7 |
| Test coverage | 0% | 70% unit + 80% critical paths | 100% of target |
| Bundle size optimization | 6/10 (splitChunks OK; VE plugin adds ~40KB; no tree-shaking audit) | 9/10 | 3 |
| Accessibility (a11y) | 4/10 (auth has aria-labels; nav uses emoji without aria-label; table has no scope) | 8/10 | 4 |
| Error boundary coverage | 1/10 (no ErrorBoundary components found; Suspense fallbacks exist) | 8/10 | 7 |
| Performance budget | 5/10 (lazy routes ✓; useTasks full table scan ✗; no pagination ✗) | 9/10 | 4 |
| Design system consistency | 3/10 (gold #D4983A used in 3+ places without token; no shared spacing scale) | 9/10 | 6 |
| Documentation coverage | 2/10 (auth/README.md exists; nothing else documented) | 7/10 | 5 |

### Actions for gaps > 2 points

**TypeScript strict coverage (gap: 55%)**
Convert one JSX file per feature to TSX during each Step 7–9 iteration. Priority order:
`shared/ui/` (already TSX) → `features/*/components/` → `widgets/` → `pages/` → `components/`.
Do not batch-convert — one file per PR, verified with `npx tsc --noEmit`.

**CSS strategy consistency (gap: 7)**
Execute Blocks 6 Steps 1, 7, 8, 9 in order. After Step 1 (shared/styles created),
add a PR checklist item: "Does this file use an allowed CSS strategy (Tailwind or SCSS Module only)?"

**Error boundary coverage (gap: 7)**
Create `src/shared/ui/ErrorBoundary/ErrorBoundary.tsx` (class component, required by React).
Wrap each `<Suspense>` in `router.tsx` with an `<ErrorBoundary>`.
Wrap Supabase-dependent widgets (StatsBar, AppNav) with feature-level boundaries.

**Test coverage (gap: 100% of target)**
Start with entities (pure functions, no mocks needed):
```bash
# Add vitest — no webpack reconfiguration needed for unit tests
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```
First test targets: `entities/employee/lib.ts` (`getStatusKey`, `hasExpiredAdditional`, `getDaysDifference`).
These are pure functions with no side effects — simplest possible starting point.

**Accessibility (gap: 4)**
1. Replace emoji icons in `AppNav.tsx` with SVG icons + `aria-label` on the `<NavLink>`
2. Add `scope="col"` to all `<th>` in `Table/index.tsx`
3. Add `role="status"` to `StatsBar` count
4. Add keyboard focus trap to all modals (tasks, permits, prescriptions)

**Performance budget (gap: 4)**
1. `useTasks`: Add server-side filter params to `fetchTasks` in `tasksService.ts` — pass `status`, `siteId`, `assignedTo` as `.eq()` clauses, not JS `.filter()`
2. Employee list: Migrate from `EmployeeProvider` React state to TanStack Query `useQuery` — enables caching, background refresh, and pagination
3. Set `performance.maxEntrypointSize: 250000` in `webpack.config.js` (currently 512KB — too permissive)

**Design system consistency (gap: 6)**
After Step 1 (shared/styles created): global find/replace of raw `#D4983A`, `#0A0F1E`, `#E8B04B`
in all non-auth CSS files. Replace with `@use 'shared/styles' as s; color: s.$gold`.

---

## Block 8 — Team Best Practices (CLAUDE.md Checklist)

Append the following section to `CLAUDE.md`:

```markdown
## Architecture Rules (post-2026-05-03 refactor)

### Structure
- [ ] New features go in `src/features/<entity>-<action>/` — never in `src/components/`
- [ ] New domain types and constants go in `src/entities/<entity>/model.ts` and `constants.ts`
- [ ] New shared UI components go in `src/shared/ui/<ComponentName>/index.tsx`
      only if the component is used in ≥3 separate features
- [ ] New Supabase table → create entity folder first, then service file in relevant feature

### Naming
- [ ] All new folders: `kebab-case` — no PascalCase folder names ever
- [ ] All new React components: `PascalCase.tsx`
- [ ] All new hooks: `useCamelCase.ts`
- [ ] All new services: `camelCaseService.ts`
- [ ] SCSS Module files: `ComponentName.module.scss`

### CSS
- [ ] No new plain `.css` files — ever
- [ ] Use Tailwind for: layout (flex/grid), spacing (p/m/gap), text size/weight, border radius
- [ ] Use SCSS Module for: @keyframes, pseudo-elements, themed states, design tokens
- [ ] Import design tokens via `@use '@/shared/styles' as s` — no raw hex values outside auth/
- [ ] Vanilla Extract: do not add any new `.css.ts` files

### Imports
- [ ] Check import direction before every PR: lower layers must not import from higher layers
- [ ] `shared/` imports nothing from `features/`, `entities/`, `components/`, `widgets/`, `pages/`
- [ ] Cross-feature imports (features/tasks → features/employee-crud) are forbidden
- [ ] Supabase calls only in `features/*/services/` — not in components, hooks, or pages

### Code quality
- [ ] No new `any` types — use `unknown` or a specific interface
- [ ] No business logic in components — extract to hook or service
- [ ] No `window.confirm()` — use a confirmation modal
- [ ] Components > 300 lines must be split before merging
- [ ] Add `index.ts` barrel to every new feature or entity folder

### PR checklist (structural compliance)
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run build` passes with 0 errors
- [ ] No new files added to `src/style/` or `src/utils/`
- [ ] No new `.css` extension files
- [ ] Import direction verified (grep for cross-layer violations)
- [ ] If touching a Supabase table: RLS policy reviewed
```

---

## Appendix A — Import Dependency Rules

```
ALLOWED IMPORT GRAPH (read: "A → B" means "A may import B")

app         → pages, widgets, features, entities, shared, auth
pages       → widgets, features, entities, shared
widgets     → features, entities, shared
features    → entities, shared
entities    → shared
shared      → (npm packages only)
auth        → shared

FORBIDDEN (will be enforced by ESLint import/no-restricted-paths):

shared      ↛ features, entities, widgets, pages, app, components
entities    ↛ features, widgets, pages, app
features/X  ↛ features/Y  (different feature slices cannot cross-import)
pages/X     ↛ pages/Y
auth        ↛ features, entities, widgets, pages, components

LEGACY ZONE (src/components/) — transitional rules:
components  → shared (allowed during migration)
components  ↛ features, entities (forbidden — creates circular risk)
pages       → components (allowed during migration, phased out per Block 6)
```

**How to detect violations:**
```bash
# Find shared importing from features/components (most common violation)
grep -r "from.*features\|from.*components" src/shared/ --include="*.ts" --include="*.tsx"

# Find cross-feature imports
grep -r "from.*features/tasks" src/features/employee-crud/ --include="*.ts"
grep -r "from.*features/employee" src/features/tasks/ --include="*.ts"

# Find Supabase calls outside services
grep -r "supabase\." src/ --include="*.tsx" | grep -v "services\|shared/api"
```

---

## Appendix B — SCSS Mixins Library

Full mixin implementations for copy-paste into `src/shared/styles/_mixins.scss`:

```scss
@use 'tokens' as t;
@use 'sass:color';

// ─── Layout ──────────────────────────────────────────────────

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// ─── Industrial Card (default solid surface) ─────────────────

@mixin industrial-card($radius: t.$radius-lg) {
  background: t.$surface-0;
  border: 1px solid t.$border-std;
  border-radius: $radius;
  box-shadow: t.$shadow-card;
}

// ─── Glassmorphism (auth card context ONLY) ──────────────────
// WARNING: Do NOT apply to scroll children.
// backdrop-filter forces GPU recomposite on every scroll frame.
// Safe only on position:fixed overlays or the auth card itself.

@mixin glass($blur: 20px, $bg-opacity: 0.08, $border-opacity: 0.15) {
  background: rgba(255, 255, 255, $bg-opacity);
  backdrop-filter: blur($blur);
  -webkit-backdrop-filter: blur($blur);
  border: 1px solid rgba(255, 255, 255, $border-opacity);
}

// ─── Gold Accent ─────────────────────────────────────────────

@mixin gold-border($width: 4px, $side: left) {
  border-#{$side}: $width solid t.$gold;
}

@mixin gold-gradient-bg {
  background: linear-gradient(135deg, t.$gold 0%, t.$gold-light 100%);
}

// Glow via pseudo-element — composited, no repaint on hover
@mixin gold-glow-hover($intensity: 0.35) {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    box-shadow: 0 0 20px rgba(t.$gold, $intensity), 0 0 60px rgba(t.$gold, $intensity * 0.4);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  &:hover::after { opacity: 1; }
}

// ─── Focus Ring (composited via outline) ─────────────────────

@mixin focus-ring($color: t.$status-info, $opacity: 0.45, $offset: 0) {
  border-color: transparent;
  outline: 2px solid rgba($color, $opacity);
  outline-offset: $offset;
}

// ─── Hover Lift (shadow via opacity, composited) ──────────────

@mixin hover-lift($shadow: 0 6px 20px rgba(0, 0, 0, 0.1)) {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: $shadow;
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  &:hover::after { opacity: 1; }
}

// ─── Status Badge ─────────────────────────────────────────────

@mixin status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
}

@mixin status-valid    { @include status-badge; background: #dcfce7; color: #166534; }
@mixin status-warning  { @include status-badge; background: #fef9c3; color: #854d0e; }
@mixin status-expired  { @include status-badge; background: #fee2e2; color: #991b1b; }

// ─── Text ────────────────────────────────────────────────────

@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin label-uppercase {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

// ─── Animation Utilities ──────────────────────────────────────

@mixin animation-fade-in($duration: 0.22s, $delay: 0s) {
  animation: fade-in $duration ease-out $delay both;
}

@mixin animation-modal-enter($duration: 0.18s) {
  animation: modal-enter $duration ease-out both;
}

// Shimmer for loading/pending buttons
@mixin shimmer-bg($from: #2563eb, $mid: #60a5fa) {
  background: linear-gradient(90deg, $from 25%, $mid 50%, $from 75%);
  background-size: 200% auto;
  animation: shimmer 1.2s linear infinite;
}

// ─── Reduced Motion Override ──────────────────────────────────

@mixin reduce-motion-reset {
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Usage in a component SCSS Module:**

```scss
// src/features/tasks/components/TaskCard.module.scss
@use '@/shared/styles' as s;

.card {
  @include s.industrial-card;
  @include s.hover-lift;
  @include s.animation-fade-in;
  padding: 14px 18px;
  transition: transform 0.15s ease; // composited only

  &--overdue {
    @include s.gold-border;
    background: #fff5f5;
    animation: s.fade-in 0.22s ease-out, s.overdue-pulse 2.4s ease-in-out infinite;
  }
}

.timeBadge {
  &--ok      { @include s.status-valid; }
  &--soon    { @include s.status-warning; }
  &--overdue { @include s.status-expired; }
}
```

---

*End of Architecture Audit & Refactoring Plan*
*Document version: 1.0 — 2026-05-03*
*Next review: after Step 5 completion*
