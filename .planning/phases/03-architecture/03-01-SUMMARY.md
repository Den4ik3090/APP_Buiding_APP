---
plan: 03-01
status: completed
completed: 2026-05-17
---

# 03-01 Summary: Architecture Consistency

## Changes

### OrganizationManager → TanStack Query
- Created `src/features/organization-docs/hooks/useOrganizationDocs.ts`:
  - `useOrgDocsQuery()` — fetches org docs, `queryKey: ['org-docs']`
  - `useUpsertOrgDocMutation()` — single doc upsert, invalidates on success
  - `useUpsertManyOrgDocsMutation()` — bulk upsert (for column removal)
- Refactored `OrganizationManager.tsx`:
  - Removed manual `useState<OrgDoc[]>`, `useState(loading)`, `useState(fetchError)`, `fetchDocs()`, `useEffect`
  - Uses `useOrgDocsQuery()` for data/loading/error
  - `docsData` derived via `useMemo` merging `uniqueOrgs` + `rawDocs`
  - `handleCheck` uses `queryClient.setQueryData` for optimistic update + `upsertOne.mutateAsync`; rolls back on error
  - "Повторить" button triggers `queryClient.invalidateQueries` instead of manual re-fetch

### employee-retrain slice
- Created `src/features/employee-retrain/index.ts` — minimal barrel documenting that retrain mutation lives in `employee-crud`

### additional-trainings
- No action needed — no Supabase calls; data flows in via `employees` prop

## Verification

```
npx tsc --noEmit → 0 errors
```
