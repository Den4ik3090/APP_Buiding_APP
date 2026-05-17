---
plan: 02-04
status: complete
completed: 2026-05-17
---

# 02-04 SUMMARY: permitsService + tasksService Tests

## Files Created

- `src/__tests__/permits/permitsService.test.ts` — 14 tests
- `src/__tests__/tasks/tasksService.test.ts` — 17 tests

## Full Suite Results

```
Test Suites: 2 failed (pre-existing), 7 passed, 9 total
Tests:       2 failed (pre-existing), 123 passed, 125 total
```

Pre-existing failures: `checkTrainingStatus` "скоро истекает" logic (present since before Phase 2, not introduced here).

## Complex Logic Covered

### deletePermit — FK cleanup (23503)
- Table: `permit_audit_log`, column: `permit_id`
- Flow: delete fails with FK error → delete from `permit_audit_log` where `permit_id = permitId` → retry delete
- Also throws after cleanup if retry also fails
- Also throws when data is empty array (RLS blocked)

### updatePermitWithStatus — CHECK constraint retry (23514)
- Returns `string` (the status candidate), NOT a Permit object
- Iterates `statusCandidates` array; on 23514 error, tries next candidate
- Throws when all candidates exhausted
- Chain terminal: `.update().eq().select('id')` → mock `.select` as terminal

### fetchTasks — filter branching
- No filters: terminal is `.limit(100)` → mock `.limit`
- With siteId/status/assignedTo: terminal is last `.eq()` → mock `.eq`
- Returns `[]` when table missing (PGRST116) instead of throwing

### deleteTask — empty array error
- Terminal: `.delete().eq().select('id')` → mock `.select`
- Throws when `data.length === 0` (RLS blocked)
- Distinguished from Supabase error (which has `error` set)

### createTask — UUID normalization
- `sanitizeTaskInsert` normalizes UUID fields: `assigned_to`, `created_by`, `employee_id`, `organization_id`
- Non-UUID values → `null`; valid UUIDs preserved
- Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`

## Total Test Count Across Plans 02-02 through 02-04

| File | Tests |
|------|-------|
| `entities/employeeLib.test.ts` | 17 |
| `entities/permitLib.test.ts` | 34 |
| `orders/ordersService.test.ts` | 9 |
| `prescriptions/prescriptionsService.test.ts` | 9 |
| `permits/permitsService.test.ts` | 14 |
| `tasks/tasksService.test.ts` | 17 |
| **Total new** | **100** |

## Verification

1. `npx jest src/__tests__/permits/ --watchAll=false` → 14/14 ✓
2. `npx jest src/__tests__/tasks/ --watchAll=false` → 17/17 ✓
3. `npm test -- --watchAll=false` → 123 passed, 2 pre-existing failures ✓
4. `npx tsc --noEmit` → 0 errors ✓
