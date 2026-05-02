# Migration Plan

## Status
- Этап 1 ✅ — .env подключён, supabaseClient читает из process.env
- Этап 2 ✅ — NotificationContext создан, prop drilling убран из 3 registry
- Этап 3 ✅ — UI-компоненты перенесены в src/shared/ui/
- Этап 4 ✅ — utils/ объединены, API-слой вынесен в shared/api/
- Этап 5 ❌ — не начат (src/entities/ не существует)
- Этап 6 ✅ — Router внедрён, 8 маршрутов, NavLink, search params
- Этап 7 ✅ — App.tsx ~123 строки, widgets extracted, EmployeeProvider
- Этап 8 🔶 — частично (новые файлы .tsx/.ts, useNotification untyped)
- CSS стратегия 🔶 — частично (5 параллельных систем, Tailwind работает)

## Audit Findings (добавлено по результатам анализа)
- CRITICAL: двойной QueryClientProvider — index.js + App.tsx
- HIGH: @types/react-router-dom v5 при runtime v7
- HIGH: поле priority в форме не существует в БД
- MEDIUM: useNotification.ts не типизирован
- LOW: две библиотеки сжатия изображений (compressorjs + browser-image-compression)
- LOW: framer-motion, chart.js возможно мёртвые зависимости

---

## Bugfix Sprint (выполнить до продолжения миграции)

### BF-1 — Двойной QueryClientProvider (15 мин, CRITICAL)
Файлы: src/index.js, src/app/App.tsx
Удалить QueryClient + QueryClientProvider из index.js
Оставить только в App.tsx
Проверка: grep -n "QueryClient" src/index.js → пусто

### BF-2 — Удалить @types/react-router-dom (5 мин, HIGH)
Файл: package.json
npm uninstall @types/react-router-dom
RRD v7 поставляет собственные типы
Проверка: grep "types/react-router" package.json → пусто

### BF-3 — Поле priority (20 мин, HIGH)
Файлы: supabase/migrations/, src/features/tasks/types.ts
Создать: supabase/migrations/add_priority_to_tasks.sql
Добавить priority?: 'low' | 'medium' | 'high' в Task + TaskInsert
Проверка: npm run typecheck → без ошибок

### BF-4 — Типизировать useNotification.ts (20 мин, MEDIUM)
Файлы: src/shared/hooks/useNotification.ts, src/app/providers/NotificationProvider.tsx
Добавить interface Notification, типизировать useState + addNotification
Проверка: grep -n "any\|never\[\]" src/shared/hooks/useNotification.ts → пусто

### BF-5 — Убрать дублирующую библиотеку сжатия (10 мин, LOW)
Файлы: src/features/tasks/utils/imageCompression.ts, package.json
npm uninstall browser-image-compression
Удалить imageCompression.ts если не используется
Проверка: grep -rn "browser-image-compression" src/ → пусто

### BF-6 — Аудит мёртвых зависимостей (10 мин, LOW)
Проверить grep по: framer-motion, chart.js, react-chartjs, LoginModal
Удалить неиспользуемые пакеты
Проверка: npm run build → без warnings о неиспользуемых модулях

---

## Этап 5 — Entity constants (1 час, низкий риск)
Цель: создать src/entities/ и вынести domain constants

Перемещения:
src/utils/constants.js              → src/entities/employee/constants.ts
src/components/utils/helpers.js     → src/entities/employee/helpers.ts
src/utils/permitConstants.js        → src/entities/permit/constants.ts
src/utils/permitHelpers.js          → src/entities/permit/helpers.ts
PRESCRIPTION_STATUSES (внутри PrescriptionsRegistry.jsx) → src/entities/prescription/constants.ts

Новые файлы:
src/entities/employee/types.ts
src/entities/permit/types.ts
src/entities/order/types.ts
src/entities/prescription/types.ts
src/entities/*/index.ts  — barrel-экспорт

Исправить импорты в EmployeesPage.tsx:
@/utils/constants       → @/entities/employee/constants
@/components/utils/helpers → @/entities/employee/helpers

Проверка: grep -rn "from.*utils/constants\|from.*components/utils/helpers" src/ → пусто
npm start → статусы корректны во всех реестрах

---

## Этап 8 — TypeScript полная волна (итеративно)
Цель: устранить оставшиеся untyped boundaries

Первая волна (после BF-4):
- src/features/employee-crud/api.ts — убрать Record<string, any>
- src/shared/hooks/useNotification.ts — типизирован в BF-4
- src/components/PermitsRegistry/*.jsx — добавить prop types на границах

CSS стратегия — вторая волна:
src/style/toast.css     → src/shared/ui/Toast/Toast.module.css
src/style/Skeleton.css  → src/shared/ui/Skeleton/Skeleton.module.css
Цель: убрать plain CSS из src/style/ полностью

Проверка: tsc --noEmit без новых ошибок

---

## Текущий Scorecard (из аудита)
| Dimension        | Score /10 | Top issue                        |
|------------------|-----------|----------------------------------|
| Architecture     | 7/10      | двойной QueryClientProvider      |
| Folder structure | 6/10      | src/entities/ отсутствует        |
| TypeScript       | 5/10      | useNotification untyped, any в api|
| Performance      | 8/10      | два чарт-пакета в бандле         |
| Security         | 7/10      | RLS не покрывает multi-tenant    |
| Data layer       | 7/10      | client-side фильтрация в useTasks|
| Styling          | 5/10      | 5 параллельных систем            |
| Dead code        | 6/10      | framer-motion, chart.js, LoginModal|
| OVERALL          | 6/10      |                                  |

---

## Следующие шаги (в порядке приоритета)
1. BF-1 → BF-6 (bugfix sprint, ~1 час суммарно)
2. Этап 5 — Entity constants
3. Этап 8 — TypeScript полная волна
4. CSS консолидация
5. useTasks — перенести фильтрацию на сторону Supabase