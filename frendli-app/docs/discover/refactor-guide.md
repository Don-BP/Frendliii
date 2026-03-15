# Discover Screen Refactor Guide

This document records what changed, why, and the session log for this refactor.
Update the Session Log at the bottom whenever work continues.

---

## Before: Monolithic `index.tsx`

All concerns were mixed into a single ~624-line file:
- Layout and styling (all `StyleSheet.create` calls)
- Data fetching (`fetchDiscoveryData`)
- Event handlers (`handleWave`)
- Inline JSX for every section (header, streak, waves, next steps, hangouts, friends)
- No filter functionality despite the filter button being present in the UI

---

## After: Orchestrator + Section Components

`index.tsx` is now ~340 lines — down from ~624 — and contains only state, fetching, handlers, and derived values. All layout and styling has moved to section components.
UI is split into focused components in `components/discover/`.

---

## Per-Fix Notes

### Fix 1: Filter button now works
Previously: `TouchableOpacity` with no `onPress`.
Now: opens `FilterSheet` bottom sheet. Filters are passed as query params to the API.
Active filters show an orange dot on the filter icon.

### Fix 2: NextStepCards are now dynamic
Previously: two hardcoded `<NextStepCard>` elements with static strings.
Now: `NextStepsSection` computes steps from `UserState` in priority order (max 2).
Data sources: `authStore`, `matchCount` and `upcomingHangoutCount` from the discovery API.

### Fix 3: Friendship style is now real data
Previously: `DiscoveryCard` showed hardcoded "Small Groups" for every user.
Now: reads `profile.friendshipStyle` and maps it via `FRIENDSHIP_STYLE_LABEL` object.
Falls back to "Small Groups" if null.

### Fix 4: Age is now calculated from DOB
Previously: fell back to hardcoded `24` if `profile.age` was missing.
Now: `calculateAge(profile.dob)` utility (`lib/calculateAge.ts`) computes actual age.
Falls back chain: `calculateAge(dob)` → `profile.age` → `24`.

### Fix 5: Header avatar is now the real user photo
Previously: hardcoded Unsplash URL.
Now: `DiscoverHeader` reads `profile.photos[0]` from `useAuthStore()`. Falls back to placeholder if empty.

### Fix 6: Pull-to-refresh added
`ScrollView` now has a `refreshControl` prop using `RefreshControl` from React Native.
Tied to `isLoading` state and `fetchDiscoveryData` handler.
If the API returns a non-zero streak after a refresh, `isStreakDismissed` resets to `false` so the banner reappears. If streak is zero or missing, the dismissed state is preserved and the banner stays hidden.

### Fix 7: Empty states added
`WavesSection`: shows "No new waves yet" when list is empty.
`SuggestedFriendsSection`: shows "No suggestions right now — try adjusting your filters" when list is empty.

---

## Session Log

| Date | Work completed |
|---|---|
| 2026-03-15 | Initial refactor — all 9 tasks completed. All 7 gaps fixed. Docs written. |

_Add a new row each session that touches the Discover screen._
