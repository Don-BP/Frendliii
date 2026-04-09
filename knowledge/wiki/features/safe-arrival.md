---
title: SafeArrival Feature
tags: [safety, notifications, supabase, pg_cron, geofence]
sources: [CC-Session-Logs/07-04-2026-10_00-safe-arrival-stage-4-deploy.md]
updated: 2026-04-09
---

# SafeArrival

Safety feature for in-person meetups. Tracks that users arrive safely, escalates to an emergency contact if they don't check in.

## Stages

| Stage | Trigger | Action |
|---|---|---|
| 1 | Session started | Client schedules local push reminders |
| 2 | User misses check-in by configured delay | Push escalation reminder to user |
| 3 | User doesn't respond | Email emergency contact with report link |
| 4 (opt-in) | Emergency contact activates | Share location link with police |

Stage 4 is off by default — must be explicitly enabled in Safety Settings.

## Architecture

**Hybrid escalation** — client schedules local push notifications for immediate UX; server independently advances stages via pg_cron every 5 minutes. If the phone dies or app is killed, server-side escalation still fires. See [[decisions/supabase-patterns#pg-cron-jobs]].

**Geofence-aware** — if user's phone is within 200m of the venue (`GEOFENCE_RADIUS_M=200`), status changes to `likely_safe` and escalation pauses. Friendly reminders sent instead of alerting contact. Reverts to `active` if phone leaves.

**Three-state model**: `active` → `likely_safe` → `resolved`. Emergency contact landing page shows meaningful status.

**No auto-resolve** — incident stays `active` until user taps "I'm Safe" or resolves from History tab. Cannot distinguish "fine and forgot" from "in danger".

**Settings snapshots** — user settings snapshotted at session start. Mid-hangout settings changes don't affect in-progress safety session.

## User-Configurable Delays

- Stage 2 delay: 5 / 10 / 15 / 20 min
- Contact delay: 15 / 30 / 60 / 120 min
- Reminder interval: 15 / 30 / 60 min

## Database Tables

- `user_safety_settings` — per-user config (delays, emergency contact, stage4 toggle)
- `safety_sessions` — one row per hangout safety session, snapshots settings
- `safety_incidents` — permanent records, never deleted (potential legal/police use)

Migration: `supabase/migrations/20260407000001_safety_sessions.sql`

## Edge Functions

| Function | Purpose |
|---|---|
| `safety-escalation` | pg_cron handler — advances stages, calls safety-notify-contact at Stage 3 |
| `safety-notify-contact` | Creates incident record, sends Resend email to emergency contact |
| `safety-report` | Public HTML landing page for emergency contact — call/email/copy buttons, country-detected emergency number |

pg_cron job: `safety-escalation-check` — `*/5 * * * *` (job ID 2)

## Key Files

- `frendli-api/src/routes/safety.ts` — `distanceMetres` helper, `GEOFENCE_RADIUS_M=200`, routes: `POST /session/start`, `POST /session/resolve`, `GET /incidents`, geofence in `POST /check-in`
- `frendli-api/src/routes/__tests__/safety-sessions.test.ts` — 4 Jest tests
- `frendli-app/lib/safety-location.ts` — client lifecycle: `startSafetySession`, `resolveSafetySession`, `scheduleLikelySafeReminder`
- `frendli-app/app/safety-settings.tsx` — tabbed Settings + History screen
- `frendli-app/app/(tabs)/profile.tsx` — "Safety Settings" nav row in SAFETY section

## Email

`FROM_EMAIL = onboarding@resend.dev` — free Resend tier, only delivers to the Resend account owner's email until a custom domain is verified. Acceptable for dev/staging.

## Pending

- `SUPABASE_SERVICE_ROLE_KEY` in `frendli-api/.env` is a placeholder — must be filled with real value before API safety routes work locally.
- Custom domain needed for Resend before production email delivery.
