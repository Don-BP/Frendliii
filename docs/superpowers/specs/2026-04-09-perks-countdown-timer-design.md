# Perks Countdown Timer — Design Spec

**Date:** 2026-04-09
**Status:** Approved

---

## Overview

Add a countdown timer to venue perks/promotions on both the app (user-facing) and the venue portal (venue owner-facing), plus a server-scheduled push notification system that alerts opted-in users before a perk they care about expires.

---

## Architecture

Three independent pieces:

1. **Countdown hook** — shared `useCountdown(valid_until)` utility used by all perk display components. Pure client-side, no network calls.
2. **Venue interaction tracking** — `user_venue_interactions` table records when a user views a venue's detail sheet. Powers the "interacted only" notification targeting scope.
3. **Notification system** — `notify-expiring-perks` Supabase edge function triggered daily by pg_cron. Finds promotions expiring within each user's configured window, filters by targeting scope, sends Expo push notifications.

---

## Data Model

### Migration: extend `profiles` table

```sql
ALTER TABLE profiles
  ADD COLUMN notify_expiring_perks         boolean     NOT NULL DEFAULT true,
  ADD COLUMN notify_expiring_perks_hours   integer     NOT NULL DEFAULT 48,
  ADD COLUMN notify_expiring_perks_scope   text        NOT NULL DEFAULT 'all_nearby'
    CHECK (notify_expiring_perks_scope IN ('all_nearby', 'interacted_only'));
```

`notify_expiring_perks_hours` valid values: `24`, `48`, `168` (1 week).

### Migration: new `user_venue_interactions` table

```sql
CREATE TABLE user_venue_interactions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id       uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  interacted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)
);

ALTER TABLE user_venue_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own interactions"
  ON user_venue_interactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Upserted (not inserted) on repeat views — `interacted_at` updates, no duplicate rows.

### Migration: new `perk_notifications_sent` table

Deduplication guard to prevent re-notifying a user about the same promotion.

```sql
CREATE TABLE perk_notifications_sent (
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id  uuid        NOT NULL REFERENCES venue_promotions(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promotion_id)
);
```

No RLS needed — only written by the service role (edge function).

---

## Countdown Hook

### `frendli-app/lib/useCountdown.ts`

```
useCountdown(valid_until: string): {
  label: string       // e.g. "3 days left", "4 hours left", "Expires today", "Expired", ""
  isUrgent: boolean   // true when ≤ 24h remaining
  isExpired: boolean  // true when past valid_until
}
```

**Adaptive format rules:**
| Remaining time | Label |
|---|---|
| > 48h | `"N days left"` |
| 24h–48h | `"1 day left"` |
| 1h–24h | `"N hours left"` |
| < 1h and > 0 | `"N min left"` |
| Same calendar day, any time remaining | `"Expires today"` (overrides hour/min labels) |
| Expired | `"Expired"` |
| Invalid/null `valid_until` | `""` (empty — component renders nothing) |

**`isUrgent`** is `true` when ≤ 24h remaining (and not expired).

Recalculates every 60 seconds via `setInterval`. Clears interval on unmount.

### `venue-portal/src/hooks/useCountdown.ts`

Identical logic, separate file (packages don't share code).

---

## Countdown UI

### App — `PerkCard.tsx`, `VenueDetailSheet.tsx`, `VenuePromotionCard.tsx`

- Countdown label rendered below the discount/title
- Color: `#8E8271` (muted) when not urgent, `#FF7F61` (coral accent) when urgent
- No badge, no animation — color shift only
- Only shown when `status === 'active'` and not expired

### Venue portal — `PromotionCard` (inside `Promotions.tsx`)

- Countdown label added to the card footer, beside the existing date range
- Color: `text-[#8E8271]` normal, `text-[#FF7F61]` urgent
- Only shown for active promotions

---

## Venue Interaction Tracking

When a user opens `VenueDetailSheet` for a venue, upsert a row into `user_venue_interactions`:

```
POST /api/venues/:venueId/interact
```

New route added to the existing `frendli-api/src/routes/venues.ts`. Upserts `(user_id, venue_id)` with `interacted_at = now()`. Used only for notification targeting — no UI surface needed.

---

## Notification Settings Screen

