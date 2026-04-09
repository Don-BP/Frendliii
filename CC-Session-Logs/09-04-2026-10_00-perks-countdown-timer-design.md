# Session Log: 09-04-2026 10:00 - perks-countdown-timer-design

## Quick Reference (for AI scanning)
**Confidence keywords:** perks-countdown, useCountdown, VenuePromotionCard, PerkCard, VenueDetailSheet, PromotionCard, notify-expiring-perks, user_venue_interactions, perk_notifications_sent, notification-settings, pg_cron, Expo-push, adaptive-format, urgency-styling, scope-filter, all_nearby, interacted_only, brainstorming, writing-plans
**Projects:** Frendli (frendli-app, venue-portal, frendli-api, supabase)
**Outcome:** Completed full brainstorm → spec → implementation plan for Perks Countdown Timer feature. Spec and plan committed to master.

---

## Decisions Made

- **Adaptive countdown format** — `>48h` → days, `24–48h` → "1 day left", `<24h` → hours, `<1h` → minutes, same calendar day → "Expires today", past → "Expired". Granular enough to be useful without being clock-like.
- **Urgency styling at ≤24h** — countdown label turns coral (`#FF7F61`) when ≤24h remaining. No badge or animation — just the color shift. Subtle but noticeable.
- **Both surfaces** — countdown on app (PerkCard, VenueDetailSheet, VenuePromotionCard) AND venue portal (PromotionCard). Venue owners need to know when their promotions expire too.
- **Server-scheduled push via Supabase edge function + pg_cron** (not client-scheduled). Client-only approach is fragile — notification only fires if user opens the perk before the window. Server approach mirrors the existing `safety-escalation` pattern.
- **User-configurable notification timing** — default 48h, options: 24h / 48h / 1 week.
- **Location-based targeting with scope opt** — default "all nearby venues" (within discovery radius), option for "only venues I've visited". Prevents notification fatigue as the app scales.
- **Dedicated Notifications settings screen** — `/notification-settings` linked from profile tab as a new "Notifications" row in a SETTINGS section. Standard pattern users expect.
- **`user_venue_interactions` table** — upserted when user opens VenueDetailSheet. Single row per user/venue pair, `interacted_at` updated on repeat views. Powers the `interacted_only` scope filter.
- **`perk_notifications_sent` deduplication table** — PK `(user_id, promotion_id)` prevents double-notifying. Written by service role (edge function), no RLS needed.
- **`distanceMetres` duplicated in edge function** — the helper is already in `frendli-api/src/routes/safety.ts` but packages don't share code. Edge function gets its own inline copy (same Haversine formula).

---

## Key Learnings

- **`PartnerVenue` is the central type for all app venue components** — defined and exported from `VenuePromotionCard.tsx`, used by `VenueDetailSheet.tsx`. Adding `valid_until` once here makes it available everywhere.
- **Task ordering matters for type safety** — `venueApi.interact()` must be added to `lib/api.ts` before `VenueDetailSheet` calls it, otherwise TypeScript errors block compilation. The initial plan had these in the wrong order; fixed in self-review.
- **Venue portal tests use `vi` (Vitest), app tests use `jest`** — different test runner APIs for the same hook logic (same code, different test syntax).
- **`venues.ts` already exists in `frendli-api`** — and already has a `venueHaversineKm` helper. The new `interact` route can be added to the existing file without creating a new router.

---

## Files to be Created / Modified (per plan)

### New files
- `supabase/migrations/20260409000001_perks_countdown.sql`
- `frendli-app/lib/useCountdown.ts`
- `frendli-app/lib/__tests__/useCountdown.test.ts`
- `frendli-app/app/notification-settings.tsx`
- `venue-portal/src/hooks/useCountdown.ts`
- `venue-portal/src/hooks/__tests__/useCountdown.test.ts`
- `frendli-api/src/routes/__tests__/venue-interact.test.ts`
- `supabase/functions/notify-expiring-perks/index.ts`

