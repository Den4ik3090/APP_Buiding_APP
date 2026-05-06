# Migration Plan — PUTEVI Safety

**Последнее обновление:** 2026-05-06 (FSD Restructuring 100% завершён — src/components удалён)  
**Основание:** Архитектурный аудит (Principal Frontend Architect, read-only)

---

## Текущий статус (что уже сделано)

| Шаг | Описание | Статус |
|-----|----------|--------|
| FSD shell | app/, pages/, widgets/, shared/, entities/ | ✅ |
| Router | HashRouter, 8 маршрутов, React.lazy | ✅ |
| NotificationContext | prop drilling убран из registry | ✅ |
| shared/ui/ | Toast, Skeleton, StatusBadge, ButtonGlow, Wrapper | ✅ |
| shared/api/ | supabase.ts (single client), telegram.ts | ✅ |
| entities/ | employee, permit, order, prescription (model+constants+lib+index) | ✅ |
| features/tasks/ | полный FSD-slice: service → hook (TanStack Query) → components | ✅ |
| features/employee-crud/ | EmployeeProvider, api.ts, EmployeeTable.tsx | ✅ (частично) |
| CSS refactor | src/style/ удалён, modal.css → shared/styles/, SCSS modules для tasks | ✅ |
| Dark mode | document.documentElement.classList.toggle("dark", isDark) | ✅ |
| Vanilla Extract | удалён из кода и webpack | ✅ |

---

## Известные проблемы, требующие исправления

### P1 — Критические (блокируют TypeScript-здоровье)

**P1-1 — Stale TaskStatus literals (30 мин)**  
Файлы: `src/features/tasks/components/TaskDashboard.tsx`, `TaskCalendar.tsx`, `TaskFilters.tsx`  
Проблема: сравнения с `'completed'`, `'done'`, `'Выполнено'`, `'open'` — этих значений нет в  
`TaskStatus = 'pending' | 'in_progress' | 'resolved' | 'overdue'`  
Исправление:
- `TaskDashboard:38-40` — заменить `'completed' || 'done' || 'Выполнено'` на `'resolved'`
- `TaskCalendar:42` — заменить `'open'` на `'pending'`
- `TaskFilters:8` — заменить `value: 'open'` на `value: 'pending'`, label обновить по смыслу  
Проверка: `npx tsc --noEmit` — ошибки в features/tasks/ исчезают (было 5)

**P1-2 — AnyEmployee / Employee prop mismatch в pages (20 мин)**  
Файлы: `src/pages/employees/EmployeesPage.tsx`, `src/pages/organizations/OrganizationsPage.tsx`,  
`src/pages/additional-trainings/AdditionalTrainingsPage.tsx`  
Проблема: `AnyEmployee[]` не совместим с `Employee[]` и `never[]` в пропсах  
Исправление: добавить `emptyText` prop в вызов `VirtualEmployeeTable` (или сделать его опциональным  
с дефолтом в `VirtualEmployeeTable.jsx`). Для `never[]` — явно типизировать useState в страницах.  
Проверка: `npx tsc --noEmit` — 0 ошибок (текущий baseline: 10)

---

### P2 — Архитектурные нарушения FSD

**P2-1 — shared/ импортирует из features/ (20 мин)**  
Файл: `src/shared/hooks/useExpiredCount.ts:5`

```ts
import type { AnyEmployee } from "@/features/employee-crud/api"; // НАРУШЕНИЕ
import { useNotificationContext } from "@/app/providers/NotificationProvider"; // НАРУШЕНИЕ
```

Исправление: заменить `AnyEmployee` на `Employee` из `@/entities/employee/model` —  
хук использует только `trainingDate` и `additionalTrainings`, оба поля есть в `Employee`.  
Для `useNotificationContext` — передавать `addNotification` как параметр хука, а не импортировать context.  
Проверка: `grep -n "from.*features\|from.*app/providers" src/shared/` — пусто

