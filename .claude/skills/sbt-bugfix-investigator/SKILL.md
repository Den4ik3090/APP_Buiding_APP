
# Safety Briefing Tracker — Bugfix Investigator

Use this skill when:
- a bug needs root-cause analysis;
- a regression appeared;
- data looks inconsistent;
- the UI shows wrong status;
- tasks, filters, uploads, or routes misbehave.

## Investigation method

Always structure the analysis as:
1. Symptom
2. Likely layer
3. Candidate root causes
4. Most probable cause
5. Minimal-risk fix
6. What to verify after the fix
7. Preventive follow-up

## Rules

- Start with the smallest plausible explanation.
- Distinguish frontend bug, query bug, auth/RLS issue, storage issue, and data-shape mismatch.
- Prefer minimal-risk fixes before refactors.
- If the bug touches shared contracts, call that out immediately.
