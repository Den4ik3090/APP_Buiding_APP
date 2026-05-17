---
description: Turn a detected problem into a structured engineering issue.
---

# /write-issue

Use this command when you detect a defect, smell, or architectural risk.

## Required Fields
- title,
- root cause,
- engineering impact,
- reproduction steps,
- observed behavior,
- expected behavior,
- severity,
- suggested fixes,
- tests required,
- owner.

## Rules
- Explain the problem technically.
- Identify the architectural consequence.
- Distinguish mitigation from structural repair.
- Be explicit about severity.
- Do not understate long-term risk.

## Output Format
Produce a ready-to-paste issue in markdown with the sections above.