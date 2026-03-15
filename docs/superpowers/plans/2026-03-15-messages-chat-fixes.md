# Messages & Chat Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four broken/mock areas in the Messages and Chat screens — replacing hardcoded hangout data with real API data, implementing search and compose, and replacing the iOS-only `Alert.prompt` report flow with a cross-platform modal.

**Architecture:** All data comes from the existing `hangoutApi.getMy()` endpoint (returns all upcoming hangouts with full attendee data). Client-side filtering isolates the hangout(s) relevant to each screen. The report modal is a standalone bottom-sheet component integrated into the chat screen.

**Tech Stack:** React Native (Expo), TypeScript, `expo-router`, `@expo/vector-icons`, existing `hangoutApi` / `messageApi` from `lib/api.ts`, Supabase auth for the report request.

**Spec:** `docs/superpowers/specs/2026-03-15-messages-chat-fixes-design.md`

---

## Chunk 1: ReportUserModal Component + Chat Integration

### Task 1: Create `ReportUserModal.tsx`

**Files:**
- Create: `frendli-app/components/ReportUserModal.tsx`

- [ ] **Step 1: Create the file with complete implementation**

```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { supabase } from '../lib/supabase';

const REPORT_REASONS = [
    'Harassment or bullying',
    'Inappropriate content',
    'Spam or fake profile',
    'Threatening behaviour',
    'Other',
];

interface ReportUserModalProps {
    visible: boolean;
    reportedUserId: string;
    reportedUserName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
    visible,
    reportedUserId,
    reportedUserName,
    onClose,
    onSuccess,
}) => {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        setSelectedReason(null);
        setDetails('');
        onClose();
    };

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setLoading(true);
        try {
            if (!supabase) throw new Error('Supabase not initialized');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/safety/report`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reportedId: reportedUserId,
                    reason: selectedReason,
                    ...(selectedReason === 'Other' && details.trim()
                        ? { details: details.trim() }
                        : {}),
                }),
            });

            if (!response.ok) throw new Error('Report failed');

            onSuccess();
            handleClose();
            Alert.alert('Reported', 'Thank you for keeping the community safe.');
        } catch (error) {
            Alert.alert('Error', 'Failed to report user. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            Report {reportedUserName ?? 'User'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Feather name="x" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>
                        Why are you reporting this person?
                    </Text>

                    {REPORT_REASONS.map((reason) => (
                        <TouchableOpacity
                            key={reason}
                            style={[
                                styles.reasonRow,
                                selectedReason === reason && styles.reasonRowSelected,
                            ]}
                            onPress={() => setSelectedReason(reason)}
                        >
                            <View style={[
                                styles.radio,
                                selectedReason === reason && styles.radioSelected,
                            ]}>
                                {selectedReason === reason && (
                                    <View style={styles.radioDot} />
                                )}
                            </View>
                            <Text style={[
                                styles.reasonText,
                                selectedReason === reason && styles.reasonTextSelected,
                            ]}>
                                {reason}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {selectedReason === 'Other' && (
                        <TextInput
                            style={styles.detailsInput}
                            placeholder="Tell us more (optional)"
                            placeholderTextColor={colors.textTertiary}
                            value={details}
                            onChangeText={setDetails}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    )}

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!selectedReason || loading) && styles.buttonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!selectedReason || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.surface} />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Report</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        padding: spacing.xl,
        paddingBottom: spacing.xxl + 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    sectionLabel: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.md,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    reasonRowSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    reasonText: {
        ...typography.body,
        color: colors.textPrimary,
    },
    reasonTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    detailsInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        height: 90,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    submitButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.lg,
        ...shadow.md,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    submitButtonText: {
        ...typography.bodyBold,
        color: colors.surface,
        fontSize: 18,
    },
});
```

- [ ] **Step 2: Verify the file was created**

Confirm `frendli-app/components/ReportUserModal.tsx` exists. TypeScript should compile without errors (no `tsc` run needed — just confirm no red underlines in IDE if available).

---

### Task 2: Integrate `ReportUserModal` into chat screen

**Files:**
- Modify: `frendli-app/app/chat/[id].tsx`

Context: The current `handleReport` (lines ~137–167) calls `Alert.prompt` which crashes on Android/web. We replace it with the modal. The `showReportModal` state and modal render are new additions.

- [ ] **Step 1: Add the `ReportUserModal` import**

At the top of the file, after the existing `HangoutFeedback` import (line ~12):

```tsx
import { ReportUserModal } from '../../components/ReportUserModal';
```

- [ ] **Step 2: Add `showReportModal` state**

In `frendli-app/app/chat/[id].tsx`, find the state declarations block (lines ~27–35). Add after `const [otherUserProfile, setOtherUserProfile] = useState<any>(null);`:

```tsx
const [showReportModal, setShowReportModal] = useState(false);
```

- [ ] **Step 3: Replace the `handleReport` function body only**

Find `handleReport` in the file. The function declaration `const handleReport = () => {` on line ~137 and its closing `};` on line ~167 must be **kept**. Replace only the body — everything between those two lines (the `Alert.prompt(...)` block and all its nested content) — with a single statement:

```tsx
const handleReport = () => {
    setShowReportModal(true);
};
```

The resulting function is three lines total. The entire `Alert.prompt(...)` call, including its callback array, must be removed.

- [ ] **Step 4: Render the modal in JSX**

Inside the `<KeyboardAvoidingView>` return block, locate the closing `}` of the `HangoutFeedback` conditional block (line ~353). Add `<ReportUserModal>` immediately after it and before the `<FlatList>` (line ~355):

```tsx
<ReportUserModal
    visible={showReportModal}
    reportedUserId={(otherUserProfile?.id ?? id) as string}
    reportedUserName={otherUserProfile?.firstName}
    onClose={() => setShowReportModal(false)}
    onSuccess={() => {}}
