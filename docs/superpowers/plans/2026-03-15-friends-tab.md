# Friends Tab Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Matches tab into a Friends tab that shows users you've completed a hangout with and rated positively (≥ 4).

**Architecture:** New `GET /api/friends` backend endpoint queries completed hangouts with positive feedback and returns a shaped friend list. The frontend replaces `matches.tsx` with `friends.tsx` — a 2-column photo grid with the same card structure as the old Matches tab. Six other files are updated to fix now-broken route references to `/(tabs)/matches`.

**Tech Stack:** Node.js/Express, Prisma ORM (backend); React Native (Expo), TypeScript, expo-router, react-native-reanimated (frontend)

**Spec:** `docs/superpowers/specs/2026-03-15-friends-tab-design.md`

---

## Chunk 1: Backend — `GET /api/friends` endpoint

### Task 1: Create the friends route file

**Files:**
- Create: `frendli-api/src/routes/friends.ts`

The route pattern follows existing routes (e.g. `frendli-api/src/routes/safety.ts`):
- Import `Router`, `Request`, `Response` from `express`
- Import `PrismaClient` from `@prisma/client`
- The route uses `requireAuth` middleware applied at the `app.use` level in `index.ts` (not per-route), so `req.user.id` is always available

- [ ] **Step 1: Create the route file**

```typescript
// frendli-api/src/routes/friends.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/friends
// Returns the current user's friends: people they've completed a hangout with
// AND left HangoutFeedback with rating >= 4.
router.get('/', async (req: Request, res: Response) => {
    try {
        const currentUserId = (req as any).user.id as string;

        // Step 1: find all completed hangouts this user attended
        const myAttendances = await prisma.hangoutAttendee.findMany({
            where: {
                userId: currentUserId,
                hangout: { status: 'completed' },
            },
            select: { hangoutId: true },
        });

        const completedHangoutIds = myAttendances.map(a => a.hangoutId);

        if (completedHangoutIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Step 2: filter to hangouts where the user left feedback with rating >= 4
        const qualifyingFeedback = await prisma.hangoutFeedback.findMany({
            where: {
                hangoutId: { in: completedHangoutIds },
                userId: currentUserId,
                rating: { gte: 4 },
            },
            select: { hangoutId: true },
        });

        const qualifyingHangoutIds = qualifyingFeedback.map(f => f.hangoutId);

        if (qualifyingHangoutIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Step 3: get all other attendees of those hangouts, with hangout details
        const otherAttendances = await prisma.hangoutAttendee.findMany({
            where: {
                hangoutId: { in: qualifyingHangoutIds },
                userId: { not: currentUserId },
            },
            include: {
                hangout: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        startTime: true,
                    },
                },
                user: {
                    include: {
                        profile: {
                            select: {
                                firstName: true,
                                photos: true,
                            },
                        },
                    },
                },
            },
        });

        // Step 4: group by friend userId, deduplicate
        const friendMap = new Map<string, {
            userId: string;
            firstName: string;
            profilePhoto: string | null;
            hangoutCount: number;
            lastHangout: { title: string; category: string | null; startTime: Date };
        }>();

        for (const attendance of otherAttendances) {
            const friendUserId = attendance.userId;
            const profile = attendance.user.profile;

            // Exclude users with no profile
            if (!profile) continue;

            const hangout = attendance.hangout;
            const existing = friendMap.get(friendUserId);

            if (!existing) {
                friendMap.set(friendUserId, {
                    userId: friendUserId,
                    firstName: profile.firstName,
                    profilePhoto: profile.photos.length > 0 ? profile.photos[0] : null,
                    hangoutCount: 1,
                    lastHangout: {
                        title: hangout.title,
                        category: hangout.category ?? null,
                        startTime: hangout.startTime,
                    },
                });
            } else {
                existing.hangoutCount += 1;
                if (hangout.startTime > existing.lastHangout.startTime) {
                    existing.lastHangout = {
                        title: hangout.title,
                        category: hangout.category ?? null,
                        startTime: hangout.startTime,
                    };
                }
            }
        }

        // Step 5: sort by lastHangout.startTime descending, format response
        const friends = Array.from(friendMap.values())
            .sort((a, b) => b.lastHangout.startTime.getTime() - a.lastHangout.startTime.getTime())
            .map(f => ({
                userId: f.userId,
                firstName: f.firstName,
                profilePhoto: f.profilePhoto,
                hangoutCount: f.hangoutCount,
                lastHangout: {
                    title: f.lastHangout.title,
                    category: f.lastHangout.category,
                    startTime: f.lastHangout.startTime.toISOString(),
                },
            }));

        res.json({ friends });
    } catch (error) {
        console.error('GET /api/friends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
```

