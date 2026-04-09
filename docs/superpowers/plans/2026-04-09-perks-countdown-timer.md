# Perks Countdown Timer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive countdown timer to all venue perk displays (app + venue portal) and server-scheduled push notifications that alert opted-in users before a nearby perk expires.

**Architecture:** A shared `useCountdown(valid_until)` hook powers all countdown labels. The app's `PartnerVenue` type gains `valid_until`. An existing Supabase DB migration adds notification preference columns to `profiles` and two new tables. A `notify-expiring-perks` edge function runs daily via pg_cron, targeting users by location or interaction history.

**Tech Stack:** React Native / Expo (frendli-app), React / Vite (venue-portal), Express / Prisma (frendli-api), Supabase (migrations + edge functions), pg_cron, Expo Push API

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260409000001_perks_countdown.sql` | Create | DB migration: profiles columns + 2 new tables |
| `frendli-app/lib/useCountdown.ts` | Create | Adaptive countdown hook for app |
| `frendli-app/lib/__tests__/useCountdown.test.ts` | Create | Tests for app countdown hook |
| `frendli-app/components/VenuePromotionCard.tsx` | Modify | Add `valid_until` to `PartnerVenue`, add countdown label |
| `frendli-app/components/PerkCard.tsx` | Modify | Add `valid_until` prop, add countdown label |
| `frendli-app/components/VenueDetailSheet.tsx` | Modify | Add countdown label, fire interaction upsert on mount |
| `frendli-app/lib/api.ts` | Modify | Add `venueApi.interact(venueId)` |
| `frendli-api/src/routes/venues.ts` | Modify | Add `POST /api/venues/:venueId/interact` |
| `frendli-api/src/routes/__tests__/venue-interact.test.ts` | Create | Tests for interact route |
| `frendli-app/app/notification-settings.tsx` | Create | Notification preferences screen |
| `frendli-app/app/(tabs)/profile.tsx` | Modify | Add Notifications nav row |
| `venue-portal/src/hooks/useCountdown.ts` | Create | Adaptive countdown hook for venue portal |
| `venue-portal/src/hooks/__tests__/useCountdown.test.ts` | Create | Tests for venue portal countdown hook |
| `venue-portal/src/pages/Promotions.tsx` | Modify | Add countdown label to `PromotionCard` |
| `supabase/functions/notify-expiring-perks/index.ts` | Create | Edge function: daily push notifications |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260409000001_perks_countdown.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260409000001_perks_countdown.sql

-- 1. Add notification preference columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_expiring_perks         boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_expiring_perks_hours   integer  NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS notify_expiring_perks_scope   text     NOT NULL DEFAULT 'all_nearby'
    CONSTRAINT notify_scope_check CHECK (notify_expiring_perks_scope IN ('all_nearby', 'interacted_only'));

-- 2. Venue interaction tracking
CREATE TABLE IF NOT EXISTS user_venue_interactions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id       uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  interacted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)
);

ALTER TABLE user_venue_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own venue interactions"
  ON user_venue_interactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Deduplication guard for push notifications
CREATE TABLE IF NOT EXISTS perk_notifications_sent (
  user_id       uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id  uuid  NOT NULL REFERENCES venue_promotions(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promotion_id)
);
```

- [ ] **Step 2: Apply the migration to remote DB**

Run from `e:/Frendli` (repo root):
```bash
npx supabase db push
```
Expected output: `Applying migration 20260409000001_perks_countdown...` then `Remote database is up to date.`

