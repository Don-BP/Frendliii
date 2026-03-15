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
                router.push('/' as any);
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
                    onWaveBack={(p) => handleWave(p as unknown as Profile, 'like')}
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
                    onSeeAll={() => router.push('/' as any)}
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
