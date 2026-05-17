# STRUCTURE
> Generated: 2026-05-16 | Focus: arch

## Summary
Complete FSD directory layout. `src/components/` is fully deleted. Features live in `src/features/`, composites in `src/widgets/`, pure data in `src/entities/`, and cross-cutting utilities in `src/shared/`. 16 unconverted `.jsx` files remain in orders, permits, and prescriptions feature slices.

## Top-Level Directory Tree

```
BuildingPersonalApp/
├── src/
│   ├── app/              # App root, providers, router
│   ├── auth/             # Auth subsystem (isolated)
│   ├── assets/img/       # Static images
│   ├── entities/         # Pure data layer
│   ├── features/         # Business logic slices
│   ├── pages/            # Thin route shells
│   ├── shared/           # Cross-cutting utilities
│   ├── widgets/          # Composite UI blocks
│   ├── __tests__/        # All unit tests
│   ├── __mocks__/        # Jest mocks
│   ├── declarations.d.ts # Asset + SCSS module type declarations
│   └── index.js          # Entry point
├── .github/workflows/ci.yml
├── supabase/functions/   # Edge functions (protected)
├── .planning/            # GSD planning artifacts
├── jest.config.js
├── babel.config.js
├── jest.setup.ts
├── webpack.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## App Layer (`src/app/`)

```
app/
├── App.tsx               # Auth gate, theme, QueryClient, ErrorBoundary shell
├── router.tsx            # All routes via React.lazy + HashRouter
├── sentry.ts             # Sentry scaffold (no-op — needs activation)
└── providers/
    └── NotificationProvider.tsx  # Toast notification context
```

## Auth Subsystem (`src/auth/`)

Isolated module with its own CSS. Not an FSD layer — treated as a sealed subsystem.
- `LoginPage`, `LoginCard` components
- `auth.css` for styles

## Entities Layer (`src/entities/`)

Pure data: TypeScript interfaces, `as const` status maps, pure helper functions.

| Entity | Contents |
|--------|----------|
| `employee/` | `model.ts`, `constants.ts`, `lib.ts`, `index.ts` |
| `permit/` | `model.ts`, `constants.ts`, `lib.ts`, `index.ts` |
| `order/` | `model.ts`, `constants.ts`, `lib.ts`, `index.ts` |
| `prescription/` | `model.ts`, `constants.ts`, `lib.ts`, `index.ts` |

## Features Layer (`src/features/`)

| Slice | Service Layer | Hooks (TanStack Query) | File Type | Notes |
|-------|--------------|----------------------|-----------|-------|
| `employee-crud/` | `services/employeesService.ts` | `hooks/useEmployees.ts` | TSX + 2 JSX | Full CRUD; react-window v2 virtual table |
| `employee-export/` | — | — | TS | `exportToCSV.ts` only |
| `employee-retrain/` | — | — | TSX | Thin/skeletal, no services layer |
| `tasks/` | `services/tasksService.ts` | `hooks/useTasks.ts` | TSX | Most modern; SCSS Modules |
| `permits/` | `services/permitsService.ts` | `hooks/usePermits.ts` | JSX (6 files) | Legacy JSX; 1 direct Supabase import |
| `orders/` | `services/ordersService.ts` | `hooks/useOrders.ts` | JSX (4 files) | Legacy JSX; 1 direct Supabase import |
| `prescriptions/` | `services/prescriptionsService.ts` | `hooks/usePrescriptions.ts` | JSX (4 files) | Legacy JSX; 1 direct Supabase import |
| `organization-docs/` | `services/organizationDocsService.ts` | — | TSX | Manual useState/useEffect (no TanStack Query) |
| `additional-trainings/` | — | — | TSX | 702-line component; recharts + dynamic xlsx |
| `about/` | — | — | TSX | Static info page |
| `component-test-react/` | — | — | — | Dead scratch page |

## Widgets Layer (`src/widgets/`)

| Widget | Notes |
|--------|-------|
| `analytics-dashboard/ui/AnalyticsDashboard.tsx` | Strict TSX; recharts + react-window v2; props-only (no Supabase) |
| `stats-bar/StatsBar.tsx` | Reads from `useEmployeesQuery` |
| `app-nav/AppNav.tsx` | Navigation shell; links to all routes |
| `app-header/AppHeader.tsx` | Header with dark mode toggle |
| `layout/` | Page layout wrapper |

## Pages Layer (`src/pages/`)

Thin shells only — each imports and renders the corresponding feature/widget.

```
pages/
├── employees/EmployeesPage.tsx
├── analytics/AnalyticsPage.tsx
├── organizations/OrganizationsPage.tsx
├── additional-trainings/AdditionalTrainingsPage.tsx
├── permits/PermitsPage.tsx
├── orders/OrdersPage.tsx
├── prescriptions/PrescriptionsPage.tsx
├── tasks/TasksPage.tsx
├── about/AboutPage.tsx
└── component-test-react/NewReactComponent.* (dead)
```

## Shared Layer (`src/shared/`)

```
shared/
├── api/
│   └── supabase.ts       # Single Supabase client (sessionStorage auth)
├── constants/
│   └── toast.ts          # TOAST_TYPES enum
├── hooks/
│   └── useNotification.ts # addNotification as param pattern
├── lib/                  # Pure utility functions
├── styles/
│   ├── modal.css         # Global: btn-primary, btn-danger, btn-cancel
│   ├── _tokens.scss      # Design tokens / color variables
│   └── _mixins.scss      # Reusable SCSS mixins
└── ui/
    ├── AnimatedSearchBar/
    ├── AnimatedStateIcons/ # framer-motion dependency (single use)
    ├── ButtonGlow/
    ├── ErrorBoundary/    # SCSS Module: ErrorBoundary.module.scss
    ├── Skeleton/         # SkeletonLoader component
    ├── StatusBadge/
    ├── Toast/            # ToastContainer
    └── Wrapper/
```

## Gaps / Unknowns
- `src/features/employee-retrain/` contents not fully explored.
- `supabase/functions/` not mapped (protected — see Telegram notes in CLAUDE.md).
