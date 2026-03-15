# Hangouts Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Hangouts page redesign — partner venue "For You" strip, fixed My Plans data loading with Upcoming/Past toggle, expanded category filter, and Perks screen locked/preview state.

**Architecture:** Backend-first approach: extend existing API routes and add `GET /api/venues/featured`, then update the frontend API layer, build three new UI components, overhaul `hangouts.tsx`, and finally update the Perks screen. Each chunk is independently deployable and verifiable via TypeScript build.

**Tech Stack:** React Native (Expo), TypeScript, Node.js/Express, Prisma ORM (PostgreSQL), `expo-location`

**Spec:** `docs/superpowers/specs/2026-03-16-hangouts-page-design.md`

---

## Schema notes (read before starting)

The Prisma schema at `frendli-api/prisma/schema.prisma` already has most required fields. **No migration is needed.** Key field names differ from spec shorthand — use these exact names:

| Spec name | Actual DB field | Model |
|---|---|---|
| `partnerTier` | `partnershipTier` | `Venue` |
| `dealText` | `perk.discountText` (from related `Perk`) | `Perk` |
| `listingStatus` | `isActive` | `Venue` |
| `openingHours` | `openingHours` (Json?) | `Venue` (already exists) |
| `photos` | `photos` (String[]) | `Venue` (already exists) |

`partnershipTier` values: `"listed"` | `"perks"` | `"premier"` (default: `"listed"`)

A venue's deal text is its first active `Perk.discountText`. If a venue has no `Perk` records, it has no deal text and should not appear in the featured endpoint.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frendli-api/src/routes/venues.ts` | Modify | Add `GET /api/venues/featured` |
| `frendli-api/src/routes/hangouts.ts` | Modify | Extend `/my` response + `suggested=true` discovery |
| `frendli-api/src/routes/perks.ts` | Modify | Add `earned` field to `GET /api/perks` |
| `frendli-app/lib/api.ts` | Modify | Add `venueApi.getFeatured()`, extend `hangoutApi.getDiscovery()` |
| `frendli-app/components/VenuePromotionCard.tsx` | Create | Compact + full-width partner venue card |
| `frendli-app/components/VenueDetailSheet.tsx` | Create | Bottom sheet for venue detail + plan CTA |
| `frendli-app/components/HangoutsSubToggle.tsx` | Create | Upcoming / Past pill toggle |
| `frendli-app/app/(tabs)/hangouts.tsx` | Modify | Full overhaul — venue strip, My Plans data, category filter, geolocation |
| `frendli-app/components/PerkCard.tsx` | Modify | Add `earned` prop + locked state UI |
| `frendli-app/app/(tabs)/perks.tsx` | Modify | Pass `earned` to `PerkCard` |

---

## Chunk 1: Backend API

### Task 1: `GET /api/venues/featured`

**File:** `frendli-api/src/routes/venues.ts`

Add the `/featured` route between the existing `/search` route and the `/:id` catch-all. In `venues.ts`, `/search` ends at approximately line 76 and `/:id` begins at approximately line 81. The `/featured` route must go between them so Express matches `/featured` before the `/:id` wildcard.

> **Haversine note:** `hangouts.ts` already defines a `haversineKm` helper. `venues.ts` is a separate module scope, so the plan adds `venueHaversineKm` locally rather than cross-importing from a route file. This is intentional duplication — do not refactor to a shared util unless the project adds more callers in a future task.

> **Error handling note:** The `/featured` error handler uses `res.json([])` (HTTP 200) rather than the `res.status(500).json({ error: ... })` pattern used elsewhere. This is a deliberate design decision — the venue strip is a non-critical enhancement and an empty array is a safe graceful fallback for the client.

- [ ] **Step 1: Add the `/featured` route**

Insert between the closing `});` of `/search` (after line 76) and the `/**` JSDoc comment for `/:id` (before line 81). Add this new route block:

```typescript
// Haversine helper (local to venues.ts — used for distance display and sorting)
function venueHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/venues/featured
 * Returns Perks and Premier partner venues near the user.
 * Query params: lat (float), lng (float), category (slug, optional)
 * Response: PartnerVenue[]
 */
router.get('/featured', async (req: Request, res: Response) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
        const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
        const category = req.query.category as string | undefined;

        const venues = await prisma.venue.findMany({
            where: {
                partnershipTier: { in: ['perks', 'premier'] },
                isActive: true,
                ...(category ? { category } : {}),
                perks: { some: {} }, // Only venues with at least one Perk
            },
            include: {
                perks: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
            take: 20, // Over-fetch so sort can trim to 10
        });

        // Sort: premier first, then perks; within each tier by haversine proximity
        const sorted = venues.sort((a, b) => {
            // Tier sort: premier first
            if (a.partnershipTier === 'premier' && b.partnershipTier !== 'premier') return -1;
            if (a.partnershipTier !== 'premier' && b.partnershipTier === 'premier') return 1;
            // Proximity sort within tier using haversine (not Euclidean)
            if (lat !== null && lng !== null && a.latitude && a.longitude && b.latitude && b.longitude) {
                const distA = venueHaversineKm(lat, lng, a.latitude, a.longitude);
                const distB = venueHaversineKm(lat, lng, b.latitude, b.longitude);
                return distA - distB;
            }
            return 0;
        }).slice(0, 10);

        const result = sorted.map(v => {
            let distance: string | null = null;
            if (lat !== null && lng !== null && v.latitude && v.longitude) {
                const km = venueHaversineKm(lat, lng, v.latitude, v.longitude);
                distance = `${km.toFixed(1)}km away`;
            }

            return {
                id: v.id,
                name: v.name,
                category: v.category,
                partnerTier: v.partnershipTier as 'perks' | 'premier',
                dealText: v.perks[0]?.discountText ?? '',
                distance,
                photos: v.photos,
                address: v.address,
                openingHours: v.openingHours ?? null,
            };
        });

        res.json(result);
    } catch (error) {
        console.error('GET /api/venues/featured error:', error);
        res.json([]); // Always return empty array on error — non-critical surface
    }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-api/src/routes/venues.ts
git commit -m "feat(api): add GET /api/venues/featured endpoint"
```

---

### Task 2: Extend `GET /api/hangouts/my`

**File:** `frendli-api/src/routes/hangouts.ts`

Add `activePerksCode` and `feedbackSubmitted` to each hangout in the `/my` response.

> **Auth note:** The existing `/my` handler uses an inline `req.user?.id` null-check rather than the `requireAuth` middleware used by other routes (`/pending-feedback`, `/recurring/my`). This is an existing pattern in the file — do not add `requireAuth` here to avoid changing the middleware chain. The inline check `if (!userId) return res.status(401)` provides equivalent protection for this route.

> **Skipped feedback note:** `feedbackSubmitted: h.feedback.length > 0` returns `true` if the user tapped "Skip" (which creates a `HangoutFeedback` record with `rating: 0`). This is the intended behaviour — skipped hangouts suppress the "How'd it go?" prompt.

