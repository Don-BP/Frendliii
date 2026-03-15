# Discover Screen — Architecture

The Discover screen (`app/(tabs)/index.tsx`) is the main feed of the RealConnect app. It shows
friend suggestions, incoming waves, nearby hangouts, and contextual next steps.

---

## Responsibility of `index.tsx`

`index.tsx` is the orchestration layer. It owns:
- All state (`recommendations`, `wavesReceived`, `happeningSoon`, `filters`, etc.)
- All data fetching (`fetchDiscoveryData`, `hangoutApi.getPendingFeedback`)
- All event handlers (`handleWave`, `handleFilter`, `handleStepPress`, `handleSOS`)
- Navigation logic

`index.tsx` does **not** contain any layout or styling code — that lives in section components.

---

## Component Map

```
components/discover/
  DiscoverHeader.tsx         — Greeting, avatar (real photo), filter button, notification bell, SOS long-press
  StreakBanner.tsx           — Session-dismissible streak card; renders nothing when count is 0
  WavesSection.tsx           — Waves received list with badge count and empty state
  NextStepsSection.tsx       — Priority-ordered next step cards (max 2); computed from UserState
  HappeningSoonSection.tsx   — Horizontal scroll of upcoming hangouts; hidden when list is empty
  SuggestedFriendsSection.tsx — Vertical list of DiscoveryCard components with empty state
  FilterSheet.tsx            — Bottom-sheet filter panel (distance, interests, availability)
  index.ts                   — Barrel export for all of the above
```

Standalone components (not in `discover/`):
```
components/
  DiscoveryCard.tsx    — Individual friend suggestion card (used inside SuggestedFriendsSection)
  WaveReceivedCard.tsx — Individual wave card (used inside WavesSection)
  NextStepCard.tsx     — Individual next step card (used inside NextStepsSection)
  MatchModal.tsx       — Full-screen match celebration modal
  HangoutFeedback.tsx  — Post-meetup rating prompt
```

---

## Data Flow

```
index.tsx
  │  (owns all state and handlers)
  │
  ├─► DiscoverHeader         onFilterPress → opens FilterSheet
  │                          onNotificationPress → router.push('/notifications')
  │                          onSOSLongPress → useSilentSOS.handleSOS()
  │
  ├─► StreakBanner           onDismiss → setIsStreakDismissed(true)
  │
  ├─► WavesSection           onWaveBack → handleWave(profile, 'like')
  │                          onDismiss(waveId) → filters wave from local state
  │
  ├─► NextStepsSection       onStepPress(StepKey) → handleStepPress() routes to correct screen
  │
  ├─► HappeningSoonSection   onHangoutPress(id) → router.push('/hangouts/[id]')
  │                          onSeeAll → router.push('/(tabs)/hangouts')
  │
  ├─► SuggestedFriendsSection onWave → handleWave(profile, 'like')
  │                            onView(userId) → router.push('/profile/[userId]')
  │                            onSeeAll → router.push('/(tabs)/matches')
  │
  ├─► FilterSheet            onApply(filters) → setFilters() + closes sheet → triggers re-fetch
  │                          onClose → closes sheet without applying
  │
  ├─► MatchModal             onClose → hides modal
  │                          onMessagePress → navigates to messages tab
  │
  └─► HangoutFeedback        onFeedbackSubmitted → hides + re-fetches
                             onSkip → calls skipFeedback API + hides
                             onReschedule → navigates to /hangouts/plan
```

---

## Filter System

Filters are stored in `index.tsx` as:
```ts
interface Filters {
  maxDistanceKm: number | null;  // null = Any
  interests: string[];           // subset of current user's interests
  days: string[];                // e.g. ['monday', 'friday']
}
```

When filters are applied, `fetchDiscoveryData` sends them as query params:
- `maxDistance` — maximum distance in km
- `filterInterests` — comma-separated interest strings
- `filterDays` — comma-separated day strings

The backend applies these as JavaScript post-fetch filters before returning results.
No schema changes are needed.

A filled orange dot appears on the filter button in `DiscoverHeader` when any filter is active.

---

## NextStepsSection — Priority Logic

`NextStepsSection` computes up to 2 step cards from `UserState`. Priority order:

| Priority | Condition | Step shown |
|---|---|---|
| 1 | `!safetyBriefingCompleted` | Complete Safety Briefing |
| 2 | `!hasConnections` | Send your first Wave |
| 3 | `hasConnections && !hasPlannedHangout` | Plan your first hangout |
| 4 | `hasPendingFeedback` | Rate your last hangout |
| 5 | `!hasProfilePhoto` | Add a profile photo |

`UserState` data sources:
- `safetyBriefingCompleted` — `authStore.profile.safetyBriefingCompleted`
- `hasConnections` — `matchCount > 0` (from discovery API response)
- `hasPlannedHangout` — `upcomingHangoutCount > 0` (from discovery API response)
- `hasPendingFeedback` — `pendingFeedbackHangout !== null`
- `hasProfilePhoto` — `authStore.profile.photos.length > 0`

---

## How to Add a New Section

1. Create `components/discover/MyNewSection.tsx`
2. Define its props interface — data in, callbacks out
3. Export it from `components/discover/index.ts`
4. Add its data to the fetch in `index.tsx` (`fetchDiscoveryData`)
5. Add its state variables to `index.tsx`
6. Add its handlers to `index.tsx`
7. Render it in the `ScrollView` in `index.tsx`

Sections should never fetch data themselves. All fetching lives in `index.tsx`.
