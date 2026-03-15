# Discover Screen Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the monolithic Discover screen into focused section components, fix 7 known feature gaps, and document the architecture for future sessions.

**Architecture:** `app/(tabs)/index.tsx` becomes a thin orchestration layer owning all state and handlers. Six new presentational section components live in `components/discover/`. A new `FilterSheet` component adds filter functionality. All data flows downward via props; no section component fetches data.

**Tech Stack:** React Native (Expo), TypeScript, Zustand (authStore), Express/Prisma (backend), `expo-haptics`, `expo-router`, `react-native-reanimated`

**Spec:** `docs/superpowers/specs/2026-03-15-discover-screen-refactor-design.md`

---

## Chunk 1: Foundation — Utility + API Layer

---

### Task 1: Create `calculateAge` utility

**Files:**
- Create: `frendli-app/lib/calculateAge.ts`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/lib/calculateAge.ts
export function calculateAge(dob: string | null | undefined): number | undefined {
  if (!dob) return undefined;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
```

- [ ] **Step 2: Verify manually**

Open a JS console or add a temporary `console.log(calculateAge('2000-01-01'))` call in any screen — confirm it returns `26` (or current age relative to today).
Remove the temp log.

- [ ] **Step 3: Commit**

```bash
cd frendli-app
git add lib/calculateAge.ts
git commit -m "feat: add calculateAge utility"
```

---

### Task 2: Update `discoveryApi.get()` to accept filter params

**Files:**
- Modify: `frendli-app/lib/api.ts` — `discoveryApi.get` function (lines 71–74)

- [ ] **Step 1: Replace the `discoveryApi` block**

Find this in `frendli-app/lib/api.ts`:
```typescript
export const discoveryApi = {
    get: (params?: { lat?: number; lng?: number }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : '';
        return apiRequest(`/api/discovery${query}`);
    }
};
```

Replace with:
```typescript
export interface DiscoveryFilters {
    lat?: number;
    lng?: number;
    maxDistance?: number;
    filterInterests?: string;
    filterDays?: string;
}

export const discoveryApi = {
    get: (params?: DiscoveryFilters) => {
        const query = params
            ? '?' + new URLSearchParams(
                Object.entries(params)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => [k, String(v)])
            ).toString()
            : '';
        return apiRequest(`/api/discovery${query}`);
    }
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app
npx tsc --noEmit
```
Expected: no errors related to `discoveryApi`.

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat: extend discoveryApi.get with filter params"
```

---

### Task 3: Update backend discovery route — filter params + new response fields

**Files:**
- Modify: `frendli-api/src/routes/discovery.ts`

- [ ] **Step 1: Extract filter params from the request** (after line 26 where `userLat`/`userLng` are extracted)

Find:
```typescript
const userLat = lat ? parseFloat(lat as string) : null;
const userLng = lng ? parseFloat(lng as string) : null;
```

Add immediately after:
```typescript
const maxDistance = req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : null;
const filterInterests = req.query.filterInterests
    ? (req.query.filterInterests as string).split(',').map(s => s.trim()).filter(Boolean)
    : [];
const filterDays = req.query.filterDays
    ? (req.query.filterDays as string).split(',').map(s => s.trim()).filter(Boolean)
    : [];
```

- [ ] **Step 2: Add matchCount and upcomingHangoutCount queries**

Find the line (after `potentialMatches` fetch):
```typescript
// 4. Get Happening Soon (Upcoming Hangouts)
```

Add BEFORE it (between the `recommendations.sort(...)` line and the `// 4.` comment):
```typescript
// Count confirmed matches for this user
const matchCount = await prisma.match.count({
    where: {
        OR: [
            { user1Id: userId },
            { user2Id: userId }
        ]
    }
});

// Count upcoming hangouts the user is attending
const upcomingHangoutCount = await prisma.hangoutAttendee.count({
    where: {
        userId,
        hangout: {
            status: 'upcoming',
            startTime: { gt: new Date() }
        }
    }
});
```

- [ ] **Step 3a: Insert filter + sort block BEFORE the existing sort line**

Find:
```typescript
recommendations.sort((a, b) => b.score - a.score);
```

Insert the following block immediately BEFORE that line (do not remove it yet):
```typescript
// Apply optional filters
let filteredRecommendations = recommendations;

if (maxDistance !== null && userLat !== null && userLng !== null) {
    filteredRecommendations = filteredRecommendations.filter(r => {
        const dist = parseFloat(r.distance);
        return isNaN(dist) || dist <= maxDistance;
    });
}

if (filterInterests.length > 0) {
    filteredRecommendations = filteredRecommendations.filter(r =>
        (r.sharedInterests as string[]).some(i => filterInterests.includes(i))
    );
}

if (filterDays.length > 0) {
    filteredRecommendations = filteredRecommendations.filter(r => {
        const targetAvail = r.availability as any;
        const targetDays = targetAvail?.days && Array.isArray(targetAvail.days) ? targetAvail.days : [];
        return filterDays.some(d => targetDays.includes(d));
    });
}

filteredRecommendations.sort((a, b) => b.score - a.score);
```

- [ ] **Step 3b: Delete the now-redundant original sort line**

Delete this line (which immediately follows the block you just inserted):
```typescript
recommendations.sort((a, b) => b.score - a.score);
```

The file should now have exactly one sort call — `filteredRecommendations.sort(...)` inside the new block.

- [ ] **Step 4: Add new fields to the response**

Find the `res.json({` block at the end and add `matchCount` and `upcomingHangoutCount`:
```typescript
res.json({
    wavesReceived: pendingWaves,
    recommendations: filteredRecommendations,
    happeningSoon: happeningSoon.map(h => ({
        ...h,
        spotsLeft: (h.maxAttendees || 6) - (h.attendees || []).length
    })),
    streakCount: (userProfile.user as any).streakCount,
    matchCount,
    upcomingHangoutCount,
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frendli-api
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/discovery.ts
git commit -m "feat: add filter params and matchCount/upcomingHangoutCount to discovery API"
```

---

## Chunk 2: Section Components

---

### Task 4: Create `DiscoverHeader` component

**Files:**
- Create: `frendli-app/components/discover/DiscoverHeader.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/DiscoverHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../../constants/tokens';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60';

interface DiscoverHeaderProps {
    profile: { firstName: string; photos: string[] } | null;
    hasActiveFilters: boolean;
    onFilterPress: () => void;
    onNotificationPress: () => void;
    onSOSLongPress: () => void;
}

export const DiscoverHeader: React.FC<DiscoverHeaderProps> = ({
    profile,
    hasActiveFilters,
    onFilterPress,
    onNotificationPress,
    onSOSLongPress,
}) => {
    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity
                    style={styles.headerLeft}
                    onLongPress={onSOSLongPress}
                    delayLongPress={2000}
                    activeOpacity={0.9}
                >
                    <Text style={styles.greetingText}>Hey, {profile?.firstName || 'User'}!</Text>
                    <Text style={styles.greetingSubtext}>Find your people today</Text>
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconButton} onPress={onFilterPress}>
                        <Feather name="sliders" size={20} color={colors.textPrimary} />
                        {hasActiveFilters && <View style={styles.filterActiveDot} />}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerIconButton} onPress={onNotificationPress}>
                        <Feather name="bell" size={20} color={colors.textPrimary} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerAvatarContainer}>
                        <Image
                            source={{ uri: profile?.photos?.[0] || PLACEHOLDER_AVATAR }}
                            style={styles.headerAvatar}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        backgroundColor: colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flex: 1,
    },
    greetingText: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 32,
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    greetingSubtext: {
        ...typography.bodyRegular,
        color: colors.textSecondary,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.subtle,
    },
    filterActiveDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        borderWidth: 1.5,
        borderColor: colors.surface,
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.badgeBlue,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    headerAvatarContainer: {
        borderRadius: 20,
        padding: 2,
        backgroundColor: colors.surface,
        ...shadow.subtle,
        marginLeft: 4,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frendli-app
npx tsc --noEmit
```
Expected: no errors in `components/discover/DiscoverHeader.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/discover/DiscoverHeader.tsx
git commit -m "feat: add DiscoverHeader section component"
```

---

### Task 5: Create `StreakBanner` component

**Files:**
- Create: `frendli-app/components/discover/StreakBanner.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/StreakBanner.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../../constants/tokens';

interface StreakBannerProps {
    streakCount: number;
    onDismiss: () => void;
}

export const StreakBanner: React.FC<StreakBannerProps> = ({ streakCount, onDismiss }) => {
    if (streakCount === 0) return null;

    return (
        <View style={styles.streakCard}>
            <View style={styles.streakIconContainer}>
                <MaterialCommunityIcons name="fire" size={24} color={colors.primary} />
            </View>
            <View style={styles.streakContent}>
                <Text style={styles.streakTitle}>{streakCount} day streak</Text>
                <Text style={styles.streakSubtitle}>
                    {streakCount >= 7 ? "You're on fire! Keep it up." : 'Keep showing up every day!'}
                </Text>
            </View>
            <TouchableOpacity style={styles.streakClose} onPress={onDismiss}>
                <Feather name="x" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    streakCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 16,
        ...shadow.subtle,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    streakIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF1EE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    streakTitle: {
        ...typography.bodyBold,
        fontSize: 16,
        color: colors.textPrimary,
    },
    streakSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    streakClose: {
        padding: 8,
        backgroundColor: colors.gray[100],
        borderRadius: 16,
    },
});
```

- [ ] **Step 2: Verify dismiss contract**

`StreakBanner` is stateless with respect to dismissal — it renders nothing when `streakCount === 0`.
The parent `index.tsx` controls dismissal by passing `isStreakDismissed ? 0 : streakCount`.
No dismiss state lives inside this component. Confirm the early-return guard `if (streakCount === 0) return null;` is present.

- [ ] **Step 3: Commit**

```bash
git add components/discover/StreakBanner.tsx
git commit -m "feat: add StreakBanner section component"
```

---

### Task 6: Create `WavesSection` component

**Files:**
- Create: `frendli-app/components/discover/WavesSection.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/WavesSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../../constants/tokens';
import { WaveReceivedCard } from '../WaveReceivedCard';

interface Profile {
    id: string;
    userId: string;
    firstName: string;
    photos: string[];
    score?: number;
    sharedInterests?: string[];
    dob?: string;
}

interface Wave {
    id: string;
    sender: { profile: Profile };
}

interface WavesSectionProps {
    waves: Wave[];
    onWaveBack: (profile: Profile) => void;
    onDismiss: (waveId: string) => void;
}

export const WavesSection: React.FC<WavesSectionProps> = ({ waves, onWaveBack, onDismiss }) => {
    return (
        <View style={styles.sectionContainer}>
            <View style={styles.wavesHeader}>
                <View style={styles.wavesTitleRow}>
                    <View style={styles.wavesDot} />
                    <Text style={styles.sectionTitle}>Waves Received</Text>
                    {waves.length > 0 && (
                        <View style={styles.wavesBadge}>
                            <Text style={styles.wavesBadgeText}>{waves.length}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.sectionSubtitle}>Wave back to connect and start chatting</Text>
            </View>

            <View style={styles.verticalList}>
                {waves.length > 0 ? (
                    waves.map((wave, index) => (
                        <WaveReceivedCard
                            key={wave.id || index}
                            index={index}
                            profile={wave.sender?.profile || { id: 'unknown', firstName: 'Someone', photos: [] }}
                            onWaveBack={() => wave.sender?.profile && onWaveBack(wave.sender.profile)}
                            onDismiss={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onDismiss(wave.id);
                            }}
                        />
                    ))
                ) : (
                    <View style={styles.emptyWaves}>
                        <Text style={styles.emptyWavesText}>No new waves yet</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginBottom: spacing.xl,
    },
    wavesHeader: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    wavesTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wavesDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.badgeBlue,
        marginRight: 8,
    },
    sectionTitle: {
        ...typography.h3,
        fontSize: 20,
        color: colors.textPrimary,
    },
    wavesBadge: {
        backgroundColor: colors.badgeBlue,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    wavesBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.surface,
    },
    sectionSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 4,
    },
    verticalList: {
        paddingHorizontal: spacing.lg,
    },
    emptyWaves: {
        width: '100%',
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.gray[100],
        borderRadius: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyWavesText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/WavesSection.tsx
git commit -m "feat: add WavesSection component with empty state"
```

---

### Task 7: Create `NextStepsSection` component

**Files:**
- Create: `frendli-app/components/discover/NextStepsSection.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/NextStepsSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../constants/tokens';
import { NextStepCard } from '../NextStepCard';

export type StepKey = 'safety' | 'first-wave' | 'plan-hangout' | 'rate-hangout' | 'add-photo';

export interface UserState {
    safetyBriefingCompleted: boolean;
    hasConnections: boolean;
    hasPlannedHangout: boolean;
    hasPendingFeedback: boolean;
    hasProfilePhoto: boolean;
}

interface StepConfig {
    key: StepKey;
    title: string;
    description: string;
    icon: string;
}

const ALL_STEPS: StepConfig[] = [
    {
        key: 'safety',
        title: 'Complete Safety Briefing',
        description: 'Learn how RealConnect keeps you safe during meetups.',
        icon: 'shield-check',
    },
    {
        key: 'first-wave',
        title: 'Send your first Wave',
        description: 'Start connecting with people near you.',
        icon: 'hand-wave',
    },
    {
        key: 'plan-hangout',
        title: 'Plan your first hangout',
        description: "You've made connections! Take it to real life.",
        icon: 'coffee',
    },
    {
        key: 'rate-hangout',
        title: 'Rate your last hangout',
        description: 'How did it go? Your feedback helps us improve.',
        icon: 'star',
    },
    {
        key: 'add-photo',
        title: 'Add a profile photo',
        description: 'Profiles with photos get 3x more waves.',
        icon: 'camera',
    },
];

function computeSteps(userState: UserState): StepConfig[] {
    const active: StepConfig[] = [];
    if (!userState.safetyBriefingCompleted) active.push(ALL_STEPS[0]);
    if (!userState.hasConnections) active.push(ALL_STEPS[1]);
    if (userState.hasConnections && !userState.hasPlannedHangout) active.push(ALL_STEPS[2]);
    if (userState.hasPendingFeedback) active.push(ALL_STEPS[3]);
    if (!userState.hasProfilePhoto) active.push(ALL_STEPS[4]);
    return active.slice(0, 2);
}

interface NextStepsSectionProps {
    userState: UserState;
    onStepPress: (step: StepKey) => void;
}

export const NextStepsSection: React.FC<NextStepsSectionProps> = ({ userState, onStepPress }) => {
    const steps = computeSteps(userState);
    if (steps.length === 0) return null;

    return (
        <View style={styles.container}>
            {steps.map((step) => (
                <NextStepCard
                    key={step.key}
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                    onPress={() => onStepPress(step.key)}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/NextStepsSection.tsx
git commit -m "feat: add NextStepsSection with dynamic priority-ordered steps"
```

---

### Task 8: Create `HappeningSoonSection` component

**Files:**
- Create: `frendli-app/components/discover/HappeningSoonSection.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/HappeningSoonSection.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../../constants/tokens';

interface Hangout {
    id: string;
    title: string;
    startTime: string;
    spotsLeft: number;
    imageUrl?: string;
    venue?: { name: string };
}

interface HappeningSoonSectionProps {
    hangouts: Hangout[];
    onHangoutPress: (id: string) => void;
    onSeeAll: () => void;
}

export const HappeningSoonSection: React.FC<HappeningSoonSectionProps> = ({
    hangouts,
    onHangoutPress,
    onSeeAll,
}) => {
    if (hangouts.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <View style={styles.rowBetween}>
                <Text style={styles.sectionTitleLarge}>Happening Soon</Text>
                <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
                    <Text style={styles.seeAllText}>See all</Text>
                    <Feather name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
            >
                {hangouts.map((hangout) => (
                    <TouchableOpacity
                        key={hangout.id}
                        style={styles.hangoutCard}
                        onPress={() => onHangoutPress(hangout.id)}
                    >
                        <Image
                            source={{
                                uri: hangout.imageUrl ||
                                    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400',
                            }}
                            style={styles.hangoutImage}
                        />
                        <View style={styles.hangoutOverlay}>
                            <View style={styles.spotsBadge}>
                                <Text style={styles.spotsText}>{hangout.spotsLeft} spots left</Text>
                            </View>
                            <Text style={styles.hangoutTitle} numberOfLines={2}>{hangout.title}</Text>
                            <Text style={styles.hangoutMeta}>{hangout.venue?.name || 'Local Spot'}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginBottom: spacing.xl,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitleLarge: {
        ...typography.h2,
        fontSize: 20,
        color: colors.textPrimary,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingBottom: 4,
    },
    seeAllText: {
        fontWeight: '700',
        color: colors.primary,
    },
    horizontalList: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    hangoutCard: {
        width: 200,
        height: 260,
        borderRadius: 20,
        overflow: 'hidden',
        ...shadow.card,
        backgroundColor: colors.surface,
    },
    hangoutImage: {
        width: '100%',
        height: 160,
    },
    hangoutOverlay: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.surface,
    },
    spotsBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    spotsText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    hangoutTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        fontSize: 14,
        marginBottom: 4,
    },
    hangoutMeta: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/HappeningSoonSection.tsx
git commit -m "feat: add HappeningSoonSection component"
```

---

### Task 9: Create `SuggestedFriendsSection` component

**Files:**
- Create: `frendli-app/components/discover/SuggestedFriendsSection.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/SuggestedFriendsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../../constants/tokens';
import { DiscoveryCard } from '../DiscoveryCard';

interface Profile {
    id: string;
    userId: string;
    firstName: string;
    age?: number;
    dob?: string;
    bio?: string;
    photos: string[];
    interests: string[];
    score?: number;
    sharedInterests?: string[];
    distance?: string;
    isVerified?: boolean;
    isOnline?: boolean;
    friendshipStyle?: string;
}

interface SuggestedFriendsSectionProps {
    recommendations: Profile[];
    wavedProfiles: string[];
    onWave: (profile: Profile) => void;
    onView: (userId: string) => void;
    onSeeAll: () => void;
}

export const SuggestedFriendsSection: React.FC<SuggestedFriendsSectionProps> = ({
    recommendations,
    wavedProfiles,
    onWave,
    onView,
    onSeeAll,
}) => {
    return (
        <View style={styles.suggestedSection}>
            <View style={styles.rowBetween}>
                <View style={styles.suggestedTitleRow}>
                    <Text style={styles.sectionTitleLarge}>Suggested Friends</Text>
                    <View style={styles.nearbyContainer}>
                        <Text style={styles.metaSubtitle}>{recommendations.length} nearby</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
                    <Text style={styles.seeAllText}>See all</Text>
                    <Feather name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.verticalList}>
                {recommendations.length > 0 ? (
                    recommendations.map((profile, index) => (
                        <DiscoveryCard
                            key={profile.userId}
                            profile={profile}
                            index={index}
                            onWave={() => onWave(profile)}
                            onView={() => onView(profile.userId)}
                            isWaved={wavedProfiles.includes(profile.userId)}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Feather name="users" size={32} color={colors.textTertiary} />
                        <Text style={styles.emptyStateTitle}>No suggestions right now</Text>
                        <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    suggestedSection: {
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    suggestedTitleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionTitleLarge: {
        ...typography.h2,
        fontSize: 20,
        color: colors.textPrimary,
    },
    nearbyContainer: {
        paddingBottom: 4,
    },
    metaSubtitle: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingBottom: 4,
    },
    seeAllText: {
        fontWeight: '700',
        color: colors.primary,
    },
    verticalList: {
        paddingHorizontal: spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        backgroundColor: colors.gray[100],
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        gap: spacing.sm,
    },
    emptyStateTitle: {
        ...typography.bodyBold,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    emptyStateSubtext: {
        ...typography.caption,
        color: colors.textTertiary,
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/SuggestedFriendsSection.tsx
git commit -m "feat: add SuggestedFriendsSection with empty state"
```

---

### Task 10: Create `FilterSheet` component

**Files:**
- Create: `frendli-app/components/discover/FilterSheet.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/FilterSheet.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography, radius } from '../../constants/tokens';

export interface Filters {
    maxDistanceKm: number | null;
    interests: string[];
    days: string[];
}

interface FilterSheetProps {
    visible: boolean;
    currentFilters: Filters;
    userInterests: string[];
    onApply: (filters: Filters) => void;
    onClose: () => void;
}

const DISTANCE_OPTIONS: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: '2km', value: 2 },
    { label: '5km', value: 5 },
    { label: '10km', value: 10 },
];

const DAYS: { label: string; value: string }[] = [
    { label: 'Mon', value: 'monday' },
    { label: 'Tue', value: 'tuesday' },
    { label: 'Wed', value: 'wednesday' },
    { label: 'Thu', value: 'thursday' },
    { label: 'Fri', value: 'friday' },
    { label: 'Sat', value: 'saturday' },
    { label: 'Sun', value: 'sunday' },
];

export const FilterSheet: React.FC<FilterSheetProps> = ({
    visible,
    currentFilters,
    userInterests,
    onApply,
    onClose,
}) => {
    const [localFilters, setLocalFilters] = useState<Filters>(currentFilters);

    useEffect(() => {
        if (visible) setLocalFilters(currentFilters);
    }, [visible]);

    const toggleInterest = (interest: string) => {
        setLocalFilters(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest],
        }));
    };

    const toggleDay = (dayValue: string) => {
        setLocalFilters(prev => ({
            ...prev,
            days: prev.days.includes(dayValue)
                ? prev.days.filter(d => d !== dayValue)
                : [...prev.days, dayValue],
        }));
    };

    const handleReset = () => {
        setLocalFilters({ maxDistanceKm: null, interests: [], days: [] });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.handle} />

                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Filters</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Feather name="x" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Distance */}
                    <Text style={styles.groupLabel}>Distance</Text>
                    <View style={styles.segmentedControl}>
                        {DISTANCE_OPTIONS.map((opt) => {
                            const isActive = localFilters.maxDistanceKm === opt.value;
                            return (
                                <TouchableOpacity
                                    key={String(opt.value)}
                                    style={[styles.segment, isActive && styles.segmentActive]}
                                    onPress={() =>
                                        setLocalFilters(prev => ({ ...prev, maxDistanceKm: opt.value }))
                                    }
                                >
                                    <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Interests */}
                    {userInterests.length > 0 && (
                        <>
                            <Text style={styles.groupLabel}>Interests</Text>
                            <View style={styles.chipsContainer}>
                                {userInterests.map((interest) => {
                                    const isSelected = localFilters.interests.includes(interest);
                                    return (
                                        <TouchableOpacity
                                            key={interest}
                                            style={[styles.chip, isSelected && styles.chipActive]}
                                            onPress={() => toggleInterest(interest)}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                                {interest}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Availability */}
                    <Text style={styles.groupLabel}>Availability</Text>
                    <View style={styles.daysRow}>
                        {DAYS.map((day) => {
                            const isSelected = localFilters.days.includes(day.value);
                            return (
                                <TouchableOpacity
                                    key={day.value}
                                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                                    onPress={() => toggleDay(day.value)}
                                >
                                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                                        {day.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyButton} onPress={() => onApply(localFilters)}>
                        <Text style={styles.applyText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray[300],
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sheetTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    scrollArea: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    groupLabel: {
        ...typography.bodyBold,
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.gray[100],
        borderRadius: radius.lg,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: radius.md,
    },
    segmentActive: {
        backgroundColor: colors.surface,
        ...shadow.sm,
    },
    segmentText: {
        ...typography.bodyMedium,
        fontSize: 14,
        color: colors.textSecondary,
    },
    segmentTextActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.full,
        backgroundColor: colors.gray[100],
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: {
        backgroundColor: '#FFF1EE',
        borderColor: colors.primary,
    },
    chipText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    chipTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    daysRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    dayChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: colors.gray[100],
        borderWidth: 1,
        borderColor: colors.border,
    },
    dayChipActive: {
        backgroundColor: colors.secondary,
        borderColor: colors.secondary,
    },
    dayText: {
        ...typography.small,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    dayTextActive: {
        color: colors.surface,
    },
    footer: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    resetButton: {
        flex: 1,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    resetText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    },
    applyButton: {
        flex: 2,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    applyText: {
        ...typography.bodyBold,
        color: colors.surface,
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/FilterSheet.tsx
git commit -m "feat: add FilterSheet bottom-sheet component"
```

---

### Task 11: Create barrel export

**Files:**
- Create: `frendli-app/components/discover/index.ts`

- [ ] **Step 1: Create the file**

```typescript
// frendli-app/components/discover/index.ts
export { DiscoverHeader } from './DiscoverHeader';
export { StreakBanner } from './StreakBanner';
export { WavesSection } from './WavesSection';
export { NextStepsSection } from './NextStepsSection';
export type { StepKey, UserState } from './NextStepsSection';
export { HappeningSoonSection } from './HappeningSoonSection';
export { SuggestedFriendsSection } from './SuggestedFriendsSection';
export { FilterSheet } from './FilterSheet';
export type { Filters } from './FilterSheet';
```

- [ ] **Step 2: Verify TypeScript compiles for all discover components**

```bash
cd frendli-app
npx tsc --noEmit
```
Expected: no errors in any file under `components/discover/`. This is a good checkpoint — all 7 components should compile cleanly before the screen rewrite begins.

- [ ] **Step 3: Commit**

```bash
git add components/discover/index.ts
git commit -m "feat: add barrel export for discover components"
```

---

## Chunk 3: Fix Existing Components + Rewrite index.tsx

---

### Task 12: Fix `DiscoveryCard` — friendship style + age from DOB

**Files:**
- Modify: `frendli-app/components/DiscoveryCard.tsx`

- [ ] **Step 1: Add `dob` and `friendshipStyle` to the Profile interface**

Find:
```typescript
interface Profile {
    id: string;
    userId: string;
    firstName: string;
    age?: number;
    bio?: string;
    photos: string[];
    interests: string[];
    distance?: string;
    score?: number;
    sharedInterests?: string[];
    isVerified?: boolean;
    isOnline?: boolean;
}
```

Replace with:
```typescript
interface Profile {
    id: string;
    userId: string;
    firstName: string;
    age?: number;
    dob?: string;
    bio?: string;
    photos: string[];
    interests: string[];
    distance?: string;
    score?: number;
    sharedInterests?: string[];
    isVerified?: boolean;
    isOnline?: boolean;
    friendshipStyle?: string;
}
```

- [ ] **Step 2: Add friendship style map and import calculateAge**

At the top of the file, after existing imports, add:
```typescript
import { calculateAge } from '../lib/calculateAge';

const FRIENDSHIP_STYLE_LABEL: Record<string, string> = {
    'one-on-one': 'One-on-One',
    'small-group': 'Small Groups',
    'open-gatherings': 'Open Gatherings',
};
```

- [ ] **Step 3: Use calculateAge and dynamic friendship style in the component body**

Inside the `DiscoveryCard` function, find (exact string — must match verbatim):
```typescript
const imageUrl = profile.photos?.[0] || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=60';
const matchScore = profile.score ? Math.round(profile.score) : 88;
const isShared = (profile.sharedInterests?.length || 0) > 0;
```

Replace with:
```typescript
const imageUrl = profile.photos?.[0] || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=60';
const matchScore = profile.score ? Math.round(profile.score) : 88;
const isShared = (profile.sharedInterests?.length || 0) > 0;
const displayAge = calculateAge(profile.dob) ?? profile.age ?? 24;
const friendshipStyleLabel = profile.friendshipStyle
    ? (FRIENDSHIP_STYLE_LABEL[profile.friendshipStyle] ?? 'Small Groups')
    : 'Small Groups';
```

- [ ] **Step 4: Use `displayAge` and `friendshipStyleLabel` in the JSX**

In the `nameText` Text element, find and replace this exact substring (just the age at the end of the line):
```
)}, {profile.age || 24}
```
Replace with:
```
)}, {displayAge}
```

Find the hardcoded friendship style line:
```typescript
<Text style={[styles.metaSubtitle, { color: colors.success }]}>
    Small Groups
</Text>
```

Replace with:
```typescript
<Text style={[styles.metaSubtitle, { color: colors.success }]}>
    {friendshipStyleLabel}
</Text>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd frendli-app
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/DiscoveryCard.tsx
git commit -m "fix: DiscoveryCard uses real age (from dob) and dynamic friendship style label"
```

---

### Task 13: Fix `WaveReceivedCard` — add `dob` to Profile type and use `calculateAge`

**Files:**
- Modify: `frendli-app/components/WaveReceivedCard.tsx`

- [ ] **Step 1: Add `dob` import and type**

After existing imports, add:
```typescript
import { calculateAge } from '../lib/calculateAge';
```

In the `WaveReceivedProps` profile interface, add `dob?: string`:
```typescript
profile: {
    id: string;
    firstName: string;
    photos: string[];
    score?: number;
    sharedInterests?: string[];
    dob?: string;
};
```

- [ ] **Step 2: Use `calculateAge` in the component body**

Find:
```typescript
const matchScore = profile.score || 88;
```

Add after it:
```typescript
const _displayAge = calculateAge(profile.dob);
```

`WaveReceivedCard` doesn't currently render an age, so we prefix with `_` to signal intentional non-use to the TypeScript compiler (suppresses `noUnusedLocals` errors). The value is available for future use when the card's design is updated to show age.

- [ ] **Step 3: Commit**

```bash
git add components/WaveReceivedCard.tsx
git commit -m "fix: WaveReceivedCard adds dob to Profile type for calculateAge support"
```

---

### Task 14: Rewrite `app/(tabs)/index.tsx`

**Files:**
- Modify: `frendli-app/app/(tabs)/index.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file content**

```typescript
// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors, spacing } from '../../constants/tokens';
import {
    DiscoverHeader,
    StreakBanner,
    WavesSection,
    NextStepsSection,
    HappeningSoonSection,
    SuggestedFriendsSection,
    FilterSheet,
} from '../../components/discover';
import type { StepKey, Filters } from '../../components/discover';
import { MatchModal } from '../../components/MatchModal';
import { HangoutFeedback } from '../../components/HangoutFeedback';
import { discoveryApi, hangoutApi } from '../../lib/api';
import type { DiscoveryFilters } from '../../lib/api';
import { useSilentSOS } from '../../hooks/useSilentSOS';
import { useAuthStore } from '../../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
    id: string;
    userId: string;
    firstName: string;
    age?: number;
    dob?: string;
    bio?: string;
    photos: string[];
    interests: string[];
    score?: number;
    sharedInterests?: string[];
    distance?: string;
    isVerified?: boolean;
    isOnline?: boolean;
    friendshipStyle?: string;
}