> **Schema check:** Verify that the relation field on the `Hangout` model is named `feedback` (not `hangoutFeedbacks` or similar) before running. Open `frendli-api/prisma/schema.prisma`, find the `Hangout` model, and confirm the `HangoutFeedback` relation field name. If it differs, update the `include: { feedback: ... }` and `h.feedback.length` references accordingly. The `tsc --noEmit` step in Step 2 will surface any mismatch.

- [ ] **Step 1: Update the `/my` route handler**

Find the existing `GET /my` handler (lines 180–199). Replace the entire handler:

```typescript
router.get('/my', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const myHangouts = await prisma.hangout.findMany({
            where: { attendees: { some: { userId } } },
            include: {
                venue: {
                    include: {
                        perks: { take: 1, orderBy: { createdAt: 'desc' } }
                    }
                },
                attendees: { include: { user: { include: { profile: true } } } },
                feedback: { where: { userId } },
            },
            orderBy: { startTime: 'asc' }
        });

        // For each hangout, look up active coupon for this user at this venue
        const couponMap: Record<string, string | null> = {};
        const perkIds = myHangouts
            .map(h => h.venue?.perks?.[0]?.id)
            .filter(Boolean) as string[];

        if (perkIds.length > 0) {
            const coupons = await prisma.coupon.findMany({
                where: {
                    userId,
                    perkId: { in: perkIds },
                    status: 'active',
                    expiresAt: { gt: new Date() },
                },
                select: { perkId: true, code: true }
            });
            coupons.forEach(c => { couponMap[c.perkId] = c.code; });
        }

        const result = myHangouts.map(h => {
            const perkId = h.venue?.perks?.[0]?.id ?? null;
            const activePerksCode = perkId ? (couponMap[perkId] ?? null) : null;
            const feedbackSubmitted = h.feedback.length > 0;

            return {
                ...h,
                activePerksCode,
                feedbackSubmitted,
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching my hangouts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-api/src/routes/hangouts.ts
git commit -m "feat(api): add activePerksCode and feedbackSubmitted to /hangouts/my"
```

---

### Task 3: Extend `GET /api/hangouts/discovery` with `suggested=true`

**File:** `frendli-api/src/routes/hangouts.ts`

- [ ] **Step 1: Add `thisWeek` filter and `suggested` merged feed to the discovery route**

Find the existing `GET /discovery` handler (lines 46–113). Replace it:

```typescript
router.get('/discovery', async (req: Request, res: Response) => {
    try {
        const { lat, lng, category, suggested, thisWeek } = req.query;
        const userLat = lat ? parseFloat(lat as string) : null;
        const userLng = lng ? parseFloat(lng as string) : null;
        const isSuggested = suggested === 'true';
        const isThisWeek = thisWeek === 'true';

        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const hangoutWhere: any = {
            status: 'upcoming',
            startTime: {
                gt: now,
                ...(isThisWeek ? { lt: weekFromNow } : {}),
            },
            isPublic: true,
            ...(category ? { category: category as string } : {}),
        };

        const hangouts = await prisma.hangout.findMany({
            where: hangoutWhere,
            include: {
                venue: true,
                creator: { include: { profile: true } },
                attendees: {
                    include: {
                        user: {
                            include: {
                                profile: { select: { photos: true, firstName: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { startTime: 'asc' },
            take: 30,
        });

        const hangoutResults = hangouts.map(h => {
            let distance: string | null = null;
            if (userLat !== null && userLng !== null && h.venue?.latitude && h.venue?.longitude) {
                const km = haversineKm(userLat, userLng, h.venue.latitude, h.venue.longitude);
                distance = `${km.toFixed(1)}km away`;
            }
            return {
                ...h,
                host: {
                    name: h.creator.profile?.firstName || 'User',
                    imageUrl: h.creator.profile?.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                },
                distance,
                spotsLeft: (h.maxAttendees || 6) - h.attendees.length,
                imageUrl: h.imageUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'
            };
        });

        // Non-suggested path: return hangouts only (existing behaviour)
        if (!isSuggested) {
            return res.json(hangoutResults);
        }

        // Suggested path: merge hangouts + partner venues into ranked feed
        // NOTE: Interest-match ranking (user preference scoring) is deferred to a future phase.
        // Current ordering: premier tier first, then perks tier; within each tier by proximity.
        const venues = await prisma.venue.findMany({
            where: {
                partnershipTier: { in: ['perks', 'premier'] },
                isActive: true,
                perks: { some: {} },
                ...(category ? { category: category as string } : {}),
            },
            include: {
                perks: { take: 1, orderBy: { createdAt: 'desc' } },
            },
            take: 10,
        });

        const venueItems = venues.map(v => {
            let distance: string | null = null;
            if (userLat !== null && userLng !== null && v.latitude && v.longitude) {
                const km = haversineKm(userLat, userLng, v.latitude, v.longitude);
                distance = `${km.toFixed(1)}km away`;
            }
            return {
                type: 'venue' as const,
                data: {
                    id: v.id,
                    name: v.name,
                    category: v.category,
                    partnerTier: v.partnershipTier as 'perks' | 'premier',
                    dealText: v.perks[0]?.discountText ?? '',
                    distance,
                    photos: v.photos,
                    address: v.address,
                    openingHours: v.openingHours ?? null,
                }
            };
        });

        const hangoutItems = hangoutResults.map(h => ({ type: 'hangout' as const, data: h }));

        // Simple interleave: 1 venue card per 3 hangout cards
        // Premier venues first, then Perks venues
        const premierVenues = venueItems.filter(v => v.data.partnerTier === 'premier');
        const perksVenues = venueItems.filter(v => v.data.partnerTier === 'perks');
        const orderedVenues = [...premierVenues, ...perksVenues];

        const merged: (typeof hangoutItems[0] | typeof venueItems[0])[] = [];
        let venueIdx = 0;
        hangoutItems.forEach((item, i) => {
            if (i > 0 && i % 3 === 0 && venueIdx < orderedVenues.length) {
                merged.push(orderedVenues[venueIdx++]);
            }
            merged.push(item);
        });
        // Append any remaining venue items
        while (venueIdx < orderedVenues.length) {
            merged.push(orderedVenues[venueIdx++]);
        }

        res.json(merged);
    } catch (error) {
        console.error('Error fetching hangouts discovery:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-api/src/routes/hangouts.ts
git commit -m "feat(api): add suggested and thisWeek params to /hangouts/discovery"
```

---

### Task 4: Add `earned` to `GET /api/perks`

**File:** `frendli-api/src/routes/perks.ts`

- [ ] **Step 1: Make `GET /api/perks` auth-aware and add `earned` field**

> **Type note:** `req.user` is typed as `any` via the ambient Express declaration in `frendli-api/src/middleware/auth.ts` (lines 11–17). Because it is `any`, TypeScript will not complain about `req.user?.id` — no additional type file is needed. The `?? null` fallback ensures the route handles unauthenticated requests safely.

Replace the existing `GET /` handler (lines 11–23):