- [ ] **Step 2: Register the route in `frendli-api/src/index.ts`**

Add after the existing auth-gated routes (after line 61 `app.use('/api/user', ...)`):

```typescript
// Add at top with other imports:
import friendsRouter from './routes/friends';

// Add with other auth-gated routes:
app.use('/api/friends', requireAuth, friendsRouter);
```

- [ ] **Step 3: Verify the backend compiles**

```bash
cd frendli-api && npx tsc --noEmit
```

Expected: no TypeScript errors. If errors appear, fix them before continuing.

---

## Chunk 2: Frontend — API wrapper + tab config + route fixes

### Task 2: Add `friendApi` to `lib/api.ts`

**Files:**
- Modify: `frendli-app/lib/api.ts`

- [ ] **Step 1: Add `friendApi` export**

Open `frendli-app/lib/api.ts`. After the last named API export (e.g. `safetyApi` or similar), add:

```typescript
export const friendApi = {
    getAll: () => apiRequest('/api/friends'),
};
```

---

### Task 3: Update `_layout.tsx` — rename Matches tab to Friends

**Files:**
- Modify: `frendli-app/app/(tabs)/_layout.tsx`

Current tab at position 4 (between Perks and Messages) is named `matches` with title `Matches` and icon `heart`. Change it to `friends` with title `Friends` and icon `users`.

- [ ] **Step 1: Update the Matches tab entry**

Find this block in `_layout.tsx`:
```tsx
<Tabs.Screen
    name="matches"
    options={{
        title: 'Matches',
        tabBarIcon: ({ color }) => <Feather name="heart" size={24} color={color} />,
    }}
/>
```

Replace with:
```tsx
<Tabs.Screen
    name="friends"
    options={{
        title: 'Friends',
        tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} />,
    }}
/>
```

---

### Task 4: Fix broken route references in `messages.tsx`, `index.tsx`, `profile.tsx`

**Files:**
- Modify: `frendli-app/app/(tabs)/messages.tsx`
- Modify: `frendli-app/app/(tabs)/index.tsx`
- Modify: `frendli-app/app/(tabs)/profile.tsx`

These files all reference `/(tabs)/matches` or `/matches` which will no longer exist once `matches.tsx` is deleted.

- [ ] **Step 1: Fix `messages.tsx` compose button**

Find the line (around line 238):
```typescript
router.push('/(tabs)/matches' as any)
```
Change to:
```typescript
router.push('/(tabs)/friends' as any)
```

- [ ] **Step 2: Fix `index.tsx` two references**

Line 190 (`'first-wave'` case):
```typescript
router.push('/(tabs)/matches' as any);
```
Change to:
```typescript
router.push('/' as any);
```

Line 275 (`SuggestedFriendsSection` `onSeeAll`):
```typescript
onSeeAll={() => router.push('/(tabs)/matches' as any)}
```
Change to:
```typescript
onSeeAll={() => router.push('/' as any)}
```

- [ ] **Step 3: Fix `profile.tsx` three changes**

Change line 9 import — remove `messageApi`, add `friendApi`:
```typescript
// Before:
import { messageApi, perksApi, hangoutApi } from '../../lib/api';
// After:
import { friendApi, perksApi, hangoutApi } from '../../lib/api';
```

Change lines 21–22 — replace match count with friend count:
```typescript
// Before:
const matches = await messageApi.getMatches();
setFriendCount(matches.length || 0);
// After:
const data = await friendApi.getAll();
setFriendCount(data.friends.length || 0);
```

Change line 167 — My Friends card tap:
```typescript
// Before:
onPress={() => router.push('/matches')}
// After:
onPress={() => router.push('/(tabs)/friends' as any)}
```

