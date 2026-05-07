# LearnProject — PUTEVI Safety: Onboarding Guide

> **Who this is for:** A developer joining the project for the first time.
> You know React and basic TypeScript, but FSD (Feature-Sliced Design) is new.
> This guide explains not just *what* the code does — but *why* it's structured this way.

---

## Table of Contents

1. [The Big Picture — What Is This App?](#1-the-big-picture)
2. [Module 1 — The Architecture (FSD)](#module-1--the-architecture-fsd)
3. [Module 2 — The Data Plumbing](#module-2--the-data-plumbing)
4. [Module 3 — Code Standards](#module-3--code-standards)
5. [The Thinking Process — Adding a New Feature](#the-thinking-process--adding-a-new-feature)
6. [Common Beginner Mistakes](#common-beginner-mistakes)
7. [Quick Reference](#quick-reference)

---

## 1. The Big Picture

**PUTEVI Safety** is a web application for AO PUTEVI — a construction company.
It tracks:

- **Employees** and their safety training expiry dates
- **Permits** (наряды-допуски) for construction work
- **Orders** (предписания) from safety inspectors
- **Prescriptions** (распоряжения) from management
- **Tasks** for the safety team
- **Organization documents** checklist

The app runs in a browser, connects to **Supabase** (a hosted Postgres database + auth), and is built with **React 18** + **TypeScript**.

---

## Module 1 — The Architecture (FSD)

### 1.1 The Building Construction Analogy

You work for a construction company. Let's use that.

Imagine building a skyscraper. There are strict rules about what can be built on what:

```
FLOOR 6 — PENTHOUSE (Pages)
  │  can use anything below it
  ▼
FLOOR 5 — OFFICES (Widgets)
  │  can use floors 1–4
  ▼
FLOOR 4 — DEPARTMENTS (Features)
  │  can use floors 1–3
  ▼
FLOOR 3 — MATERIALS (Entities)
  │  can use floors 1–2
  ▼
FLOOR 2 — TOOLS & EQUIPMENT (Shared)
  │  can use floor 1 only
  ▼
FLOOR 1 — FOUNDATION (External libraries: React, Supabase, etc.)
```

**The ironclad rule:** You can only bring materials *down* from upper floors.
A foundation worker does not carry bricks from the penthouse. A page can import from features. A feature cannot import from a page.

This is Feature-Sliced Design (FSD).

---

### 1.2 The Layer Structure

Here is the actual project folder structure:

```
src/
├── app/           ← Floor 6 (app shell, auth, providers, router)
├── pages/         ← Floor 6 (one file per URL route)
├── widgets/       ← Floor 5 (layout-level components: header, nav, stats)
├── features/      ← Floor 4 (business logic: employee-crud, tasks, permits...)
├── entities/      ← Floor 3 (pure data contracts: Employee, Permit, Order...)
├── shared/        ← Floor 2 (utilities: supabase client, hooks, ui components)
└── auth/          ← Special isolated zone (login page)
```

Let's walk through each layer.

---

### 1.3 Layer: `shared/` — The Toolbox

**What it is:** The lowest layer. Code that has zero business logic.
Nothing in `shared/` knows about employees, permits, or tasks.

```
src/shared/
├── api/
│   └── supabase.ts        ← The ONE database client for the whole app
├── constants/
│   └── toast.ts           ← Notification type definitions
├── hooks/
│   ├── useNotification.ts ← Toast notification hook
│   └── useExpiredCount.ts ← Count expired employees (generic)
├── lib/                   ← Pure utility functions
├── styles/
│   ├── modal.css          ← Global button classes (btn-primary, btn-danger)
│   ├── _tokens.scss       ← Design tokens (colors, spacing)
│   └── _mixins.scss       ← Reusable SCSS patterns
└── ui/
    ├── Toast/             ← Notification component
    ├── Skeleton/          ← Loading placeholder
    ├── StatusBadge/       ← Colored status pill
    ├── ButtonGlow/        ← Animated button
    ├── Wrapper/           ← Layout wrapper
    └── ErrorBoundary/     ← Crash recovery component
```

**The Golden Rule for `shared/`:**
> It must have ZERO imports from `features/`, `pages/`, `app/`, or `entities/`.

If you write a utility function in `shared/` that imports from a feature — you have broken the architecture. It would be like pouring your foundation *after* the building is already standing.

**Real example — the Supabase client:**

```typescript
// src/shared/api/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[supabase] REACT_APP_SUPABASE_URL и REACT_APP_SUPABASE_KEY должны быть заданы в .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage, // intentional security decision — session only
  },
});
```

There is **exactly one** Supabase client. Every feature imports *this* one.
Never create `createClient(...)` anywhere else in the project.

---

### 1.4 Layer: `entities/` — The Data Contracts

**What it is:** Pure TypeScript definitions for the business objects.
No React. No Supabase. No UI. Just types, constants, and pure functions.

```
src/entities/
├── employee/
│   ├── model.ts       ← TypeScript interfaces
│   ├── constants.ts   ← Status thresholds, training type list
│   ├── lib.ts         ← Pure helper functions (date math, status derivation)
│   └── index.ts       ← Public API (what the rest of the app can import)
├── permit/
├── order/
└── prescription/
```

**Real example — the Employee type:**

```typescript
// src/entities/employee/model.ts

export interface AdditionalTraining {
  dateReceived?: string | null;
  expiryMonths?: number | string | null;
  [key: string]: unknown;
}

// This is the app-side shape (camelCase).
// The database uses snake_case — the service layer translates between them.
export interface Employee {
  id: string;
  name: string;
  profession: string;
  birthDate: string | null;
  trainingDate: string;     // the most important field: when did they last train?
  responsible: string;
  comment: string;
  photo_url: string;
  organization: string;
  additionalTrainings: AdditionalTraining[];
  createdAt: string | null;
}

export type EmployeeInsert = Omit<Employee, 'id' | 'createdAt'>;
export type EmployeeUpdate = Partial<EmployeeInsert>;
```

**Real example — pure helper functions:**

```typescript
// src/entities/employee/lib.ts

export const getDaysDifference = (date: string): number =>
  Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

export const getStatusKey = (days: number): StatusKey => {
  if (days >= DAYS_THRESHOLD) return 'expired';   // 90+ days
  if (days >= WARNING_THRESHOLD) return 'warning'; // 75–89 days
  return 'valid';
};
```

These functions have no side effects. They always return the same output for the same input. They can be called from any layer.

**The Public API (`index.ts`):**

```typescript
// src/entities/employee/index.ts

// Only export what the rest of the app needs.
// Internal helpers stay private.
export type { Employee, EmployeeInsert, EmployeeUpdate, AdditionalTraining } from './model';
export { STORAGE_KEY, DAYS_THRESHOLD, WARNING_THRESHOLD, ADDITIONAL_TRAINING_TYPES } from './constants';
export { getDaysDifference, getStatusKey, isTrainingExpired, hasExpiredAdditional } from './lib';
export type { StatusKey } from './lib';
```

Why does this matter? Because when someone writes `import { Employee } from '@/entities/employee'`, they only see what you've explicitly decided to expose. The internal file structure is hidden. You can refactor `model.ts` into multiple files and nothing outside the entity breaks.

---

### 1.5 Layer: `features/` — The Business Logic

**What it is:** Each feature is one self-contained domain of work. A feature knows about entities, but entities don't know about features.

```
src/features/
├── employee-crud/         ← Create/read/update/delete employees
│   ├── services/
│   │   └── employeesService.ts
│   ├── hooks/
│   │   └── useEmployees.ts
│   └── components/
│       ├── EmployeeTable.tsx
│       ├── EmployeeForm.tsx
│       ├── VirtualEmployeeTable.tsx
│       ├── WorkerTrainingDownloadButton.jsx
│       ├── OrganizationTelegramReport.jsx
│       └── index.ts           ← Public API
├── tasks/                 ← Task management
├── permits/               ← Work permits
├── orders/                ← Safety orders
├── prescriptions/         ← Safety prescriptions
├── organization-docs/     ← Document checklist per organization
│   ├── services/
│   │   └── organizationDocsService.ts
│   └── components/
│       ├── OrganizationManager.tsx
│       └── index.ts
├── additional-trainings/  ← Extra training records
└── employee-export/       ← CSV export
```

Each feature that reads/writes the database has three internal sub-folders: `services/`, `hooks/`, `components/`. This is the core pattern of this project. We'll explain it deeply in Module 2.

---

### 1.6 Layer: `widgets/` — Layout Components

**What it is:** Large UI components that compose multiple features together. They belong to the layout, not to a specific business domain.

```
src/widgets/
├── analytics-dashboard/   ← Full analytics view (charts, employee lists)
│   ├── ui/
│   │   └── AnalyticsDashboard.tsx
│   └── index.ts
├── app-header/            ← Top bar (logo, logout, theme toggle)
├── app-nav/               ← Navigation tabs
├── stats-bar/             ← Live summary statistics
└── layout/                ← Page layout wrapper
```

A widget can import from `features/` and `entities/`. A feature cannot import from a widget.

**Real example — `StatsBar` widget reads from the employee feature's hook directly:**

```typescript
// src/widgets/stats-bar/StatsBar.tsx (simplified)
import { useEmployeesQuery } from '@/features/employee-crud/hooks/useEmployees';

export function StatsBar() {
  const { data: employees = [] } = useEmployeesQuery();
  // ... render summary stats
}
```

---

### 1.7 Layer: `pages/` — The Route Shells

**What it is:** Thin components. One file per URL route. Their only job is to:
1. Read URL parameters (search params, route params)
2. Call hooks to get data
3. Pass data down to a widget or feature component

Pages should contain almost zero business logic. The logic lives in features.

**Real example — the Analytics page:**

```typescript
// src/pages/analytics/AnalyticsPage.tsx
import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AnalyticsDashboard from "@/widgets/analytics-dashboard";
import { getDaysDifference, getStatusKey, hasExpiredAdditional } from "@/entities/employee";
import { useEmployeesQuery } from "@/features/employee-crud/hooks/useEmployees";

export default function AnalyticsPage() {
  const { data: employees = [] } = useEmployeesQuery();
  const [searchParams] = useSearchParams();

  const selectedOrg = searchParams.get("org") ?? "Все";
  const statusFilter = searchParams.get("status") ?? "all";

  // The page filters data from URL params, then passes it to the widget.
  const filteredEmployees = useMemo(
    () => employees.filter((emp) =>
      selectedOrg === "Все" ? true : emp.organization === selectedOrg
    ),
    [employees, selectedOrg]
  );

  return (
    <AnalyticsDashboard
      employees={filteredEmployees}
      getDaysDifference={getDaysDifference}
    />
  );
}
```

Notice the page does not contain charts, tables, or business logic.
It reads the URL, filters the data, and hands it to the widget.

---

### 1.8 The Golden Rule Visualized

```
ALLOWED imports (downward only):

pages      → widgets, features, entities, shared
widgets    → features, entities, shared
features   → entities, shared
entities   → shared
shared     → (nothing from above)

FORBIDDEN imports (upward):

shared     ✗ → features, pages, app
entities   ✗ → features, pages, app
features   ✗ → widgets, pages
widgets    ✗ → pages
```

**Why does this matter?**

Imagine `shared/hooks/useExpiredCount.ts` imported from a feature:

```typescript
// This was a real bug in the old codebase, now fixed.
import type { AnyEmployee } from "@/features/employee-crud/api"; // VIOLATION
import { useNotificationContext } from "@/app/providers/NotificationProvider"; // VIOLATION
```

This creates a circular dependency risk. If the feature changes its types, the shared hook breaks. If the app provider moves, the shared hook breaks. The lower layer becomes fragile and depends on the upper layer to exist.

The fix was to pass `addNotification` as a parameter instead of importing the context:

```typescript
// src/shared/hooks/useExpiredCount.ts — correct version
type AddNotification = (message: string, type: NotificationType, duration?: number) => void;

export function useExpiredCount(
  filteredEmployees: Employee[],
  getDaysDiff: (date: string) => number,
  addNotification: AddNotification  // injected as parameter, never imported from above
): number {
  // ...
}
```

---

### 1.9 The Public API Rule (`index.ts`)

Every feature's `components/` folder and every entity must have an `index.ts` that explicitly declares its public interface.

**Why?** Because your feature is like a department in the company. You don't let outsiders walk into random offices. They talk to the receptionist — the `index.ts`.

```typescript
// src/features/employee-crud/components/index.ts
export { default as EmployeeTable } from './EmployeeTable';
export { default as EmployeeForm } from './EmployeeForm';
export { default as VirtualEmployeeTable } from './VirtualEmployeeTable';

// WorkerTrainingDownloadButton is NOT exported — it's internal to the feature.
// OrganizationTelegramReport is NOT exported — it's internal to the feature.
```

If you add a new internal helper component and don't export it from `index.ts`, no one from outside can accidentally depend on it. You're free to rename, refactor, or delete it.

---

## Module 2 — The Data Plumbing

### 2.1 The Problem This Solves

In early versions of this project, components looked like this:

```typescript
// OLD PATTERN — do not write this
function PermitsRegistry() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase.from('permits').select('*');
    if (!error) setPermits(data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // 200 lines of rendering code mixed with database calls...
}
```

Problems with this approach:
1. The component knows the database table structure — if a column is renamed, you must find every component that uses it
2. No caching — every page navigation re-fetches from the database
3. Loading states and error states are entirely manual
4. After updating a permit, other components (like a counter widget) don't automatically update — you must pass callbacks up through props

The solution is a three-layer pipeline: **Service → Hook → Component**.

---

### 2.2 The Three Layers of Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE DATABASE                                              │
│  (cloud Postgres)                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │  raw SQL / REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: SERVICE FILE                                          │
│  features/*/services/*.ts                                       │
│                                                                 │
│  • Pure async functions                                         │
│  • Knows the database schema (snake_case column names)          │
│  • Translates between DB shape and app shape                    │
│  • Throws errors — never swallows them silently                 │
│  • No React, no useState, no useEffect, no JSX                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  typed Employee[] / void / etc.
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: TANSTACK QUERY HOOK                                   │
│  features/*/hooks/*.ts                                          │
│                                                                 │
│  • Wraps service calls with useQuery / useMutation              │
│  • Provides caching, background refresh, loading/error states   │
│  • Manages cache invalidation after mutations                   │
│  • No JSX — returns data and mutation functions                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │  { data, isLoading, isError, mutate }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: REACT COMPONENT                                       │
│  features/*/components/*.tsx  or  widgets/*/                    │
│                                                                 │
│  • Imports the hook, destructures what it needs                 │
│  • Renders UI based on data / loading / error states            │
│  • Calls mutate functions on user actions                       │
│  • Does NOT know Supabase exists                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Real Example: `organization-docs`

This feature manages a document checklist: for each organization on the construction site, did they submit the required paperwork?

**Layer 1 — The Service:**

```typescript
// src/features/organization-docs/services/organizationDocsService.ts
import { supabase } from '@/shared/api/supabase';

// Types are defined here and exported — the component imports them from the service
export type DocsStatus = Record<string, boolean>;

export interface OrgDoc {
  org_name: string;
  docs_status: DocsStatus;
  updated_at?: Date;
}

// READ: fetch all org documents from the database
export async function fetchOrgDocs(): Promise<OrgDoc[]> {
  const { data, error } = await supabase.from('organization_docs').select('*');
  if (error) throw error;
  return (data as OrgDoc[]) ?? [];
}

// WRITE: update one organization's document status
export async function upsertOrgDoc(
  orgName: string,
  docsStatus: DocsStatus
): Promise<void> {
  const { error } = await supabase
    .from('organization_docs')
    .upsert(
      { org_name: orgName, docs_status: docsStatus, updated_at: new Date() },
      { onConflict: 'org_name' }  // insert if new, update if exists
    );
  if (error) throw error;
}

// WRITE: update many organizations at once (used when a column is removed)
export async function upsertManyOrgDocs(docs: OrgDoc[]): Promise<void> {
  const payload = docs.map((d) => ({
    org_name: d.org_name,
    docs_status: d.docs_status,
    updated_at: new Date(),
  }));
  const { error } = await supabase
    .from('organization_docs')
    .upsert(payload, { onConflict: 'org_name' });
  if (error) throw error;
}
```

Key observations:
- The service imports `supabase` — the component never will
- Every function is `async` and returns a typed Promise
- On error, we `throw` — we never hide problems by returning `null`
- This file has zero `useState`, zero `useEffect`, zero JSX

**Layer 2 — The Component (imports service, not supabase):**

```typescript
// src/features/organization-docs/components/OrganizationManager.tsx
import React, { useState, useEffect, useMemo } from "react";
import type { Employee } from "@/entities/employee";
import {
  fetchOrgDocs,
  upsertOrgDoc,
  upsertManyOrgDocs,
  type DocsStatus,
  type OrgDoc,
} from "../services/organizationDocsService";  // ← imports from SERVICE, not supabase

interface OrganizationManagerProps {
  employees?: Employee[];
}

export default function OrganizationManager({ employees = [] }: OrganizationManagerProps) {
  const [docsData, setDocsData] = useState<OrgDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Calling the SERVICE function, not supabase directly
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const currentDbData = await fetchOrgDocs();
      // merge with currently active organizations from employee list
      const merged = uniqueOrgs.map((orgName) => {
        const existing = currentDbData.find((d) => d.org_name === orgName);
        return existing || { org_name: orgName, docs_status: getDefaultDocs() };
      });
      setDocsData(merged);
    } catch (err) {
      console.error("Ошибка при загрузке:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calling the SERVICE function when a checkbox is toggled
  const handleCheck = async (orgName: string, key: string) => {
    const updatedStatus: DocsStatus = {
      ...targetOrg.docs_status,
      [key]: !targetOrg.docs_status[key],
    };
    setDocsData(/* optimistic local update */);
    await upsertOrgDoc(orgName, updatedStatus);  // ← service call
  };
}
```

---

### 2.4 Full Example: Employee Feature with TanStack Query

The `employee-crud` feature shows the complete three-layer pipeline.

**Layer 1 — Service (key parts):**

```typescript
// src/features/employee-crud/services/employeesService.ts

// Private column list for SELECT queries
const FIELDS = 'id,name,profession,birth_date,training_date,responsible,...';

// Private: translates app (camelCase) → database (snake_case)
function mapFormToDb(form: Employee) {
  return {
    name: form.name,
    birth_date: form.birthDate || null,  // app uses camelCase, DB uses snake_case
    training_date: form.trainingDate,
    // ...
  };
}

// Private: translates database (snake_case) → app (camelCase)
function formatDataForApp(data: DbRow[]): Employee[] {
  return data.map((emp) => ({
    id: emp.id,
    birthDate: emp.birth_date ?? null,
    trainingDate: emp.training_date,
    // ...
  }));
}

// Public: fetch all employees with a 30-second timeout safety net
export async function fetchEmployees(): Promise<Employee[]> {
  const fetching = supabase.from('employees').select(FIELDS).order('name');
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 30000)
  );
  const { data, error } = await Promise.race([fetching, timeout]);
  if (error) throw error;
  return formatDataForApp(data ?? []);
}

export async function createEmployee(formData: Employee): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert([mapFormToDb(formData)])
    .select(FIELDS)
    .single();
  if (error) throw error;
  return formatDataForApp([data])[0];
}
```

**Layer 2 — TanStack Query Hook:**

```typescript
// src/features/employee-crud/hooks/useEmployees.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Employee } from '@/entities/employee';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee, retrainEmployee }
  from '../services/employeesService';

// READ: fetches employees, caches result, provides loading/error state automatically
export function useEmployeesQuery() {
  return useQuery<Employee[], Error>({
    queryKey: ['employees'],   // cache key — the "address" in TanStack's cache
    queryFn: fetchEmployees,
    placeholderData: [],       // show empty array while loading, not undefined
    throwOnError: false,
    retry: (failureCount, error) => {
      if (error.message === 'timeout') return false;  // never retry timeouts
      return failureCount < 2;
    },
  });
}

// WRITE: create employee, then invalidate cache so all lists refresh automatically
export function useAddEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Employee) => createEmployee(data),
    onSuccess: () => {
      // This tells every component using useEmployeesQuery() to refresh.
      // No prop drilling. No manual state updates.
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useDeleteEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useRetrainEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retrainEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
```

**Layer 3 — Component (key parts):**

```typescript
// src/pages/employees/EmployeesPage.tsx
import {
  useEmployeesQuery,
  useAddEmployeeMutation,
  useDeleteEmployeeMutation,
  useRetrainEmployeeMutation,
} from "@/features/employee-crud/hooks/useEmployees";

export default function EmployeesPage() {
  // Component calls the hook. No supabase. No async/await at this level.
  const { data: employees = [], isLoading, isError } = useEmployeesQuery();
  const addMutation = useAddEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();
  const retrainMutation = useRetrainEmployeeMutation();

  // Local UI state — not data state
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleSave = async (data: Employee) => {
    // Call the mutation. TanStack handles caching, error, and cache invalidation.
    if (editingEmployee) {
      await updateMutation.mutateAsync(data);
    } else {
      await addMutation.mutateAsync(data);
    }
    setShowForm(false);
  };
}
```

**What TanStack Query gives you for free:**
- If two components both call `useEmployeesQuery()`, only **one** database request is made — they share the same cache entry
- Navigate away and back — the list renders instantly from cache while silently refreshing in the background
- After any mutation's `onSuccess`, every component using `useEmployeesQuery()` automatically receives the updated list

---

### 2.5 Why Not Put Supabase Calls in Components?

Here is what goes wrong without the service layer:

```typescript
// BAD: component calls supabase directly
function EmployeeCard({ id }: { id: string }) {
  const handleDelete = async () => {
    await supabase.from('employees').delete().eq('id', id);
    // Problem: How does EmployeeTable know to remove this row?
    // How does StatsBar know to update its count?
    // You need to pass callbacks 3 levels up. This is prop drilling.
  };
}
```

```typescript
// GOOD: component calls mutation hook
function EmployeeCard({ id }: { id: string }) {
  const deleteMutation = useDeleteEmployeeMutation();

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    // onSuccess in the hook invalidates ['employees'] cache.
    // Every component using useEmployeesQuery() updates automatically.
    // Zero prop drilling.
  };
}
```

The service layer also provides a future-proofing benefit: if Supabase is replaced by a different backend, you change the service files — not 50 component files.

---

## Module 3 — Code Standards

### 3.1 Strict TypeScript — No Safety Helmets Allowed

TypeScript is the safety helmet on a construction site. When you write `as any`, you take the helmet off.

**Current status: 0 `as any` in the codebase.** Please do not add any.

**Why `any` is dangerous:**

```typescript
// With any — TypeScript cannot protect you
const employee: any = fetchEmployee();
employee.trainingDtae;      // typo: "Dtae" not "Date" — TypeScript says nothing
employee.nonExistentMethod(); // runtime crash — TypeScript says nothing
```

```typescript
// With proper types — TypeScript catches mistakes before production
const employee: Employee = await fetchEmployee();
employee.trainingDtae; // TypeScript error: Property 'trainingDtae' does not exist
```

**What to use instead of `any`:**

| Situation | Wrong | Right |
|-----------|-------|-------|
| Unknown data from API | `any` | `unknown` + type guard |
| Partial data | `any` | `Partial<Employee>` |
| Multiple possible shapes | `any` | `Employee \| Permit` (union) |
| Type not yet defined | `any` | Define the type first |

**`unknown` vs `any`:**

```typescript
// any: bypasses TypeScript completely (dangerous)
function process(data: any) {
  data.name.toUpperCase(); // no error, crashes at runtime if data has no .name
}

// unknown: forces you to check before using (safe)
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    (data as { name: string }).name.toUpperCase(); // safe
  }
}
```

**Type assertions — use sparingly:**

```typescript
// Acceptable: you know the exact shape from Supabase
return (data as OrgDoc[]) ?? [];

// Acceptable: DOM event target narrowing
const node = event.target as Node;

// Never acceptable
const employee = someValue as any;
```

---

### 3.2 Interface Design Patterns

Every component must define its props interface explicitly:

```typescript
// Correct pattern — used throughout this project
interface OrganizationManagerProps {
  employees?: Employee[];  // ? means optional, defaults to [] in the component
}

export default function OrganizationManager({ employees = [] }: OrganizationManagerProps) {
  // ...
}
```

Service functions must declare their return types explicitly:

```typescript
// Return type declared — the component knows what to expect
export async function fetchOrgDocs(): Promise<OrgDoc[]> { ... }
export async function upsertOrgDoc(orgName: string, docsStatus: DocsStatus): Promise<void> { ... }
```

Types that are part of a feature's contract belong in the service file and are imported from there:

```typescript
// Component imports types from the service, not re-defining them
import {
  type DocsStatus,
  type OrgDoc,
} from "../services/organizationDocsService";
```

---

### 3.3 Styling — The Hybrid Strategy

The project uses three styling approaches. **The rule: match the styling of the area you're editing. Do not migrate styles as a side effect.**

| Area | Strategy |
|------|----------|
| `src/features/tasks/` | SCSS Modules |
| `src/widgets/analytics-dashboard/` | Tailwind utilities |
| `src/features/permits/components/` | Plain CSS |
| `src/features/orders/components/` | Plain CSS |
| `src/features/prescriptions/components/` | Plain CSS |
| `src/shared/ui/ErrorBoundary/` | SCSS Module |
| `src/shared/ui/` (other) | Tailwind only |
| `src/auth/` | Plain CSS + Tailwind |

**Global button classes** come from `src/shared/styles/modal.css` and are imported globally in `src/index.js`:
- `btn-primary` — main action button
- `btn-danger` — destructive action (delete)
- `btn-cancel` — close/cancel

Do NOT redefine these in feature CSS files.

**SCSS Modules usage:**

```typescript
import styles from './MyComponent.module.scss';

// Use bracket notation for hyphenated class names
<div className={styles['card-header']}>

// Use clsx for conditional classes
import clsx from 'clsx';
<div className={clsx(styles['card'], isActive && styles['card--active'])}>
```

**Critical SCSS constraint — `@/` does not work inside SCSS files:**

The webpack `@/` alias is not resolved by sass-loader. Always use relative paths:

```scss
/* Correct */
@use '../../styles' as s;
@use 'sass:color';

.card { color: color.adjust(s.$navy-surface, $lightness: 10%); }

/* Wrong — sass-loader won't resolve this */
@use '@/shared/styles' as s;
```

Also: never use the deprecated `darken()` / `lighten()` Sass functions. Use `color.adjust()` from `@use "sass:color"`.

**Dark mode:**

Tailwind's `darkMode: "class"` is configured. `App.tsx` toggles `<html class="dark">`:

```typescript
useEffect(() => {
  document.documentElement.classList.toggle("dark", isDark);
}, [isDark]);
```

In your components:

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
```

---

### 3.4 React Reliability — Error Boundaries

Without an Error Boundary, if one component crashes during render, the entire app shows a blank screen with no explanation.

`ErrorBoundary` is a class component (React requires this — hooks cannot catch render errors).

```typescript
// src/shared/ui/ErrorBoundary/ErrorBoundary.tsx

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {

  // React calls this when any CHILD throws during render.
  // Return new state to trigger the fallback UI.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Called after the error is caught — use this for logging/monitoring
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children; // all good, render normally
    }
    // Error occurred — show the branded fallback UI
    return (
      <div className={styles['wrapper']}>
        <div className={styles['card']}>
          <h2>Что-то пошло не так</h2>
          <button onClick={this.handleReload}>Перезагрузить страницу</button>
        </div>
      </div>
    );
  }
}
```

**How it's used in the app:**

```typescript
// src/app/App.tsx
<ErrorBoundary>
  <div key="app-router-shell">
    <AppRouter />  {/* All lazy-loaded pages are wrapped here */}
  </div>
</ErrorBoundary>
```

The header, navigation, and stats bar remain visible even if a page crashes. Only the page content is replaced by the fallback.

---

### 3.5 Notifications

Use the notification system for user feedback after actions:

```typescript
import { useNotificationContext } from "@/app/providers/NotificationProvider";
import { TOAST_TYPES } from "@/shared/constants/toast";

function MyComponent() {
  const { addNotification } = useNotificationContext();

  const handleSave = async () => {
    try {
      await saveData();
      addNotification("Данные сохранены", TOAST_TYPES.SUCCESS);
    } catch {
      addNotification("Ошибка сохранения", TOAST_TYPES.ERROR);
    }
  };
}
```

Available types: `TOAST_TYPES.SUCCESS`, `TOAST_TYPES.ERROR`, `TOAST_TYPES.WARNING`, `TOAST_TYPES.INFO`.

---

## The Thinking Process — Adding a New Feature

**Scenario:** The safety manager asks you to add a "Helmet Distribution" feature.
Each employee should have a record of whether they received a safety helmet and when.

Walk through exactly how to build this step by step.

---

### Step 1 — Define the Entity

> Ask yourself: "What is the data shape?"

If helmet distribution is a property of an employee, add it to the `Employee` entity.
If it's a separate tracked object with its own ID and lifecycle, create a new entity.

For this scenario, a helmet record is standalone — create a new entity:

```typescript
// src/entities/helmet/model.ts

export interface HelmetRecord {
  id: string;
  employeeId: string;
  size: string;
  issuedAt: string;              // ISO date string
  returnedAt: string | null;
  condition: 'new' | 'used' | 'damaged';
}

export type HelmetRecordInsert = Omit<HelmetRecord, 'id'>;
```

```typescript
// src/entities/helmet/constants.ts
export const HELMET_CONDITIONS = {
  NEW: 'new',
  USED: 'used',
  DAMAGED: 'damaged',
} as const;
```

```typescript
// src/entities/helmet/lib.ts
import type { HelmetRecord } from './model';

export function isHelmetActive(record: HelmetRecord): boolean {
  return record.returnedAt === null;
}
```

```typescript
// src/entities/helmet/index.ts — the public API
export type { HelmetRecord, HelmetRecordInsert } from './model';
export { HELMET_CONDITIONS } from './constants';
export { isHelmetActive } from './lib';
```

> **Why define the entity first?**
> All other layers depend on this type contract. The service needs to know what to return. The component needs to know what to render. Starting with the types prevents layers from drifting apart.

---

### Step 2 — Create the Service

> Ask yourself: "What database operations do I need?"

```typescript
// src/features/helmet-distribution/services/helmetService.ts
import { supabase } from '@/shared/api/supabase';
import type { HelmetRecord, HelmetRecordInsert } from '@/entities/helmet';

const FIELDS = 'id,employee_id,size,issued_at,returned_at,condition';

// Private: DB snake_case → app camelCase
function mapRowToRecord(row: Record<string, unknown>): HelmetRecord {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    size: row.size as string,
    issuedAt: row.issued_at as string,
    returnedAt: (row.returned_at as string | null) ?? null,
    condition: row.condition as HelmetRecord['condition'],
  };
}

export async function fetchHelmetsByEmployee(employeeId: string): Promise<HelmetRecord[]> {
  const { data, error } = await supabase
    .from('helmet_distribution')
    .select(FIELDS)
    .eq('employee_id', employeeId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRowToRecord);
}

export async function issueHelmet(record: HelmetRecordInsert): Promise<HelmetRecord> {
  const { data, error } = await supabase
    .from('helmet_distribution')
    .insert([{
      employee_id: record.employeeId,
      size: record.size,
      issued_at: record.issuedAt,
      condition: record.condition,
    }])
    .select(FIELDS)
    .single();
  if (error) throw error;
  return mapRowToRecord(data);
}

export async function returnHelmet(id: string): Promise<void> {
  const { error } = await supabase
    .from('helmet_distribution')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
```

> **Why a private `mapRowToRecord`?**
> The database uses `issued_at`. Your app uses `issuedAt`. This mapping is an internal implementation detail of the service. Nothing outside needs to know the database column names.

---

### Step 3 — Create the TanStack Query Hook

> Ask yourself: "How will the UI consume this data?"

```typescript
// src/features/helmet-distribution/hooks/useHelmets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HelmetRecord, HelmetRecordInsert } from '@/entities/helmet';
import { fetchHelmetsByEmployee, issueHelmet, returnHelmet } from '../services/helmetService';

// The cache key includes employeeId — each employee gets their own cache entry
export function useHelmetsByEmployeeQuery(employeeId: string) {
  return useQuery<HelmetRecord[], Error>({
    queryKey: ['helmets', employeeId],
    queryFn: () => fetchHelmetsByEmployee(employeeId),
    enabled: !!employeeId,   // don't run if employeeId is empty string
  });
}

export function useIssueHelmetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: HelmetRecordInsert) => issueHelmet(record),
    onSuccess: (_, variables) => {
      // Invalidate only this employee's helmet list
      qc.invalidateQueries({ queryKey: ['helmets', variables.employeeId] });
    },
  });
}

export function useReturnHelmetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => returnHelmet(id),
    onSuccess: () => {
      // Invalidate all helmet queries (we don't know which employee from just the id)
      qc.invalidateQueries({ queryKey: ['helmets'] });
    },
  });
}
```

> **Why `enabled: !!employeeId`?**
> TanStack Query runs immediately on mount. If `employeeId` is an empty string before the employee is selected, you'd make a broken database request. `enabled: false` prevents that.

---

### Step 4 — Build the Feature Component

> Ask yourself: "What does the user need to see and do?"

```typescript
// src/features/helmet-distribution/components/HelmetHistory.tsx
import React from 'react';
import type { Employee } from '@/entities/employee';
import { isHelmetActive } from '@/entities/helmet';
import { useHelmetsByEmployeeQuery, useReturnHelmetMutation } from '../hooks/useHelmets';