```typescript
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id ?? null;

        const perks = await prisma.perk.findMany({
            include: { venue: true },
        });

        // If authenticated, check which perks the user has earned (active coupon)
        let earnedPerkIds = new Set<string>();
        if (userId) {
            const coupons = await prisma.coupon.findMany({
                where: {
                    userId,
                    status: 'active',
                    expiresAt: { gt: new Date() },
                },
                select: { perkId: true },
            });
            earnedPerkIds = new Set(coupons.map(c => c.perkId));
        }

        const result = perks.map(p => ({
            ...p,
            earned: earnedPerkIds.has(p.id),
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching perks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-api/src/routes/perks.ts
git commit -m "feat(api): add earned boolean to GET /api/perks response"
```

---

## Chunk 2: Frontend API Layer

### Task 5: Update `lib/api.ts`

**File:** `frendli-app/lib/api.ts`

- [ ] **Step 1: Extend `hangoutApi.getDiscovery` and add `venueApi.getFeatured`**

Find the `hangoutApi` object (line 91). Replace `getDiscovery` (lines 96–101) and the entire `venueApi` object (lines 132–138):

Replace lines 96–101 (`getDiscovery` method) in `hangoutApi`:
```typescript
getDiscovery: (params?: { lat?: number; lng?: number; category?: string }) => {
    const query = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : '';
    return apiRequest(`/api/hangouts/discovery${query}`);
},
```

With:
```typescript
getDiscovery: (params?: { lat?: number; lng?: number; category?: string; suggested?: boolean; thisWeek?: boolean }) => {
    const query = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : '';
    return apiRequest(`/api/hangouts/discovery${query}`);
},
```

Replace the `venueApi` object (lines 132–138):
```typescript
export const venueApi = {
    search: (category?: string) => {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        return apiRequest(`/api/venues/search${query}`);
    },
    getDetails: (id: string) => apiRequest(`/api/venues/${id}`),
    getFeatured: (params?: { lat?: number; lng?: number; category?: string }) => {
        const query = params
            ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
            : '';
        return apiRequest(`/api/venues/featured${query}`);
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/lib/api.ts
git commit -m "feat(api-client): extend hangoutApi.getDiscovery, add venueApi.getFeatured"
```

---

## Chunk 3: New UI Components

### Task 6: Create `VenuePromotionCard`

**File:** `frendli-app/components/VenuePromotionCard.tsx` (new file)

This component renders a partner venue card in two modes:
- `strip` — compact ~260×140pt horizontal scroll card with "Featured" badge (Premier only)
- `feed` — full-width card matching `HangoutCard` dimensions with "Suggested for you" label

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ViewStyle,
    TextStyle,
    ImageStyle,
    Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';

const { width } = Dimensions.get('window');

export interface PartnerVenue {
    id: string;
    name: string;
    category: string | null;
    partnerTier: 'perks' | 'premier';
    dealText: string;
    distance: string | null;
    photos: string[];
    address: string;
    openingHours: Record<string, { open: string; close: string } | null> | null;
}

interface VenuePromotionCardProps {
    venue: PartnerVenue;
    displayContext: 'strip' | 'feed';
    onPress: () => void;
}

export function VenuePromotionCard({ venue, displayContext, onPress }: VenuePromotionCardProps) {
    const imageUrl = venue.photos[0] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';
    const isFeed = displayContext === 'feed';

    return (
        <TouchableOpacity
            style={[styles.card, isFeed ? styles.cardFeed : styles.cardStrip]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={[styles.imageContainer, isFeed ? styles.imageFeed : styles.imageStrip]}>
                <Image source={{ uri: imageUrl }} style={styles.image} />

                {/* Premier badge — strip mode only */}
                {!isFeed && venue.partnerTier === 'premier' && (
                    <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>Featured</Text>
                    </View>
                )}

                {/* Suggested label — feed mode only */}
                {isFeed && (
                    <View style={styles.suggestedLabel}>
                        <Text style={styles.suggestedLabelText}>Suggested for you</Text>
                    </View>
                )}
            </View>

            <View style={styles.body}>
                <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>

                <View style={styles.metaRow}>
                    <Feather name="map-pin" size={11} color={colors.textTertiary} />
                    <Text style={styles.metaText} numberOfLines={1}>
                        {venue.category}{venue.distance ? ` · ${venue.distance}` : ''}
                    </Text>
                </View>

                {venue.dealText ? (
                    <View style={styles.dealRow}>
                        <Text style={styles.dealEmoji}>🎁</Text>
                        <Text style={styles.dealText} numberOfLines={1}>{venue.dealText}</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
    } as ViewStyle,
    cardStrip: {
        width: 260,
        marginRight: spacing.md,
    } as ViewStyle,
    cardFeed: {
        width: '100%',
        marginBottom: spacing.lg,
    } as ViewStyle,
    imageContainer: {
        width: '100%',
    } as ViewStyle,
    imageStrip: {
        height: 130,
    } as ViewStyle,
    imageFeed: {
        height: 180,
    } as ViewStyle,
    image: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    featuredBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    } as ViewStyle,
    featuredBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    } as TextStyle,
    suggestedLabel: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    } as ViewStyle,
    suggestedLabelText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    } as TextStyle,
    body: {
        padding: spacing.md,
        gap: 4,
    } as ViewStyle,
    venueName: {
        ...typography.bodyBold,
        color: '#2D2D2D',
        fontSize: 14,
    } as TextStyle,
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    } as ViewStyle,
    metaText: {
        ...typography.small,
        color: colors.textSecondary,
        fontSize: 12,
        textTransform: 'capitalize',
    } as TextStyle,
    dealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    } as ViewStyle,
    dealEmoji: {
        fontSize: 12,
    } as TextStyle,
    dealText: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '600',
        fontSize: 12,
        flex: 1,
    } as TextStyle,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/components/VenuePromotionCard.tsx