**P2-2 — Захардкоженные имена Realtime-каналов (15 мин)**  
Файлы: `src/features/permits/components/PermitsRegistry.jsx`,  
`src/features/prescriptions/components/PrescriptionsRegistry.jsx`  
Проблема: строки `"permits_changes"` и `"prescriptions_registry_changes"` — опечатка или  
переименование без grep тихо ломает live-обновления.  
Исправление: создать `src/shared/constants/realtimeChannels.ts`:

```ts
export const REALTIME_CHANNELS = {
  PERMITS: 'permits_changes',
  PRESCRIPTIONS: 'prescriptions_registry_changes',
} as const;
```

Заменить строки в обоих registry.  
Проверка: `grep -rn "\.channel(\"" src/features/` — пусто

**P2-3 — AppLayout.module.scss мёртвый файл (5 мин)**  
Файл: `src/AppLayout.module.scss`  
Проверка перед удалением: `grep -rn "AppLayout" src/` — пусто  
Действие: удалить файл.

---

## Stage 1 — Структурная миграция Registry ✅ ЗАВЕРШЁН

Цель: вынести Supabase-вызовы из трёх legacy-компонентов в service-слой и подключить TanStack Query.

### 1.1 — Permits service + hook ✅

`src/features/permits/services/permitsService.ts` — создан (Stage 2.1).  
`src/features/permits/hooks/usePermits.ts` — создан (Stage 2.2):
- `usePermitsQuery()` / `usePermitEmployeesQuery()` / `useDeletePermitMutation()`

`src/features/permits/components/PermitsRegistry.jsx` — обновлён:
- удалён `useState(permits/employees/loading)` + `loadPermits/loadEmployees/loadData`
- Realtime callback использует `queryClient.invalidateQueries`

### 1.2 — Prescriptions service + hook ✅

`src/features/prescriptions/services/prescriptionsService.ts` — создан (Stage 2.1).  
`src/features/prescriptions/hooks/usePrescriptions.ts` — создан (Stage 2.2).  
`src/features/prescriptions/components/PrescriptionsRegistry.jsx` — обновлён.

### 1.3 — Orders service + hook ✅

`src/features/orders/services/ordersService.ts` — создан (Stage 2.1).  
`src/features/orders/hooks/useOrders.ts` — создан (Stage 2.2).  
`src/features/orders/components/OrdersRegistry.jsx` — обновлён.

---

## Stage 2 — EmployeeProvider → TanStack Query ✅ ЗАВЕРШЁН

Цель была: устранить anti-pattern "API-функция получает setState как параметр" и убрать Context.

**Что сделано:**
- Создан `src/features/employee-crud/services/employeesService.ts` — чистые async-функции без setState
- Создан `src/features/employee-crud/hooks/useEmployees.ts`:
  - `useEmployeesQuery`, `useOrganizationsQuery`
  - `useAddEmployeeMutation`, `useUpdateEmployeeMutation`, `useDeleteEmployeeMutation`, `useRetrainEmployeeMutation`
- `EmployeesPage.tsx` — UI-состояние (`showForm`, `editingEmployee`) перенесено в локальный `useState`; CRUD — через mutation hooks с `mutateAsync`
- `StatsBar`, `AppNav`, `OrganizationsPage`, `AnalyticsPage`, `AdditionalTrainingsPage` — заменён `useEmployeeContext()` на прямые вызовы `useEmployeesQuery()` / `useOrganizationsQuery()`
- `EmployeeProvider.tsx` — **удалён**
- `App.tsx` — `<EmployeeProvider>` обёртка убрана

Проверка: `npx tsc --noEmit` — 0 ошибок ✅

---

## Stage 3 — TypeScript Hardening (после Stage 2)

### 3.1 — Устранить AnyEmployee + Legacy api.ts Liquidation ✅ ЗАВЕРШЁН

