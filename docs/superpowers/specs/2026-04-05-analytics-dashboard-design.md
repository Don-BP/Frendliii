# Analytics Dashboard — Design Spec
**Date:** 2026-04-05
**Area:** venue-portal
**Priority:** High

## Overview

The venue portal Dashboard currently shows 4 stat tiles: monthly redemptions, all-time redemptions, active promotions count, and current tier. The PRD requires 8 metrics. This spec adds the 6 missing metrics and extracts all data fetching into a dedicated `useDashboardStats` hook.

## Current State

`venue-portal/src/pages/Dashboard.tsx` contains all data fetching inline. It queries `venue_redemptions` for monthly + all-time counts, `venue_promotions` for active count, and builds a 30-day daily redemption chart. The 6 PRD-required metrics are absent.

## Requirements

All 8 PRD metrics must be present:

| # | Metric | Status |
|---|---|---|
| 1 | Redemptions this month | Exists |
| 2 | Today's redemptions | **New** |
| 3 | This-week redemptions | **New** |
| 4 | Avg group size | **New** |
| 5 | Hourly redemption chart | **New** |
| 6 | New vs returning visitors | **New** |
| 7 | 30-day return rate | **New** |
| 8 | 60-day return rate | **New** |

The existing all-time redemptions tile and active promotions tile are replaced by today's and this-week's redemptions per the PRD. Current tier tile stays.

## Data Sources

### Today's redemptions
`venue_redemptions` WHERE `redeemed_at >= start of today UTC`

### This-week redemptions
`venue_redemptions` WHERE `redeemed_at >= start of current ISO week`

### Avg group size
`venue_redemptions` JOIN `hangouts` on `hangout_id` JOIN `hangout_participants` on `hangout_id` — count participants per hangout, average across all redemptions at this venue. Requires `venue_redemptions` to have a `hangout_id` foreign key. **If this column doesn't exist, avg group size is omitted from the dashboard and a TODO is left in the hook for when the schema is extended.**

### Hourly redemption chart
`venue_redemptions` grouped by `EXTRACT(hour FROM redeemed_at)` for the last 30 days. Returns 24 buckets (hours 0–23) with redemption counts. Replaces or supplements the existing 30-day daily chart.

### New vs returning visitors
For each unique `user_id` in `venue_redemptions` for this venue: first-ever redemption at this venue = **new**, any redemption where the user has a prior redemption at this venue = **returning**. Calculated client-side from the full redemption list.

### 30-day return rate
Users who redeemed in the most recent 30-day window AND also redeemed in the 30-day window before that, as a percentage of users in the earlier window.

### 60-day return rate
Same logic, 60-day windows.

## Architecture

### `venue-portal/src/hooks/useDashboardStats.ts` (new)

Single hook that owns all dashboard data fetching. Returns:

```typescript
interface DashboardStats {
  loading: boolean
  monthlyCount: number
  todayCount: number
  thisWeekCount: number
  avgGroupSize: number | null   // null if hangout_id not available
  hourlyChart: HourCount[]      // { hour: number; count: number }[]
  dailyChart: DayCount[]        // existing 30-day chart, kept
  newVisitors: number
  returningVisitors: number
  rate30Day: number             // percentage 0–100
  rate60Day: number             // percentage 0–100
  activePromos: number          // kept for tier card
}
```

All Supabase queries run in a single `Promise.all` for parallel loading. The hook accepts `venueId: string | undefined` and returns early with defaults when undefined.

### `venue-portal/src/pages/Dashboard.tsx`

- Remove all inline data fetching
- Import and call `useDashboardStats(venueId)`
- Render two rows of stat tiles:
  - **Row 1 (4 tiles):** Redemptions this month, Today, This week, Current tier
  - **Row 2 (4 tiles):** Avg group size, New visitors, Returning visitors, 30-day return rate
- Hourly chart replaces or sits alongside the existing 30-day daily chart
- 60-day return rate shown as a secondary label beneath the 30-day tile
- Existing upgrade banner, tier gating, and styling unchanged

## Tier Gating

Analytics are only visible to Perks and Premier venues. Listed venues see the upgrade banner (existing behaviour). The `useDashboardStats` hook is not called when the venue is on the Listed tier.

## Testing

- Unit test: `useDashboardStats` returns correct `todayCount` for redemptions with today's date
- Unit test: new vs returning classification is correct for a mixed redemption history
- Unit test: 30-day return rate calculation
- Unit test: hourly chart bucketing produces 24 entries
- Unit test: hook returns loading=true initially, loading=false after queries resolve