interface Wave {
    id: string;
    sender: { profile: Profile };
}

interface Hangout {
    id: string;
    title: string;
    startTime: string;
    spotsLeft: number;
    imageUrl?: string;
    venue?: { name: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = { maxDistanceKm: null, interests: [], days: [] };

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
    // Data state
    const [recommendations, setRecommendations] = useState<Profile[]>([]);
    const [wavesReceived, setWavesReceived] = useState<Wave[]>([]);
    const [happeningSoon, setHappeningSoon] = useState<Hangout[]>([]);
    const [streakCount, setStreakCount] = useState(0);
    const [matchCount, setMatchCount] = useState(0);
    const [upcomingHangoutCount, setUpcomingHangoutCount] = useState(0);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isStreakDismissed, setIsStreakDismissed] = useState(false);
    const [wavedProfiles, setWavedProfiles] = useState<string[]>([]);
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
    const [matchData, setMatchData] = useState({ visible: false, name: '', photo: '' });
    const [showFeedback, setShowFeedback] = useState(false);
    const [pendingFeedbackHangout, setPendingFeedbackHangout] = useState<any>(null);

    const router = useRouter();
    const { handleSOS } = useSilentSOS();
    const { profile } = useAuthStore();

    // ─── Data Fetching ──────────────────────────────────────────────────────────

