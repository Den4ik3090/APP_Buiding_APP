---
name: security-audit
description: >
  Deep security audit for the PUTEVI Safety codebase. Scans for Supabase RLS gaps,
  IDOR/BOLA vectors, secret leakage, XSS surfaces, sessionStorage exfiltration risks,
  Edge Function auth issues, and TypeScript safety regressions. Invoke after any
  code change touching auth, Supabase services, Edge Functions, or user-facing inputs.
metadata:
  origin: PUTEVI
  invokes_after: [code-change, pre-pr, pre-release]
---

# Security Audit Skill

Use this skill **before declaring any task complete** if the change touches:
- `src/auth/` — authentication flow
- `src/shared/api/supabase.ts` — the single client
- Any `services/*.ts` — Supabase boundary
- `supabase/functions/**` — Edge Functions
- Any form, file upload, or user-controlled string

## Phase 1 — Forbidden Pattern Scan

```bash
# Type safety regression
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | head -20

# Multiple Supabase clients (must be exactly 1)
grep -rn "createClient" src/ --include="*.ts" --include="*.tsx" --include="*.jsx" --include="*.js"

# Direct Supabase calls outside services/ (FSD + auditability violation)
grep -rn "supabase.from\|supabase.auth\|supabase.rpc" src/features --include="*.ts" --include="*.tsx" --include="*.jsx" \
  | grep -v "/services/" | head -20

# Hardcoded secrets
grep -rEn "(sk-[a-zA-Z0-9]{20,}|sb_secret_|service_role)" --include="*.ts" --include="*.tsx" --include="*.jsx" --include="*.js" src/ supabase/ 2>/dev/null
grep -rEn "REACT_APP_.*=.*['\"][^'\"]{20,}" --include="*.ts" --include="*.tsx" src/ 2>/dev/null

# .env hygiene
test -f .env && grep -E "^(REACT_APP_SUPABASE_KEY|SERVICE_ROLE)" .env > /dev/null && echo "⚠️ .env present — confirm it is .gitignored"
git check-ignore .env 2>&1

# Console.log in production paths
grep -rn "console\.\(log\|debug\|info\)" src/ --include="*.ts" --include="*.tsx" | grep -v "// " | head -20

# Dangerous innerHTML / dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML\|innerHTML" src/ --include="*.tsx" --include="*.jsx"

# eval / Function constructor
grep -rn "\beval(\|new Function(" src/ --include="*.ts" --include="*.tsx" --include="*.jsx"

# Unvalidated URL / redirects
grep -rn "window\.location\.\(href\|assign\|replace\)" src/ --include="*.ts" --include="*.tsx" --include="*.jsx"
```

For every match: report file, line, why it matters, fix.

## Phase 2 — Supabase RLS Surface Mapping

For each `services/*.ts` file, extract every Supabase call and map the threat:

| Service | Operation | Table | Filter | RLS dependency | IDOR risk |
|---------|-----------|-------|--------|----------------|-----------|
| permitsService.ts | `select` | permits | `eq('employee_id', X)` | RLS must enforce `auth.uid()` ownership or role | HIGH if no policy |
| ordersService.ts | `update` | orders | `eq('id', orderId)` | RLS must check writer permission | CRITICAL if no policy |

Output a **server-side action items list** — things the auditor cannot fix in code, only in Supabase dashboard:
- Tables that need RLS enabled
- Policies that need creation/tightening
- Service-role keys that should not be in client bundle

## Phase 3 — Edge Function Audit

For each function in `supabase/functions/`:

```bash
# List functions
ls -la supabase/functions/

# For each function — check auth handling
grep -n "verify_jwt\|Authorization\|authHeader\|x-telegram" supabase/functions/*/index.ts
```

Verify:
- [ ] `verify_jwt` setting in `config.toml` matches function intent (public webhook = false; user-triggered = true)
- [ ] Telegram webhook validates `X-Telegram-Bot-Api-Secret-Token` header
- [ ] No service-role key returned to client
- [ ] CORS headers explicit, not `*` for authenticated functions
- [ ] Input validated before DB writes

## Phase 4 — Client-Side Safety

```bash
# sessionStorage / localStorage write surface
grep -rn "sessionStorage\|localStorage" src/ --include="*.ts" --include="*.tsx" --include="*.jsx" | head

# File upload paths (compressorjs is the only allowed lib per CLAUDE.md)
grep -rn "FileReader\|new File\|new Blob" src/ --include="*.ts" --include="*.tsx" --include="*.jsx"
grep -rn "import.*compressorjs\|from 'compressorjs'" src/ --include="*.ts" --include="*.tsx" --include="*.jsx"

# Unrestricted file input accept
grep -rn "type=\"file\"" src/ --include="*.tsx" --include="*.jsx" | grep -v "accept="
```

Findings checklist:
- [ ] Every `<input type="file">` has `accept="image/*"` (or stricter)
- [ ] All image processing goes through `compressorjs` (per `CLAUDE.md`)
- [ ] No raw user input written to DOM via `dangerouslySetInnerHTML`
- [ ] No user input concatenated into URL strings without encoding

## Phase 5 — Type Safety Verification

```bash
# Must be 0
npx tsc --noEmit 2>&1 | tail -5

# as any count must stay at 0
grep -rcn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v ":0$"

# any type usage outside declarations.d.ts
grep -rn ": any\b\|<any>" src/ --include="*.ts" --include="*.tsx" | grep -v "declarations.d.ts" | head
```

## Output Format

```markdown
# 🔒 Security Audit Report

## Forbidden Patterns
| Pattern | Hits | Files |
|---------|------|-------|
| `as any` | 0 | ✅ clean |
| Multiple `createClient` | 1 | ✅ only `src/shared/api/supabase.ts` |
| Direct `supabase.from` outside services/ | N | [files] |
| Hardcoded secrets | 0 | ✅ |
| `console.log` in production | N | [files] |

## RLS Action Items (Supabase Dashboard)
1. ⚠️ Confirm RLS enabled on table `permits` — policy must check `auth.uid() = employee_id` for SELECT
2. ⚠️ ...

## Edge Function Findings
- `telegram-webhook`: [verdict + issues]
- `telegram-notify`: [verdict + issues]

## Client-Side Findings
- [findings]

## Type Safety
- `tsc --noEmit`: 0 errors ✅
- `as any` count: 0 ✅

## Verdict
SAFE TO PROCEED ✅ / NEEDS FIXES ❌

If NEEDS FIXES — list blockers ordered by severity.
```

## Integration Note

This skill produces a **report only** — it does not modify code. The Coder persona reads this report and applies fixes. The Reviewer persona uses this report as input to the formal scorecard.