# Safety Briefing Tracker

A compliance dashboard for tracking mandatory safety briefings, certifications, and work permits across a construction workforce. Built for site managers and safety engineers at АО ПУТЕВИ.

## What it does

- **Employee registry** — view all staff with color-coded expiry status (valid / warning / expired) for briefings and certifications
- **Permits and orders** — track active work permits and orders by site
- **Prescriptions** — log safety violations and follow their resolution through to closure
- **Tasks** — create, assign, and close work tasks with photo evidence attached at resolution
- **Telegram alerts** — automated notifications when certifications approach expiry (30 / 15 / 7 days)

## Who uses it

Safety engineers and site managers responsible for workforce compliance at a construction company. Used daily to monitor expiration dates and respond to open violations or tasks.

## Local setup

```bash
# Prerequisites: Node.js >= 18, npm >= 9

cp .env.example .env
# Fill in the two Supabase variables (see table below)

npm install
npm start
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |

Both values are available in your Supabase project → Settings → API.

## Key architectural decisions

- **Hash-based routing** — `/#/employees`, `/#/tasks` etc. — no server rewrite rules needed for static deploy
- **Supabase as full backend** — auth, database (PostgreSQL), file storage, and edge functions all in one service
- **Hybrid JSX + TSX codebase** — incremental TypeScript migration; new code is `.tsx/.ts`, legacy registries stay `.jsx`
- **FSD (Feature-Sliced Design)** — the `tasks` feature is the reference implementation; other features are legacy and migrating gradually
- **Telegram notifications via Edge Functions** — runs server-side in Supabase Deno runtime, not in the browser bundle

## What to know before changing things

- **`.env` is required** — `supabaseClient.js` reads from `process.env`; the app will not connect without it
- **Supabase RLS is active** — all queries run under the authenticated user's policies; test with a real auth session, not anon
- **Telegram edge functions are protected** — `supabase/functions/telegram-notify/` and `telegram-webhook/` are operational code; ask before changing anything there
- **One QueryClientProvider** — lives in `App.tsx` only; adding another at the root (`index.js`) causes stale query state
- **`StatusBadge` tone API** — the `expired/warning/valid` prop drives row color across all three registries; a change here has wide effect
- **`compressorjs` is the active image library** — `browser-image-compression` was removed; don't add it back

## Deployment

```bash
npm run build
# Output: /dist — deploy as static files to any CDN or static host
```

Edge functions deploy separately via Supabase CLI:
```bash
npx supabase functions deploy telegram-notify
```

## Feature status

| Feature | Status | Notes |
|---|---|---|
| Employee registry | ✅ Stable | legacy JSX |
| Permits | ✅ Stable | legacy JSX |
| Orders | ✅ Stable | legacy JSX |
| Prescriptions | ✅ Stable | legacy JSX |
| Tasks | 🔶 Active development | modern FSD, TypeScript |
| Analytics | 🔶 Partial | chart.js + recharts present |
| Telegram notifications | ✅ Operational | protected — do not modify |
