---
name: audit-loop
description: >
  Formal scorecard generator for the self-correction loop in autonomous audit mode.
  Produces calibrated 0-10 scores per category, with min-of-categories as final score.
  Includes anti-inflation guard for repeated iterations.
metadata:
  origin: PUTEVI
  invoked_by: reviewer-persona
---

# Audit Loop Skill

Use this skill in **Phase 3 (Review)** of the autonomous audit. Output the formal scorecard that drives the loop decision.

## Scoring Rubric (0–10 per category)

### 🏛️ FSD / Architecture
- **10**: Perfect layer discipline, all features have services/, hooks/, components/, index.ts barrel; zero upward imports from shared/
- **9**: One minor barrel export missing or one cosmetic FSD nit
- **7–8**: Direct Supabase call in a hook (not in services/); barrel inconsistency in 1 feature
- **5–6**: Multiple FSD violations or duplicated service logic across features
- **0–4**: Components folder revived; second Supabase client; shared/ imports from features/

### 🔒 Security
- **10**: All RLS dependencies documented; every Supabase call gated by service-layer validation; Edge Functions auth-correct; no secrets in bundle; sessionStorage XSS surface acknowledged
- **9**: One MEDIUM finding with documented mitigation plan
- **7–8**: 1 HIGH finding (e.g., webhook missing secret-token check)
- **5–6**: 1 CRITICAL or multiple HIGH
- **0–4**: Hardcoded service-role key, IDOR confirmed, auth bypass, secrets in git history

### 🧮 Logic Correctness
- **10**: Expiry/certification date math timezone-safe; all hook deps complete; cache invalidation matches mutation surface; Realtime subscriptions cleaned up
- **9**: One MEDIUM logic edge case (e.g., off-by-one on expiry day boundary)
- **7–8**: Hook missing dep or stale closure in 1 location
- **5–6**: Cache invalidation gap causes stale UI; race condition possible
- **0–4**: Expiry false-negative (CRITICAL — this is a compliance product)

### 🎨 UI/UX States
- **10**: Every async path renders loading + error + empty; mutations disable triggering buttons; dark mode parity; a11y preserved
- **9**: One missing empty state in a non-critical view
- **7–8**: Loading state missing in 1 feature; dark mode broken in 1 component
- **5–6**: Multiple missing error states; unresponsive UI during mutations
- **0–4**: No error boundary; user can submit twice; dark mode broken globally

### ⚡ Performance
- **10**: TanStack Query staleTime/gcTime tuned; react-window v2 used correctly; no N+1; lazy-load on routes; memoization correct
- **9**: One unnecessary re-render in non-critical widget
- **7–8**: Missing memoization in hot path; suboptimal staleTime
- **5–6**: List without virtualization on 500+ items
- **0–4**: Render loop; memory leak; broken react-window v2 (used v1 API)

### 🧪 Type Safety
- **10**: `tsc --noEmit` = 0 errors; `as any` = 0; no `: any` outside declarations.d.ts; narrow types at all boundaries
- **9**: One justified `unknown` cast at a boundary
- **7–8**: Two type assertions that could be replaced with proper guards
- **0–6**: ANY new `as any` introduced — automatic ≤6 regardless of other quality

### 📚 Hygiene
- **10**: Zero `console.log` in production paths; no orphan TODOs; no dead code
- **9**: 1–2 informational logs (non-sensitive)
- **7–8**: 5+ console statements; some dead imports
- **5–6**: Sensitive data in logs (employee names/IDs)
- **0–4**: Auth tokens or PII logged

## Final Score Calculation

```