    const fetchDiscoveryData = useCallback(async () => {
        try {
            setIsLoading(true);

            const params: DiscoveryFilters = {};
            if (filters.maxDistanceKm !== null) params.maxDistance = filters.maxDistanceKm;
            if (filters.interests.length > 0) params.filterInterests = filters.interests.join(',');
            if (filters.days.length > 0) params.filterDays = filters.days.join(',');

            const data = await discoveryApi.get(params);
            setRecommendations(data.recommendations || []);
            setWavesReceived(data.wavesReceived || []);
            setHappeningSoon(data.happeningSoon || []);
            setMatchCount(data.matchCount || 0);
            setUpcomingHangoutCount(data.upcomingHangoutCount || 0);
            // Reset dismissed state only when a real streak is confirmed from the API
            setStreakCount(data.streakCount || 0);
            if ((data.streakCount || 0) > 0) setIsStreakDismissed(false);

            const pendingFeedback = await hangoutApi.getPendingFeedback();
            if (pendingFeedback) {
                setPendingFeedbackHangout(pendingFeedback);
                setShowFeedback(true);
            }
        } catch (error) {
            console.error('Error fetching discovery data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDiscoveryData();
    }, [fetchDiscoveryData]);

    // ─── Handlers ────────────────────────────────────────────────────────────────

    const handleWave = async (waveProfile: Profile, type: 'like' | 'pass') => {
        try {
            if (type === 'like') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/discovery/wave`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${
                            (
                                await (
                                    require('../../lib/supabase').supabase?.auth.getSession()
                                )
                            ).data.session?.access_token
                        }`,
                    },
                    body: JSON.stringify({ receiverId: waveProfile.userId, type }),
                }
            );

            const data = await response.json();

            if (data.matched) {
                setMatchData({
                    visible: true,
                    name: waveProfile.firstName,
                    photo:
                        waveProfile.photos[0] ||
                        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=60',
                });
            }

            if (type === 'like') {
                setWavedProfiles(prev => [...prev, waveProfile.userId]);
            }
        } catch (error) {
            console.error('Error sending wave:', error);
        }
    };

    const handleFilter = (newFilters: Filters) => {
        setFilters(newFilters);
        setIsFilterSheetVisible(false);
    };

    const handleStepPress = (step: StepKey) => {
        switch (step) {
            case 'safety':
                router.push('/safety/briefing' as any);
                break;
            case 'first-wave':
                router.push('/(tabs)/matches' as any);
                break;
            case 'plan-hangout':
                router.push('/hangouts/plan' as any);
                break;
            case 'rate-hangout':
                setShowFeedback(true);
                break;
            case 'add-photo':
                router.push('/edit-profile' as any);
                break;
        }
    };

    // ─── Derived State ────────────────────────────────────────────────────────────

    const hasActiveFilters =
        filters.maxDistanceKm !== null ||
        filters.interests.length > 0 ||
        filters.days.length > 0;

    const userState = {
        safetyBriefingCompleted: profile?.safetyBriefingCompleted ?? false,
        hasConnections: matchCount > 0,
        hasPlannedHangout: upcomingHangoutCount > 0,
        hasPendingFeedback: !!pendingFeedbackHangout,
        hasProfilePhoto: (profile?.photos?.length ?? 0) > 0,
    };

    // ─── Loading State ────────────────────────────────────────────────────────────

    if (isLoading && recommendations.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Finding potential friends...</Text>
            </View>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <DiscoverHeader
                profile={profile ? { firstName: profile.firstName, photos: profile.photos } : null}
                hasActiveFilters={hasActiveFilters}
                onFilterPress={() => setIsFilterSheetVisible(true)}
                onNotificationPress={() => router.push('/notifications' as any)}
                onSOSLongPress={handleSOS}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchDiscoveryData} />
                }
            >
                <StreakBanner
                    streakCount={isStreakDismissed ? 0 : streakCount}
                    onDismiss={() => setIsStreakDismissed(true)}
                />

                <WavesSection
                    waves={wavesReceived}
                    onWaveBack={(p) => handleWave(p, 'like')}
                    onDismiss={(waveId) =>
                        setWavesReceived(prev => prev.filter(w => w.id !== waveId))
                    }
                />

                <NextStepsSection userState={userState} onStepPress={handleStepPress} />

                <HappeningSoonSection
                    hangouts={happeningSoon}
                    onHangoutPress={(id) => router.push(`/hangouts/${id}` as any)}
                    onSeeAll={() => router.push('/(tabs)/hangouts' as any)}
                />

                <SuggestedFriendsSection
                    recommendations={recommendations}
                    wavedProfiles={wavedProfiles}
                    onWave={(p) => handleWave(p, 'like')}
                    onView={(userId) => router.push(`/profile/${userId}` as any)}
                    onSeeAll={() => router.push('/(tabs)/matches' as any)}
                />
            </ScrollView>

            <FilterSheet
                visible={isFilterSheetVisible}
                currentFilters={filters}
                userInterests={profile?.interests || []}
                onApply={handleFilter}
                onClose={() => setIsFilterSheetVisible(false)}
            />

            <MatchModal
                visible={matchData.visible}
                onClose={() => setMatchData({ ...matchData, visible: false })}
                matchName={matchData.name}
                matchPhoto={matchData.photo}
                onMessagePress={() => {
                    setMatchData({ ...matchData, visible: false });
                    router.push('/(tabs)/messages' as any);
                }}
            />

            {showFeedback && pendingFeedbackHangout && (
                <HangoutFeedback
                    hangout={pendingFeedbackHangout}
                    onClose={() => setShowFeedback(false)}
                    onFeedbackSubmitted={() => {
                        setShowFeedback(false);
                        fetchDiscoveryData();
                    }}
                    onSkip={async () => {
                        if (pendingFeedbackHangout) {
                            await hangoutApi.skipFeedback(pendingFeedbackHangout.id).catch(console.error);
                        }
                        setShowFeedback(false);
                        setPendingFeedbackHangout(null);
                    }}
                    onReschedule={() => router.push('/hangouts/plan' as any)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.textSecondary,
    },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

> **Note on authStore fields:** `profile?.safetyBriefingCompleted`, `profile?.interests`, and `profile?.photos` are all declared in `ProfileData` in `store/authStore.ts` (lines 34, 37, 47) — no changes to the store are needed.

```bash
cd frendli-app
npx tsc --noEmit
```
Expected: no errors in `app/(tabs)/index.tsx` or `components/discover/`.

- [ ] **Step 3: Run the app and verify visually**

```bash
npx expo start
```

Check each of the following on the Discover screen:
- Header shows real user first name (not placeholder)
- Header avatar shows user's actual photo (not hardcoded Unsplash URL)
- Filter button opens `FilterSheet` bottom sheet
- Applying a filter closes the sheet and triggers a re-fetch (loading spinner appears)
- An active filter shows the orange dot on the filter button
- Resetting filters clears the dot
- Streak banner appears if user has a streak; dismiss button hides it; pull-to-refresh restores it
- Pull-to-refresh spinner appears at the top of the scroll view
- NextStepCards show at most 2 relevant steps (not hardcoded)
- Waves Received shows empty state when there are none
- Suggested Friends shows empty state when there are none after filtering
- DiscoveryCard shows the correct friendship style (not always "Small Groups")

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "refactor: decompose Discover screen into section components; fix all 7 feature gaps"
```

---

## Chunk 4: Documentation

---

### Task 15: Write `docs/discover/README.md`

**Files:**
- Create: `frendli-app/docs/discover/README.md`

- [ ] **Step 1: Create the file**

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
cd frendli-app
mkdir -p docs/discover
git add docs/discover/README.md
git commit -m "docs: add Discover screen architecture README"
```

---

### Task 16: Write `docs/discover/refactor-guide.md`

**Files:**
- Create: `frendli-app/docs/discover/refactor-guide.md`

- [ ] **Step 1: Create the file**

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add docs/discover/refactor-guide.md
git commit -m "docs: add Discover screen refactor guide and session log"
```

---

*End of plan.*
