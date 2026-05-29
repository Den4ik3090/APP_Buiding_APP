---
name: sbt-telegram-boundary
description: >
  Hard boundary guard for Telegram Edge Functions in PUTEVI Safety. Activates on:
  "telegram", "notification", "webhook", "telegram-notify", "telegram-webhook",
  "edge function", "alert". STOP — do not modify supabase/functions/telegram-*
  without explicit user approval. Safe changes are UI representation, observability,
  and retry logic only.
allowed-tools:
  - Read
---

# Safety Briefing Tracker — Telegram Boundary

Use this skill when:
- discussing Telegram notifications;
- reviewing alert-related frontend behavior;
- integrating UI with notification status;
- analyzing operational risk around edge-function-connected features.

## STOP — Protected Resources

`supabase/functions/telegram-notify/` and `supabase/functions/telegram-webhook/`
are protected operational code. **Do not modify them** unless the user explicitly
says "yes, change the edge function". If the task touches these files, halt and
confirm before proceeding.

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
