# Discover Screen Refactor — Design Spec
**Date:** 2026-03-15
**Status:** Approved
**Scope:** `frendli-app` (React Native / Expo)

---

## 1. Problem

`app/(tabs)/index.tsx` is a monolithic ~624-line file mixing layout, data fetching, event handling, and UI logic. This makes it hard to edit, extend, or hand off. Several features are incomplete or use placeholder data despite real data being available.

### Known gaps to fix alongside the refactor
1. Filter button in header has no `onPress` — no filter functionality
2. NextStepCards are hardcoded strings, not derived from user state
3. DiscoveryCard shows friendship style as hardcoded "Small Groups"
4. Age is never calculated from `dob` — falls back to hardcoded `24`
5. Header avatar is a hardcoded Unsplash URL, not the user's real photo
6. No pull-to-refresh on the ScrollView
7. No empty state when `recommendations` is an empty array

---

## 2. Goal

Refactor the Discover screen into a maintainable, section-based architecture. `index.tsx` becomes a thin orchestration layer. All 7 gaps above are fixed as part of the same pass. Document the structure so future sessions can pick up without ramp-up.

---

## 3. Architecture

### Principle
`index.tsx` owns state, data fetching, and event handlers. It renders section components that are purely presentational — no fetching, no side effects.

### New folder
```
frendli-app/
  components/
    discover/
      DiscoverHeader.tsx
      StreakBanner.tsx
      WavesSection.tsx
      NextStepsSection.tsx
      HappeningSoonSection.tsx
      SuggestedFriendsSection.tsx
      FilterSheet.tsx
      index.ts                   ← barrel export
  docs/
    discover/
      README.md                  ← living architecture doc
      refactor-guide.md          ← one-time migration record
```

### Existing components — unchanged location and interface
`DiscoveryCard.tsx`, `WaveReceivedCard.tsx`, `NextStepCard.tsx`, `MatchModal.tsx`, `HangoutFeedback.tsx` remain in `components/`. Only screen-level composition moves. **Exception:** `DiscoveryCard` and `WaveReceivedCard` get `dob?: string` added to their Profile type so `calculateAge` can be used (see Section 6).

### Data flow
```
index.tsx
  │  state: recommendations, wavesReceived, happeningSoon,
  │          streakCount, isStreakDismissed, filters, wavedProfiles,
  │          matchData, showFeedback, pendingFeedbackHangout, isLoading
  │  handlers: handleWave, handleFilter, handleRefresh, handleSOS
  │
  ├─► DiscoverHeader         (props: profile, hasActiveFilters, onFilterPress,
  │                                  onNotificationPress, onSOSLongPress)
  ├─► StreakBanner            (props: streakCount, onDismiss)
  ├─► WavesSection            (props: waves, onWaveBack, onDismiss(waveId))
  ├─► NextStepsSection        (props: userState, onStepPress(step))
  ├─► HappeningSoonSection    (props: hangouts, onHangoutPress, onSeeAll)
  ├─► SuggestedFriendsSection (props: recommendations, wavedProfiles,
  │                                   onWave, onView, onSeeAll)
  ├─► MatchModal              (props: matchData, onClose, onMessagePress)
  └─► HangoutFeedback         (props: hangout, onClose, onFeedbackSubmitted,
                                      onSkip, onReschedule)
```

---

## 4. Component Contracts

### DiscoverHeader
```ts
interface DiscoverHeaderProps {
  profile: { firstName: string; photos: string[] } | null;
  hasActiveFilters: boolean;
  onFilterPress: () => void;
  onNotificationPress: () => void;
  onSOSLongPress: () => void;
}
```
- Displays real `profile.photos[0]` as avatar (falls back to placeholder if null)
- Shows filled dot on filter button when `hasActiveFilters` is true

### StreakBanner
```ts
interface StreakBannerProps {
  streakCount: number;
  onDismiss: () => void;
}
```
- Renders nothing when `streakCount === 0` OR when dismissed
- `onDismiss` sets a local `isStreakDismissed: boolean` state in `index.tsx` (not `setStreakCount(0)`)
  — this means a pull-to-refresh restores the streak value from the API but the banner stays
  dismissed for the session. `isStreakDismissed` resets to `false` only when `fetchDiscoveryData`
  completes (i.e., a real refresh re-shows a still-active streak).

### WavesSection
```ts
interface WavesSectionProps {
  waves: Wave[];
  onWaveBack: (profile: Profile) => void;
  onDismiss: (waveId: string) => void;
}
```
- `WavesSection` internally maps over `waves` and calls `onDismiss(wave.id)` per card;
  `WaveReceivedCard.onDismiss` remains `() => void` — the id is captured in the map closure,
  not emitted by the card itself.
- Renders empty state ("No new waves yet") when `waves` is empty

### NextStepsSection

```ts
type StepKey = 'safety' | 'first-wave' | 'plan-hangout' | 'rate-hangout' | 'add-photo';

interface UserState {
  safetyBriefingCompleted: boolean;  // source: authStore.profile.safetyBriefingCompleted
  hasConnections: boolean;           // source: discovery response — add matchCount to response
  hasPlannedHangout: boolean;        // source: discovery response — add upcomingHangoutCount to response
  hasPendingFeedback: boolean;       // source: pendingFeedbackHangout !== null (already in state)
  hasProfilePhoto: boolean;          // source: authStore.profile.photos.length > 0
}

interface NextStepsSectionProps {
  userState: UserState;
  onStepPress: (step: StepKey) => void;
}
```