**Фаза 1:** `AnyEmployee` заменён на `Employee` в: `employeesService.ts`, `useEmployees.ts`,  
`exportToCSV.ts`, `EmployeesPage.tsx`, `StatsBar.tsx`, `OrganizationsPage.tsx`, `AdditionalTrainingsPage.tsx`.

**Фаза 2 (Legacy Liquidation):**
- `mapFormToDb` и `formatDataForApp` перенесены из `api.ts` в `employeesService.ts` как private функции (не экспортируются). `mapFormToDb` типизирован как `(form: Employee)`, `formatDataForApp` получает строгий `DbRow` тип вместо `AnyEmployee[]`.
- `src/features/employee-crud/api.ts` — **удалён** (4 мёртвые функции со старым setState-антипаттерном, `AnyEmployee` тип).
- `src/features/employee-retrain/api.ts` — **удалён** (100% мёртвый код, единственный потребитель `AnyEmployee` в живом импорте).

`npx tsc --noEmit` → 0 ошибок. `AnyEmployee` полностью удалён из кодовой базы.

### 3.x — Конвертация legacy JSX компонентов в TSX ✅ ЗАВЕРШЁН

**Выполнено:**
- `VirtualEmployeeTable.jsx` → `VirtualEmployeeTable.tsx` — strict `VirtualEmployeeTableProps`, `RowComponentProps` из react-window v2. Исправлен API с v1 на v2. Удалён `.jsx`.
- `EmployeeForm.jsx` → `EmployeeForm.tsx` — строгие интерфейсы `EmployeeFormProps`, `EmployeeFormData`, `FormAdditionalTraining`, `FieldConfig`. Удалён `.jsx`.
- `EmployeeTable.tsx` — заменён локальный `Employee` на `import type { Employee } from "@/entities/employee"`. `addNotification` сигнатура выровнена.
- `EmployeesPage.tsx` — убраны все `as any`.
- `OrganizationManager.jsx` → `OrganizationManager.tsx` — `OrganizationManagerProps`, `OrgDoc`, `DocsStatus`. Удалён `.jsx`. Убран `as any` в `OrganizationsPage.tsx`.
- `AdditionalTrainingsManager.jsx` → `AdditionalTrainingsManager.tsx` — `AdditionalTrainingsManagerProps`, `TrainingRecord`, `EmployeeGroup`, `ByTypeItem`, `ByMonthItem`, `TrainingData`. Удалён `.jsx`. Убран `as any` в `AdditionalTrainingsPage.tsx`.

**`as any` в `.ts`/`.tsx` файлах: 0** — полностью ликвидировано.  
`npx tsc --noEmit` → 0 ошибок.

### 3.2 — Типизировать Notification.type как union ✅ ЗАВЕРШЁН

- `src/shared/constants/toast.ts` — добавлен `as const` на `TOAST_TYPES`; экспортирован `NotificationType = typeof TOAST_TYPES[keyof typeof TOAST_TYPES]`.
- `src/shared/hooks/useNotification.ts` — `Notification.type: string` → `type: NotificationType`; `addNotification` параметр сужён до `NotificationType`.
- `VirtualEmployeeTable.tsx`, `EmployeeTable.tsx`, `useExpiredCount.ts` — сигнатуры `addNotification` обновлены до `NotificationType`.
- `src/declarations.d.ts` — добавлен `declare module 'file-saver'` (отсутствующие bundled types, обнаруженные при конвертации).

`npx tsc --noEmit` → 0 ошибок.

### 3.3 — Добавить Error Boundaries ✅ ЗАВЕРШЁН

