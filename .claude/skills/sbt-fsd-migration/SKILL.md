
# Safety Briefing Tracker — FSD Migration

Use this skill when:
- moving legacy code into FSD;
- designing a new slice;
- restructuring imports;
- defining public API for features/entities/widgets;
- deciding what belongs in shared vs entities vs features vs widgets vs pages.

## FSD principles to enforce

- Organize by business meaning, not by file type.[web:29][web:35]
- Expose slice functionality through a public API entry point.[web:44][web:47]
- Avoid direct deep imports across slices.[web:44][web:47]
- Keep dependencies flowing in one direction.
- Prefer incremental migration over big-bang rewrites.

## Project-specific mapping

Reference implementation:
- tasks feature = modern FSD + TypeScript

Legacy areas:
- employees
- permits
- orders
- prescriptions

Default interpretation:
- shared = reusable technical/UI/model utilities without business ownership
- entities = core business objects such as employee, permit, prescription, task
- features = user actions or business scenarios
- widgets = composite UI blocks
- pages = route-level screens

## Required output

For every migration proposal, provide:
1. Current state
2. Target slice layout
3. Why this belongs in that layer
4. Public API proposal
5. Safe migration steps
6. What can stay legacy for now
7. Risk level
8. Suggested commit order

## Rules

- Do not move everything at once.
- Preserve behavior first, improve structure second.
- Prefer adapter wrappers when full migration is too risky.
- If a module is stable and large, propose “strangler pattern” migration.
- New code should be .ts/.tsx unless there is a strong reason otherwise.
