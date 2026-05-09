# Skill: Autonomous Multi-Agent Audit

## Purpose
Triggers a full project audit cycle using the Architect-Coder-Reviewer triad with a self-correction loop.

## Workflow
1. **Phase 0: Reconnaissance**: Use `find`, `ls`, and `grep` to map the current state.
2. **Phase 1: Architect Analysis**: Identify architectural drift (FSD violations, RLS gaps).
3. **Phase 2: Improvement Plan**: Generate `IMPROVEMENT_PLAN.md` with prioritized tasks.
4. **Phase 3: Execution & Verification**: Implement fixes and run `npx tsc --noEmit`.

## Usage
Run this skill when a high-level project health check or a complex refactoring is needed.