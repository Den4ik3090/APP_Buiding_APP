# External Integrations
> Generated: 2026-05-16 | Focus: tech

## Summary
The primary backend is Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). Telegram is the only third-party external service: outbound notifications via a Supabase Edge Function, and an inbound webhook bot that queries employee data. Sentry is scaffolded but not yet activated.

## Supabase

**Single client** — `src/shared/api/supabase.ts`. Never create a second client instance.

```ts
// src/shared/api/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { storage: window.sessionStorage },  // intentional security decision
});
```

**SDK:** `@supabase/supabase-js` ^2.91.1

### Database Tables (Postgres via RLS)

All tables have Row Level Security enabled. Single-tenant model: all authenticated users are trusted staff and have full CRUD access.

| Table | RLS Policies | Notes |
|-------|-------------|-------|
| `employees` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | Core entity; `name`, `organization`, `training_date`, `created_at`, photo reference |
| `permits` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | Safety permits |
| `orders` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | Work orders |
| `prescriptions` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | Safety prescriptions |
| `organization_docs` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | Org-level documents |
| `tasks` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | `id`, `title`, `description`, `assigned_to` (→ auth.users), `status` (enum), `site_id`, `created_at`, `due_date` |
| `task_resolutions` | SELECT/INSERT/UPDATE/DELETE for `authenticated` | `task_id` (→ tasks), `photo_url`, `completed_at`, `comments` |

**Enum:** `task_status` — `pending`, `in_progress`, `resolved`, `overdue`

Migrations located in `supabase/migrations/`:
- `tasks_schema.sql` — tasks + task_resolutions tables, RLS, tasks storage bucket
- `20260515_rls_core_tables.sql` — RLS for employees, permits, orders, prescriptions, organization_docs
- `20260515_employee_photos_private.sql` — employee-photos bucket set to private
- `20260515_tasks_created_by.sql`, `add_priority_to_tasks.sql`, `relax_tasks_rls.sql`, `security_hardening.sql` — incremental patches

### Storage Buckets

| Bucket | Access | Notes |
|--------|--------|-------|
| `employee-photos` | Private — authenticated read via signed URLs; authenticated write/update/delete | Accessed via `createSignedUrl` in `src/features/employee-crud/services/employeesService.ts`; image compression via `compressorjs` before upload |
| `tasks` | Public read; authenticated write/delete | Task resolution photos; public URL used in `src/features/tasks/services/storageService.ts` |

### Authentication

- **Provider:** Supabase Auth (email + password)
- **Session storage:** `window.sessionStorage` (clears on tab close — intentional security decision; do not change without explicit request)
- **Auth gate:** `src/app/App.tsx` — calls `supabase.auth.getSession()` on mount, subscribes to `onAuthStateChange`
- **Login UI:** `src/auth/LoginPage.tsx` — isolated subsystem; receives `signIn` callback from App
- **Logout:** `supabase.auth.signOut({ scope: 'global' })` called from `AppHeader`

### Realtime Channels

Three named channels subscribed in JSX registry components. **Do not rename channel strings** without a coordinated Supabase infrastructure change.

Channel names defined in `src/shared/constants/realtimeChannels.ts`:

| Constant | Channel String | Subscriber |
|----------|---------------|------------|
| `REALTIME_CHANNELS.PERMITS` | `'permits_changes'` | `src/features/permits/components/PermitsRegistry.jsx` |
| `REALTIME_CHANNELS.PRESCRIPTIONS` | `'prescriptions_registry_changes'` | `src/features/prescriptions/components/PrescriptionsRegistry.jsx` |
| `REALTIME_CHANNELS.ORDERS` | `'orders_registry_changes'` | `src/features/orders/components/OrdersRegistry.jsx` |

### Edge Functions

Configured in `supabase/config.toml`. Runtime: Deno.

**`telegram-notify`** (`supabase/functions/telegram-notify/index.ts`)
- Invoked client-side via `supabase.functions.invoke("telegram-notify", { body: { text } })`
- Client wrapper: `src/shared/api/telegram.ts` → `sendToTelegram(text)`
- Requires JWT Bearer token (authenticated session); validates user before forwarding to Telegram
- Sends HTML-formatted messages to a configured Telegram chat
- JWT verification: `verify_jwt: true` in config