Change line 339 — Discover Features list item tap:
```typescript
// Before:
onPress={() => router.push('/matches')}
// After:
onPress={() => router.push('/(tabs)/friends' as any)}
```

---

## Chunk 3: Frontend — Friends screen + delete old Matches screen

### Task 5: Create `friends.tsx` and delete `matches.tsx`

**Files:**
- Create: `frendli-app/app/(tabs)/friends.tsx`
- Delete: `frendli-app/app/(tabs)/matches.tsx`

The Friends screen is a 2-column photo grid with the same card structure as `matches.tsx`. Key differences from `matches.tsx`:
- Data comes from `friendApi.getAll()` → `data.friends`
- Cards show: name (16px), last hangout subtitle (emoji + title + date), hangout count badge (top-right)
- Badge replaces the "NEW" badge and last-message preview
- Error state added (missing from `matches.tsx`)
- Category emoji map uses hangout-type keys, not venue-type keys

- [ ] **Step 1: Create `frendli-app/app/(tabs)/friends.tsx`**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    Dimensions, ViewStyle, TextStyle, ImageStyle,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { friendApi } from '../../lib/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const FRIEND_CATEGORY_EMOJI: Record<string, string> = {
    coffee:   '☕',
    food:     '🍽️',
    outdoors: '🌿',
    games:    '🎮',
    music:    '🎸',
    arts:     '🎨',
    fitness:  '💪',
    other:    '🎉',
};
const DEFAULT_FRIEND_EMOJI = '🎉';

type FriendCard = {
    userId: string;
    firstName: string;
    profilePhoto: string | null;
    hangoutCount: number;
    lastHangout: {
        title: string;
        category: string | null;
        startTime: string;
    };
};