If the migration history is missing prior entries, see the repair steps from session log `05-04-2026-19_30-venue-portal-db-push.md`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260409000001_perks_countdown.sql
git commit -m "feat(supabase): add perks countdown migration — profiles prefs + user_venue_interactions + perk_notifications_sent"
```

---

## Task 2: App `useCountdown` Hook

**Files:**
- Create: `frendli-app/lib/useCountdown.ts`
- Create: `frendli-app/lib/__tests__/useCountdown.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// frendli-app/lib/__tests__/useCountdown.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns empty label for null input', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.label).toBe('');
    expect(result.current.isUrgent).toBe(false);
    expect(result.current.isExpired).toBe(false);
  });

  it('returns "Expired" for past date', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const { result } = renderHook(() => useCountdown(past));
    expect(result.current.label).toBe('Expired');
    expect(result.current.isExpired).toBe(true);
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns hours label and isUrgent when < 24h remaining', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(); // 5h
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('5 hours left');
    expect(result.current.isUrgent).toBe(true);
  });

  it('returns minutes label when < 1h remaining', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 min
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('30 min left');
    expect(result.current.isUrgent).toBe(true);
  });

  it('returns days label when > 48h remaining', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(); // 3 days
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.label).toBe('3 days left');
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns "1 day left" when 24–48h remaining', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(); // 30h
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.label).toBe('1 day left');
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns "Expires today" when expiry is same calendar day', () => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 0);
    // Only run this test when it's before 23:59 — skip if within 1 min of midnight
    if (endOfDay.getTime() - Date.now() < 60000) return;
    const { result } = renderHook(() => useCountdown(endOfDay.toISOString()));
    expect(result.current.label).toBe('Expires today');
    expect(result.current.isUrgent).toBe(true);
  });

  it('recalculates after 60 seconds', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(); // 2h
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('2 hours left');
    act(() => jest.advanceTimersByTime(61000));
    // still 2h (barely changed) — label unchanged is fine; key thing is no crash
    expect(result.current.label).toBe('2 hours left');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd e:/Frendli/frendli-app && npx jest lib/__tests__/useCountdown.test.ts --no-coverage
```
Expected: `Cannot find module '../useCountdown'`

- [ ] **Step 3: Implement the hook**

```typescript
// frendli-app/lib/useCountdown.ts
import { useState, useEffect } from 'react';

interface CountdownResult {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
}

function compute(valid_until: string | null): CountdownResult {
  if (!valid_until) return { label: '', isUrgent: false, isExpired: false };

  const now = new Date();
  const end = new Date(valid_until);
  if (isNaN(end.getTime())) return { label: '', isUrgent: false, isExpired: false };

  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { label: 'Expired', isUrgent: false, isExpired: true };

  const diffHours = diffMs / (1000 * 60 * 60);
  const isUrgent = diffHours <= 24;

  // "Expires today" overrides hour/min labels when same calendar day
  const sameDay =
    end.getFullYear() === now.getFullYear() &&
    end.getMonth() === now.getMonth() &&
    end.getDate() === now.getDate();

  if (sameDay) return { label: 'Expires today', isUrgent: true, isExpired: false };

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return { label: `${mins} min left`, isUrgent: true, isExpired: false };
  }

  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return { label: `${hours} hour${hours !== 1 ? 's' : ''} left`, isUrgent: true, isExpired: false };
  }

  if (diffHours < 48) {
    return { label: '1 day left', isUrgent: false, isExpired: false };
  }

  const days = Math.floor(diffHours / 24);
  return { label: `${days} days left`, isUrgent: false, isExpired: false };
}

export function useCountdown(valid_until: string | null): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() => compute(valid_until));

  useEffect(() => {
    setResult(compute(valid_until));
    const id = setInterval(() => setResult(compute(valid_until)), 60_000);
    return () => clearInterval(id);
  }, [valid_until]);

  return result;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd e:/Frendli/frendli-app && npx jest lib/__tests__/useCountdown.test.ts --no-coverage
```
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add frendli-app/lib/useCountdown.ts frendli-app/lib/__tests__/useCountdown.test.ts
git commit -m "feat(app): add useCountdown hook with adaptive formatting and urgency flag"
```

---

## Task 3: Venue Portal `useCountdown` Hook