- `src/shared/ui/ErrorBoundary/ErrorBoundary.tsx` — Class component: `getDerivedStateFromError` + `componentDidCatch` (логирует в console). Fallback UI в стиле PUTEVI (navy + gold). Кнопка "Перезагрузить страницу".
- `src/shared/ui/ErrorBoundary/ErrorBoundary.module.scss` — SCSS Module с токенами (`$navy-surface`, `$gold`, `$radius-xl`). Sass-импорт: `@use "../../styles" as s` (относительный путь к barrel `index.scss`) + `@use "sass:color"` для `color.adjust()`. Webpack-алиас `@/` не резолвится sass-loader — относительные пути обязательны для SCSS Modules в этом проекте.
- `src/shared/ui/ErrorBoundary/index.ts` — barrel-экспорт.
- `src/app/App.tsx` — `<ErrorBoundary>` обёртка вокруг `<AppRouter />`. Ловит ошибки рендера всех lazy-loaded страниц.

Поведение при ошибке: branded fallback UI вместо белого экрана. Остальной шелл (header, nav, stats) остаётся рабочим.  
`npm run build` → `compiled with 2 warnings` (только bundle size). `npx tsc --noEmit` → 0 ошибок.

---

## Post-Migration Status — Employee & Registry Features

**Дата:** 2026-05-06 (обновлено: Final Type Hardening завершён)  
**`npx tsc --noEmit` → 0 ошибок | `as any` в .ts/.tsx: 0**

### TypeScript Coverage — Employee pipeline

| Файл | Статус |
|------|--------|
| `entities/employee/model.ts` | ✅ Strict |
| `entities/employee/lib.ts` | ✅ Strict |
| `features/employee-crud/api.ts` | 🗑️ Удалён (legacy dead code) |
| `features/employee-crud/services/employeesService.ts` | ✅ Strict `Employee` |
| `features/employee-crud/hooks/useEmployees.ts` | ✅ Strict `Employee` |
| `features/employee-crud/components/EmployeeTable.tsx` | ✅ Entity `Employee` импортирован |
| `features/employee-crud/components/VirtualEmployeeTable.tsx` | ✅ Strict (JSX удалён) |
| `features/employee-crud/components/EmployeeForm.tsx` | ✅ Strict (JSX удалён) |
| `features/organization-docs/components/OrganizationManager.tsx` | ✅ Strict (JSX удалён) |
| `features/additional-trainings/components/AdditionalTrainingsManager.tsx` | ✅ Strict |
| `widgets/analytics-dashboard/ui/AnalyticsDashboard.tsx` | ✅ Strict (JSX→TSX) |
| `pages/employees/EmployeesPage.tsx` | ✅ Без `as any` |
| `widgets/stats-bar/StatsBar.tsx` | ✅ |
| `widgets/app-nav/AppNav.tsx` | ✅ |
| `pages/analytics/AnalyticsPage.tsx` | ✅ |
| `features/employee-export/exportToCSV.ts` | ✅ |

### Оставшиеся `as any`

**Нет.** Все `.ts`/`.tsx` файлы — 0 `as any`.

---

## Stage 4 — Перформанс и bundle (низкий приоритет)

### 4.1 — Убрать дублирующую charting-библиотеку

Проверить: `grep -rn "from 'chart.js'\|from 'react-chartjs'" src/` vs `from 'recharts'`  
Если используется только одна — удалить другую + entry в package.json.  
Экономия: ~300–450 KB bundle.

### 4.2 — Dynamic import для xlsx

Файл: `src/features/employee-export/exportToCSV.ts`  
Заменить статический `import * as XLSX from 'xlsx'` на динамический импорт внутри функции:

```ts
const XLSX = await import('xlsx');
```

Экономия: ~800 KB из initial bundle.

### 4.3 — Server-side фильтрация в useTasks

Файл: `src/features/tasks/hooks/useTasks.ts`  
Текущая проблема: `fetchTasks()` делает `SELECT *` без LIMIT, фильтрация в браузере.  
Исправление в `tasksService.ts`:

```ts
export const fetchTasks = async (filters: TaskFilters) => {
  let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (filters.status)     q = q.eq('status', filters.status);
  if (filters.siteId)     q = q.eq('site_id', filters.siteId);
  if (filters.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
  return q.limit(200);
};
```

