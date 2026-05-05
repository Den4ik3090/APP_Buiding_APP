---
name: sbt-react-feature-impl
description: Guide for building and extending React features in PUTEVI Safety project.
---

# Safety Briefing Tracker — React Feature Implementation

Use this skill when:
- Building a new feature or extending existing tasks/analytics.
- Wiring data loading (TanStack Query) into the UI.
- Adding form flows or route-level behavior.

## Project Rules
1. **Infrastructure:** Respect the single `QueryClientProvider` setup in `App.tsx`.
2. **Consistency:** Prefer patterns already used in `tasks` when designing new FSD code.
3. **Decoupling:** Do not create hidden cross-feature coupling; respect FSD layers.
4. **Domain Integrity:** Treat registry statuses and expiry logic as domain-critical.
5. **Incrementalism:** Use project-safe incremental changes to maintain stability.

## For Every Implementation Task
Ensure the output covers:
- **Scope & Layers:** Define the affected FSD layers.
- **Structure:** File structure proposal and data flow.
- **Data Layer:** Query/mutation placement and error/loading/empty states.
- **Safety:** Regression-sensitive areas and testing focus.

## Implementation Style
- Practical and production-oriented; readable over clever.
- Minimal blast radius; align with current codebase reality.
- **TS-First:** Mandatory TypeScript for all new code and refactored boundaries.