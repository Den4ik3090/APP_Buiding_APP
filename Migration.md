# Migration Plan

## Status
- Этап 1 ✅ — .env подключён, supabaseClient читает из process.env
- Этап 2 ✅ — NotificationContext создан, prop drilling убран из 3 registry
- Этап 3 ✅ — Shared UI перемещён в src/shared/ui/
- Этап 4 ✅ — Shared API/utils/hooks перемещены в src/shared/
- Этап 5 🔲
- Этап 6 ✅ — activeTab → URL navigation (HashRouter, 7 routes, NavLink, search params)
- Этап 7 ✅ — App.jsx decomposed → App.tsx (~88L auth-only), EmployeeProvider, widgets, feature apis
- Этап 8 🔲

---

## Этап 3 — Shared UI (1–2 часа, низкий риск)
Цель: изолировать переиспользуемые компоненты в shared/ui/

Перемещения:
src/components/Skeleton.jsx       → src/shared/ui/Skeleton/index.jsx
src/components/StatusBadge.jsx    → src/shared/ui/StatusBadge/index.jsx
src/components/Toast.jsx          → src/shared/ui/Toast/Toast.jsx
src/components/ToastContainer.jsx → src/shared/ui/Toast/ToastContainer.jsx
src/components/Table.jsx          → src/shared/ui/Table/index.jsx
src/components/ui/ButtonGlow.jsx  → src/shared/ui/ButtonGlow/index.jsx
src/components/ui/ButtonGlow.scss → src/shared/ui/ButtonGlow/ButtonGlow.scss

Удалить:
src/components/Dashboard.jsx — не используется (проверить grep перед удалением)

Правила:
- Не переименовывать .jsx в .tsx
- Не менять логику компонентов
- Сохранить CSS-стратегию каждого компонента
- Использовать @/ alias в новых импортах

Проверка: npm start → Skeleton, StatusBadge, Toast, Table, ButtonGlow отображаются.

---

## Этап 4 — Shared API + Utils merge (1–2 часа, низкий риск)
Цель: объединить два utils/, вынести supabaseClient, убрать пустые файлы

Перемещения:
src/supabaseClient.js            → src/shared/api/supabase.ts
src/utils/sendToTelegram.js      → src/shared/api/telegram.ts
src/utils/analytics.js           → src/shared/lib/analytics.ts
src/utils/toastConfig.js         → src/shared/constants/toast.ts
src/hooks/useNotification.js     → src/shared/hooks/useNotification.ts

Удалить:
src/components/utils/orderConstant.js — пустой
src/components/utils/orderHelpers.js  — пустой

Риск: Supabase-импорт есть в 10+ файлах — обновить все за один коммит.
Проверка: npm run build без ошибок, все сетевые запросы работают.

---

## Этап 5 — Entity constants (1 час, низкий риск)
Цель: вынести domain constants из компонентов в сущности

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
src/entities/*/index.ts  — barrel-экспорт в каждой папке

Риск: PRESCRIPTION_STATUSES может импортироваться снаружи — проверить grep.
Проверка: npm start, статусы отображаются корректно во всех реестрах.

---

## Этап 6 — Router (2–3 часа, средний риск)
Цель: заменить activeTab на URL-навигацию

Установить: react-router-dom + @types/react-router-dom

Новые файлы:
src/app/router.tsx — HashRouter с 7 маршрутами

Маршруты:
/                    → EmployeesPage
/analytics           → AnalyticsPage
/organizations       → OrganizationsPage
/additional-trainings → AdditionalTrainingsPage
/permits             → PermitsPage
/orders              → OrdersPage
/prescriptions       → PrescriptionsPage

Изменения:
src/App.jsx        — убрать activeTab state, добавить RouterProvider
src/widgets/app-nav/AppNav.tsx — button onClick → NavLink

Риск: selectedOrg и tableStatusFilter используются между вкладками
Решение: URL search params (?org=АО&status=expired)
Проверка: обновить страницу на /permits → остаёшься на permits.

---

## Этап 7 — App.jsx decomposition (2–3 часа, средний риск)
Цель: превратить App.jsx из 740 строк в ~50-строчный orchestrator

Новые файлы:
src/widgets/app-header/AppHeader.tsx  ← header JSX из App.jsx
src/widgets/stats-bar/StatsBar.tsx    ← info JSX из App.jsx
src/features/employee-crud/api.ts     ← addEmployee, updateEmployee, handleDelete
src/features/employee-retrain/api.ts  ← handleRetrain
src/features/employee-export/exportToCSV.ts ← exportCSV
src/pages/employees/EmployeesPage.tsx ← блок activeTab === "table"
src/app/App.tsx                       ← только auth-check + providers + router

Риск: expiredCount и prevExpiredRef нужны в двух местах
Решение: вынести в отдельный hook useExpiredCount
Проверка: CRUD сотрудников, CSV-экспорт, счётчик просроченных, toast — всё работает.

---

## Этап 8 — TypeScript + CSS стратегия (итеративно)
Цель: зафиксировать правила, начать миграцию без полной перезаписи

TypeScript — принцип: новые файлы только .tsx/.ts
Старые .jsx переименовываются по мере касания

CSS — принцип: CSS Modules для новых файлов
Первая волна:
src/style/toast.css   → src/shared/ui/Toast/Toast.module.css
src/style/Skeleton.css → src/shared/ui/Skeleton/Skeleton.module.css

Проверка: tsc --noEmit без новых ошибок, стили визуально не изменились.