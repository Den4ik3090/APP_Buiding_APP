# PUTEVI Safety — Technical Debt & Architecture Remediation

## What This Is

A structured remediation milestone for the PUTEVI Safety production SPA. The app manages employee training records, safety permits, orders, prescriptions, and tasks for AO PUTEVI (built on React 18 + TypeScript + Supabase). The codebase is functionally complete but has accumulated meaningful technical debt, security vulnerabilities, and architectural violations that create silent failure risk in production.

**This milestone does not add features.** It makes the existing system observable, secure, type-safe, and architecturally consistent.

## Core Value

**A production system that fails loudly, securely, and cleanly.** Silent degraded modes, invisible runtime errors, direct database access bypassing the service layer, and known-CVE dependencies are the four highest-risk open issues. Fixing these is the prerequisite for any future feature work.

## Context

- **Stack:** React 18, TypeScript 5.3 (strict, 0 `as any`), Webpack 5, TanStack Query v5, Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Architecture:** Feature-Sliced Design (FSD) — migration complete except for 3 legacy JSX registry components with direct Supabase imports
- **State:** Production app — changes must not break existing functionality
- **Codebase map:** Complete (`./planning/codebase/` — 7 documents)

## Requirements

### Validated (existing capabilities)

- ✓ Employee CRUD with training expiry tracking — existing
- ✓ Safety permit management with Realtime channels — existing
- ✓ Orders and prescriptions management — existing
- ✓ Task management with calendar view — existing
- ✓ Organization document management — existing
- ✓ Additional trainings with xlsx export — existing
- ✓ Analytics dashboard (recharts + react-window v2) — existing
- ✓ Supabase Auth with sessionStorage (intentional security decision) — existing
- ✓ Dark mode (Tailwind class strategy) — existing
- ✓ CI: tsc + build on push/PR — existing

### Active (this milestone)

- [ ] **Phase 1 — Production safety:** Fix silent `is_dismissed` degraded mode, activate Sentry error monitoring, fix 3 FSD violations (direct Supabase in registries), migrate xlsx 0.18.5 → ExcelJS
- [ ] **Phase 2 — Type safety:** Convert 16 legacy `.jsx` files to strict TypeScript, add unit/integration test coverage for 9 untested feature slices
- [ ] **Phase 3 — Architecture consistency:** Migrate OrganizationManager to TanStack Query, add `services/` layer to skeletal slices (`employee-retrain`, `additional-trainings`)
- [ ] **Phase 4 — Dependency hygiene + CI:** Remove unused `@coreui/*` packages, evaluate `framer-motion` usage, add test suite to CI, write Playwright E2E tests

### Out of Scope

- New features or UI changes — this milestone is remediation only
- Supabase schema changes beyond the `is_dismissed` migration — requires coordinated infra work
- Auth flow changes — protected, requires separate planning
- Telegram edge function changes — protected, requires separate planning
- `sessionStorage` auth change — intentional security decision, not to be changed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| xlsx → ExcelJS | xlsx 0.18.5 is abandoned community fork with known CVEs; ExcelJS is actively maintained with similar API | Pending |
| Sentry activation | Production errors currently completely invisible; `src/app/sentry.ts` is a no-op stub | Pending |
| FSD registry refactor | 3 JSX registries bypass `services/` layer with direct Supabase imports — violates FSD hard rule | Pending |
| `is_dismissed` migration | Fallback loads all employees (incl. dismissed) silently; `drop_console` strips the warning in prod | Pending |
| Research before each phase | Domain is partially understood from codebase map; research still valuable for migration patterns | Enabled |
| Standard granularity | 4-phase scope fits standard slice size (3-5 plans per phase) | Confirmed |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-16 after initialization*
