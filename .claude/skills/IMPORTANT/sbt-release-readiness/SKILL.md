---
name: sbt-release-readiness
description: >
  Pre-release validation checklist for PUTEVI Safety. Use before any merge,
  deploy, or “is this done?” question. Checks regressions, RLS, cache, routing,
  shared UI contracts, file flows, and environment assumptions. Activates on:
  “release”, “deploy”, “merge”, “ready to ship”, “production”, “done?”, “release
  notes”. Escalates automatically on StatusBadge, auth/RLS, or Telegram changes.
allowed-tools:
  - Read
  - Bash
  - Grep
---

# Safety Briefing Tracker — Release Readiness

Use this skill when:
- preparing a release;
- reviewing a branch before merge;
- validating production safety;
- checking whether a feature is “done enough”.

## Release criteria

Always inspect:
- user-visible regressions;
- auth/RLS implications;
- query/cache implications;
- routing impact;
- shared UI contract impact;
- file/photo flows;
- operational dashboards and statuses;
- environment/config assumptions.

## Output

1. Release decision: ready / needs fixes / high risk
2. Blocking issues
3. Non-blocking issues
4. Required manual tests
5. Rollback sensitivity
6. Recommended release notes summary

## Critical warnings

Escalate clearly if:
- StatusBadge behavior changes;
- auth or RLS assumptions changed;
- query provider setup is touched;
- Telegram boundary was crossed;
- static deploy assumptions were broken.
