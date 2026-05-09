
# Safety Briefing Tracker — Supabase and RLS

Use this skill when:
- reviewing data access;
- checking whether UI assumptions match RLS;
- designing secure queries;
- auditing storage/file access;
- discussing auth-bound behavior;
- validating dangerous flows.

## Project assumptions

- Supabase is the backend for auth, database, storage, and edge functions.
- RLS is enabled and must be treated as real production behavior.[web:30][web:36]
- Queries must be evaluated in authenticated context, not only anon context.[web:30]
- Telegram functions are operational code and protected.
- Photo evidence and file flows may involve storage and task closure flows.

## Security rules

- Never assume frontend checks replace RLS.[web:30][web:51]
- Distinguish UI visibility from actual authorization.[web:30]
- Consider storage policies separately from table policies.[web:51]
- Be explicit about the difference between authenticated user, role, site scope, and admin assumptions.
- If a proposed change affects data access, list impacted tables, policies, and UI flows.

## Required output

1. What resource is accessed
2. Who should access it
3. Current likely risk
4. RLS / auth implications
5. Safe recommendation
6. Validation checklist
7. Dangerous assumptions to avoid

## Special warning cases

Mark clearly if a suggestion is:
- unsafe under RLS;
- likely to break authenticated flows;
- storage-sensitive;
- edge-function-sensitive.
