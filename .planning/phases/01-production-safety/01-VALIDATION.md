---
phase: 1
slug: production-safety
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + jsdom |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm test -- --watchAll=false` |
| **Estimated runtime** | ~30 seconds (tsc) / ~60 seconds (jest) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm test -- --watchAll=false && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| is_dismissed-migration | 01 | 1 | PROD-01 | T-1-01 | Dismissed employees never exposed in API response | manual+tsc | `npx tsc --noEmit` | ⬜ pending |
| drop_console-verify | 01 | 1 | PROD-02 | — | No critical warnings silently stripped | manual | grep fallback removed | ⬜ pending |
| sentry-init | 01 | 2 | PROD-03 | T-1-02 | DSN not in source — only via env var | tsc | `npx tsc --noEmit` | ⬜ pending |
| sentry-error-boundary | 01 | 2 | PROD-04 | T-1-02 | Errors captured without exposing PII | manual | throw error in dev, check Sentry | ⬜ pending |
| sentry-unhandled | 01 | 2 | PROD-05 | T-1-02 | Rejection captured | manual | trigger rejection in dev | ⬜ pending |
| orders-fsd-fix | 01 | 3 | PROD-06 | T-1-03 | No direct supabase in OrdersRegistry | grep | `grep -r "from.*supabase" src/features/orders/components/` | ⬜ pending |
| permits-fsd-fix | 01 | 3 | PROD-07 | T-1-03 | No direct supabase in PermitsRegistry; channel names unchanged | grep+manual | `grep -r "from.*supabase" src/features/permits/components/` | ⬜ pending |
| prescriptions-fsd-fix | 01 | 3 | PROD-08 | T-1-03 | No direct supabase in PrescriptionsRegistry; channel names unchanged | grep+manual | `grep -r "from.*supabase" src/features/prescriptions/components/` | ⬜ pending |
| xlsx-remove | 01 | 4 | PROD-09 | T-1-04 | No xlsx 0.18.5 in node_modules | grep | `grep '"xlsx"' package.json` returns nothing | ⬜ pending |
| exceljs-export | 01 | 4 | PROD-10 | — | Export produces valid .xlsx | manual | click export, open in Excel/LibreOffice | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing Jest infrastructure covers this phase — no new test framework needed
- `npx tsc --noEmit` is the primary automated gate after each task
- `jest.config.js` typo (`setupFilesAfterFramework`) should be noted but does NOT block Phase 1 verification

*Note: Most Phase 1 verifications are grep-based or manual (browser check) rather than unit tests. Unit tests for the new service functions are Phase 2 scope.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dismissed employees don't appear | PROD-01 | Requires live Supabase DB with `is_dismissed` column | Run app, check employee list shows no dismissed records |
| Sentry captures ErrorBoundary errors | PROD-04 | Requires real Sentry DSN and production build | Throw error in dev, check Sentry dashboard within 30s |
| Sentry captures promise rejections | PROD-05 | Requires real Sentry DSN | Trigger `Promise.reject()` in dev console, check dashboard |
| ExcelJS export produces valid file | PROD-10 | File content verification | Click export, open .xlsx in Excel or LibreOffice — must open without errors |
| Realtime channels still connect | PROD-07, PROD-08 | Requires live Supabase Realtime | Open PermitsPage and PrescriptionsPage, verify real-time updates still work |

---

## Security Threat Model (ASVS L1)

| Threat ID | Threat | Mitigation | Requirement |
|-----------|--------|------------|-------------|
| T-1-01 | Dismissed employee data exposed via fallback query | Remove fallback entirely; filter `is_dismissed = false` unconditionally | PROD-01 |
| T-1-02 | Sentry DSN exposed in JavaScript bundle (client-side) | DSN exposure is accepted risk for client-side Sentry; do not put auth tokens in DSN; use Sentry's allowed-domains config | PROD-03 |
| T-1-03 | Direct `supabase` import bypasses RLS-aware service layer | Move all calls through services layer which uses the authenticated client consistently | PROD-06..08 |
| T-1-04 | xlsx 0.18.5 CVEs exploitable via malformed file processing | Replace with maintained ExcelJS; ExcelJS only writes, never reads user-provided files in this feature | PROD-09 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual instructions
- [ ] Sampling continuity: tsc runs after every task
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
