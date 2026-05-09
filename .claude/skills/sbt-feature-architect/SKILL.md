---
name: sbt-feature-architect
description: >
  Generates a complete FSD-compliant feature slice from a specification. Use this
  skill whenever the user wants to add a new feature, new domain entity, new CRUD
  surface, or scaffolds a slice (e.g. "add an incident-reports feature", "scaffold
  the vehicle-checklist module", "create a new feature for X"). Produces services/,
  hooks/, components/, types.ts and an index.ts barrel with TanStack Query wiring,
  typed Supabase calls, and component skeletons that include loading/error/empty
  states. Semi-autonomous: proposes the directory tree first, waits for confirmation,
  then generates code and runs three verification gates. Do NOT use for editing an
  existing feature — that's `sbt-react-feature-impl`.
---

# Feature Architect

## When to invoke

- A new domain entity needs UI (e.g. `incident-reports`, `vehicle-checklist`)
- The spec is clear: entity name, Supabase tables, FK relations, required operations

## When NOT to invoke

- Modification of an existing feature → use `sbt-react-feature-impl`
- Pure UI change with no data layer → handle directly
- Cross-feature refactor or move → use `sbt-safe-move`
- Greenfield design where the data model is still unsettled → resolve the model first

## Input contract

The user must supply (ask if any are missing — do NOT invent):

1. **Feature name** — kebab-case, matches a Supabase domain (e.g. `incident-reports`)
2. **Entities** — Supabase table names, FK relations, RLS policy names
3. **Operations** — list / create / update / delete / status-transition / bulk-action
4. **Notification policy** — which mutations surface toasts; which stay silent
5. **Realtime?** — does the registry subscribe to Supabase Realtime, or polling/manual refresh

If any item is missing, ASK. Do not invent table schemas. Do not assume RLS.

## Output structure

```
src/features/<feature-name>/
├── services/
│   ├── <feature>Service.ts       # async functions, typed, Supabase calls only
│   └── index.ts                  # barrel
├── hooks/
│   ├── use<Feature>Query.ts      # useQuery wrappers
│   ├── use<Feature>Mutations.ts  # useMutation wrappers, invalidation included
│   └── index.ts
├── components/
│   ├── <Feature>Registry.tsx     # if registry view applies
│   ├── <Feature>Form.tsx
│   └── index.ts
├── types.ts                      # entity interfaces, derived from Database types
└── index.ts                      # public API barrel
```

## Generation order

Generate in this exact order — earlier files inform later ones:

1. **types.ts** — derive interfaces from `Database['public']['Tables'][...]`. No `as any`.
2. **services/** — pure async functions returning typed values. No UI side effects.
3. **hooks/** — TanStack Query wrappers. Notification handlers are parameters, not imports.
4. **components/** — last. Loading / error / empty states are mandatory, not optional.
5. **index.ts** (top-level) — barrel exporting only what pages and widgets consume.

## Verification gates (run all three after generation)

Fail-closed: if any gate fails, halt and report. Do not "fix" gate failures by
weakening checks — fix the code.

```bash
# Gate 1 — TypeScript clean
npx tsc --noEmit

# Gate 2 — No Supabase calls outside services/
grep -rn "supabase\.from\|supabase\.auth\|supabase\.rpc" \
  src/features/<feature-name> \
  --include="*.ts" --include="*.tsx" \
  | grep -v "/services/"
# expected: empty

# Gate 3 — Public barrel exists
test -f src/features/<feature-name>/index.ts && echo OK || echo MISSING
```

## FSD contract — hard rules

| Layer            | Allowed                                  | Forbidden                                |
|------------------|------------------------------------------|------------------------------------------|
| `services/`      | Supabase calls, typed responses          | `useNavigate`, `addNotification`, JSX    |
| `hooks/`         | `useQuery`, `useMutation`, invalidation  | Direct Supabase, app/ imports for toasts |
| `components/`    | Hook consumption, JSX, local state       | Direct Supabase, `window.confirm/alert`  |
| `types.ts`       | Domain interfaces, derived types         | `as any`, `@ts-ignore`                   |
| `index.ts`       | Re-export public surface only            | Re-exporting internal helpers            |

## Anti-patterns to refuse outright

- `as any` in service return types — use a proper typed mapper
- `useState` for server data instead of `useQuery`
- Inline Supabase calls inside JSX event handlers
- Toast logic inside services (services are headless)
- `addNotification` imported from `app/` shell into hooks (pass as parameter)
- Mutating server-state in `onMutate` without rollback in `onError`
- `enabled: !!id` patterns without confirming the dependency is observable

## Output format (response shape)

Produce in this order:

1. **Plan** — directory tree + file list with one-line purpose each
2. **STOP. Ask for confirmation before generating any file.**
3. After explicit approval — generate files in the order above
4. Run all three verification gates
5. **Report** — what was generated, which gates passed, what needs human review

Example skeleton of step 5:

```
## Generation complete

Files created (12):
- src/features/incident-reports/types.ts
- src/features/incident-reports/services/incidentReportsService.ts
- ...

Gates:
- npx tsc --noEmit          ✅ 0 errors
- Supabase boundary check    ✅ no leaks
- Public barrel              ✅ exists

Needs human review:
- RLS policy on incident_reports table — RLS not validated by this skill,
  run sbt-supabase-rls before merging
- Notification copy on create/update — placeholders inserted, replace with
  product-approved strings
```

## Coordination with other skills

- **Before generation** — if the data model touches sensitive entities, run
  `sbt-architect-review` to validate the slice fits the broader architecture
- **After generation** — run `sbt-supabase-rls` to verify RLS policies cover
  the new operations, and `sbt-performance-audit` if the registry is expected
  to render large lists
- **At release** — run `sbt-release-readiness` checklist