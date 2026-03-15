# Friends Tab Design

**Date:** 2026-03-15
**Status:** Approved

## Overview

Convert the existing Matches tab into a Friends tab. Friends are users you have completed a hangout with and left positive feedback for (rating ≥ 4). The tab surfaces your real-world connections — people you have actually met up with — in a browsable 2-column photo grid.

## Scope

Three parts:

1. **Backend** — new `GET /api/friends` endpoint
2. **Frontend** — new `friends.tsx` screen replacing `matches.tsx`
3. **Config updates** — tab layout, one route reference in `messages.tsx`, `lib/api.ts` wrapper

## Friend Definition

A user is a friend if:
- There exists at least one `Hangout` with `status = "completed"` that both the current user and the other user attended (`HangoutAttendee` records for both)
- The current user submitted `HangoutFeedback` for that hangout with `rating >= 4`

Friendship is directional from the current user's perspective — the other user does not need to have left feedback.

**Group hangouts:** Hangouts can have more than 2 attendees. All other attendees of a qualifying hangout are counted as friend candidates. If a hangout had 4 attendees, all 3 others become candidates. The final returned list is deduplicated: **one entry per unique friend `userId`**, with `hangoutCount` summed across all qualifying hangouts and `lastHangout` taken from the most recent one.

---

## Schema Notes

Key fields used by this feature (from `prisma/schema.prisma`):

- `User.id` — UUID, same as Supabase auth UID
- `Profile.userId` — FK to `User.id` (optional relation: `Profile?` on `User`)
- `Profile.firstName: String`; `Profile.photos: String[]` (first element is primary photo; empty array → null photo)
- `Profile` has no `lastName` field — use `firstName` only for display
- `Hangout.status`: `"upcoming" | "completed" | "cancelled"`
- `Hangout.category`: `String?` — values: `"coffee" | "food" | "outdoors" | "games" | "music" | "arts" | "fitness" | "other"` (nullable)
- `HangoutAttendee`: `hangoutId`, `userId`
- `HangoutFeedback`: `hangoutId`, `userId` (reviewer), `rating: Int`

---

## Backend

### Endpoint

```
GET /api/friends
Authorization: Bearer <supabase-token>
```

The route uses the existing `requireAuth` middleware, which decodes the Supabase JWT and attaches `req.user.id` (the Prisma `User.id`).

### Query Logic

1. Read `currentUserId` from `req.user.id`.
2. Find all `HangoutAttendee` rows for `currentUserId`, joined to `Hangout` where `hangout.status = "completed"`.
3. From those hangouts, keep only the ones where a `HangoutFeedback` record exists with `userId = currentUserId` and `rating >= 4`.
4. From the qualifying hangouts, collect all other `HangoutAttendee` rows (where `userId != currentUserId`).
5. Group by `userId`. For each group:
   - `hangoutCount` — count of qualifying hangouts shared with this user
   - `lastHangout` — the qualifying hangout with the most recent `startTime`
6. For each grouped user, join to `User → Profile` to get `firstName` and `photos[0]` (null if `photos` is empty).
   - **If a friend user has no `Profile` row, exclude them from the response entirely.**
7. Return the list sorted by `lastHangout.startTime` descending (most recent friend activity first).

### Response Shape