Убрать `applyFilters` из хука — фильтрация переносится на сторону Supabase.

---

## Stage 5 — FSD Registry Co-location ✅ ЗАВЕРШЁН

**Дата:** 2026-05-06  
Цель: переместить legacy `src/components/` registry-папки в домены FSD, устранить circular coupling в `employee-crud`.

### Phase 1 — Registry UI Co-location ✅

| Откуда | Куда |
|--------|------|
| `src/components/PermitsRegistry/` (8 файлов) | `src/features/permits/components/` |
| `src/components/OrderRegistry/` (5 файлов) | `src/features/orders/components/` |
| `src/components/Prescriptions/` (5 файлов) | `src/features/prescriptions/components/` |

- `PermitsRegistry.jsx`, `OrdersRegistry.jsx`, `PrescriptionsRegistry.jsx` — относительный импорт `../../app/providers/NotificationProvider` обновлён до `../../../app/providers/NotificationProvider`.
- `PermitsPage.tsx`, `OrdersPage.tsx`, `PrescriptionsPage.tsx` — `@/components/...` → `@/features/*/components/...`.
- Старые пустые директории удалены.

### Phase 2 — Eliminate Circular Coupling (Debt 1) ✅

| Откуда | Куда |
|--------|------|
| `src/components/WorkerTrainingDownloadButton.jsx` + `.scss` | `src/features/employee-crud/components/` |
| `src/components/OrganizationTelegramReport.jsx` | `src/features/employee-crud/components/` |

- `EmployeeTable.tsx` — `@/components/WorkerTrainingDownloadButton` / `@/components/OrganizationTelegramReport` → относительные `./WorkerTrainingDownloadButton` / `./OrganizationTelegramReport`.
- `VirtualEmployeeTable.tsx` — `./WorkerTrainingDownloadButton` → `@/features/employee-crud/components/WorkerTrainingDownloadButton`.

`npx tsc --noEmit` → 0 ошибок ✅

### Phase 3 — Employee Feature Consolidation ✅

| Откуда | Куда |
|--------|------|
| `src/components/EmployeeForm.tsx` + `.scss` | `src/features/employee-crud/components/` |
| `src/components/VirtualEmployeeTable.tsx` | `src/features/employee-crud/components/` |

- `EmployeesPage.tsx` — `@/components/EmployeeForm` / `@/components/VirtualEmployeeTable` → `@/features/employee-crud/components/...`.
- `EmployeeTable.tsx` — те же импорты уже были обновлены на относительные `./...` (Phase 2 baseline).
- `src/features/employee-crud/components/index.ts` — создан (экспортирует `EmployeeTable`, `EmployeeForm`, `VirtualEmployeeTable`).

### Phase 4 — Organization-Docs Slice ✅

Новый FSD-слайс: `src/features/organization-docs/`.

**Создано:**
- `src/features/organization-docs/services/organizationDocsService.ts` — экспортирует:
  - `fetchOrgDocs(): Promise<OrgDoc[]>` — SELECT `organization_docs`
  - `upsertOrgDoc(orgName, docsStatus)` — UPSERT одной записи
  - `upsertManyOrgDocs(docs)` — UPSERT массива (используется при удалении колонки)
  - Публичные типы `DocsStatus`, `OrgDoc`
- `src/features/organization-docs/components/OrganizationManager.tsx` — переработан: все 3 прямых вызова `supabase` заменены вызовами сервиса. Импорт `supabase` удалён.
- `src/features/organization-docs/components/index.ts` — barrel-экспорт.

**Обновлено:**
- `OrganizationsPage.tsx` — `@/components/OrganizationManager` → `@/features/organization-docs/components/OrganizationManager`.

`npx tsc --noEmit` → 0 ошибок ✅

### Phase 5 — Additional Trainings Slice ✅

