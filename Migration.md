# Migration Plan — PUTEVI Safety

**Последнее обновление:** 2026-05-05  
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
Файлы: `src/components/PermitsRegistry/PermitsRegistry.jsx:102`,  
`src/components/Prescriptions/PrescriptionsRegistry.jsx:104`  
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
Проверка: `grep -rn "\.channel(\"" src/components/` — пусто

**P2-3 — AppLayout.module.scss мёртвый файл (5 мин)**  
Файл: `src/AppLayout.module.scss`  
Проверка перед удалением: `grep -rn "AppLayout" src/` — пусто  
Действие: удалить файл.

---

## Stage 1 — Структурная миграция Registry (приоритет: высокий)

Цель: вынести Supabase-вызовы из трёх legacy-компонентов в service-слой.  
Образец для копирования: `src/features/tasks/services/tasksService.ts`

### 1.1 — Permits service + hook (4–6ч)

Создать `src/features/permits/services/permitsService.ts`:

```ts
// fetchPermits(): Promise<Permit[]>
// createPermit(payload): Promise<Permit>
// updatePermit(id, payload): Promise<Permit>
// deletePermit(id): Promise<void>
```

Все типы — из `@/entities/permit/model.ts`. Supabase вызовы — только здесь, без setState-параметров.

Создать `src/features/permits/hooks/usePermits.ts`:

```ts
export function usePermits(filters?) { return useQuery(['permits', filters], ...) }
export function useCreatePermit() { return useMutation(...) }
export function useUpdatePermit() { ... }
export function useDeletePermit() { ... }
```

Обновить `src/components/PermitsRegistry/PermitsRegistry.jsx`:
- удалить `useState(permits)` + `useEffect(loadPermits)`
- заменить на `const { data: permits, isLoading } = usePermits()`
- удалить inline `supabase.from()` вызовы для permits
- оставить пока: `useState(showForm)`, `useState(editingPermit)`, фильтры, Realtime

Проверка: поведение не меняется, `npx tsc --noEmit` без новых ошибок.

### 1.2 — Prescriptions service + hook (4–6ч)

Аналогично 1.1, для `prescriptions`.  
Создать `src/features/prescriptions/services/prescriptionsService.ts`  
и `src/features/prescriptions/hooks/usePrescriptions.ts`.  
Обновить `src/components/Prescriptions/PrescriptionsRegistry.jsx`.

### 1.3 — Orders service + hook (4–6ч)

Аналогично 1.1, для `orders`.  
Создать `src/features/orders/services/ordersService.ts`  
и `src/features/orders/hooks/useOrders.ts`.  
Обновить `src/components/OrderRegistry/OrdersRegistry.jsx`.

---

## Stage 2 — EmployeeProvider → TanStack Query (приоритет: средний)

Цель: устранить anti-pattern "API-функция получает setState как параметр".  
Файлы: `src/features/employee-crud/api.ts`, `src/features/employee-crud/EmployeeProvider.tsx`

Текущая проблема в `api.ts:58`:

```ts
// setState передаётся в сервисный слой — инверсия зависимостей
export const addEmployee = async (
  formData, notify, setEmployees, setShowForm, setEditingEmployee
) => { ... setEmployees(prev => ...); setShowForm(false); }
```

Цель:

```ts
// api.ts — только данные
export const addEmployee = async (formData: EmployeeInsert): Promise<Employee>

// EmployeeProvider — хук управляет состоянием
const { mutate: add } = useMutation({
  mutationFn: addEmployee,
  onSuccess: () => qc.invalidateQueries(['employees'])
})
```

Шаги:
1. Переписать `fetchFromSupabase` — использовать `useQuery(['employees'], fetchEmployees)`
2. Переписать `addEmployee`, `updateEmployee`, `deleteEmployee`, `retrainEmployee` в api.ts — убрать все параметры setState, оставить только данные, возвращать `Promise<Employee|void>`
3. В `EmployeeProvider` создать мутации через `useMutation`
4. Убрать `useState(employees)` + `useEffect(reload)` — данные идут из useQuery
5. Обновить тип контекста

Проверка: `npx tsc --noEmit`, визуальный тест CRUD в браузере.

---

## Stage 3 — TypeScript Hardening (после Stage 2)

### 3.1 — Устранить AnyEmployee

После того как `EmployeeProvider` перейдёт на TanStack Query и `fetchEmployees` будет возвращать  
`Employee[]`, заменить `AnyEmployee = Record<string, any>` на `Employee` в api.ts и всех consumers.  
Файлы: `src/features/employee-crud/api.ts`, `EmployeesPage.tsx`, `VirtualEmployeeTable.jsx`, `EmployeeForm.jsx`.  
Это разблокирует настоящую типобезопасность — schema change в БД станет TS-ошибкой, а не runtime-багом.

### 3.2 — Типизировать Notification.type как union

Файл: `src/shared/hooks/useNotification.ts`  
Проблема: `type: string` вместо `'success' | 'error' | 'warning' | 'info'`  
Исправление: привести к union, совместимому с `TOAST_TYPES as const` из `shared/constants/toast.ts`

### 3.3 — Добавить Error Boundaries

Создать `src/shared/ui/ErrorBoundary/index.tsx` (class component).  
Обернуть в `App.tsx`:
- `<ErrorBoundary>` вокруг `<AppRouter />`
- `<ErrorBoundary>` вокруг `<EmployeeProvider>`

Текущее поведение при ошибке: белый экран без сообщения.

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
