# Frendli Knowledge Base — Index

*Read this first at session start. It maps all available knowledge.*
*After reading, drill into relevant articles before analyzing the codebase.*

---

## Quick Reference

| Item | Value |
|------|-------|
| Project | Frendli — social connection app (discover, hangouts, venues) |
| App stack | React Native / Expo SDK 52 / Expo Router |
| API stack | Express 5 + Prisma 6 + PostgreSQL (Docker) |
| Web portal | React 19 / Vite / Tailwind |
| Auth | Mock (`x-mock-user-id` header) + Supabase Auth (Apple/Google/Phone) |
| Test user | `00000000-0000-0000-0000-000000000001` |

---

## Concepts
- [Project Status](concepts/project-status.md) — overall implementation status, plan audit outcomes, roadmap

## Features
- [SafeArrival](features/safe-arrival.md) — meetup safety: geofence, hybrid escalation, emergency contact, edge functions
- [Perks Countdown Timer](features/perks-countdown-timer.md) — DESIGNED NOT BUILT — useCountdown hook, push notifications, 12-task plan ready
- [Venue Portal](features/venue-portal.md) — analytics, monthly reports, promotion workflow (status enum), QR scanner
- [Stripe ID Verification](features/stripe-id-verification.md) — expo-web-browser approach, payment_pending state, no data stored

## Decisions
- [Supabase Patterns](decisions/supabase-patterns.md) — db push, migration repair, edge functions, pg_cron, storage RLS
- [Testing Patterns](decisions/testing-patterns.md) — vi.hoisted, chainable mocks, UTC hours, double .eq() bug fix
- [CLI Tools](decisions/cli-tools.md) — frendli-api.sh, db-inspect.sh, typecheck.sh, prisma-ops.sh

## Bugs
- [Supabase Migration Repair](bugs/supabase-migration-repair.md) — SQLSTATE 42710/2BP01 patterns + repair workflow

---

## Raw Session Logs

All 8 logs processed (2026-04-09). See [log.md](log.md) for ingest history.

---

*Last updated: 2026-04-09 | See [log.md](log.md) for operation history*
