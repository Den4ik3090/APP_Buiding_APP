---
plan: 01-03
phase: 1
status: complete
completed_at: 2026-05-16
subsystem: features/orders, features/permits, features/prescriptions
tags: [fsd, realtime, supabase, refactor]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [subscribeToOrders, subscribeToPermits, subscribeToPrescriptions]
  affects: [ordersService.ts, permitsService.ts, prescriptionsService.ts, OrdersRegistry.jsx, PermitsRegistry.jsx, PrescriptionsRegistry.jsx]
tech_stack:
  added: []
  patterns: [service-layer-realtime, realtime-channel-return]
key_files:
  created: []
  modified:
    - src/features/orders/services/ordersService.ts
    - src/features/orders/components/OrdersRegistry.jsx
    - src/features/permits/services/permitsService.ts
    - src/features/permits/components/PermitsRegistry.jsx
    - src/features/prescriptions/services/prescriptionsService.ts
    - src/features/prescriptions/components/PrescriptionsRegistry.jsx
decisions:
  - "Service functions return RealtimeChannel directly so components retain the reference for cleanup unsubscribe()"
  - "Channel name strings kept as REALTIME_CHANNELS constant references in service files — not hardcoded"
  - ".jsx extensions preserved on all 3 registry files (tsx conversion deferred to Phase 2 per D-04)"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-05-16"
  tasks: 3
  files: 6
---

# Phase 1 Plan 03: Move Realtime Subscriptions to Service Layer Summary

One-liner: Moved all Supabase Realtime channel subscriptions from JSX registry components into their respective TypeScript service files, eliminating the FSD violation of direct supabase client usage in the component layer.

## Files Changed

- `src/features/orders/services/ordersService.ts`: Added `import type { RealtimeChannel }`, `import { REALTIME_CHANNELS }`, and `subscribeToOrders(onUpdate)` function at end of file
- `src/features/orders/components/OrdersRegistry.jsx`: Removed `import { supabase }` and `import { REALTIME_CHANNELS }`; replaced inline `supabase.channel(...)` useEffect with call to `subscribeToOrders()`
- `src/features/permits/services/permitsService.ts`: Added `import type { RealtimeChannel }`, `import { REALTIME_CHANNELS }`, and `subscribeToPermits(onUpdate)` function at end of file
- `src/features/permits/components/PermitsRegistry.jsx`: Removed `import { supabase }` and `import { REALTIME_CHANNELS }`; replaced Realtime useEffect with call to `subscribeToPermits()` (expired-count toast useEffect untouched)
- `src/features/prescriptions/services/prescriptionsService.ts`: Added `import type { RealtimeChannel }`, `import { REALTIME_CHANNELS }`, and `subscribeToPrescriptions(onUpdate)` function at end of file
- `src/features/prescriptions/components/PrescriptionsRegistry.jsx`: Removed `import { supabase }` and `import { REALTIME_CHANNELS }`; replaced Realtime useEffect with call to `subscribeToPrescriptions()`

## Channel Name Preservation

All 3 channel name strings are unchanged — still sourced from `REALTIME_CHANNELS` constants:
- `'orders_registry_changes'` (REALTIME_CHANNELS.ORDERS)
- `'permits_changes'` (REALTIME_CHANNELS.PERMITS)
- `'prescriptions_registry_changes'` (REALTIME_CHANNELS.PRESCRIPTIONS)

## Note

`.jsx` extension preserved on all 3 registry files. TypeScript conversion is Phase 2 scope per D-04.

## Verification

- `npx tsc --noEmit`: 0 errors
- Zero direct `supabase` imports remain in any of the 3 registry components
- Each `subscribe*` function appears exactly 2 times in its registry (1 import + 1 call)
- `previousExpiredCountRef` count in PermitsRegistry.jsx: 5 (expired-count useEffect untouched)
- Channel strings in `realtimeChannels.ts`: unchanged (3 entries verified)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. The refactor moves existing Supabase Realtime call sites from component layer to service layer — no new network endpoints, auth paths, or schema changes introduced. The singleton supabase client and RLS enforcement are unchanged.

## Self-Check: PASSED

- FOUND: src/features/orders/services/ordersService.ts (subscribeToOrders present at line 66)
- FOUND: src/features/orders/components/OrdersRegistry.jsx (no supabase import, subscribeToOrders used)
- FOUND: src/features/permits/services/permitsService.ts (subscribeToPermits present at line 193)
- FOUND: src/features/permits/components/PermitsRegistry.jsx (no supabase import, subscribeToPermits used, expired-count useEffect untouched)
- FOUND: src/features/prescriptions/services/prescriptionsService.ts (subscribeToPrescriptions present at line 66)
- FOUND: src/features/prescriptions/components/PrescriptionsRegistry.jsx (no supabase import, subscribeToPrescriptions used)
- FOUND: .planning/phases/01-production-safety/01-03-SUMMARY.md
- FOUND: commit 954ef35 (refactor(01-03): move Realtime subscriptions to service layer)