interface HelmetHistoryProps {
  employee: Employee;
}

export default function HelmetHistory({ employee }: HelmetHistoryProps) {
  const { data: helmets = [], isLoading } = useHelmetsByEmployeeQuery(employee.id);
  const returnMutation = useReturnHelmetMutation();

  if (isLoading) return <p>Loading helmet records...</p>;

  return (
    <div>
      <h3>Helmet History — {employee.name}</h3>
      {helmets.length === 0 && <p>No helmets issued.</p>}
      {helmets.map((helmet) => (
        <div key={helmet.id}>
          <span>Size: {helmet.size}</span>
          <span>Issued: {helmet.issuedAt}</span>
          <span>Status: {isHelmetActive(helmet) ? 'Active' : 'Returned'}</span>
          {isHelmetActive(helmet) && (
            <button
              onClick={() => returnMutation.mutate(helmet.id)}
              disabled={returnMutation.isPending}
            >
              Mark as Returned
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

```typescript
// src/features/helmet-distribution/components/index.ts — public API
export { default as HelmetHistory } from './HelmetHistory';
```

**Step 5 — Wire it to a Page:**

```typescript
// src/pages/employees/EmployeesPage.tsx — add alongside existing imports
import { HelmetHistory } from '@/features/helmet-distribution/components';

// When an employee is selected, show their helmet history
{selectedEmployee && (
  <HelmetHistory employee={selectedEmployee} />
)}
```

---

### The Mental Checklist for Any New Feature

Before writing any code, answer these questions in order:

1. **Entity first:** What is the TypeScript shape of this data? Does it need a new entity or extend an existing one?

2. **Service second:** What Supabase table does this touch? What are the DB column names (snake_case)? What operations are needed: SELECT, INSERT, UPDATE, DELETE?

3. **Hook third:** Does this need caching with TanStack Query? What is the `queryKey`? What should be invalidated after mutations?

4. **Component last:** What does the user see? What actions can they take? Import the hook — never import the service directly in a component.

5. **Public API:** Add `index.ts` to your `components/` folder. Export only what external layers need.

6. **FSD check:** Does your feature accidentally import from `pages/` or `widgets/`? Does your service import from somewhere other than `@/shared/`?

7. **TypeScript check:** `npx tsc --noEmit` must remain at 0 errors.

---

## Common Beginner Mistakes

### Mistake 1 — Calling Supabase in a Component

```typescript
// Wrong
function MyComponent() {
  const handleLoad = async () => {
    const { data } = await supabase.from('helmets').select('*');
  };
}

// Right
function MyComponent() {
  const { data: helmets } = useHelmetsByEmployeeQuery(employeeId);
}
```

### Mistake 2 — Breaking the Import Direction

```typescript
// Wrong — feature importing from a page (upward import)
import { usePageState } from '@/pages/employees/EmployeesPage';

// Wrong — shared importing from a feature (upward import)
import { useEmployeeContext } from '@/features/employee-crud/EmployeeProvider';

// Right — always import downward
import type { Employee } from '@/entities/employee';
import { useEmployeesQuery } from '@/features/employee-crud/hooks/useEmployees';
```

### Mistake 3 — Using `any`

```typescript
// Wrong
const handleData = (data: any) => { data.name; }

// Right
const handleData = (data: Employee) => { data.name; }

// Right when the shape is truly unknown at compile time
const handleData = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    (data as { name: string }).name;
  }
}
```

### Mistake 4 — Forgetting `index.ts`

```typescript
// Exposes internal path — fragile if you move or rename the file
import HelmetHistory from '@/features/helmet-distribution/components/HelmetHistory';

// Imports from the public API — stable
import { HelmetHistory } from '@/features/helmet-distribution/components';
```

### Mistake 5 — Putting Business Logic in Pages

```typescript
// Wrong — page contains database and logic
export default function EmployeesPage() {
  const handleDelete = async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    sendTelegramNotification(id);
    // ...30 more lines
  };
}

// Right — page delegates to the feature hook
export default function EmployeesPage() {
  const deleteMutation = useDeleteEmployeeMutation();
  const handleDelete = (id: string) => deleteMutation.mutate(id);
}
```

### Mistake 6 — Creating a Second Supabase Client

```typescript
// NEVER do this — creates auth and connection issues
import { createClient } from '@supabase/supabase-js';
const mySupabase = createClient(url, key);

// Always import the shared single client
import { supabase } from '@/shared/api/supabase';
```

### Mistake 7 — Using `@/` in SCSS

```scss
/* Wrong — sass-loader won't resolve this */
@use '@/shared/styles' as s;

/* Right — use relative path */
@use '../../../shared/styles' as s;
@use 'sass:color';
```

---

## Quick Reference

### Import Paths Cheatsheet

| What you need | Import from |
|---------------|-------------|
| `Employee` type | `@/entities/employee` |
| `getDaysDifference`, `getStatusKey` | `@/entities/employee` |
| Supabase client | `@/shared/api/supabase` |
| Notifications | `@/app/providers/NotificationProvider` |
| Toast type constants | `@/shared/constants/toast` |
| Shared UI components | `@/shared/ui/Toast`, `@/shared/ui/Skeleton`, etc. |
| Employee data hooks | `@/features/employee-crud/hooks/useEmployees` |
| Employee form/table components | `@/features/employee-crud/components` |
| ErrorBoundary | `@/shared/ui/ErrorBoundary` |

### New Feature Folder Template

```
src/features/my-feature/
├── services/
│   └── myFeatureService.ts    ← supabase calls ONLY, pure async functions
├── hooks/
│   └── useMyFeature.ts        ← TanStack Query wrappers
├── components/
│   ├── MyFeatureComponent.tsx ← JSX, imports hook (never imports service directly)
│   └── index.ts               ← public API — export only what outside needs
```

### Layer Import Summary

```
pages       →  widgets, features, entities, shared  ✅
widgets     →  features, entities, shared            ✅
features    →  entities, shared                      ✅
entities    →  shared only                           ✅
shared      →  external libraries only               ✅

shared      →  features, pages, app                  ✗ FORBIDDEN
entities    →  features, pages, app                  ✗ FORBIDDEN
features    →  widgets, pages                        ✗ FORBIDDEN
```

### Verification Before Every Commit

```bash
npx tsc --noEmit   # must return 0 errors
```

---

*This guide reflects the project state as of 2026-05-06.*
*FSD migration: complete. TypeScript errors: 0. `as any` occurrences: 0.*
*For the full history of architectural decisions, see `Migration.md`.*
