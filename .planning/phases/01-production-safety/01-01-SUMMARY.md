---
plan: 01-01
status: complete
completed_at: 2026-05-16
---

# Plan 01-01 Summary: Remove Fallback Paths in employeesService.ts

## Changes Made
- `src/features/employee-crud/services/employeesService.ts`: Replaced `fetchEmployees()` fallback block with single-path version that throws on any Supabase error. Replaced `fetchOrganizations()` fallback with single-path version. Updated comment header lines 4-5.

## Lines Changed
- Removed: ~20 lines (try/catch fallback block, console.warn, degraded FIELDS_BASE select, fallback query in fetchOrganizations)
- Added: ~10 lines (clean single-path versions)

## Verification
- `npx tsc --noEmit`: 0 errors
- No "Degraded mode", "console.warn", or "fallback" tokens remain in employeesService.ts
- FIELDS_BASE still referenced at 3 write-back select call sites (createEmployee, updateEmployee, retrainEmployee) plus declaration and FIELDS construction
- All 11 exported functions preserved with unchanged signatures

## Important Note
PROD-01 requires the user to run the SQL migration before deploying:
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_dismissed boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
```
Without this migration, fetchEmployees() will throw in production (desired fail-loud behavior).

## Self-Check: PASSED
- File exists: `src/features/employee-crud/services/employeesService.ts` — FOUND
- Commit fa5687c exists — FOUND
- tsc: 0 errors
- Acceptance grep checks: all passed