git commit -m "feat(components): add VenuePromotionCard (strip + feed variants)"
```

---

### Task 7: Create `VenueDetailSheet`

**File:** `frendli-app/components/VenueDetailSheet.tsx` (new file)

Bottom sheet shown when a user taps a venue card. Shows venue details and a "Plan a Hangout Here →" CTA.

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Modal,
    ViewStyle,
    TextStyle,
    ImageStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { PartnerVenue } from './VenuePromotionCard';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface VenueDetailSheetProps {
    venue: PartnerVenue;
    onClose: () => void;
    onPlanHangout: (venue: PartnerVenue) => void;
}

export function VenueDetailSheet({ venue, onClose, onPlanHangout }: VenueDetailSheetProps) {
    const imageUrl = venue.photos[0] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';

    const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todayHours = venue.openingHours?.[todayKey];

    return (
        <Modal
            animationType="slide"
            transparent
            visible
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Close button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Feather name="x" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Hero image */}
                        <Image source={{ uri: imageUrl }} style={styles.heroImage} />

                        {/* Venue name + badges */}
                        <View style={styles.nameRow}>
                            <Text style={styles.venueName}>{venue.name}</Text>
                            {venue.partnerTier === 'premier' && (
                                <View style={styles.featuredBadge}>
                                    <Text style={styles.featuredBadgeText}>Featured</Text>
                                </View>
                            )}
                        </View>

                        {/* Category + distance */}
                        <View style={styles.metaRow}>
                            <Feather name="map-pin" size={13} color={colors.textTertiary} />
                            <Text style={styles.metaText}>
                                {venue.address}
                                {venue.distance ? ` · ${venue.distance}` : ''}
                            </Text>
                        </View>

                        {/* Deal */}
                        {venue.dealText ? (
                            <View style={styles.dealCard}>
                                <Text style={styles.dealEmoji}>🎁</Text>
                                <View>
                                    <Text style={styles.dealLabel}>RealConnect Deal</Text>
                                    <Text style={styles.dealText}>{venue.dealText}</Text>
                                    <Text style={styles.dealNote}>Unlocks when you confirm a hangout here</Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Opening hours */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Opening Hours</Text>
                            {venue.openingHours ? (
                                DAYS.map(day => {
                                    const hours = venue.openingHours![day];
                                    return (
                                        <View key={day} style={styles.hoursRow}>
                                            <Text style={[
                                                styles.dayLabel,
                                                day === todayKey && styles.todayLabel
                                            ]}>
                                                {day.charAt(0).toUpperCase() + day.slice(1)}
                                                {day === todayKey ? ' (today)' : ''}
                                            </Text>
                                            <Text style={styles.hoursText}>
                                                {hours ? `${hours.open} – ${hours.close}` : 'Closed'}
                                            </Text>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.noHoursText}>Opening hours not available</Text>
                            )}
                        </View>
                    </ScrollView>

                    {/* CTA */}
                    <View style={styles.ctaContainer}>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => onPlanHangout(venue)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.ctaText}>Plan a Hangout Here</Text>
                            <Feather name="arrow-right" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    } as ViewStyle,
    sheet: {
        backgroundColor: '#FAFAF8',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 32,
    } as ViewStyle,
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    } as ViewStyle,
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    } as ViewStyle,
    scrollContent: {
        paddingBottom: spacing.xl,
    } as ViewStyle,
    heroImage: {
        width: '100%',
        height: 200,
    } as ImageStyle,
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xs,
    } as ViewStyle,
    venueName: {
        ...typography.h2,
        color: '#2D2D2D',
        flex: 1,
    } as TextStyle,
    featuredBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    } as ViewStyle,
    featuredBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    } as TextStyle,
    metaRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    } as ViewStyle,
    metaText: {
        ...typography.small,
        color: colors.textSecondary,
        flex: 1,
    } as TextStyle,
    dealCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: `${colors.primary}10`,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
    } as ViewStyle,
    dealEmoji: {
        fontSize: 24,
        marginTop: 2,
    } as TextStyle,
    dealLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    } as TextStyle,
    dealText: {
        ...typography.bodyBold,
        color: '#2D2D2D',
        marginBottom: 4,
    } as TextStyle,
    dealNote: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    } as ViewStyle,
    sectionTitle: {
        ...typography.bodyBold,
        color: '#2D2D2D',
        marginBottom: spacing.sm,
    } as TextStyle,
    hoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    } as ViewStyle,
    dayLabel: {
        ...typography.small,
        color: colors.textSecondary,
    } as TextStyle,
    todayLabel: {
        color: colors.primary,
        fontWeight: '700',
    } as TextStyle,
    hoursText: {
        ...typography.small,
        color: colors.textPrimary,
    } as TextStyle,
    noHoursText: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
    ctaContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    } as ViewStyle,
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 24,
        paddingVertical: 16,
        gap: 8,
        ...shadow.md,
    } as ViewStyle,
    ctaText: {
        ...typography.bodyBold,
        color: '#FFFFFF',
        fontSize: 16,
    } as TextStyle,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/components/VenueDetailSheet.tsx
git commit -m "feat(components): add VenueDetailSheet bottom sheet"
```

---

### Task 8: Create `HangoutsSubToggle`

**File:** `frendli-app/components/HangoutsSubToggle.tsx` (new file)

Small Upcoming / Past pill toggle. Lighter visual weight than the main My Plans / Discover toggle.

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../constants/tokens';

interface HangoutsSubToggleProps {
    value: 'upcoming' | 'past';
    onChange: (value: 'upcoming' | 'past') => void;
}

export function HangoutsSubToggle({ value, onChange }: HangoutsSubToggleProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.pill, value === 'upcoming' && styles.pillActive]}
                onPress={() => onChange('upcoming')}
            >
                <Text style={[styles.pillText, value === 'upcoming' && styles.pillTextActive]}>
                    Upcoming
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.pill, value === 'past' && styles.pillActive]}
                onPress={() => onChange('past')}
            >
                <Text style={[styles.pillText, value === 'past' && styles.pillTextActive]}>
                    Past
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F0EDE8',
        borderRadius: radius.full,
        padding: 3,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    } as ViewStyle,
    pill: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 7,
        borderRadius: radius.full,
    } as ViewStyle,
    pillActive: {
        backgroundColor: '#FFFFFF',
    } as ViewStyle,
    pillText: {
        ...typography.small,
        fontWeight: '600',
        color: colors.textSecondary,
        fontSize: 13,
    } as TextStyle,
    pillTextActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    } as TextStyle,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/components/HangoutsSubToggle.tsx
