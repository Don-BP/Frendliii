# Design: Messages & Chat — Bug Fixes & Data Connections

**Date:** 2026-03-15
**Scope:** `messages.tsx`, `chat/[id].tsx`, new `ReportUserModal.tsx` component
**Status:** Approved

---

## Problem Summary

Four issues exist in the Messages list and Chat screens:

1. **Active Hangouts (messages list) is hardcoded** — a static mock array instead of real data.
2. **Hangout info bar (chat screen) is hardcoded** — always shows "Board Games / Today at 7:00 PM · Starbucks" regardless of actual planned hangouts.
3. **Search and compose buttons are dead** — both `onPress={() => {}}` with no implementation.
4. **Report user crashes on Android/web** — uses `Alert.prompt` which is iOS-only.

---

## Fix 1: Real Hangout Data

### Attendee data shape (important)

`hangoutApi.getMy()` returns an array of `Hangout` objects. Each hangout's `attendees` field is an array of `HangoutAttendee` join-table records with shape:
```ts
{ id: string; hangoutId: string; userId: string; user: { id: string; profile: {...} } }
```
The user ID is at `attendee.userId`. All attendee filters below must use `attendees.some(a => a.userId === targetId)`.

### Category-to-emoji mapping

The `category` field on a hangout is a plain string. Use this mapping for the emoji badge:

```ts
const CATEGORY_EMOJI: Record<string, string> = {
  cafe:         '☕',
  restaurant:   '🍽️',
  park:         '🌿',
  museum:       '🏛️',
  bar:          '🍺',
  music_venue:  '🎸',
  karaoke:      '🎤',
  gym:          '🏋️',
  games:        '🎲',
  any:          '✨',
};
const DEFAULT_EMOJI = '🎉';
// Usage: CATEGORY_EMOJI[hangout.category ?? ''] ?? DEFAULT_EMOJI
```

### Active Hangouts section (`messages.tsx`)

- On mount, call `hangoutApi.getMy()` in parallel with `messageApi.getMatches()`.
- Filter: `new Date(h.startTime) > new Date() && h.status !== 'cancelled'`.
- Sort ascending by `startTime`.
- Render each in the horizontal scroll: show `hangout.title` and the category emoji badge.
- **Error handling:** if `hangoutApi.getMy()` throws, swallow the error with `console.error` (matching the existing pattern in `fetchMatches`). The section will be hidden because the filtered list will be empty.
- If the filtered list is empty (including on error), **hide the entire "Active Hangouts" section** — no empty state. Wrap the entire outer `<View style={styles.activeHangoutsGroup}>` (including the "Active Hangouts" label) in `{activeHangouts.length > 0 && (...)}`. Do not conditionally render only the inner `ScrollView`.
- Tapping a hangout item is a **no-op** for now (the hangout detail route is out of scope). Wrap in `TouchableOpacity` with an empty `onPress` so the tap style is visible and the route can be wired later.

### Hangout info bar (`chat/[id].tsx`)

- After `otherUserProfile` is set, call `hangoutApi.getMy()`.
- Filter: `attendees.some(a => a.userId === otherUserProfile.id) && new Date(h.startTime) > new Date() && h.status !== 'cancelled'`.
- Sort ascending by `startTime`, take index `[0]`.
- If found: display real `hangout.title`, formatted `startTime`, and `hangout.venue?.name ?? 'Venue TBD'`.
- **Date formatting:** use a helper:
  - Same calendar day as today → `"Today at H:MM AM/PM"`
  - Next calendar day → `"Tomorrow at H:MM AM/PM"`
  - Otherwise → `"EEE, MMM D at H:MM AM/PM"` (use `toLocaleDateString` / `toLocaleTimeString`)
- **Tap behaviour:** the bar is **non-tappable** (`View` instead of `TouchableOpacity`). Remove the chevron icon. The hangout detail route doesn't exist yet.
- If none found, or `otherUserProfile` is null, or the fetch throws: **hide the bar entirely**.
- **Error handling:** swallow with `console.error`.

---

## Fix 2: Search & Compose Buttons (`messages.tsx`)

### Search