| Откуда | Куда |
|--------|------|
| `src/components/AdditionalTrainingsManager.tsx` + `.css` | `src/features/additional-trainings/components/` |

- `AdditionalTrainingsPage.tsx` — `@/components/AdditionalTrainingsManager` → `@/features/additional-trainings/components/AdditionalTrainingsManager`.
- `src/features/additional-trainings/components/index.ts` — создан.

### Phase 6 — Analytics Widget & TSX Hardening ✅

Новый виджет: `src/widgets/analytics-dashboard/`.

- `AnalyticsDashboard.jsx` — **конвертирован в TSX** и перенесён в `src/widgets/analytics-dashboard/ui/AnalyticsDashboard.tsx`.
- Строгие интерфейсы добавлены:
  - `AnalyticsDashboardProps` — `employees: Employee[]`, `getDaysDifference: (dateStr: string) => number`
  - `EnrichedEmployee` — `Employee` + `responsibleLabel`, `professionLabel`, `daysSinceTraining`
  - `DueSoonEmployee` — `EnrichedEmployee` + `daysUntilRefresh`
  - `ResponsibleGroup`, `PieDataItem`, `BarDataItem`
- Все состояния типизированы: `useState<string | null>`, `useState<EnrichedEmployee | null>`, `useRef<HTMLDivElement>`.
- `RowComponent` типизирован через `RowComponentProps` из `react-window`.
- `List` props скорректированы до v2 API: `defaultHeight` вместо `height`.
- Supabase: **не используется** — чистый props-based компонент ✅.
- `AnalyticsDashboard.scss` — **удалён** (орфанный файл, не импортировался нигде).
- `src/widgets/analytics-dashboard/index.ts` — создан (экспортирует default + `AnalyticsDashboardProps`).
- `AnalyticsPage.tsx` — `@/components/AnalyticsDashboard` → `@/widgets/analytics-dashboard`.

### Финал — src/components УДАЛЁН ✅

`src/components/` полностью пуст и удалён. Ни одного `@/components/` импорта в кодовой базе.

`npx tsc --noEmit` → 0 ошибок ✅

---

## Неприкасаемые файлы

| Файл / область | Причина |
|----------------|---------|
| `src/components/EmployeeForm.jsx` | Самый большой компонент, главная форма ввода данных. Риск регрессии выше пользы. Трогать только после стабилизации всех Registry. |
| Строки Realtime-каналов (`"permits_changes"`, `"prescriptions_registry_changes"`) | Observable infrastructure. Константа защищает от опечаток, но сами строки не менять без миграции на стороне Supabase. |
| `src/shared/api/supabase.ts` — `storage: sessionStorage` | Намеренное security-решение. Изменение требует security review, не code PR. |
| `supabase/functions/` | Защищённые Edge Functions. Любые изменения — только с явного согласия. |

---

## Порядок выполнения

```
P1-1 → P1-2            fix TS baseline: 10 → 0 ошибок
P2-1 → P2-2 → P2-3    fix FSD нарушения, защитить Realtime-имена
Stage 1.1 → 1.2 → 1.3  Registry service layers (поочерёдно, изолированно)
Stage 2                 EmployeeProvider → TanStack Query
Stage 3.1 → 3.2 → 3.3  TypeScript hardening (после Stage 2)
Stage 4                 Performance (в последнюю очередь)
```

---

## Эталонные файлы (образцы для нового кода)

| Зачем смотреть | Файл |
|----------------|------|
| Service layer | `src/features/tasks/services/tasksService.ts` |
| TanStack Query hook | `src/features/tasks/hooks/useTasks.ts` |
| Entity model | `src/entities/employee/model.ts` |
| Typed component (Tailwind + dark mode) | `src/features/employee-crud/components/EmployeeTable.tsx` |
| SCSS Module usage | `src/features/tasks/components/tasks.module.scss` |