**`telegram-webhook`** (`supabase/functions/telegram-webhook/index.ts`)
- Inbound webhook from Telegram Bot API
- Authenticated via `x-telegram-bot-api-secret-token` header (WEBHOOK_SECRET)
- Uses Supabase service role key to query `employees` table directly
- Supported bot commands: `/help`, `/id`, `/stats`, `/org <name>`, `/new`, `/expired`
- Chat ID allowlist enforced via `TELEGRAM_ALLOWED_CHAT_IDS` env var

## Telegram

**Bot API:** `https://api.telegram.org/bot{TOKEN}/sendMessage`

**Outbound flow (app → Telegram):**
1. Component calls `sendToTelegram(text)` from `src/shared/api/telegram.ts`
2. `sendToTelegram` calls `supabase.functions.invoke("telegram-notify")`
3. Edge function forwards to Telegram Bot API with 10s timeout

**Inbound flow (Telegram → app data):**
1. Telegram sends webhook POST to `telegram-webhook` edge function
2. Function validates secret token + allowlisted chat ID
3. Queries `employees` table and responds with formatted stats

**Required Supabase secrets (edge functions):**

| Secret | Used By |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | Both functions |
| `TELEGRAM_CHAT_ID` | `telegram-notify` |
| `TELEGRAM_WEBHOOK_SECRET` | `telegram-webhook` |
| `TELEGRAM_ALLOWED_CHAT_IDS` | `telegram-webhook` (comma-separated) |
| `SUPABASE_URL` | Both functions (auto-set by Supabase) |
| `SUPABASE_ANON_KEY` | `telegram-notify` (auto-set by Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | `telegram-webhook` |
| `NOTIFY_ALLOWED_ORIGIN` | `telegram-notify` (CORS; falls back to `*`) |

## Sentry (Not Active)

**Status:** Scaffolded but disabled. `src/app/sentry.ts` exports a no-op `initSentry()`.

**To activate:**
1. `npm install @sentry/react`
2. Uncomment `Sentry.init(...)` block in `src/app/sentry.ts`
3. Add `REACT_APP_SENTRY_DSN` to `.env`
4. Call `initSentry()` in `src/index.js`

Config notes: `tracesSampleRate: 0`, strips `event.user.email` before sending.

## Environment Variables

**Required for the SPA (`.env`, sourced by webpack via `dotenv`):**

| Variable | Purpose |
|----------|---------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL |
| `REACT_APP_SUPABASE_KEY` | Supabase anon/publishable key |

**Optional:**
| Variable | Purpose |
|----------|---------|
| `REACT_APP_SENTRY_DSN` | Sentry DSN (only needed after activating Sentry) |

Copy `.env.example` → `.env` to get started.

**Injected via `webpack.DefinePlugin`** — only `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` are exposed to browser bundles. No other env vars are forwarded.

## CI/CD & Deployment

**CI:** GitHub Actions — `.github/workflows/ci.yml`
- Requires `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` as GitHub repository secrets
- Fallback placeholder values allow the build step to complete without live credentials

**Hosting:** Not specified in codebase — `dist/` folder output. No deployment step in CI pipeline.

**Supabase CLI:** `supabase/` folder structure present; migrations and functions managed locally and pushed to Supabase cloud.

## Gaps / Unknowns

- No Supabase CLI version pinned; `supabase/config.toml` only configures edge functions, not database settings.
- The `telegram-webhook` edge function URL (registered with Telegram's `setWebhook` API) is not documented in code — must be configured externally in Telegram Bot settings.
- Deployment target (Vercel, Netlify, custom server, etc.) is not defined in the codebase.
- `REACT_APP_SENTRY_DSN` is referenced in `sentry.ts` comments but not in `.env.example` — would need to be added when activating.
- Realtime subscriptions in `PermitsRegistry.jsx`, `OrdersRegistry.jsx`, `PrescriptionsRegistry.jsx` subscribe to postgres changes but the exact subscription filter (`filter`, `event`, `schema`) was not read — check those files for specifics.