```ts
{
  friends: Array<{
    userId: string
    firstName: string
    profilePhoto: string | null   // Profile.photos[0] or null
    hangoutCount: number
    lastHangout: {
      title: string
      category: string | null     // null if Hangout.category is null
      startTime: string           // ISO 8601
    }
  }>
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid auth token |
| 500 | Database error |

An empty `friends: []` is a valid 200 response (not a 404).

---

## Frontend

### File Changes

| Action | File |
|--------|------|
| **Delete** | `frendli-app/app/(tabs)/matches.tsx` |
| **Create** | `frendli-app/app/(tabs)/friends.tsx` |
| **Modify** | `frendli-app/app/(tabs)/_layout.tsx` |
| **Modify** | `frendli-app/app/(tabs)/messages.tsx` |
| **Modify** | `frendli-app/app/(tabs)/index.tsx` |
| **Modify** | `frendli-app/app/(tabs)/profile.tsx` |
| **Modify** | `frendli-app/lib/api.ts` |

### `lib/api.ts` — Add `friendApi`

Add alongside the other named API objects:

```ts
export const friendApi = {
    getAll: () => apiRequest('/api/friends'),
};
```

### Tab Config (`_layout.tsx`)

- Rename the screen from `matches` to `friends` (file-system route resolves to `friends.tsx`)
- Label: `Friends`
- Icon: `users` (Feather)
- Tab position: unchanged — `friends` occupies position 4 (between Perks and Messages), same slot as the current `matches` screen

### Route Update (`messages.tsx`)

The compose button currently pushes to `/(tabs)/matches`. Update to `/(tabs)/friends`. This is intentional: tapping the compose shortcut opens the Friends tab, where the user can tap any friend card to open their profile, and the profile screen (`app/profile/[id].tsx`) has a "Message [Name]" button that routes to `/chat/${id}`.

### Route Updates (`index.tsx`)

Two references to update:

- **Line 275** (`SuggestedFriendsSection` `onSeeAll` prop): `'/(tabs)/matches'` → `'/'` (Discover tab). `SuggestedFriendsSection` shows discovery recommendations (potential friends you haven't met yet), so "See All" should navigate to the Discover screen, not the Friends screen.
- **Line 190** (`'first-wave'` onboarding step): `'/(tabs)/matches'` → `'/'` (Discover). This step prompts the user to send their first wave — Discover is the right destination since that's where they find people to wave at.

### Updates (`profile.tsx`)

Three changes:

1. **Lines 167 and 339**: `router.push('/matches')` → `router.push('/(tabs)/friends' as any)`. Both currently use the bare `/matches` path; replace with the full tab path `/(tabs)/friends`.
2. **Lines 21–22**: The friend count stat card currently calls `messageApi.getMatches()` and uses `matches.length`. Replace with `friendApi.getAll()` and use `data.friends.length` instead.
3. **Line 9 import**: Remove `messageApi` from the import (it is only used at line 21, which is being replaced). Add `friendApi`. Result: `import { friendApi, perksApi, hangoutApi } from '../../lib/api';`

### Screen: `friends.tsx`

**Data fetching:**

State variables and initial values:
- `friends: FriendCard[]` — `[]`
- `loading: boolean` — `true` (starts true so the spinner shows before the first fetch)
- `error: string | null` — `null`
- `isRefreshing: boolean` — `false`

Fetch function (called on mount and on pull-to-refresh):
```ts
async function fetchFriends(refreshing = false) {
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
}
```

**`FriendCard` type (local to the file):**

```ts
type FriendCard = {
  userId: string
  firstName: string
  profilePhoto: string | null
  hangoutCount: number
  lastHangout: {
    title: string
    category: string | null
    startTime: string
  }
}
```

**Category emoji map (local to `friends.tsx`):**

Keyed on the actual `Hangout.category` values (different from the `CATEGORY_EMOJI` map in `messages.tsx` which uses venue-type keys):

```ts
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
```

**Card dimensions:**

```ts
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;
// Card height: portrait ratio, same as matches.tsx
// COLUMN_WIDTH * 1.45
```

**Layout:**
- Header: same pattern as `matches.tsx` — title "Friends", subtitle "People you've met up with"
- `FlatList` with `numColumns={2}`, `columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: spacing.md }}`, `contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 }}`
- `keyExtractor={item => item.userId}`
- `RefreshControl` with `onRefresh={() => fetchFriends(true)}`, `tintColor={colors.primary}`

**Card design** — follow the same structure as `matches.tsx` cards:
- `Animated.View` (with `FadeInDown` animation) wrapping a `TouchableOpacity` (`activeOpacity={0.9}`, `onPress={() => router.push(`/profile/${friend.userId}` as any)}`)
- Card `View` (inside `TouchableOpacity`): `width: COLUMN_WIDTH`, `height: COLUMN_WIDTH * 1.45`, `borderRadius: radius.xxl`, `overflow: 'hidden'`, `position: 'relative'`, `...shadow.card`, `borderWidth: 1`, `borderColor: 'rgba(45,30,75,0.05)'`
- `Image` uses `StyleSheet.absoluteFillObject` + `resizeMode: 'cover'`
- `cardGradient` — dark overlay `View` using `StyleSheet.absoluteFillObject`, `backgroundColor: 'rgba(45,30,75,0.2)'`, `marginTop: '60%'` (covers bottom 40% of card)
- Bottom info `View` — `position: 'absolute'`, `bottom: 0`, `left: 0`, `right: 0`, `padding: spacing.md` — contains:
  - Name: white, `Lexend_600SemiBold`, 16px
  - Subtitle: `{emoji} {title} · {date}` — white/translucent, 11px, `numberOfLines={1}`
    - `emoji` from `FRIEND_CATEGORY_EMOJI[category ?? ''] ?? DEFAULT_FRIEND_EMOJI`
    - `date` formatted as `MMM D` (e.g. `Mar 10`) via `new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`
- Hangout count badge — `position: 'absolute'`, `top: spacing.md`, `right: spacing.md` — pill shape:
  - Text: `{n} hangout{n !== 1 ? 's' : ''}` — white, 10px, bold
  - Background: `colors.primary` with `borderRadius: radius.full`
- Missing `profilePhoto` (null): initials avatar — a `View` with `StyleSheet.absoluteFillObject`, `backgroundColor: colors.primary + '22'`, centered `Text` showing `firstName[0].toUpperCase()` in `BricolageGrotesque_800ExtraBold`, 48px, `colors.primary` (same as `matches.tsx` placeholder)
- `Animated.View` with `FadeInDown.delay(index * 80).springify()` wrapping each card (same as `matches.tsx`)


**States:**

| State | UI |
|-------|----|
| Loading | Centered `ActivityIndicator` (`size="large"`, `color={colors.primary}`) + "Loading friends..." text below |
| Empty | Centered icon (`🤝`, fontSize 56) + title "No friends yet" + subtitle "Complete a hangout and leave positive feedback to add friends!" + button "Find a Hangout" → `router.push('/(tabs)/hangouts' as any)` |
| Error | Centered error text + "Try Again" `TouchableOpacity` that re-calls `friendApi.getAll()` |
| Pull-to-refresh | `RefreshControl` on `FlatList`, `tintColor={colors.primary}` |

---

## Out of Scope

- Pagination (friend lists are small; add later if needed)
- Mutual feedback requirement (only current user's feedback is checked)
- "Remove friend" action
- Friend request / approval flow

---

## Files Affected

| File | Change |
|------|--------|
| `frendli-api/src/routes/friends.ts` | New — route handler for `GET /api/friends` |
| `frendli-api/src/index.ts` | Register `/api/friends` route (add import + `app.use('/api/friends', ...)`) |
| `frendli-app/app/(tabs)/friends.tsx` | New — Friends screen |
| `frendli-app/app/(tabs)/matches.tsx` | **Delete** |
| `frendli-app/app/(tabs)/_layout.tsx` | Rename screen to `friends`, update label + icon |
| `frendli-app/app/(tabs)/messages.tsx` | Update compose button route to `/(tabs)/friends` |
| `frendli-app/app/(tabs)/index.tsx` | Line 190: `/(tabs)/matches` → `/`; Line 275: `/(tabs)/matches` → `/` |
| `frendli-app/app/(tabs)/profile.tsx` | Update 2 route pushes + replace match count with friend count via `friendApi` |
| `frendli-app/lib/api.ts` | Add `friendApi` |