export default function FriendsScreen() {
    const router = useRouter();
    const [friends, setFriends] = useState<FriendCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchFriends = useCallback(async (refreshing = false) => {
        try {
            if (refreshing) setIsRefreshing(true);
            const data = await friendApi.getAll();
            setFriends(data.friends);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load friends');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const renderItem = ({ item, index }: { item: FriendCard; index: number }) => {
        const emoji = FRIEND_CATEGORY_EMOJI[item.lastHangout.category ?? ''] ?? DEFAULT_FRIEND_EMOJI;
        const date = new Date(item.lastHangout.startTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        const badgeText = `${item.hangoutCount} hangout${item.hangoutCount !== 1 ? 's' : ''}`;

        return (
            <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push(`/profile/${item.userId}` as any)}
                >
                    <View style={styles.friendCard}>
                        {item.profilePhoto ? (
                            <Image source={{ uri: item.profilePhoto }} style={styles.cardImage} />
                        ) : (
                            <View style={[styles.cardImage, styles.placeholderImage]}>
                                <Text style={styles.placeholderInitial}>
                                    {item.firstName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.cardGradient} />

                        <View style={styles.hangoutBadge}>
                            <Text style={styles.hangoutBadgeText}>{badgeText}</Text>
                        </View>

                        <View style={styles.cardInfo}>
                            <Text style={styles.friendName} numberOfLines={1}>
                                {item.firstName}
                            </Text>
                            <Text style={styles.lastHangout} numberOfLines={1}>
                                {emoji} {item.lastHangout.title} · {date}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchFriends()}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Friends</Text>
                    <Text style={styles.headerSubtitle}>People you've met up with</Text>
                </View>
            </View>

            <FlatList
                data={friends}
                keyExtractor={item => item.userId}
                renderItem={renderItem}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchFriends(true)}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🤝</Text>
                        <Text style={styles.emptyTitle}>No friends yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Complete a hangout and leave positive feedback to add friends!
                        </Text>
                        <TouchableOpacity
                            style={styles.discoverButton}
                            onPress={() => router.push('/(tabs)/hangouts' as any)}
                        >
                            <Text style={styles.discoverButtonText}>Find a Hangout</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cream,
    } as ViewStyle,
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    } as TextStyle,
    errorText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    } as TextStyle,
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    } as ViewStyle,
    retryButtonText: {
        ...typography.bodyBold,
        color: '#fff',
    } as TextStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: 80,
        paddingBottom: spacing.lg,
    } as ViewStyle,
    headerTitle: {
        ...typography.h1,
        fontSize: 34,
        color: colors.secondary,
        letterSpacing: -1,
    } as TextStyle,
    headerSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    } as TextStyle,
    gridContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
        flexGrow: 1,
    } as ViewStyle,
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    } as ViewStyle,
    friendCard: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.45,
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        overflow: 'hidden',
        position: 'relative',
        ...shadow.card,
        borderWidth: 1,
        borderColor: 'rgba(45,30,75,0.05)',
    } as ViewStyle,
    cardImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    } as ImageStyle,
    placeholderImage: {
        backgroundColor: colors.primary + '22',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    placeholderInitial: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 48,
        color: colors.primary,
    } as TextStyle,
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(45,30,75,0.2)',
        marginTop: '60%',
    } as ViewStyle,
    hangoutBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.full,
        zIndex: 10,
        ...shadow.sm,
    } as ViewStyle,
    hangoutBadgeText: {
        ...typography.small,
        fontWeight: '800',
        fontSize: 10,
        color: colors.surface,
        letterSpacing: 0.5,
    } as TextStyle,
    cardInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
    } as ViewStyle,
    friendName: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 16,
        color: colors.surface,
        marginBottom: 2,
    } as TextStyle,
    lastHangout: {
        ...typography.small,
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    } as TextStyle,
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: spacing.xxxl,
        paddingHorizontal: spacing.xl,
    } as ViewStyle,
    emptyIcon: {
        fontSize: 56,
        marginBottom: spacing.lg,
    } as TextStyle,
    emptyTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    } as TextStyle,
    emptySubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    } as TextStyle,
    discoverButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        ...shadow.premium,
    } as ViewStyle,
    discoverButtonText: {
        ...typography.bodyBold,
        color: '#fff',
    } as TextStyle,
});
```

- [ ] **Step 2: Delete `frendli-app/app/(tabs)/matches.tsx`**

Delete the file. On the terminal:
```bash
rm frendli-app/app/(tabs)/matches.tsx
```

Or delete it through your IDE.

---

## Chunk 4: Verification

### Task 6: Manual verification checklist

No automated test suite is configured for this project. Verify the changes work by running both servers and exercising the affected screens.

- [ ] **Step 1: Verify TypeScript compiles (frontend)**

```bash
cd frendli-app && npx tsc --noEmit
```

Expected: no TypeScript errors. Fix any type errors before proceeding with manual verification.

- [ ] **Step 2: Start the backend**

```bash
cd frendli-api && npm run dev
```

Expected: server starts without errors on the configured port.

- [ ] **Step 3: Start the frontend**

```bash
cd frendli-app && npm run dev
```

Expected: Expo dev server starts, app loads in simulator/device.

- [ ] **Step 4: Verify Friends tab appears**

- The tab bar shows "Friends" in position 4 (between Perks and Messages)
- Icon is two people (Feather `users`)
- Tapping it opens the Friends screen

- [ ] **Step 5: Verify Friends screen states**

- With no friends: empty state shows 🤝, "No friends yet", and "Find a Hangout" button
- "Find a Hangout" button navigates to Hangouts tab
- Pull-to-refresh works (spinner appears, then resolves)

- [ ] **Step 6: Verify API endpoint (if you have a user with completed+rated hangouts)**

```bash
# Replace TOKEN with a valid Supabase JWT
curl -H "Authorization: Bearer TOKEN" http://localhost:PORT/api/friends
```

Expected: `{ "friends": [...] }` — array of friend objects with correct shape.

- [ ] **Step 7: Verify friend cards (if friends exist)**

- Card shows photo (or initials if no photo)
- Name on the bottom overlay
- Hangout count badge top-right (e.g. "2 hangouts")
- Last hangout subtitle (e.g. "☕ Coffee Chat · Mar 10")
- Tapping a card opens the user's profile

- [ ] **Step 8: Verify broken routes are fixed**

- Messages tab compose button → opens Friends tab
- Discover tab "See All" (SuggestedFriendsSection) → stays on Discover
- Profile screen "My Friends" card and list item → opens Friends tab
- Profile screen friend count shows correct number from `friendApi`

- [ ] **Step 9: Verify old Matches route is gone**

- Confirm `app/(tabs)/matches.tsx` has been deleted
- Navigating to `/(tabs)/matches` should 404 or redirect (no crash)