New screen: `frendli-app/app/notification-settings.tsx`

Linked from the profile tab as a dedicated "Notifications" row in the Settings section (same nav row pattern as Safety Settings).

**Controls:**
1. **Toggle** — "Notify me about expiring perks" (`notify_expiring_perks`)
2. **Timing picker** — "How far in advance?" → 24 hours / 48 hours / 1 week (`notify_expiring_perks_hours`). Hidden when toggle is off.
3. **Scope picker** — "For which venues?" → "All nearby venues" / "Only venues I've visited" (`notify_expiring_perks_scope`). Hidden when toggle is off.

Changes saved immediately on change (optimistic update + API call), same pattern as Safety Settings.

---

## Edge Function: `notify-expiring-perks`

**File:** `supabase/functions/notify-expiring-perks/index.ts`

**Schedule:** Daily at 09:00 UTC via pg_cron.

**Logic:**
1. Query `venue_promotions` where `status = 'active'` and `valid_until` is between `now()` and `now() + 168h` (max window — catches all user thresholds in one pass).
2. For each promotion, fetch opted-in users (`notify_expiring_perks = true`, Expo push token present) whose configured `notify_expiring_perks_hours` puts this promotion in their personal window (i.e. `valid_until` is within `[now + threshold - 1h, now + threshold + 1h]`).
3. Apply scope filter:
   - `all_nearby` — user's stored `lat`/`lng` is within the venue's discovery radius using an inline `distanceMetres` helper (same Haversine formula as `frendli-api/src/routes/safety.ts` — duplicated into the edge function since packages don't share code)
   - `interacted_only` — user has a row in `user_venue_interactions` for the venue
4. Skip users already in `perk_notifications_sent` for this promotion.
5. Send via Expo push API (`https://exp.host/--/api/v2/push/send`).
6. Insert sent records into `perk_notifications_sent`.

**Error handling:** Each promotion batch wrapped in try/catch. A single failure logs and continues — does not abort the job. Returns 200 always so pg_cron doesn't retry aggressively.

**pg_cron registration (SQL Editor):**
```sql
select cron.schedule(
  'notify-expiring-perks-daily',
  '0 9 * * *',
  $$ select net.http_post(
       url := 'https://vodhhpgtxftxqdokghhc.supabase.co/functions/v1/notify-expiring-perks',
       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `valid_until` null or invalid | `useCountdown` returns `{ label: '', isUrgent: false, isExpired: false }` — component renders nothing |
| User has no Expo push token | Skip silently |
| Expo push API error | Log error, continue to next user |
| Duplicate notification | Blocked by `perk_notifications_sent` PK constraint |
| `distanceMetres` missing user lat/lng | Treat as "not nearby" — skip user |

---

## Testing

| Area | What to test |
|---|---|
| `useCountdown` (unit) | Each format case: >48h, 24–48h, 1–24h, <1h, expires today, expired, invalid input. Fake timers. |
| `useCountdown` (unit) | `isUrgent` true at exactly 24h, false at 24h+1s |
| `notify-expiring-perks` (Jest) | Threshold window filtering, scope filtering (all_nearby vs interacted_only), deduplication skip |
| `PromotionCard` (venue portal) | Countdown label present on active, absent on draft/ended |
| Notification settings screen | Timing + scope pickers hidden when toggle is off |

---

## Files to Create / Modify

### New files
- `frendli-app/lib/useCountdown.ts`
- `frendli-app/app/notification-settings.tsx`
- `venue-portal/src/hooks/useCountdown.ts`
- `supabase/functions/notify-expiring-perks/index.ts`
- `supabase/migrations/20260409000001_perks_countdown.sql`

### Modified files
- `frendli-app/components/PerkCard.tsx` — add countdown label
- `frendli-app/components/VenueDetailSheet.tsx` — add countdown label + fire interaction upsert on open
- `frendli-app/components/VenuePromotionCard.tsx` — add countdown label
- `frendli-app/app/(tabs)/profile.tsx` — add Notifications nav row
- `frendli-api/src/routes/venues.ts` — add `POST /api/venues/:venueId/interact`
- `venue-portal/src/components/PromotionCard` (inside `Promotions.tsx`) — add countdown label
