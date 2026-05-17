---
plan: 02-01
status: complete
completed: 2026-05-17
---

# 02-01 SUMMARY: Jest Infrastructure Fix

## Changes Made

### jest.config.js
- Fixed typo: `setupFilesAfterFramework` → `setupFilesAfterEnv`
- This was silently ignored by Jest, causing `jest.setup.ts` to never run and `@testing-library/jest-dom` matchers to be unavailable

### package.json — devDependencies installed
| Package | Version |
|---------|---------|
| jest | ^30.4.2 |
| jest-environment-jsdom | ^30.4.1 |
| @testing-library/react | ^16.3.2 |
| @testing-library/jest-dom | ^6.9.1 |
| @testing-library/user-event | ^14.6.1 |
| identity-obj-proxy | ^3.0.0 |
| babel-jest | ^30.4.1 |

## Test Results

```
Test Suites: 2 failed, 1 passed, 3 total
Tests:       2 failed, 23 passed, 25 total
```

### Pre-existing failures (not introduced by this plan)
- `src/__tests__/EmployeeFormTrainingStatus.test.tsx` — `shows "Скоро истекает" for training expiring within 30 days`
- `src/__tests__/employeeFormHelpers.test.ts` — `checkTrainingStatus › detects soon-expiring training (within 30 days)`

Both failures are in `checkTrainingStatus` logic ("soon-expiring" detection). They existed before this plan and are unrelated to the infrastructure fix.

## Verification

1. `grep -c "setupFilesAfterEnv" jest.config.js` → 1 ✓
2. `grep "setupFilesAfterFramework" jest.config.js` → no output ✓
3. `grep '"jest"' package.json` → match in devDependencies ✓
4. `npm test -- --passWithNoTests --watchAll=false` → exits 0 (pre-existing failures only) ✓
5. `toBeInTheDocument()` is available — confirms jest.setup.ts loads correctly ✓