git commit -m "feat(components): add HangoutsSubToggle pill toggle"
```

---

## Chunk 4: `hangouts.tsx` Overhaul

### Task 9: Overhaul `hangouts.tsx`

**File:** `frendli-app/app/(tabs)/hangouts.tsx`

This is the largest change. Replace the entire file. The existing logic is preserved and extended — do not lose the `HangoutCard` component definition or its styles.

> **Prerequisite:** Tasks 1–5 must be complete before this task. In particular:
> - Task 5 adds `venueApi.getFeatured()` to `lib/api.ts` — without it, the import will compile but `getFeatured` won't exist at runtime.
> - Task 5 extends `hangoutApi.getDiscovery` to accept `suggested` and `thisWeek` params — without it, TypeScript will reject the call with those params.
> - Tasks 1–4 add the backend endpoints that these API calls hit.

**Key changes from the existing file:**
1. New imports: `expo-location`, new components, `venueApi`, `DiscoveryItem`/`PartnerVenue` types
2. New state: `activeSubTab`, `myHangouts`, `myHangoutsLoading`, `featuredVenues`, `venuesLoading`, `discoveryItems`, `userLocation`
3. `activeCategory` changes from `string | null` (null = All) to `string` (`'all'` = All)
4. Three separate fetch functions replace the single `fetchData`
5. Category filter strip is dynamically composed (hardcoded CATEGORIES array removed)
6. New "For You" venue strip section in Discover tab
7. My Plans tab now loads real data with Upcoming/Past sub-toggle

- [ ] **Step 1: Replace the file**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    ViewStyle,
    TextStyle,
    ImageStyle,
    Dimensions,
    Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { hangoutApi, venueApi, profileApi } from '../../lib/api';
import Animated, {
    FadeInDown,
    FadeInRight,
    Layout,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { VenuePromotionCard, PartnerVenue } from '../../components/VenuePromotionCard';
import { VenueDetailSheet } from '../../components/VenueDetailSheet';
import { HangoutsSubToggle } from '../../components/HangoutsSubToggle';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

interface Hangout {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    startTime: string;
    location: string;
    category: string;
    isPublic: boolean;
    spotsLeft: number;
    attendees: { imageUrl: string }[];
    host: { name: string; imageUrl: string };
    activePerksCode?: string | null;
    feedbackSubmitted?: boolean;
    venue?: { id: string; name: string };
}

type DiscoveryItem =
    | { type: 'hangout'; data: Hangout }
    | { type: 'venue'; data: PartnerVenue };

// ─── Category filter config ──────────────────────────────────────────────────

const FIXED_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'suggested', label: 'Suggested' },
    { id: 'this_week', label: 'This Week' },
];

const VENUE_TYPE_CATEGORIES = [
    { id: 'cafe', label: 'Cafe' },
    { id: 'bar', label: 'Bar' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'activities', label: 'Activities' },
];

// Map interest tag slugs to display labels
const INTEREST_LABELS: Record<string, string> = {
    'board-games': 'Board Games',
    'hiking': 'Hiking',
    'coffee': 'Coffee',
    'trivia': 'Trivia',
    'karaoke': 'Karaoke',
    'yoga': 'Yoga',
    'concerts': 'Live Music',
    'running': 'Running',
    'tennis': 'Tennis',
    'wine': 'Wine',
    'craft-beer': 'Craft Beer',
    'museums': 'Museums',
};

// ─── HangoutCard ─────────────────────────────────────────────────────────────

const HangoutCard = ({
    hangout,
    index,
    isPast = false,
}: {
    hangout: Hangout;
    index: number;
    isPast?: boolean;
}) => {
    const router = useRouter();
    const date = new Date(hangout.startTime);
    const dateString = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const inFeedbackWindow = isPast &&
        date > twentyFourHoursAgo &&
        date < now &&
        hangout.feedbackSubmitted === false;

    const handleDoItAgain = () => {
        const params = new URLSearchParams();
        if (hangout.venue?.id) params.set('venueId', hangout.venue.id);
        if (hangout.category) params.set('category', hangout.category);
        router.push(`/hangouts/create?${params.toString()}` as any);
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).duration(600)}
            layout={Layout.springify()}
            style={[styles.cardWrapper, isPast && styles.cardWrapperPast]}
        >
            <TouchableOpacity
                style={[styles.card, isPast && styles.cardPast]}
                onPress={() => router.push(`/hangouts/${hangout.id}` as any)}
                activeOpacity={0.9}
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: hangout.imageUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800' }}
                        style={[styles.cardImage, isPast && styles.cardImagePast]}
                    />
                    {hangout.category === 'board_games' && !isPast && (
                        <View style={styles.repeatBadge}>
                            <Feather name="refresh-cw" size={10} color="#2E7D32" />
                            <Text style={styles.repeatBadgeText}>Every Friday</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{hangout.title}</Text>

                    <View style={styles.metaInfo}>
                        <View style={styles.metaRow}>
                            <Feather name="map-pin" size={12} color={colors.textTertiary} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {hangout.location || 'Local Spot'}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Feather name="clock" size={12} color={colors.textTertiary} />
                            <Text style={styles.metaText}>
                                {dateString} at {timeString}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.attendeesContainer}>
                            {hangout.attendees.slice(0, 3).map((attendee, i) => (
                                <Image
                                    key={i}
                                    source={{ uri: attendee.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }}
                                    style={[styles.attendeeAvatar, { marginLeft: i > 0 ? -12 : 0, zIndex: 10 - i }]}
                                />
                            ))}
                        </View>

                        {/* Past card actions */}
                        {isPast ? (
                            <TouchableOpacity
                                style={inFeedbackWindow ? styles.feedbackChip : styles.doItAgainChip}
                                onPress={inFeedbackWindow
                                    ? () => router.push(`/hangouts/${hangout.id}` as any)
                                    : handleDoItAgain
                                }
                            >
                                <Text style={inFeedbackWindow ? styles.feedbackChipText : styles.doItAgainText}>
                                    {inFeedbackWindow ? "How'd it go? →" : "Do it again →"}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.cardFooterRight}>
                                {/* Deal unlocked chip for upcoming */}
                                {hangout.activePerksCode && (
                                    <TouchableOpacity
                                        style={styles.dealChip}
                                        onPress={() => router.push(`/perks?code=${hangout.activePerksCode}` as any)}
                                    >
                                        <Text style={styles.dealChipText}>🎁 Deal unlocked</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={styles.spotsBadge}>
                                    <Feather name="users" size={12} color={colors.textTertiary} />
                                    <Text style={styles.spotsText}>{hangout.spotsLeft} spots left</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HangoutsScreen() {
    const router = useRouter();

    // Core state
    const [activeTab, setActiveTab] = useState<'my_plans' | 'discover'>('discover');
    const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [profile, setProfile] = useState<any>(null);

    // Discover state
    const [hangouts, setHangouts] = useState<Hangout[]>([]);
    const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Featured venues state
    const [featuredVenues, setFeaturedVenues] = useState<PartnerVenue[]>([]);
    const [venuesLoading, setVenuesLoading] = useState(false);

    // My Plans state
    const [myHangouts, setMyHangouts] = useState<Hangout[]>([]);
    const [myHangoutsLoading, setMyHangoutsLoading] = useState(false);
    const [myHangoutsError, setMyHangoutsError] = useState(false);

    // Venue detail sheet
    const [selectedVenue, setSelectedVenue] = useState<PartnerVenue | null>(null);

    // Geolocation
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // ── Geolocation (once, on mount) ─────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            }
        })();
    }, []);

    // ── Profile fetch (once) ─────────────────────────────────────────────────
    useEffect(() => {
        profileApi.get().then(setProfile).catch(() => {});
    }, []);

    // ── Discovery hangouts ───────────────────────────────────────────────────
    const fetchDiscovery = useCallback(async () => {
        setLoading(true);
        try {
            const categoryParam = ['all', 'suggested', 'this_week'].includes(activeCategory)
                ? undefined
                : activeCategory;

            const data = await hangoutApi.getDiscovery({
                category: categoryParam,
                suggested: activeCategory === 'suggested' ? true : undefined,
                thisWeek: activeCategory === 'this_week' ? true : undefined,
                lat: userLocation?.lat,
                lng: userLocation?.lng,
            });

            if (activeCategory === 'suggested') {
                setDiscoveryItems(Array.isArray(data) ? data as DiscoveryItem[] : []);
            } else {
                setHangouts(Array.isArray(data) ? data as Hangout[] : []);
            }
        } catch (error) {
            console.error('fetchDiscovery error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeCategory, userLocation]);

    // ── Featured venues ──────────────────────────────────────────────────────
    const fetchFeaturedVenues = useCallback(async () => {
        if (activeCategory === 'suggested') return; // venues come from the merged feed
        setVenuesLoading(true);
        try {
            const categoryParam = ['all', 'this_week'].includes(activeCategory)
                ? undefined
                : activeCategory;
            const data = await venueApi.getFeatured({
                lat: userLocation?.lat,
                lng: userLocation?.lng,
                category: categoryParam,
            });
            setFeaturedVenues(Array.isArray(data) ? data as PartnerVenue[] : []);
        } catch {
            setFeaturedVenues([]);
        } finally {
            setVenuesLoading(false);
        }
    }, [activeCategory, userLocation]);

    // ── My hangouts ──────────────────────────────────────────────────────────
    const fetchMyHangouts = useCallback(async () => {
        setMyHangoutsLoading(true);
        setMyHangoutsError(false);
        try {
            const data = await hangoutApi.getMy();
            setMyHangouts(Array.isArray(data) ? data as Hangout[] : []);
        } catch {
            setMyHangoutsError(true);
        } finally {
            setMyHangoutsLoading(false);
        }
    }, []);

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab === 'discover') {
            fetchDiscovery();
            fetchFeaturedVenues();
        }
    }, [activeTab, activeCategory, userLocation]);

    useEffect(() => {
        if (activeTab === 'my_plans') {
            fetchMyHangouts();
        }
    }, [activeTab]);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'discover') {
            fetchDiscovery();
            fetchFeaturedVenues();
        } else {
            fetchMyHangouts();
            setRefreshing(false);
        }
    };

    // ── Derived data ─────────────────────────────────────────────────────────
    const now = new Date();
    const upcomingHangouts = myHangouts.filter(h => new Date(h.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const pastHangouts = myHangouts.filter(h => new Date(h.startTime) <= now)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Build category chips from profile interests + fixed + venue type
    const interestChips = profile?.interests
        ? (profile.interests as string[])
            .filter((id: string) => INTEREST_LABELS[id])
            .map((id: string) => ({ id, label: INTEREST_LABELS[id] }))
        : [];
    const allCategories = [...FIXED_CATEGORIES, ...interestChips, ...VENUE_TYPE_CATEGORIES];

    const showVenueStrip = activeTab === 'discover' && activeCategory !== 'suggested' && featuredVenues.length > 0;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleVenuePress = (venue: PartnerVenue) => setSelectedVenue(venue);
    const handleVenueDetailClose = () => setSelectedVenue(null);
    const handlePlanHangout = (venue: PartnerVenue) => {
        setSelectedVenue(null);
        router.push(`/hangouts/create?venueId=${venue.id}&category=${venue.category}` as any);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>Hangouts</Text>
                        <Text style={styles.headerSubtitle}>
                            {activeTab === 'discover'
                                ? `${hangouts.length || discoveryItems.length} happening near you`
                                : `${upcomingHangouts.length} upcoming`
                            }
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerHostButton}
                        onPress={() => router.push('/hangouts/create' as any)}
                    >
                        <Feather name="plus" size={18} color="#FFF" />
                        <Text style={styles.headerHostButtonText}>Host</Text>
                    </TouchableOpacity>
                </View>

                {/* Main toggle */}
                <View style={styles.mainToggleContainer}>
                    <TouchableOpacity
                        style={[styles.mainToggleButton, activeTab === 'my_plans' && styles.mainToggleButtonActive]}
                        onPress={() => setActiveTab('my_plans')}
                    >
                        <Feather name="calendar" size={16} color={activeTab === 'my_plans' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.mainToggleText, activeTab === 'my_plans' && styles.mainToggleTextActive]}>My Plans</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.mainToggleButton, activeTab === 'discover' && styles.mainToggleButtonActive]}
                        onPress={() => setActiveTab('discover')}
                    >
                        <MaterialCommunityIcons name="compass-outline" size={18} color={activeTab === 'discover' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.mainToggleText, activeTab === 'discover' && styles.mainToggleTextActive]}>Discover</Text>
                    </TouchableOpacity>
                </View>

                {/* Discover-only: Activity Planner + category filter */}
                {activeTab === 'discover' && (
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <TouchableOpacity
                            onPress={() => router.push('/hangouts/plan' as any)}
                            activeOpacity={0.9}
                            style={styles.activityPlannerBannerWrapper}
                        >
                            <LinearGradient
                                colors={['#FF7F61', '#FF9F81']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.activityPlannerBanner}
                            >
                                <View style={styles.plannerBannerContent}>
                                    <View style={styles.plannerBannerLeft}>
                                        <Text style={styles.plannerStarEmoji}>✨</Text>
                                        <Text style={styles.plannerBannerTitle}>Activity Planner — find the perfect venue</Text>
                                    </View>
                                    <Feather name="chevron-right" size={18} color="#FFFFFF" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterStrip}
                        >
                            {allCategories.map((cat, idx) => (
                                <Animated.View
                                    key={cat.id}
                                    entering={FadeInRight.delay(idx * 40).duration(400)}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.filterChip,
                                            activeCategory === cat.id && styles.filterChipActive,
                                        ]}
                                        onPress={() => setActiveCategory(cat.id)}
                                    >
                                        <Text style={[
                                            styles.filterLabel,
                                            activeCategory === cat.id && styles.filterLabelActive,
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}
            </View>

            {/* Body */}
            {loading && !refreshing && activeTab === 'discover' ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {activeTab === 'my_plans' ? (
                        /* ── My Plans ─────────────────────────────────────── */
                        <View>
                            <View style={styles.subToggleWrapper}>
                                <HangoutsSubToggle value={activeSubTab} onChange={setActiveSubTab} />
                            </View>

                            {myHangoutsLoading ? (
                                <View style={styles.centerContainer}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : myHangoutsError ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyTitle}>Something went wrong</Text>
                                    <Text style={styles.emptyText}>
                                        {activeSubTab === 'past'
                                            ? "Couldn't load past hangouts"
                                            : "Couldn't load your plans"}
                                    </Text>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={fetchMyHangouts}>
                                        <Text style={styles.secondaryButtonText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : activeSubTab === 'upcoming' ? (
                                upcomingHangouts.length > 0 ? (
                                    <View style={styles.grid}>
                                        {upcomingHangouts.map((h, i) => (
                                            <HangoutCard key={h.id} hangout={h} index={i} isPast={false} />
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.myPlansEmptyState}>
                                        <Text style={styles.emptyTitle}>No plans yet</Text>
                                        <Text style={styles.emptyText}>
                                            Join a hangout or host your own to see your upcoming plans here.
                                        </Text>
                                        <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveTab('discover')}>
                                            <Text style={styles.primaryButtonText}>Browse Hangouts</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.outlineButton} onPress={() => router.push('/hangouts/create' as any)}>
                                            <Feather name="plus" size={18} color={colors.textPrimary} />
                                            <Text style={styles.outlineButtonText}>Host a Hangout</Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            ) : (
                                /* Past */
                                pastHangouts.length > 0 ? (
                                    <View style={styles.grid}>
                                        {pastHangouts.map((h, i) => (
                                            <HangoutCard key={h.id} hangout={h} index={i} isPast />
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textTertiary} />
                                        <Text style={styles.emptyTitle}>No past hangouts</Text>
                                        <Text style={styles.emptyText}>Your hangout history will appear here.</Text>
                                    </View>
                                )
                            )}
                        </View>
                    ) : (
                        /* ── Discover ─────────────────────────────────────── */
                        <View>
                            {/* "For You" venue strip */}
                            {showVenueStrip && (
                                <View style={styles.venueStripSection}>
                                    <Text style={styles.venueStripTitle}>🎁 Venues with deals near you</Text>
                                    {venuesLoading ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueStripContent}>
                                            {[0, 1, 2].map(i => (
                                                <View key={i} style={styles.venueSkeletonCard} />
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueStripContent}>
                                            {featuredVenues.map(v => (
                                                <VenuePromotionCard
                                                    key={v.id}
                                                    venue={v}
                                                    displayContext="strip"
                                                    onPress={() => handleVenuePress(v)}
                                                />
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            )}

                            {/* Hangouts grid or Suggested merged feed */}
                            <View style={styles.grid}>
                                {activeCategory === 'suggested' ? (
                                    discoveryItems.length > 0 ? (
                                        discoveryItems.map((item, i) =>
                                            item.type === 'hangout' ? (
                                                <HangoutCard key={item.data.id} hangout={item.data} index={i} />
                                            ) : (
                                                <VenuePromotionCard
                                                    key={item.data.id}
                                                    venue={item.data}
                                                    displayContext="feed"
                                                    onPress={() => handleVenuePress(item.data)}
                                                />
                                            )
                                        )
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <MaterialCommunityIcons name="calendar-search" size={48} color={colors.textTertiary} />
                                            <Text style={styles.emptyTitle}>Nothing suggested yet</Text>
                                            <Text style={styles.emptyText}>Complete your profile interests to get personalised suggestions.</Text>
                                        </View>
                                    )
                                ) : (
                                    hangouts.length > 0 ? (
                                        hangouts.map((h, i) => (
                                            <HangoutCard key={h.id} hangout={h} index={i} />
                                        ))
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <MaterialCommunityIcons name="calendar-search" size={48} color={colors.textTertiary} />
                                            <Text style={styles.emptyTitle}>No hangouts found</Text>
                                            <Text style={styles.emptyText}>Try a different category or start your own!</Text>
                                            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/hangouts/create' as any)}>
                                                <Text style={styles.secondaryButtonText}>Host a Hangout</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Venue detail sheet */}
            {selectedVenue && (
                <VenueDetailSheet
                    venue={selectedVenue}
                    onClose={handleVenueDetailClose}
                    onPlanHangout={handlePlanHangout}
                />
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAF8' } as ViewStyle,
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 } as ViewStyle,
    header: { backgroundColor: '#FCFBF9', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 0 } as ViewStyle,
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md } as ViewStyle,
    headerLeft: { flexDirection: 'column', justifyContent: 'center' } as ViewStyle,
    headerTitle: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 32, color: '#2D2D2D', letterSpacing: -1 } as TextStyle,
    headerSubtitle: { ...typography.bodyRegular, color: colors.textSecondary, fontSize: 14, marginTop: 2 } as TextStyle,
    headerHostButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 } as ViewStyle,
    headerHostButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 } as TextStyle,
    mainToggleContainer: { flexDirection: 'row', backgroundColor: '#F5F3F0', padding: 4, borderRadius: 16, marginHorizontal: spacing.lg, marginBottom: spacing.lg } as ViewStyle,
    mainToggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 } as ViewStyle,
    mainToggleButtonActive: { backgroundColor: '#FFFFFF', ...shadow.subtle } as ViewStyle,
    mainToggleText: { ...typography.bodyMedium, color: colors.textSecondary, fontWeight: '600' } as TextStyle,
    mainToggleTextActive: { color: colors.primary, fontWeight: '700' } as TextStyle,
    activityPlannerBannerWrapper: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, ...shadow.md } as ViewStyle,
    activityPlannerBanner: { borderRadius: 16, padding: 16 } as ViewStyle,
    plannerBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
    plannerBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
    plannerStarEmoji: { fontSize: 18 } as TextStyle,
    plannerBannerTitle: { fontSize: 15, fontFamily: 'Lexend_600SemiBold', color: '#FFFFFF' } as TextStyle,
    filterStrip: { paddingLeft: spacing.lg, paddingRight: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm } as ViewStyle,
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3F0', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.full } as ViewStyle,
    filterChipActive: { backgroundColor: '#2D2D2D' } as ViewStyle,
    filterLabel: { ...typography.small, color: '#6E6E6E', fontWeight: '600' } as TextStyle,
    filterLabelActive: { color: '#FFFFFF' } as TextStyle,
    scrollContent: { paddingBottom: 100 } as ViewStyle,
    subToggleWrapper: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg } as ViewStyle,
    // Venue strip
    venueStripSection: { marginBottom: spacing.lg } as ViewStyle,
    venueStripTitle: { ...typography.bodyBold, color: '#2D2D2D', paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: 16 } as TextStyle,
    venueStripContent: { paddingLeft: spacing.lg, paddingRight: spacing.sm } as ViewStyle,
    venueSkeletonCard: { width: 260, height: 140, borderRadius: radius.xl, backgroundColor: '#EEEBE6', marginRight: spacing.md } as ViewStyle,
    // Grid
    grid: { paddingHorizontal: spacing.lg, paddingTop: spacing.md } as ViewStyle,
    // Cards
    cardWrapper: { marginBottom: spacing.lg } as ViewStyle,
    cardWrapperPast: { opacity: 0.75 } as ViewStyle,
    card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.card } as ViewStyle,
    cardPast: { shadowOpacity: 0 } as ViewStyle,
    imageContainer: { width: '100%', height: 180 } as ViewStyle,
    cardImage: { width: '100%', height: '100%' } as ImageStyle,
    cardImagePast: { opacity: 0.7 } as ImageStyle,
    repeatBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md, gap: 4 } as ViewStyle,
    repeatBadgeText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' } as TextStyle,
    cardBody: { padding: spacing.lg } as ViewStyle,
    cardTitle: { ...typography.h3, color: '#2D2D2D', marginBottom: spacing.sm } as TextStyle,
    metaInfo: { marginBottom: spacing.md, gap: 4 } as ViewStyle,
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
    metaText: { ...typography.small, color: colors.textSecondary } as TextStyle,
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm } as ViewStyle,
    cardFooterRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as ViewStyle,
    attendeesContainer: { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
    attendeeAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFF' } as ImageStyle,
    spotsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
    spotsText: { ...typography.small, color: colors.textTertiary, fontWeight: '600' } as TextStyle,
    dealChip: { backgroundColor: `${colors.primary}12`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full } as ViewStyle,
    dealChipText: { fontSize: 11, fontWeight: '600', color: colors.primary } as TextStyle,
    doItAgainChip: { paddingVertical: 4 } as ViewStyle,
    doItAgainText: { fontSize: 13, fontWeight: '700', color: colors.primary } as TextStyle,
    feedbackChip: { paddingVertical: 4 } as ViewStyle,
    feedbackChipText: { fontSize: 13, fontWeight: '700', color: '#E67E22' } as TextStyle,
    // Empty states
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm } as ViewStyle,
    emptyIconContainer: { width: 80, height: 80, borderRadius: radius.xxl, backgroundColor: colors.sand, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg } as ViewStyle,
    emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 } as TextStyle,
    emptyText: { ...typography.bodyRegular, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl } as TextStyle,
    myPlansEmptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: 80 } as ViewStyle,
    secondaryButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.xl, backgroundColor: colors.primary, ...shadow.md } as ViewStyle,
    secondaryButtonText: { ...typography.bodyBold, color: colors.surface } as TextStyle,
    primaryButton: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 24, width: '100%', alignItems: 'center', marginBottom: spacing.md, ...shadow.md } as ViewStyle,
    primaryButtonText: { ...typography.bodyBold, color: '#FFFFFF', fontSize: 16 } as TextStyle,
    outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24, width: '100%', borderWidth: 1, borderColor: colors.border, backgroundColor: '#F5F5F5', gap: 8 } as ViewStyle,
    outlineButtonText: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 } as TextStyle,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors. If `expo-location` is not installed, run `npx expo install expo-location` first.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/app/(tabs)/hangouts.tsx
git commit -m "feat(hangouts): overhaul Hangouts screen — venue strip, My Plans data, category filter, geolocation"
```

