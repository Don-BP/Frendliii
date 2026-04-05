# Promotion Workflow + Tier Limits — Design Spec
**Date:** 2026-04-05
**Area:** venue-portal + supabase
**Priority:** High

## Overview

The current `venue_promotions` table uses an `is_active: boolean` column that conflates two distinct concepts: whether a promotion was ever activated, and whether it's currently live. This spec replaces `is_active` with a proper `status` enum (`draft | active | ended`), adds per-tier active promotion limits, and updates the Promotions UI to reflect three distinct states.

## Status Definitions

| Status | Meaning | Editable? |
|---|---|---|
| `draft` | Created but not yet activated | Yes — full edit |
| `active` | Live and within valid date range | Limited — can only end it |
| `ended` | Expired (`valid_until` passed) or manually deactivated | No — read-only |

Venues activate their own promotions instantly — no approval required.

A promotion transitions to `ended` automatically when `valid_until` passes. The Promotions page derives this on load by checking `status = 'active' AND valid_until <= now()` and treating those as visually ended (the DB value is updated lazily on next staff interaction, or by a scheduled cleanup job).

## Tier Promotion Limits

| Tier | Max active promotions |
|---|---|
| Listed | 0 (no access — existing TierGate) |
| Perks | 2 |
| Premier | 4 |

The limit is enforced in:
1. **`usePromotions` hook** — `canActivate` boolean derived from `activeCount < tierLimit`
2. **Promotions page UI** — "New Promotion" button and activate toggle disabled when `canActivate = false`, with message: *"You've reached your [N] active promotion limit. End a promotion to activate a new one."*
3. **Supabase RLS / DB trigger** (optional hardening) — can be added later; frontend enforcement is sufficient for v1

## Database Migration

A single migration file replaces `is_active` with `status`:

```sql
-- Add status column with default draft
ALTER TABLE venue_promotions
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'ended'));

-- Migrate existing data
UPDATE venue_promotions
  SET status = CASE
    WHEN is_active = true AND valid_until > now() THEN 'active'
    ELSE 'ended'
  END;

-- Drop is_active
ALTER TABLE venue_promotions DROP COLUMN is_active;
```

## Edge Function Updates

`supabase/functions/redeem-coupon/index.ts` currently checks `is_active = true`. This must be updated to check `status = 'active'` before the migration is deployed. Both changes (edge function + migration) are deployed together to avoid a window where coupon validation breaks.

## Type Changes

`venue-portal/src/lib/types.ts` — `VenuePromotion`:

```typescript
// Before
export interface VenuePromotion {
  is_active: boolean
  // ...
}

// After
export type PromotionStatus = 'draft' | 'active' | 'ended'

export interface VenuePromotion {
  status: PromotionStatus
  // ...
}
```

## Hook Changes — `usePromotions.ts`

- All queries updated: filter by `status` instead of `is_active`
- `togglePromotion` renamed to `activatePromotion(id)` and `endPromotion(id)` — two explicit actions instead of a toggle
- New export: `canActivate: boolean` — `activeCount < tierLimit`
- `tierLimit` derived from `venue.tier`: `perks → 2`, `premier → 4`, `listed → 0`

## UI Changes — `Promotions.tsx`

Three sections replace two:

**Active** — `status = 'active'` AND `valid_until > now()`
Each card shows: title, discount, expiry date, "End Promotion" button (red/destructive style)

**Draft** — `status = 'draft'`
Each card shows: title, discount, expiry date, "Edit" button, "Activate" button
- Activate button disabled + tooltip when `canActivate = false`

**Ended** — `status = 'ended'` OR (`status = 'active'` AND `valid_until <= now()`)
Each card shows: title, discount, end date — read-only, muted style

**Limit banner** — shown below the section header when `canActivate = false`:
> "You've reached your [N] active promotion limit. End a promotion to activate a new one."

**New Promotion button** — disabled (not hidden) when `canActivate = false`, same message on hover/focus.

## Promotion Form Changes

`PromotionForm` component currently defaults new promotions to whatever `is_active` was. New promotions always start as `draft`. The form removes any active/inactive toggle — status is managed via the explicit Activate / End buttons on the card, not in the form.

## Deployment Order

1. Update `redeem-coupon` edge function to check `status = 'active'` (deploy first)
2. Run Supabase migration (adds `status`, migrates data, drops `is_active`)
3. Deploy venue portal with updated types, hook, and UI

This order ensures no window where coupon validation is broken.

## Testing

- Unit test: `canActivate` returns false when `activeCount >= tierLimit`
- Unit test: `activatePromotion` is blocked when at tier limit
- Unit test: migration correctly sets `status = 'active'` for rows where `is_active = true AND valid_until > now()`
- Unit test: `endPromotion` sets `status = 'ended'`
- Unit test: Promotions page renders three sections with correct promotions in each
- Unit test: "New Promotion" button disabled state when at limit
- Integration test: `redeem-coupon` edge function rejects coupon with `status != 'active'`
