
# Safety Briefing Tracker — Safe Legacy Refactor

Use this skill when:
- cleaning large JSX files;
- extracting hooks/helpers/components safely;
- reducing duplication in legacy registries;
- introducing types gradually;
- improving maintainability without large architecture changes.

## Refactor policy

- Stability first.
- Avoid behavior changes unless explicitly requested.
- Prefer small isolated refactors.
- Preserve current contracts when high-impact components are involved.
- Use wrapper/adaptor patterns to reduce risk.

## Output format

1. Refactor goal
2. What must not break
3. Safe extraction candidates
4. Suggested sequence of edits
5. Minimal verification plan
6. What should be postponed
7. Optional TS migration path

## Special caution

- employee / permit / order / prescription registries are stable;
- wide-impact shared UI or status logic must be flagged before touching;
- visual changes in compliance dashboards can alter user trust, so keep UI changes intentional.
