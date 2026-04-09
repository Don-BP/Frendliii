---
title: Perks Countdown Timer
tags: [perks, notifications, countdown, supabase, pg_cron, expo-push]
sources: [CC-Session-Logs/09-04-2026-10_00-perks-countdown-timer-design.md]
updated: 2026-04-09
---

# Perks Countdown Timer

**Status: DESIGNED ONLY — implementation plan ready, no code written yet.**

Spec: `docs/superpowers/specs/2026-04-09-perks-countdown-timer-design.md`
Plan: `docs/superpowers/plans/2026-04-09-perks-countdown-timer.md` (12 tasks)

## What It Does

Shows a countdown on all venue perk displays (app + venue portal) showing time remaining before a promotion expires. Server-scheduled push notifications alert opted-in users before a nearby perk expires.

## Countdown Format (Adaptive)

| Remaining | Label |
|---|---|
| > 48h | "N days left" |
| 24–48h | "1 day left" |
| 1–24h | "N hours left" |
| < 1h | "N min left" |
| Same calendar day | "Expires today" (overrides hour/min) |
| Expired | "Expired" |
| Invalid | "" (renders nothing) |

**Urgency**: label turns coral `#FF7F61` when ≤24h remaining. No badge or animation — color shift only.

## Affected Components

**App:** `PerkCard.tsx`, `VenueDetailSheet.tsx`, `VenuePromotionCard.tsx` (all three)
**Venue portal:** `PromotionCard` inside `Promotions.tsx`

`PartnerVenue` interface (exported from `VenuePromotionCard.tsx`) gains `valid_until?: string | null`.

## Push Notifications

Server-scheduled via `notify-expiring-perks` Supabase edge function + pg_cron (daily at 09:00 UTC). Mirrors the `safety-escalation` pattern. See [[decisions/supabase-patterns#pg-cron-jobs]].

**Targeting scopes:**
- `all_nearby` (default) — users within discovery radius (~50km) of the venue
- `interacted_only` — only users with a row in `user_venue_interactions` for that venue

**User preferences** (stored on `profiles`):
- `notify_expiring_perks` boolean (default true)
- `notify_expiring_perks_hours` integer: 24 / 48 / 168 (default 48)
- `notify_expiring_perks_scope` text: `all_nearby` | `interacted_only` (default `all_nearby`)

**Deduplication**: `perk_notifications_sent (user_id, promotion_id)` PK prevents double-notifying.

## New DB Tables / Columns

- `profiles` — 3 new columns (notify prefs)
- `user_venue_interactions (user_id, venue_id, interacted_at)` — upserted when user opens VenueDetailSheet
- `perk_notifications_sent (user_id, promotion_id, sent_at)` — dedup guard, no RLS (service role only)

Migration: `supabase/migrations/20260409000001_perks_countdown.sql`

## Interaction Tracking

`POST /api/venues/:venueId/interact` (added to existing `frendli-api/src/routes/venues.ts`) — upserts `user_venue_interactions`. Called from `VenueDetailSheet` on mount via `venueApi.interact(venue.id)`.

## Notification Settings Screen

`frendli-app/app/notification-settings.tsx` — linked from profile tab as "Notifications" row in a SETTINGS section (above SAFETY). Controls: enable toggle, timing picker, scope picker (timing + scope hidden when toggle is off).

## Implementation Notes

- `distanceMetres` helper in edge function is duplicated from `frendli-api/src/routes/safety.ts` — packages don't share code, edge function gets its own Haversine copy.
- `venueApi.interact` must be added to `lib/api.ts` (Task 6 Step 1) BEFORE VenueDetailSheet calls it — ordering matters for TypeScript compilation.
- Venue portal and app use separate `useCountdown` hook files (identical logic, different packages).