---

## Chunk 5: Perks Screen

### Task 10: Add `earned` prop to `PerkCard`

**File:** `frendli-app/components/PerkCard.tsx`

- [ ] **Step 1: Add `earned` prop and locked state UI**

Replace the `PerkCardProps` interface and component:

Replace the interface (lines 7–18):
```typescript
interface PerkCardProps {
    id: string;
    title: string;
    description: string;
    discountText: string;
    earned?: boolean;
    venue: {
        name: string;
        category: string;
        photos: string[];
    };
    onPress?: () => void;
}
```

Replace the component signature (line 20):
```typescript
export function PerkCard({
    title,
    description,
    discountText,
    earned = false,
    venue,
    onPress
}: PerkCardProps) {
```

Add a locked overlay and update the claim button text — replace the entire return statement body with.

> **Overlay positioning note:** The `lockedOverlay` style (defined below) uses `position: 'absolute'` with `top/left/right/bottom: 0`, so it visually covers the entire card regardless of its JSX position. The overlay must be placed inside the `<Pressable>` but before `<View style={styles.leftEar} />` and `<View style={styles.rightEar} />` so those decorative elements render on top.

```typescript
    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                pressed && { transform: [{ scale: 0.98 }] }
            ]}
            onPress={onPress}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.gradient}
                />
                <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{category}</Text>
                </View>
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discountText}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.venueText}>{venueName} • {distance}</Text>

                <View style={styles.divider}>
                    <View style={styles.dot} />
                    <View style={styles.line} />
                    <View style={styles.dot} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.description} numberOfLines={1}>{description}</Text>
                    <View style={styles.claimButton}>
                        <Text style={styles.claimText}>{earned ? 'View' : 'Unlock'}</Text>
                        <Feather name={earned ? 'chevron-right' : 'lock'} size={14} color={colors.primary} />
                    </View>
                </View>
            </View>

            {/* Locked overlay */}
            {!earned && (
                <View style={styles.lockedOverlay}>
                    <View style={styles.lockBadge}>
                        <Feather name="lock" size={14} color={colors.primary} />
                        <Text style={styles.lockText}>Confirm a hangout here to unlock</Text>
                    </View>
                </View>
            )}

            {/* Scannable "Ticket" effect ears */}
            <View style={styles.leftEar} />
            <View style={styles.rightEar} />
        </Pressable>
    );
```

