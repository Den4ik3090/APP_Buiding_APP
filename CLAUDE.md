# Project Instructions

## Project Profile
- This is a production-oriented React application with mixed JavaScript and TypeScript.
- The codebase is hybrid: `.jsx`, `.js`, `.tsx`, and `.ts` coexist intentionally.
- Styling is also hybrid: plain CSS, SCSS, and CSS modules coexist.
- Do not normalize the entire codebase to one style unless explicitly asked.

## Main Zones
- `src/auth/` is an isolated auth subsystem with partially modernized TypeScript code.
- `src/components/OrderRegistry/`, `src/components/PermitsRegistry/`, and `src/components/Prescriptions/` are feature areas and should be changed locally.
- `src/components/Table.jsx`, `StatusBadge.jsx`, `Skeleton.jsx`, `Toast*.jsx`, `hooks/`, and `utils/` can affect multiple features.
- `src/supabaseClient.js` and `supabase/functions/` are sensitive integration areas.
- Treat `supabase/functions/telegram-*` as protected operational code.

## Working Style
- Read 2-3 similar local files before editing.
- Prefer minimal diffs.
- Preserve current public behavior unless explicitly asked to change it.
- Do not perform broad cleanup or style normalization as a side effect.
- Do not rename files or symbols broadly unless explicitly requested.

## JavaScript / TypeScript Rules
- This repository is in an incremental migration state.
- Do not propose mass JS->TS migration in routine tasks.
- If converting files, do it one file at a time and preserve compatibility.
- Prefer adding types at boundaries: props, utility inputs/outputs, hooks, data helpers.
- Avoid introducing `any` unless there is no practical alternative; prefer narrow types or `unknown`.

## Styling Rules
- Match the local styling strategy of the area you edit.
- In `auth/`, prefer the existing local conventions there.
- In legacy component areas, preserve the existing CSS/SCSS approach unless the task explicitly includes style refactoring.
- Do not migrate CSS to modules, SCSS, or Tailwind as a side effect.

## React Rules
- Keep changes scoped to the requested feature.
- Reuse nearby local patterns before introducing abstractions.
- Do not split large components unless explicitly asked or unless the split is necessary for the fix.
- Preserve accessibility semantics and current UX behavior.

## Supabase Rules
- Inspect `src/supabaseClient.js` before changing query logic assumptions.
- Do not widen permissions or suggest insecure shortcuts.
- Treat query bugs as one of: client/context mismatch, query shape issue, null/error handling issue, or policy/runtime assumption.
- Prefer fixing the narrowest root cause.
- Do not rewrite the global client for a local feature bug unless clearly required.

## Telegram / Edge Functions
- `supabase/functions/telegram-notify/` and `supabase/functions/telegram-webhook/` are protected.
- Ask before changing webhook handling, env assumptions, function config, or deploy-related behavior.
- Do not assume local testing flags are safe for production.
- Treat webhook URL, secrets, and verification assumptions explicitly.

## Verification
- After local UI/code edits: run lint if available for the project.
- After behavior changes: run the smallest reliable verification command.
- After structural changes: run lint, typecheck, and build when practical.
- Summarize changed files and verification results.

## Safety
- Ask before deleting files.
- Ask before changing auth flow.
- Ask before changing `src/supabaseClient.js`.
- Ask before changing files under `supabase/functions/`.
- Ask before dependency installation.
- Ask before broad renames across multiple feature folders.

## Compaction Instructions
Preserve:
- active task goal
- touched feature area
- changed files
- verification commands already run
- unresolved assumptions about auth, Supabase, or Telegram integrations
