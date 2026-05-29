---
name: sbt-ui-registry-review
description: >
  Reviews registry components (PermitsRegistry, OrdersRegistry, PrescriptionsRegistry
  and any analogous virtualized list view) for structural consistency. Use this skill
  whenever the user mentions registries, list views, table components, virtualized
  lists, "the permits page", "the orders page", or asks to compare/align how
  registries behave. Checks column definitions, filter and sort patterns,
  virtualization wiring, action menus, and loading/error/empty states. Produces a
  cross-registry drift report so you can see at a glance which registry diverges
  from the rest.
---

# UI Registry Review

## What counts as a "registry"

A registry component is a top-level feature view that:

- Renders a virtualized list or table of records from a single domain
- Has filters and / or sorting controls
- Has per-row actions (open / edit / delete / status change)
- Lives at `src/features/<feature>/components/<Feature>Registry.tsx`

Current registries (audit baseline — extend as new ones land):

- `src/features/permits/components/PermitsRegistry.tsx` (or `.jsx`)
- `src/features/orders/components/OrdersRegistry.tsx` (or `.jsx`)
- `src/features/prescriptions/components/PrescriptionsRegistry.tsx` (or `.jsx`)

If a candidate file does not satisfy all four bullets above, it is not a
registry — review it under the appropriate other skill.

## Required structure

Every registry must expose, in this order:

1. **Header bar** — title + primary CTA + filter trigger
2. **Filter panel** — controlled state, derived `filteredRecords` via `useMemo`
3. **Virtualized list** — react-window v2 `<List>` with `rowComponent` / `rowProps`
4. **Row actions** — consistent action menu (kebab menu or trailing button group)
5. **States** — explicit branches for `isPending`, `isError`, empty result,
   filtered-empty result. The last two are different and must render different copy.

## Consistency checks

Drift between registries is a smell. Run as a cross-registry diff.

### Check 1 — Filter shape uniformity

```bash
# Each registry should declare a typed filter state
for f in src/features/*/components/*Registry.{tsx,jsx}; do
  [ -f "$f" ] || continue
  echo "=== $f ==="
  grep -A 8 "useState<.*Filter\|useState\s*<.*Filter" "$f" \
    || echo "  (no typed filter state found — DEFECT)"
done
```

Untyped `useState({})` for filter state is a defect.

### Check 2 — Virtualization parity

```bash
grep -rn "from ['\"]react-window['\"]" src/features/*/components/*Registry.{tsx,jsx}
```

If one registry virtualizes and another renders the full array, justify the
asymmetry in the report or recommend alignment. A 50-row registry on a tiny
admin page may legitimately skip virtualization — but document the choice.

### Check 3 — Native dialog leakage

```bash
# window.confirm and alert() are forbidden — use the shared confirmation primitive
grep -rn "window\.confirm\|alert(" src/features/*/components/*Registry.{tsx,jsx}
```

Known exception: `OrganizationManager.tsx` uses native dialogs by design and is
out of scope. Report any other registry hits as defects.

### Check 4 — Empty / filtered-empty split

```bash
# Look for distinct empty branches
for f in src/features/*/components/*Registry.{tsx,jsx}; do
  [ -f "$f" ] || continue
  empty=$(grep -c "records\.length === 0\|data\.length === 0" "$f")
  filtered=$(grep -c "filteredRecords\.length === 0\|filtered\.length === 0" "$f")
  echo "$f — empty: $empty, filtered-empty: $filtered"
done
```

Both checks should be > 0. A single check covering both cases is a defect:
"No records yet" and "No matches for current filters" are different messages.

### Check 5 — Action consistency

All registries should expose the same action verbs in the same order. If
PermitsRegistry has `[open, edit, delete]` and OrdersRegistry has
`[edit, open, delete]`, that is drift — flag it.

## Output format

```
# Registry Review — <date>

## Cross-registry drift matrix

| Aspect                      | Permits | Orders | Prescriptions | Status   |
|-----------------------------|---------|--------|---------------|----------|
| Typed filter state          | ✅      | ❌     | ✅            | drift    |
| Virtualized                 | ✅      | ✅     | ✅            | aligned  |
| No native dialogs           | ✅      | ❌     | ✅            | drift    |
| Empty/filtered-empty split  | ✅      | ✅     | ❌            | drift    |
| Action verb order           | A       | B      | A             | drift    |

## Per-registry findings

### PermitsRegistry
- [path:line] — <issue> — <recommendation>

### OrdersRegistry
- ...

### PrescriptionsRegistry
- ...

## Drift summary
<one-paragraph description of the dominant drift pattern>
```

## Non-goals

- Visual / styling review (use a separate skill or design pass)
- Performance profiling (use `sbt-performance-audit`)
- **Refactoring registries to a generic `<Registry />` abstraction is
  explicitly out of scope** — each registry has domain-specific column logic
  and the cost of premature abstraction is higher than the cost of duplication
  here. Recommend convergence patterns, not abstractions.