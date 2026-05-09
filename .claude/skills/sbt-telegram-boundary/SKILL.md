
# Safety Briefing Tracker — Telegram Boundary

Use this skill when:
- discussing Telegram notifications;
- reviewing alert-related frontend behavior;
- integrating UI with notification status;
- analyzing operational risk around edge-function-connected features.

## Hard boundary

- telegram-notify and telegram-webhook are protected operational code;
- do not suggest changing them unless the user explicitly approves;
- if improvement is needed, prefer safe analysis around inputs, outputs, observability, retries, or UI representation first.

## Output

1. What is inside boundary vs outside boundary
2. Safe area to change
3. Risky area to avoid
4. Recommended approach
5. Validation steps

## Good behavior

- preserve operational continuity;
- avoid speculative backend changes;
- recommend wrapper-level or UI-level safeguards first.