**Files:**
- Create: `venue-portal/src/hooks/useCountdown.ts`
- Create: `venue-portal/src/hooks/__tests__/useCountdown.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// venue-portal/src/hooks/__tests__/useCountdown.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns empty label for null input', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.label).toBe('');
    expect(result.current.isUrgent).toBe(false);
    expect(result.current.isExpired).toBe(false);
  });

  it('returns "Expired" for past date', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const { result } = renderHook(() => useCountdown(past));
    expect(result.current.label).toBe('Expired');
    expect(result.current.isExpired).toBe(true);
  });

  it('returns hours label and isUrgent when < 24h remaining', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString();
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('3 hours left');
    expect(result.current.isUrgent).toBe(true);
  });

  it('returns days label when > 48h remaining', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(); // 4 days
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.label).toBe('4 days left');
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns "1 day left" when 24–48h remaining', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString();
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.label).toBe('1 day left');
    expect(result.current.isUrgent).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd e:/Frendli/venue-portal && npm test -- hooks/__tests__/useCountdown.test.ts
```
Expected: `Cannot find module '../useCountdown'`

- [ ] **Step 3: Implement the hook**

```typescript
// venue-portal/src/hooks/useCountdown.ts
import { useState, useEffect } from 'react'

interface CountdownResult {
  label: string
  isUrgent: boolean
  isExpired: boolean
}

function compute(valid_until: string | null): CountdownResult {
  if (!valid_until) return { label: '', isUrgent: false, isExpired: false }

  const now = new Date()
  const end = new Date(valid_until)
  if (isNaN(end.getTime())) return { label: '', isUrgent: false, isExpired: false }

  const diffMs = end.getTime() - now.getTime()
  if (diffMs <= 0) return { label: 'Expired', isUrgent: false, isExpired: true }

  const diffHours = diffMs / (1000 * 60 * 60)
  const isUrgent = diffHours <= 24

  const sameDay =
    end.getFullYear() === now.getFullYear() &&
    end.getMonth() === now.getMonth() &&
    end.getDate() === now.getDate()

  if (sameDay) return { label: 'Expires today', isUrgent: true, isExpired: false }

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60))
    return { label: `${mins} min left`, isUrgent: true, isExpired: false }
  }

  if (diffHours < 24) {
    const hours = Math.floor(diffHours)
    return { label: `${hours} hour${hours !== 1 ? 's' : ''} left`, isUrgent: true, isExpired: false }
  }

  if (diffHours < 48) return { label: '1 day left', isUrgent: false, isExpired: false }

  const days = Math.floor(diffHours / 24)
  return { label: `${days} days left`, isUrgent: false, isExpired: false }
}

export function useCountdown(valid_until: string | null): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() => compute(valid_until))

  useEffect(() => {
    setResult(compute(valid_until))
    const id = setInterval(() => setResult(compute(valid_until)), 60_000)
    return () => clearInterval(id)
  }, [valid_until])

  return result
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd e:/Frendli/venue-portal && npm test -- hooks/__tests__/useCountdown.test.ts
```
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/hooks/useCountdown.ts venue-portal/src/hooks/__tests__/useCountdown.test.ts
git commit -m "feat(venue-portal): add useCountdown hook"
```

---

## Task 4: Add Countdown to `VenuePromotionCard`

**Files:**
- Modify: `frendli-app/components/VenuePromotionCard.tsx`

`PartnerVenue` is exported from this file and used by `VenueDetailSheet`. Adding `valid_until` here makes it available everywhere.

- [ ] **Step 1: Add `valid_until` to `PartnerVenue` and render countdown**

In `frendli-app/components/VenuePromotionCard.tsx`, make these changes:

1. Add import at the top:
```typescript
import { useCountdown } from '../lib/useCountdown';
```

2. Add `valid_until` to the `PartnerVenue` interface (this interface is exported):
```typescript
export interface PartnerVenue {
    id: string;
    name: string;
    category: string | null;
    partnerTier: 'perks' | 'premier';
    dealText: string;
    valid_until?: string | null;   // <-- add this line
    distance: string | null;
    photos: string[];
    address: string;
    openingHours: Record<string, { open: string; close: string } | null> | null;
}
```

3. Inside `VenuePromotionCard`, call the hook and render the label. Find the JSX block that renders `venue.dealText` and add the countdown below it. The exact location will vary — add it wherever deal text is shown:

```typescript
export function VenuePromotionCard({ venue, displayContext, onPress }: VenuePromotionCardProps) {
    const { label: countdownLabel, isUrgent } = useCountdown(venue.valid_until ?? null);
    // ... rest of component

    // In the JSX, after the dealText element, add:
    // {countdownLabel ? (
    //   <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
    //     {countdownLabel}
    //   </Text>
    // ) : null}
```

4. Add styles at the bottom of `StyleSheet.create({...})`:
```typescript
    countdown: {
        fontSize: 11,
        fontFamily: typography.bodyRegular.fontFamily,
        color: colors.textTertiary,
        marginTop: 2,
    },
    countdownUrgent: {
        color: colors.primary,  // #FF7F61 coral
    },
```

- [ ] **Step 2: Commit**

```bash
git add frendli-app/components/VenuePromotionCard.tsx
git commit -m "feat(app): add countdown to VenuePromotionCard"
```

---

## Task 5: Add Countdown to `PerkCard`

**Files:**
- Modify: `frendli-app/components/PerkCard.tsx`

- [ ] **Step 1: Add `valid_until` prop and render countdown**

1. Add import at the top of `frendli-app/components/PerkCard.tsx`:
```typescript
import { useCountdown } from '../lib/useCountdown';
```

2. Add `valid_until` to `PerkCardProps`:
```typescript
interface PerkCardProps {
    id: string;
    title: string;
    description: string;
    discountText: string;
    valid_until?: string | null;   // <-- add
    earned?: boolean;
    venue: {
        name: string;
        category: string;
        photos: string[];
    };
    onPress?: () => void;
}
```

3. Destructure it and call the hook at the top of the component body:
```typescript
export function PerkCard({
    title,
    description,
    discountText,
    valid_until,
    earned = false,
    venue,
    onPress
}: PerkCardProps) {
    const { label: countdownLabel, isUrgent } = useCountdown(valid_until ?? null);
```

4. In the footer JSX (below the `description` Text element), add:
```typescript
{countdownLabel ? (
    <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
        {countdownLabel}
    </Text>
) : null}
```

5. Add styles:
```typescript
    countdown: {
        fontSize: 11,
        fontFamily: typography.bodyRegular.fontFamily,
        color: colors.textTertiary,
        marginTop: 4,
    },
    countdownUrgent: {
        color: colors.primary,
    },
```

- [ ] **Step 2: Commit**

```bash
git add frendli-app/components/PerkCard.tsx
git commit -m "feat(app): add countdown to PerkCard"
```

---

## Task 6: Add Countdown + Interaction Tracking to `VenueDetailSheet`

**Files:**
- Modify: `frendli-app/lib/api.ts` (add `venueApi.interact` so VenueDetailSheet can call it)
- Modify: `frendli-app/components/VenueDetailSheet.tsx`

- [ ] **Step 1: Add `venueApi.interact` to `frendli-app/lib/api.ts`**

Find the `venueApi` object and add one line:
```typescript
export const venueApi = {
    // ... existing methods ...
    getDetails: (id: string) => apiRequest(`/api/venues/${id}`),
    interact: (venueId: string) => apiRequest(`/api/venues/${venueId}/interact`, { method: 'POST' }),
    // ...
};
```

- [ ] **Step 2: Add countdown label and interaction upsert to VenueDetailSheet**

1. Add imports at the top of `frendli-app/components/VenueDetailSheet.tsx`:
```typescript
import { useEffect } from 'react';
import { useCountdown } from '../lib/useCountdown';
import { venueApi } from '../lib/api';
```

2. Inside `VenueDetailSheet`, call the hook and fire the interaction upsert on mount:
```typescript
export function VenueDetailSheet({ venue, onClose, onPlanHangout }: VenueDetailSheetProps) {
    const { label: countdownLabel, isUrgent } = useCountdown(venue.valid_until ?? null);

    useEffect(() => {
        venueApi.interact(venue.id).catch(() => {/* non-critical, silent */});
    }, [venue.id]);

    // ... rest of component
```

3. In the JSX section that shows `venue.dealText`, add the countdown label directly below it:
```typescript
<Text style={styles.dealText}>{venue.dealText}</Text>
{countdownLabel ? (
    <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
        {countdownLabel}
    </Text>
) : null}
```

4. Add styles:
```typescript
    countdown: {
        fontSize: 12,
        color: '#8E8271',
        marginTop: 2,
    },
    countdownUrgent: {
        color: '#FF7F61',
    },
```

- [ ] **Step 3: Commit**

```bash
git add frendli-app/lib/api.ts frendli-app/components/VenueDetailSheet.tsx
git commit -m "feat(app): add countdown + interaction tracking to VenueDetailSheet"
```

---

## Task 7: Venue Interact API Route

**Files:**
- Modify: `frendli-api/src/routes/venues.ts`
- Create: `frendli-api/src/routes/__tests__/venue-interact.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frendli-api/src/routes/__tests__/venue-interact.test.ts
import request from 'supertest';
import express from 'express';
import venuesRouter from '../venues';

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).user = { id: 'user-1' }; next(); });
app.use('/api/venues', venuesRouter);

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockFrom = jest.fn().mockReturnValue({
  upsert: mockUpsert,
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

describe('POST /api/venues/:venueId/interact', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 on success', async () => {
    const res = await request(app).post('/api/venues/venue-123/interact');
    expect(res.status).toBe(204);
  });

  it('upserts into user_venue_interactions', async () => {
    await request(app).post('/api/venues/venue-123/interact');
    expect(mockFrom).toHaveBeenCalledWith('user_venue_interactions');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', venue_id: 'venue-123' }),
      expect.objectContaining({ onConflict: 'user_id,venue_id' })
    );
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd e:/Frendli/frendli-api && npx jest routes/__tests__/venue-interact.test.ts --no-coverage
```
Expected: route not found / 404

- [ ] **Step 4: Add the route to `venues.ts`**

In `frendli-api/src/routes/venues.ts`, add at the top (after existing imports):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Then add the route before `export default router`:
```typescript
/**
 * POST /api/venues/:venueId/interact
 * Records that the authenticated user viewed a venue.
 * Used for "interacted_only" notification targeting scope.
 */
router.post('/:venueId/interact', async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { venueId } = req.params;

  const { error } = await supabaseAdmin
    .from('user_venue_interactions')
    .upsert(
      { user_id: userId, venue_id: venueId, interacted_at: new Date().toISOString() },
      { onConflict: 'user_id,venue_id' }
    );

  if (error) {
    console.error('venue interact error:', error);
    return res.status(500).json({ error: 'Failed to record interaction' });
  }
  return res.status(204).send();
});
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd e:/Frendli/frendli-api && npx jest routes/__tests__/venue-interact.test.ts --no-coverage
```
Expected: `2 passed`

- [ ] **Step 6: Commit**

```bash
git add frendli-api/src/routes/venues.ts frendli-api/src/routes/__tests__/venue-interact.test.ts
git commit -m "feat(api): add POST /api/venues/:venueId/interact for notification targeting"
```

---

## Task 8: Notification Settings Screen

**Files:**
- Create: `frendli-app/app/notification-settings.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// frendli-app/app/notification-settings.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../constants/tokens';

const HOUR_OPTIONS = [
  { label: '24 hours before', value: 24 },
  { label: '48 hours before', value: 48 },
  { label: '1 week before', value: 168 },
];

const SCOPE_OPTIONS = [
  { label: 'All nearby venues', value: 'all_nearby' },
  { label: 'Only venues I\'ve visited', value: 'interacted_only' },
];

type NotifPrefs = {
  notify_expiring_perks: boolean;
  notify_expiring_perks_hours: number;
  notify_expiring_perks_scope: 'all_nearby' | 'interacted_only';
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notify_expiring_perks: true,
    notify_expiring_perks_hours: 48,
    notify_expiring_perks_scope: 'all_nearby',
  });

  useEffect(() => { loadPrefs(); }, []);

  async function loadPrefs() {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase!
      .from('profiles')
      .select('notify_expiring_perks, notify_expiring_perks_hours, notify_expiring_perks_scope')
      .eq('user_id', user.id)
      .single();
    if (data) setPrefs(data as NotifPrefs);
    setLoading(false);
  }

  async function save(updates: Partial<NotifPrefs>) {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    setSaving(true);
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase!
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) Alert.alert('Error', 'Failed to save. Please try again.');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <View style={{ width: 24 }} />}
      </View>

      {/* Expiring Perks section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Expiring Perks</Text>
        <Text style={styles.sectionDesc}>
          Get notified before a venue perk near you expires.
        </Text>

        {/* Main toggle */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Enable notifications</Text>
          <Switch
            value={prefs.notify_expiring_perks}
            onValueChange={(v) => save({ notify_expiring_perks: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {prefs.notify_expiring_perks && (
          <>
            {/* Timing */}
            <Text style={styles.subLabel}>How far in advance?</Text>
            {HOUR_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionRow}
                onPress={() => save({ notify_expiring_perks_hours: opt.value })}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {prefs.notify_expiring_perks_hours === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {/* Scope */}
            <Text style={[styles.subLabel, { marginTop: spacing.md }]}>For which venues?</Text>
            {SCOPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionRow}
                onPress={() => save({ notify_expiring_perks_scope: opt.value as NotifPrefs['notify_expiring_perks_scope'] })}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {prefs.notify_expiring_perks_scope === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: colors.textPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontFamily: typography.h3.fontFamily, color: colors.textPrimary, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 15, color: colors.textPrimary },
  subLabel: { fontSize: 13, color: colors.textTertiary, marginTop: spacing.sm, marginBottom: 4 },
  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  optionLabel: { fontSize: 14, color: colors.textPrimary },
});
```

- [ ] **Step 2: Commit**

```bash
git add frendli-app/app/notification-settings.tsx
git commit -m "feat(app): add Notification Settings screen with expiring perks prefs"
```

---

## Task 9: Add Notifications Nav Row to Profile Tab

**Files:**
- Modify: `frendli-app/app/(tabs)/profile.tsx`

- [ ] **Step 1: Add Notifications row**

Open `frendli-app/app/(tabs)/profile.tsx`. Find the SAFETY section (search for `SAFETY`). Add a new SETTINGS section immediately before it. Copy the exact nav row pattern used by Safety Settings:

```typescript
{/* Settings Section */}
<Animated.View entering={FadeInUp.delay(1250)} style={styles.section}>
    <Text style={styles.sectionSubtitle}>SETTINGS</Text>
    <TouchableOpacity
        style={styles.listCardItem}
        onPress={() => router.push('/notification-settings' as any)}
    >
        <View style={[styles.listIconBox, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="notifications-outline" size={20} color="#2196F3" />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Notifications</Text>
            <Text style={styles.listSub}>Manage perk alerts and reminders</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
</Animated.View>
```

Place this block directly before the existing `{/* Safety Section */}` block.

- [ ] **Step 2: Commit**

```bash
git add "frendli-app/app/(tabs)/profile.tsx"
git commit -m "feat(app): add Notifications nav row to profile tab"
```

---

## Task 10: Add Countdown to Venue Portal `PromotionCard`

**Files:**
- Modify: `venue-portal/src/pages/Promotions.tsx`

- [ ] **Step 1: Write the failing test**

In `venue-portal/src/pages/__tests__/Promotions.test.tsx`, add one test to the existing suite:

```typescript
it('shows countdown label on active promotion', async () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(); // 3 days
  mockGetPromotions.mockResolvedValue([
    { id: '1', title: 'Happy Hour', discount: '20% off', status: 'active',
      valid_from: new Date().toISOString(), valid_until: future,
      venue_id: 'v1', description: null, created_at: new Date().toISOString() }
  ]);
  render(<Promotions />);
  await waitFor(() => expect(screen.getByText('3 days left')).toBeInTheDocument());
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd e:/Frendli/venue-portal && npm test -- pages/__tests__/Promotions.test.tsx
```
Expected: `Unable to find an element with the text: 3 days left`

- [ ] **Step 3: Add countdown to `PromotionCard` inside `Promotions.tsx`**

1. Add import at the top of `venue-portal/src/pages/Promotions.tsx`:
```typescript
import { useCountdown } from '../hooks/useCountdown'
```

2. Inside the `PromotionCard` function component, add at the top of the function body:
```typescript
const { label: countdownLabel, isUrgent } = useCountdown(p.status === 'active' ? p.valid_until : null)
```

3. In the card JSX, find the date range line (where `valid_from`/`valid_until` are shown) and add the countdown label below it:
```tsx
{countdownLabel && (
  <p className={`text-xs mt-1 font-medium ${isUrgent ? 'text-[#FF7F61]' : 'text-[#8E8271] dark:text-[#9E8FC0]'}`}>
    {countdownLabel}
  </p>
)}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd e:/Frendli/venue-portal && npm test -- pages/__tests__/Promotions.test.tsx
```
Expected: all tests pass including the new one.

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/pages/Promotions.tsx venue-portal/src/pages/__tests__/Promotions.test.tsx
git commit -m "feat(venue-portal): add countdown to PromotionCard for active promotions"
```

---

## Task 11: `notify-expiring-perks` Edge Function

**Files:**
- Create: `supabase/functions/notify-expiring-perks/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/notify-expiring-perks/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/** Haversine distance in metres between two lat/lng points */
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const DISCOVERY_RADIUS_M = 50_000 // 50 km — matches app discovery radius

Deno.serve(async () => {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 168 * 60 * 60 * 1000) // max 1 week ahead

  // 1. Fetch active promotions expiring within the max window
  const { data: promotions, error: promoErr } = await supabase
    .from('venue_promotions')
    .select('id, title, discount, valid_until, venue_id, venues(name, latitude, longitude)')
    .eq('status', 'active')
    .gt('valid_until', now.toISOString())
    .lt('valid_until', windowEnd.toISOString())

  if (promoErr) {
    console.error('fetch promotions error:', promoErr)
    return new Response('error fetching promotions', { status: 500 })
  }

  if (!promotions || promotions.length === 0) {
    return new Response('no expiring promotions', { status: 200 })
  }

  // 2. Fetch opted-in users with push tokens
  const { data: users, error: userErr } = await supabase
    .from('profiles')
    .select('user_id, push_token, latitude, longitude, notify_expiring_perks_hours, notify_expiring_perks_scope')
    .eq('notify_expiring_perks', true)
    .not('push_token', 'is', null)

  if (userErr) {
    console.error('fetch users error:', userErr)
    return new Response('error fetching users', { status: 500 })
  }

  if (!users || users.length === 0) {
    return new Response('no opted-in users', { status: 200 })
  }

  // 3. For each promotion, find eligible users and send
  const pushMessages: { to: string; title: string; body: string }[] = []
  const sentRecords: { user_id: string; promotion_id: string }[] = []

  for (const promo of promotions) {
    const venue = (promo as any).venues
    if (!venue) continue

    const expiresAt = new Date(promo.valid_until)
    const hoursLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    for (const user of users) {
      const threshold = user.notify_expiring_perks_hours as number // 24, 48, or 168
      // User's window: notify when promotion is within [threshold - 1h, threshold + 1h]
      if (hoursLeft < threshold - 1 || hoursLeft > threshold + 1) continue

      // Scope filter
      if (user.notify_expiring_perks_scope === 'all_nearby') {
        if (!user.latitude || !user.longitude) continue
        const dist = distanceMetres(user.latitude, user.longitude, venue.latitude, venue.longitude)
        if (dist > DISCOVERY_RADIUS_M) continue
      } else {
        // interacted_only
        const { data: interaction } = await supabase
          .from('user_venue_interactions')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('venue_id', promo.venue_id)
          .maybeSingle()
        if (!interaction) continue
      }

      // Deduplication check
      const { data: alreadySent } = await supabase
        .from('perk_notifications_sent')
        .select('user_id')
        .eq('user_id', user.user_id)
        .eq('promotion_id', promo.id)
        .maybeSingle()
      if (alreadySent) continue

      pushMessages.push({
        to: user.push_token,
        title: `${venue.name} perk expiring soon!`,
        body: `${promo.title} — ${promo.discount}. Don't miss out.`,
      })
      sentRecords.push({ user_id: user.user_id, promotion_id: promo.id })
    }
  }

  // 4. Send push notifications in batches of 100
  const BATCH_SIZE = 100
  for (let i = 0; i < pushMessages.length; i += BATCH_SIZE) {
    const batch = pushMessages.slice(i, i + BATCH_SIZE)
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
    } catch (err) {
      console.error('push send error:', err)
    }
  }

  // 5. Record sent notifications
  if (sentRecords.length > 0) {
    await supabase.from('perk_notifications_sent').insert(sentRecords)
  }

  return new Response(
    JSON.stringify({ sent: pushMessages.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

- [ ] **Step 2: Deploy the edge function**

Run from `e:/Frendli`:
```bash
npx supabase functions deploy notify-expiring-perks
```
Expected: `Deployed successfully`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/notify-expiring-perks/index.ts
git commit -m "feat(supabase): add notify-expiring-perks edge function"
```

---

## Task 12: Register pg_cron Job

- [ ] **Step 1: Register the job in Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor and run:

```sql
select cron.schedule(
  'notify-expiring-perks-daily',
  '0 9 * * *',
  $$
    select net.http_post(
      url := 'https://vodhhpgtxftxqdokghhc.supabase.co/functions/v1/notify-expiring-perks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);
```

Expected output: a row with an integer schedule ID (e.g. `3`).

Alternatively, if `current_setting` is not configured, hardcode the service role key (from Supabase Dashboard → Settings → API → service_role key):
```sql
'Authorization', 'Bearer <your-service-role-key>'
```

- [ ] **Step 2: Verify the job was registered**

```sql
select jobid, jobname, schedule from cron.job where jobname = 'notify-expiring-perks-daily';
```
Expected: one row with `schedule = '0 9 * * *'`

- [ ] **Step 3: Commit notes to CLAUDE.md or session log**

Add to `CLAUDE.md` under **Setup & Config**:
```
- pg_cron job: `notify-expiring-perks-daily` — `0 9 * * *` → `notify-expiring-perks`
```

```bash
git add CLAUDE.md
git commit -m "docs: record notify-expiring-perks pg_cron job registration"
```

---

## Verification Checklist

After all tasks are complete, run a full check:

```bash
# App tests
cd e:/Frendli/frendli-app && npx jest --no-coverage

# API tests
cd e:/Frendli/frendli-api && npx jest --no-coverage

# Venue portal tests
cd e:/Frendli/venue-portal && npm test -- --run

# TypeScript check
cd e:/Frendli && bash .claude/cli/tools/typecheck.sh both
```

All should pass with zero TypeScript errors.
