# Skill: UI Registry & Data Grid Auditor

## Purpose
Ensures consistency, performance, and FSD compliance across all workforce safety registries (Permits, Orders, etc.).

## Audit Criteria
1. **Infrastructure**:
   - Must use `TanStack Query` for data fetching.
   - Must use `react-window` v2 for virtualization if items > 50.
2. **FSD Compliance**:
   - Logic must reside in `services/` and `hooks/`.
   - UI components must only consume data via hooks.
3. **UX Standards**:
   - Loading states (Skeleton/Spinner) are mandatory.
   - Error boundaries or explicit error alerts must be present.
   - Empty state handling (No data found).

## Automated Verification
```bash
# Проверка наличия виртуализации в реестрах
grep -l "useQuery" src/features/*/components/*Registry.tsx | xargs grep -L "FixedSizeList"