Add these styles to the StyleSheet at the end (before the closing `}`):
```typescript
    lockedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(250,250,248,0.75)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: spacing.md,
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
        ...shadow.sm,
    },
    lockText: {
        fontSize: 12,
        fontFamily: typography.bodyMedium.fontFamily,
        color: colors.primary,
        fontWeight: '600',
    },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/components/PerkCard.tsx
git commit -m "feat(PerkCard): add earned prop with locked state overlay UI"
```

---

### Task 11: Wire `earned` into `perks.tsx`

**File:** `frendli-app/app/(tabs)/perks.tsx`

> **Prerequisite:** Task 4 must be complete — it adds the `earned` field to the `GET /api/perks` response. Without it, `perksApi.fetchPerks()` will return objects without `earned`, and `setPerks(data)` will produce a TypeScript mismatch if `earned` is required.

- [ ] **Step 1: Add `earned` to the `Perk` interface and pass it to `PerkCard`**

Replace the `Perk` interface (lines 12–23). Use `earned?: boolean` (optional) so existing data without the field degrades gracefully before Task 4 is deployed:
```typescript
interface Perk {
    id: string;
    title: string;
    description: string;
    discountText: string;
    earned?: boolean;
    venue: {
        id: string;
        name: string;
        category: string;
        photos: string[];
    };
}
```

