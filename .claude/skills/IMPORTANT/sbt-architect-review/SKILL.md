---
name: sbt-architect-review
description: >
  Architecture review for PUTEVI Safety. Use when evaluating module boundaries,
  FSD layer compliance, technical debt prioritization, risk assessment before
  refactoring, or designing new features. Activates on: "architecture", "module
  boundary", "tech debt", "design", "risk", "refactor", "fits the project".
  NOT for bug fixes — use sbt-bugfix-investigator. NOT for new FSD slices — use
  sbt-feature-architect.
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Safety Briefing Tracker — Architecture Review

Use this skill when the task is:
- architecture review;
- module boundary review;
- technical debt prioritization;
- design of new features;
- risk assessment before refactoring;
- evaluating whether a change fits the project architecture.

## Project context

Safety Briefing Tracker is a compliance dashboard for construction workforce safety tracking.
It is production-oriented and used by safety engineers and site managers.
Core areas:
- employees;
- permits;
- orders;
- prescriptions;
- tasks with photo evidence;
- analytics;
- Telegram notifications.

Stack:
- React
- JavaScript + TypeScript
- hybrid JSX + TSX
- Supabase
- TanStack Query
- static deploy
- Hash routing
- FSD as target architecture
- tasks feature is the reference implementation
- several legacy registries remain in JSX

## Non-negotiable constraints

- Do not recommend a full rewrite if incremental migration is possible.
- Treat stable legacy modules carefully.
- There must be only one QueryClientProvider, in App.tsx.
- Do not recommend unsafe changes to Telegram edge functions without explicit approval.
- Do not ignore Supabase RLS.
- Assume this is a compliance-critical internal tool, not a toy CRUD project.
- StatusBadge tone API is high-impact.

## Review method

Always classify the task as one of:
- legacy-only;
- FSD-only;
- cross-cutting;
- infrastructure-adjacent.

Then produce:
1. Problem framing
2. Current risk
3. Recommended direction
4. Safer alternative
5. Migration path
6. Risk level: low / medium / high
7. Regression risk
8. What must be tested

## What good advice looks like

- concrete;
- specific to this repository style;
- cautious around production data and UX;
- incremental;
- tied to file/module structure;
- explicit about trade-offs.

## What to avoid

- “improve architecture” without specifics;
- suggesting new providers at root;
- breaking routing assumptions;
- hand-wavy “rewrite to clean architecture” advice;
- ignoring legacy coexistence reality.