- Add state: `showSearch: boolean` (default `false`), `searchQuery: string` (default `''`).
- **Header layout when `showSearch = false` (normal):** title on the left, two icon buttons (search, compose) on the right — unchanged from current.
- **Header layout when `showSearch = true` (search active):** the entire header row becomes a single row with a cancel/back chevron on the left, an auto-focused `TextInput` in the center (flex: 1), and a clear `×` button on the right that appears only when `searchQuery` is non-empty. The original title and both icon buttons are hidden. The header container height does not change — use `Animated.timing` to cross-fade between the two layouts (opacity from 0→1 on the search row, 1→0 on the normal row) so height stays fixed.
- Filter expression — applied to the full `matches` array before the `newMatches`/`recentChats` split:
  ```ts
  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? matches.filter(m =>
        m.otherUser.firstName.toLowerCase().includes(q) ||
        (m.hangoutTitle ?? '').toLowerCase().includes(q)
      )
    : matches;
  ```
  Note: `hangoutTitle` is `string | undefined`; the `?? ''` guard prevents a runtime crash.
- Tapping the cancel chevron sets `showSearch = false` and `searchQuery = ''`.
- Tapping `×` clears `searchQuery` but keeps search mode open.
- The filtered array feeds into the existing `newMatches`/`recentChats` split logic (replace `matches` with `filtered` in those derivations).

### Compose (edit icon)

- `onPress` navigates to `/(tabs)/matches` using `router.push('/(tabs)/matches')`.
- No tooltip needed.

---

## Fix 3: Report User Modal (`chat/[id].tsx` + new component)

Replace `Alert.prompt` (iOS-only) with a custom `ReportUserModal` component.

### Component: `components/ReportUserModal.tsx`

**Props:**
```ts
interface ReportUserModalProps {
  visible: boolean;
  reportedUserId: string;
  reportedUserName?: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Reason options (single-select):**
```ts
const REPORT_REASONS = [
  'Harassment or bullying',
  'Inappropriate content',
  'Spam or fake profile',
  'Threatening behaviour',
  'Other',
];
```

**UI:**
- Bottom sheet modal (`animationType="slide"`, `transparent`, semi-transparent overlay).
- Header: `"Report [reportedUserName ?? 'User']"` with a close `×` button.
- Reason list: full-width tappable rows, each with a radio circle indicator on the left. Selecting a row highlights it and deselects any prior selection.
- When `"Other"` is selected: a `TextInput` animates in below the list (optional free-text field, placeholder `"Tell us more (optional)"`).
- Submit button: disabled and at reduced opacity until a reason is selected.
- On submit: calls `POST /api/safety/report` via `fetch` (mirroring the existing pattern in `chat/[id].tsx` for report/block calls), body `{ reportedId, reason, details? }`.
- On success: call `onSuccess()` then `onClose()`, then fire `Alert.alert('Reported', 'Thank you for keeping the community safe.')`.
- On error: fire `Alert.alert('Error', 'Failed to report user. Please try again.')`.
- Loading state: show `ActivityIndicator` inside the submit button while the request is in flight; disable the button.

**Usage in `chat/[id].tsx`:**
- Add `showReportModal: boolean` state (default `false`).
- **Replace the entire body of the existing `handleReport` function** (which currently contains `Alert.prompt(...)`) **with a single line: `setShowReportModal(true)`**. Do not leave the `Alert.prompt` call in place alongside the new modal — remove it entirely.
- Render `<ReportUserModal>` at the bottom of the JSX tree alongside the other modals, passing:
  - `reportedUserId={(otherUserProfile?.id ?? id) as string}` — the `as string` cast is required because `id` from `useLocalSearchParams()` is typed `string | string[]`.
  - `reportedUserName={otherUserProfile?.firstName}`

---

## Files Changed

| File | Change |
|---|---|
| `frendli-app/app/(tabs)/messages.tsx` | Real hangout data, search state + UI, compose navigation |
| `frendli-app/app/chat/[id].tsx` | Real hangout bar, report modal integration |
| `frendli-app/components/ReportUserModal.tsx` | New component — report user bottom sheet |

No backend changes required.

---

## Out of Scope

- Hangout detail screen (`/hangouts/[id]`) — tapping an active hangout item is a no-op for now.
- SafeArrival geolocation flow — separate feature.
- Friendship milestones — separate feature.
- Pre-meetup safety briefing — separate feature.
- Icebreaker chips / inline activity cards — next brainstorm session.