### Modified files
- `frendli-app/components/VenuePromotionCard.tsx` — add `valid_until` to `PartnerVenue`, add countdown label
- `frendli-app/components/PerkCard.tsx` — add `valid_until` prop, countdown label
- `frendli-app/components/VenueDetailSheet.tsx` — countdown label + interaction upsert on mount
- `frendli-app/lib/api.ts` — add `venueApi.interact(venueId)`
- `frendli-app/app/(tabs)/profile.tsx` — add Notifications nav row
- `frendli-api/src/routes/venues.ts` — add `POST /api/venues/:venueId/interact`
- `venue-portal/src/pages/Promotions.tsx` — add countdown to `PromotionCard`

### Docs committed this session
- `docs/superpowers/specs/2026-04-09-perks-countdown-timer-design.md`
- `docs/superpowers/plans/2026-04-09-perks-countdown-timer.md`

---

## Pending Tasks

- **Execute the plan** — 12 tasks ready, awaiting subagent-driven or inline execution
- **Friendship milestones** — next feature in the queue (brainstorm + spec + plan, not started)
- **Post-meetup push nudge** — low priority, not started
- **Fill `SUPABASE_SERVICE_ROLE_KEY`** in `frendli-api/.env` (still a placeholder from Stage 4 work)

---

## Setup & Config

- No new infrastructure deployed this session — spec + plan only
- pg_cron job `notify-expiring-perks-daily` to be registered at `0 9 * * *` during plan execution (Task 12)
- Supabase project ID: `vodhhpgtxftxqdokghhc`

---

## Quick Resume Context

Designed and planned the Perks Countdown Timer feature end-to-end. The spec lives at `docs/superpowers/specs/2026-04-09-perks-countdown-timer-design.md` and the 12-task implementation plan at `docs/superpowers/plans/2026-04-09-perks-countdown-timer.md`. No code written yet — plan is ready to execute. Next: choose subagent-driven or inline execution, then move to Friendship Milestones brainstorm.

---

## Raw Session Log

User invoked /resume. Loaded context from CLAUDE.md + 3 recent session logs (07-04, 05-04 x2).
User confirmed: previous session ended with offer to work on Perks countdown timer or Friendship milestones.
User chose to continue in recommended order (Perks countdown first).

Brainstorming skill invoked. Context explored: VenuePromotion schema (valid_from, valid_until, status), usePromotions hook, Promotions.tsx PromotionCard, app components (PerkCard, VenueDetailSheet, VenuePromotionCard).

Clarifying questions answered one at a time:
- Where: C) both app + venue portal
- Granularity: B) adaptive (days / hours / "Expires today")
- Urgency styling: A) yes, subtle — color shift only
- Notifications: C) visual + push, user can opt out
- Notification timing: C) default 48h, user-configurable (24h/48h/1 week)
- App surfaces: A) all three (PerkCard, VenueDetailSheet, VenuePromotionCard)

User declined visual companion (text only).

Three approaches proposed for push notification delivery:
1. Client-scheduled (fragile)
2. Server edge function + pg_cron (recommended)
3. Hybrid

User chose Option 2.

Targeting question: C) location-based + user option for "interacted only" scope to prevent notification fatigue.

Design presented in 6 sections, all approved.
Spec written to docs/superpowers/specs/2026-04-09-perks-countdown-timer-design.md.
Self-review fixed: distanceMetres note + venues.ts route reference.
Spec committed.

User approved spec.

writing-plans skill invoked. Codebase explored: PerkCard props, VenuePromotionCard PartnerVenue interface, VenueDetailSheet, profile.tsx Safety section pattern, venues.ts existing endpoints, api.ts venueApi structure.

12-task plan written with full code in every step.
Self-review caught type ordering bug: venueApi.interact used in Task 6 before defined in Task 7. Fixed by adding api.ts change as Step 1 of Task 6.
Plan committed.

User asked to save session to CC-Session-Logs.