/>
```

- [ ] **Step 5: Manual verification**

Run the app (`npx expo start`), navigate to any chat, tap the `···` menu → tap "Report". Verify:
- On web/Android: a bottom sheet slides up (not a crash)
- Reason rows are selectable
- "Other" reveals the text input
- Submit is disabled until a reason is selected
- Tapping × dismisses the modal cleanly

- [ ] **Step 6: Commit**

```bash
git add frendli-app/components/ReportUserModal.tsx frendli-app/app/chat/[id].tsx
git commit -m "fix: replace Alert.prompt report flow with cross-platform ReportUserModal"
```

---

## Chunk 2: Real Hangout Data + Search & Compose

### Task 3: Real hangout data in messages list

**Files:**
- Modify: `frendli-app/app/(tabs)/messages.tsx`

Context: The "Active Hangouts" section (lines ~184–221) is fully hardcoded with two mock items. We connect it to `hangoutApi.getMy()` and render real data, hiding the section when empty.

- [ ] **Step 1: Update imports**

In `frendli-app/app/(tabs)/messages.tsx`:

Change line 7:
```tsx
import { messageApi } from '../../lib/api';
```
To:
```tsx
import { messageApi, hangoutApi } from '../../lib/api';
```

- [ ] **Step 2: Add the `CATEGORY_EMOJI` mapping constant**

Add before the `MessagesScreen` component declaration:

```tsx
const CATEGORY_EMOJI: Record<string, string> = {
    cafe:        '☕',
    restaurant:  '🍽️',
    park:        '🌿',
    museum:      '🏛️',
    bar:         '🍺',
    music_venue: '🎸',
    karaoke:     '🎤',
    gym:         '🏋️',
    games:       '🎲',
    any:         '✨',
};
const DEFAULT_EMOJI = '🎉';
```

- [ ] **Step 3: Add `activeHangouts` state**

Inside `MessagesScreen`, add after the existing state declarations (line ~36):

```tsx
const [activeHangouts, setActiveHangouts] = useState<any[]>([]);
```

- [ ] **Step 4: Update `fetchMatches` to fetch hangouts in parallel**

Replace the entire `fetchMatches` function with:

```tsx
const fetchMatches = async () => {
    try {
        const [data, hangoutsRaw] = await Promise.all([
            messageApi.getMatches(),
            hangoutApi.getMy().catch((err: any) => {
                console.error('Error fetching hangouts:', err);
                return [];
            }),
        ]);

        const now = new Date();
        const upcoming = (hangoutsRaw as any[])
            .filter((h: any) =>
                new Date(h.startTime) > now && h.status !== 'cancelled'
            )
            .sort((a: any, b: any) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
        setActiveHangouts(upcoming);

        const enhancedData = data.map((item: any, index: number) => ({
            ...item,
            otherUser: {
                ...item.otherUser,
                isOnline: index % 3 === 0,
                isSafe: index === 0,
            },
            lastMessage: item.lastMessage
                ? { ...item.lastMessage, isUnread: index < 2 }
                : null,
        }));
        setMatches(enhancedData);
    } catch (error) {
        console.error('Error fetching matches:', error);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
};
```

- [ ] **Step 5: Replace the hardcoded Active Hangouts section in JSX**

Find the `<View style={styles.activeHangoutsGroup}>` block (lines ~184–221) — the entire block including both hardcoded `TouchableOpacity` items inside the `ScrollView`. Replace the entire `<View style={styles.activeHangoutsGroup}>...</View>` block with:

```tsx
{activeHangouts.length > 0 && (
    <View style={styles.activeHangoutsGroup}>
        <Text style={styles.sectionHeaderLabel}>Active Hangouts</Text>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
        >
            {activeHangouts.map((hangout) => {
                const emoji = CATEGORY_EMOJI[hangout.category ?? ''] ?? DEFAULT_EMOJI;
                return (
                    <TouchableOpacity
                        key={hangout.id}
                        style={styles.activeHangoutItem}
                        onPress={() => {}}
                    >
                        <View style={styles.activeHangoutAvatarContainer}>
                            {hangout.imageUrl ? (
                                <Image
                                    source={{ uri: hangout.imageUrl }}
                                    style={styles.activeHangoutAvatar}
                                />
                            ) : (
                                <View style={[styles.activeHangoutAvatar, styles.activeHangoutAvatarEmoji]}>
                                    <Text style={styles.activeHangoutEmojiText}>{emoji}</Text>
                                </View>
                            )}
                            <View style={styles.activeActivityBadge}>
                                <Text style={styles.activeActivityIcon}>{emoji}</Text>
                            </View>
                        </View>
                        <Text style={styles.activeHangoutName} numberOfLines={1}>
                            {hangout.title}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    </View>
)}
```

- [ ] **Step 6: Add the emoji placeholder style**

In the `StyleSheet.create({...})` block, add after `activeHangoutAvatar`:

```tsx
activeHangoutAvatarEmoji: {
    justifyContent: 'center',
    alignItems: 'center',
} as ViewStyle,
activeHangoutEmojiText: {
    fontSize: 28,
} as TextStyle,
```

- [ ] **Step 7: Manual verification**

Run the app, navigate to the Messages tab. Verify:
- If you have upcoming hangouts in the DB: they appear with real titles and emoji badges
- If you have no upcoming hangouts: the "Active Hangouts" section is completely absent (no label, no scroll area)
- Pull-to-refresh still works

---

### Task 4: Real hangout info bar in chat screen

**Files:**
- Modify: `frendli-app/app/chat/[id].tsx`

Context: The hangout bar (lines ~309–323) is hardcoded. We replace it with real data fetched during the existing history load, or hide it when there's no upcoming shared hangout.

- [ ] **Step 1: Add `upcomingHangout` state**

In `frendli-app/app/chat/[id].tsx`, add after the existing state declarations:

```tsx
const [upcomingHangout, setUpcomingHangout] = useState<any>(null);
```

- [ ] **Step 2: Add the `formatHangoutTime` helper**

Add this function inside the component, after the state declarations and before the `useEffect`:

```tsx
const formatHangoutTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const afterTomorrowStart = new Date(tomorrowStart.getTime() + 86400000);
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (date >= todayStart && date < tomorrowStart) return `Today at ${timeStr}`;
    if (date >= tomorrowStart && date < afterTomorrowStart) return `Tomorrow at ${timeStr}`;
    return (
        date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
        ` at ${timeStr}`
    );
};
```

- [ ] **Step 3: Fetch the upcoming hangout inside `fetchHistory`**

Inside the `fetchHistory` async function (inside the main `useEffect`), find the block where `data.otherUser` is set:

```tsx
if (data.otherUser) {
    setOtherUserProfile(data.otherUser);
}
```

Replace it with:

```tsx
if (data.otherUser) {
    setOtherUserProfile(data.otherUser);
    try {
        const hangouts = await hangoutApi.getMy();
        const now = new Date();
        const matchHangout = (hangouts as any[])
            .filter((h: any) =>
                h.status !== 'cancelled' &&
                new Date(h.startTime) > now &&
                h.attendees.some((a: any) => a.userId === data.otherUser.id)
            )
            .sort((a: any, b: any) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )[0] ?? null;
        setUpcomingHangout(matchHangout);
    } catch (err) {
        console.error('Error fetching hangout for chat bar:', err);
    }
}
```

> **⚠️ Important:** The filter uses `data.otherUser.id` — the local variable from the fetch response, **not** `otherUserProfile?.id`. React state updates are asynchronous: `setOtherUserProfile(data.otherUser)` on the line above does not immediately update the `otherUserProfile` variable. At the time the filter runs, `otherUserProfile` is still `null`. Always use `data.otherUser.id` here.
```

- [ ] **Step 4: Replace the hardcoded hangout bar JSX**

Find the hardcoded `<TouchableOpacity style={styles.hangoutBar} ...>` block (lines ~309–323). Replace the **entire block** with:

```tsx
{upcomingHangout && (
    <View style={styles.hangoutBar}>
        <View style={styles.hangoutBarContent}>
            <View style={styles.hangoutBarIconContainer}>
                <Text style={styles.hangoutBarIcon}>
                    {upcomingHangout.category === 'games' ? '🎲'
                        : upcomingHangout.category === 'cafe' ? '☕'
                        : upcomingHangout.category === 'park' ? '🌿'
                        : upcomingHangout.category === 'bar' ? '🍺'
                        : '🗓️'}
                </Text>
            </View>
            <View>
                <Text style={styles.hangoutBarTitle}>
                    {upcomingHangout.title}
                </Text>
                <Text style={styles.hangoutBarDetails}>
                    {formatHangoutTime(upcomingHangout.startTime)}
                    {upcomingHangout.venue?.name
                        ? ` · ${upcomingHangout.venue.name}`
                        : ' · Venue TBD'}
                </Text>
            </View>
        </View>
    </View>
)}
```

- [ ] **Step 5: Manual verification**

Run the app, open a chat with someone you have a shared upcoming hangout with. Verify:
- The bar shows the real hangout title and correct time format
- Open a chat with someone you have NO upcoming hangout with — the bar is completely absent
- Date formatting: today's hangouts show "Today at 3:00 PM", tomorrow's show "Tomorrow at ...", later ones show "Thu, Mar 19 at ..."

- [ ] **Step 6: Commit**

```bash
git add frendli-app/app/(tabs)/messages.tsx frendli-app/app/chat/[id].tsx
git commit -m "fix: connect Active Hangouts and chat hangout bar to real API data"
```

---

### Task 5: Search & compose buttons in messages list

**Files:**
- Modify: `frendli-app/app/(tabs)/messages.tsx`

Context: Both header buttons are `onPress={() => {}}`. We implement search (animated header input) and compose (navigate to matches tab).

- [ ] **Step 1: Add `Animated`, `TextInput` to React Native imports**

In `frendli-app/app/(tabs)/messages.tsx`, update the first import line to add `Animated` and `TextInput`:

```tsx
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    ActivityIndicator, RefreshControl, ViewStyle, TextStyle, ImageStyle,
    ScrollView, Animated, TextInput,
} from 'react-native';
```

- [ ] **Step 2: Add `useRef` to the React import**

Change:
```tsx
import React, { useState, useEffect, useCallback } from 'react';
```
To:
```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
```

- [ ] **Step 3: Add search states and animated value**

Inside `MessagesScreen`, add after the existing state declarations:

```tsx
const [showSearch, setShowSearch] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const searchAnim = useRef(new Animated.Value(0)).current;
```

> **Note:** `searchAnim` is declared with `.current` at the end. `useRef(new Animated.Value(0))` returns a ref object; `.current` extracts the `Animated.Value` itself. Passing the ref object (without `.current`) to `Animated.timing` will cause a runtime error.

- [ ] **Step 4: Add `openSearch` and `closeSearch` helpers**

Add these two functions inside the component, after the state declarations:

```tsx
const openSearch = () => {
    setShowSearch(true);
    Animated.timing(searchAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
    }).start();
};

const closeSearch = () => {
    Animated.timing(searchAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
    }).start(() => {
        setShowSearch(false);
        setSearchQuery('');
    });
};
```

- [ ] **Step 5: Add the filtered matches derivation**

Immediately before the existing `const newMatches = matches.filter(...)` line, add:

```tsx
const q = searchQuery.toLowerCase().trim();
const filteredMatches = q
    ? matches.filter(
        (m) =>
            m.otherUser.firstName.toLowerCase().includes(q) ||
            (m.hangoutTitle ?? '').toLowerCase().includes(q)
    )
    : matches;
```

Then update the two existing lines that derive `newMatches` and `recentChats` to use `filteredMatches` instead of `matches`:

```tsx
const newMatches = filteredMatches.filter((m) => !m.lastMessage);
const recentChats = filteredMatches.filter((m) => m.lastMessage);
```

- [ ] **Step 6: Replace the header JSX**

Find the `<View style={styles.header}>` block (lines ~162–175). Replace it entirely with:

```tsx
<View style={styles.header}>
    {!showSearch ? (
        <View style={styles.headerInner}>
            <View>
                <Text style={styles.headerTitle}>Chats</Text>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconCircle} onPress={openSearch}>
                    <Feather name="search" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.iconCircle, styles.iconCircleActive]}
                    onPress={() => router.push('/(tabs)/matches' as any)}
                >
                    <Feather name="edit" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    ) : (
        <Animated.View style={[styles.headerInner, styles.searchRow, { opacity: searchAnim }]}>
            <TouchableOpacity onPress={closeSearch} style={styles.cancelButton}>
                <Feather name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TextInput
                autoFocus
                style={styles.searchInput}
                placeholder="Search chats..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                >
                    <Feather name="x" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
            )}
        </Animated.View>
    )}
</View>
```

- [ ] **Step 7: Add new styles**

The intended JSX structure is:
- `<View style={styles.header}>` — the fixed-height outer container (padding only, no flex direction)
  - When `!showSearch`: `<View style={styles.headerInner}>` — holds the title + icons row (this is where `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'` live)
  - When `showSearch`: `<Animated.View style={[styles.headerInner, styles.searchRow, { opacity: searchAnim }]}>` — holds the back arrow + input + clear button

In the `StyleSheet.create({...})` block, update the existing `header` style and add new styles:

Update `header` — remove `flexDirection`, `alignItems`, `justifyContent` (those are now on `headerInner`):
```tsx
header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: spacing.lg,
} as ViewStyle,
```

Add new styles:
```tsx
headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
} as ViewStyle,
searchRow: {
    gap: spacing.sm,
} as ViewStyle,
cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
} as ViewStyle,
searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
} as TextStyle,
clearButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
} as ViewStyle,
```

- [ ] **Step 8: Manual verification**

Run the app, navigate to the Messages tab. Verify:
- Tapping the search icon reveals an auto-focused text input with a back arrow on the left; the "Chats" title and both original icons are gone
- Typing filters the matches list in real time (try a name)
- Typing a query with no matches shows an empty list
- Tapping the back arrow clears the query and restores the normal header
- Tapping the `×` clear button clears the query but keeps the search row open
- Tapping the compose/edit icon navigates to the Matches tab

- [ ] **Step 9: Commit**

```bash
git add frendli-app/app/(tabs)/messages.tsx
git commit -m "feat: implement search and compose buttons in messages header"
```