**Step → navigation mapping** (handled in `index.tsx`'s `onStepPress`):
| StepKey | Route |
|---|---|
| `'safety'` | `/safety/briefing` |
| `'first-wave'` | `/(tabs)/matches` |
| `'plan-hangout'` | `/hangouts/plan` |
| `'rate-hangout'` | triggers `setShowFeedback(true)` in `index.tsx` |
| `'add-photo'` | `/edit-profile` |

Priority-ordered steps (renders top 2):
1. `!safetyBriefingCompleted` → "Complete Safety Briefing"
2. `!hasConnections` → "Send your first Wave"
3. `hasConnections && !hasPlannedHangout` → "Plan your first hangout"
4. `hasPendingFeedback` → "Rate your last hangout"
5. `!hasProfilePhoto` → "Add a profile photo"

**Backend change needed:** Add `matchCount: number` and `upcomingHangoutCount: number` to the
discovery API response (Section 5).

### HappeningSoonSection
```ts
interface HappeningSoonSectionProps {
  hangouts: Hangout[];
  onHangoutPress: (id: string) => void;
  onSeeAll: () => void;
}
```

### SuggestedFriendsSection
```ts
interface SuggestedFriendsSectionProps {
  recommendations: Profile[];
  wavedProfiles: string[];
  onWave: (profile: Profile) => void;
  onView: (userId: string) => void;
  onSeeAll: () => void;
}
```
- Renders an empty state card ("No suggestions right now — try adjusting your filters")
  when `recommendations` is empty

### FilterSheet
```ts
interface Filters {
  maxDistanceKm: number | null;  // null = Any
  interests: string[];
  days: string[];
}
interface FilterSheetProps {
  visible: boolean;
  currentFilters: Filters;
  userInterests: string[];        // from authStore.profile.interests
  onApply: (filters: Filters) => void;
  onClose: () => void;
}
```
- Built with React Native `Modal` + slide-up animation (no new library)
- Three groups: Distance segmented control (2 / 5 / 10 / Any), Interests multi-select chips,
  Days multi-select (Mon–Sun)
- "Reset" clears all filters; "Apply" closes sheet and triggers re-fetch

---

## 5. Backend Changes

File: `frendli-api/src/routes/discovery.ts`

### New query params for filtering
`maxDistance` (km, number), `filterInterests` (comma-separated string), `filterDays` (comma-separated string).

Applied **before** the scoring loop as JS post-fetch filters (no SQL changes needed at MVP scale):
- `maxDistance`: filter candidates by `distanceKm <= maxDistance`
- `filterInterests`: candidate must share at least one interest with the filter list
- `filterDays`: candidate must have at least one overlapping availability day

### New fields in response
Add to the existing response object:
```ts
{
  matchCount: number,            // total confirmed matches for the user
  upcomingHangoutCount: number,  // hangouts the user is attending with status 'upcoming'
  // ... existing fields unchanged
}
```
These are two additional Prisma queries using existing models — no schema change.

---

## 6. Data Fixes

### Age from DOB
New utility: `frendli-app/lib/calculateAge.ts`
```ts
export function calculateAge(dob: string | null | undefined): number | undefined {
  if (!dob) return undefined;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
```
- `DiscoveryCard` and `WaveReceivedCard` each get `dob?: string` added to their Profile type
- `calculateAge(profile.dob)` is called inside each card; result is displayed, falling back to
  `profile.age` if `dob` is absent

### Friendship Style
`DiscoveryCard` reads `profile.friendshipStyle` and maps to a display label:
```ts
const friendshipStyleLabel: Record<string, string> = {
  'one-on-one': 'One-on-One',
  'small-group': 'Small Groups',
  'open-gatherings': 'Open Gatherings',
};
// usage: friendshipStyleLabel[profile.friendshipStyle] ?? 'Small Groups'
```

### Header Avatar
`DiscoverHeader` reads `profile.photos[0]` from the auth store. Falls back to placeholder if empty.

---

## 7. Pull-to-Refresh

`ScrollView` in `index.tsx` gains:
```tsx
import { RefreshControl } from 'react-native';

refreshControl={
  <RefreshControl refreshing={isLoading} onRefresh={fetchDiscoveryData} />
}
```

---

## 8. Documentation Files

### `docs/discover/README.md`
- Screen responsibility (what `index.tsx` owns)
- Component map (one line per file)
- Text-based data flow diagram
- Filter system overview
- "How to add a new section" step-by-step guide

### `docs/discover/refactor-guide.md`
- Before/after structure comparison
- Per-fix notes for all 7 gaps
- Session log (date + what was completed) — updated each session

---

## 9. Implementation Order

1. Create `calculateAge` utility (`frendli-app/lib/calculateAge.ts`)
2. Create `components/discover/` folder and all section component files (extract from `index.tsx`)
3. Create barrel export `components/discover/index.ts`
4. Create `FilterSheet.tsx` inside `components/discover/`
5. Fix `DiscoveryCard`: add `dob?` to Profile type, use `calculateAge`, use friendship style map
6. Fix `WaveReceivedCard`: add `dob?` to Profile type, use `calculateAge`
7. Rewrite `index.tsx` to use section components; add pull-to-refresh; add `isStreakDismissed` state
8. Update backend `discovery.ts`: filter params + `matchCount`/`upcomingHangoutCount` in response
9. Write `docs/discover/README.md` and `docs/discover/refactor-guide.md`

---

## 10. Out of Scope

- No changes to auth flow, matching algorithm weights, or database schema
- No changes to other tabs (matches, hangouts, messages, profile)
- No new navigation routes
- `MatchModal` and `HangoutFeedback` stay in `components/` root (shared across future screens)
