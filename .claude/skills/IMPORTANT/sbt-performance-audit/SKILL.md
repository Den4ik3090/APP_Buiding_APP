---
name: sbt-performance-audit
description: >
  Audits performance hotspots in the SBT codebase. Use this skill whenever the
  user mentions performance, slow renders, lag, jank, "feels slow", virtualization,
  react-window, memoization, useMemo/useCallback, TanStack Query staleTime, refetch
  storms, or asks for an audit before release. Verifies react-window v2 API usage
  (NOT v1 — v1 is a regression), detects missing memoization in heavy filter/map/sort
  pipelines, validates query configuration, and flags components missing loading,
  error, or empty states. Read-only by default — produces a report; modifies code
  only on explicit follow-up request.
---

# Performance Audit

## Scope

This skill covers four classes of performance issues:

1. **Virtualization** — incorrect react-window v2 API usage
2. **Memoization** — heavy computations on every render
3. **Query configuration** — missing or wrong `staleTime` / `gcTime`
4. **Render branches** — components missing loading / error / empty states

Out of scope (covered elsewhere): bundle analysis, image optimization, service
worker tuning, server-side performance.

## Detection Passes

Run each pass, tally findings, then produce the report. Do not fix anything
during detection — fixes happen only after the user reviews the report and
explicitly asks for a remediation pass.

### Pass 1 — react-window v2 contract

react-window v2 uses `<List>` with `rowComponent` / `rowProps`. v1's
`FixedSizeList` / `itemCount` / `itemSize` is a regression — the codebase is
on v2 and any v1-shaped code is a hard blocker.

```bash
# v1 API leak — must be empty
grep -rn "FixedSizeList\|VariableSizeList\|itemCount\|itemSize" \
  src/ --include="*.tsx" --include="*.jsx"

# v2 import shape — should match
grep -rn "from ['\"]react-window['\"]" src/ --include="*.tsx"
```

### Pass 2 — Unmemoized heavy operations

```bash
# Filter / map / sort calls in components, not wrapped in useMemo
grep -rn "\.filter(\|\.map(\|\.sort(" \
  src/features/*/components/*.tsx \
  src/widgets/*/ui/*.tsx \
  --include="*.tsx" \
  | grep -v "useMemo\|useCallback"
```

Findings here are **candidates**, not defects. Small static arrays don't need
memoization. Real targets: list-derivation pipelines over query results that
re-run on every keystroke or unrelated state change.

### Pass 3 — Query configuration

Every `useQuery` should declare `staleTime`. Default of 0 causes refetch storms
on every focus / mount. Mutations should invalidate specific query keys, not
the entire cache.

```bash
# useQuery calls — manually inspect each for staleTime
grep -rn "useQuery(" src/features/*/hooks/*.ts

# Cache nukes — invalidating with no arguments is almost always wrong
grep -rn "invalidateQueries()" src/features/*/hooks/*.ts
```

### Pass 4 — Loading / error / empty states

A component consuming `useQuery` without branching on `isPending` / `isError`
will either crash on first render or flicker. Both are defects.

```bash
# Components using useQuery without state branching (heuristic)
for f in $(grep -rln "useQuery\|useMutation" src/features/*/components/*.tsx); do
  if ! grep -q "isPending\|isError\|isLoading" "$f"; then
    echo "MISSING STATES: $f"
  fi
done
```

## Output Format

```
# Performance Audit Report — <date>

## Blockers (hard fail — fix before merge)
- [path/file.tsx:123] — <one-line issue> — <one-line fix>

## Warnings (likely defect, requires inspection)
- [path/file.tsx:456] — <issue> — <recommendation>

## Notes (observations, not defects)
- <observation>

## Pass summary
| Pass                              | Found | Action |
|-----------------------------------|-------|--------|
| react-window v1 leak              | 0     | none   |
| Unmemoized heavy ops              | 4     | review |
| Missing staleTime                 | 7     | review |
| Missing loading/error states      | 1     | fix    |
```

Each finding includes file path, line number, the current pattern, and the
recommended pattern. **Do not propose fixes that span more than one feature
slice in a single report** — keep remediation scoped.

## Non-Goals

- Bundle size analysis
- Image / asset optimization
- React Compiler migration (out of scope until React 19 adoption)
- Auto-fixing without user approval after the report is reviewed
- Suggesting `React.memo` on every component (it has costs; recommend only
  where profiling shows benefit)