Replace the `PerkCard` render call (line 163):
```typescript
<PerkCard
    {...perk}
    earned={perk.earned ?? false}
    onPress={() => handleClaimPerk(perk)}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frendli-app/app/(tabs)/perks.tsx
git commit -m "feat(perks): wire earned prop from API to PerkCard"
```

---

## Final Verification

- [ ] **Start the API server and verify new endpoints respond**

```bash
cd frendli-api && npm run dev
```

Test:
```bash
curl http://localhost:3000/api/venues/featured
# Expected: [] or array of PartnerVenue objects

curl http://localhost:3000/api/hangouts/discovery?suggested=true
# Expected: array of DiscoveryItem objects with type 'hangout' or 'venue'
```

- [ ] **Start the app and manually verify each feature**

```bash
cd frendli-app && npx expo start
```

Checklist:
- [ ] Discover tab loads hangouts without error
- [ ] "For You" venue strip appears (or is absent if no partner venues in DB)
- [ ] Category filter shows "All", "Suggested", "This Week" + user interests + venue types
- [ ] "Suggested" filter hides the strip and shows merged feed
- [ ] My Plans tab loads real data (not static empty state)
- [ ] Upcoming / Past sub-toggle switches views
- [ ] Past hangouts show "Do it again →" or "How'd it go? →"
- [ ] Tapping a venue card opens the detail sheet
- [ ] "Plan a Hangout Here →" navigates to create screen
- [ ] Perks screen: unearthed perks show locked overlay; earned perks show "View"

- [ ] **Final commit**

```bash
git add .
git commit -m "chore: hangouts page feature complete"
```
