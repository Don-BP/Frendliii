import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Platform,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { profileApi, discoveryApi } from '../../lib/api';
import { getRankFromScore } from '../../lib/rank';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

function PassionDots({ weight, shared }: { weight: number; shared: boolean }) {
    const filled = Math.round(weight);
    return (
        <View style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: 10 }).map((_, i) => (
                <View
                    key={i}
                    style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: i < filled
                            ? shared ? colors.primary : colors.textSecondary
                            : colors.border,
                    }}
                />
            ))}
        </View>
    );
}

export default function ProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (typeof id === 'string') {
                    const data = await profileApi.getById(id);
                    setProfile(data.profile);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    const formatActivityPrefs = (prefs: any) => {
        if (!prefs) return null;
        return [prefs.environment, prefs.energy, prefs.social]
            .filter(Boolean)
            .map((v: string) => v.charAt(0).toUpperCase() + v.slice(1))
            .join(' · ') || null;
    };

    const formatAvailability = (avail: any) => {
        if (!avail) return 'Not set';
        const dayMap: Record<string, string> = {
            mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
            fri: 'Fri', sat: 'Sat', sun: 'Sun',
        };
        const timeMap: Record<string, string> = {
            morning: 'Mornings', afternoon: 'Afternoons',
            evening: 'Evenings', night: 'Nights',
        };
        const days = (avail.days || []).map((d: string) => dayMap[d] || d).join(', ');
        const times = (avail.times || []).map((t: string) => timeMap[t] || t).join(', ');
        if (days && times) return `${days} · ${times}`;
        return days || times || 'Not set';
    };

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleWave = async (type: 'like' | 'maybe') => {
        try {
            await discoveryApi.wave(profile.userId, type);
            router.back();
        } catch (err) {
            console.error('Wave failed:', err);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Profile not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const age = calculateAge(profile.dob);

    // Mock compatibility data for now - could be fetched from backend later
    const compatibility = {
        score: 88,
        breakdown: [
            { label: 'Shared Interests', percentage: 75, detail: '(3 shared)' },
            { label: 'Hangout Style', percentage: 100, detail: '(Matching!)' },
            { label: 'Life Stage', percentage: 33, detail: '' },
            { label: 'Activity Preferences', percentage: 33, detail: '(1 shared)' },
            { label: 'Availability', percentage: 30, detail: '(1 overlaps)' },
        ]
    };

    const rank = (profile as any).rank ?? getRankFromScore((profile as any).compatibilityScore ?? 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Feather name="x" size={24} color={colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Feather name="flag" size={20} color={colors.secondary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Photo */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.photoContainer}>
                    <View style={styles.photoWrapper}>
                        <Image
                            source={{ uri: profile.photos?.[0] || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800' }}
                            style={styles.photo}
                        />
                        <View style={styles.onlineDot} />
                    </View>
                </Animated.View>

                {/* Name & Basic Info */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{profile.firstName}</Text>
                        {profile.safetyBadges?.length > 0 && (
                            <MaterialCommunityIcons name="check-decagram" size={20} color="#4ADE80" style={styles.verifiedIcon} />
                        )}
                        {age && <Text style={styles.age}>, {age}</Text>}
                    </View>
                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={14} color={colors.textTertiary} />
                        <Text style={styles.locationText}>0.3 mi away</Text>
                    </View>

                    {/* Friendship Rank badge */}
                    {rank && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <Text style={{ fontSize: 16 }}>{rank.emoji}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                                {rank.name}
                            </Text>
                        </View>
                    )}

                    {/* Compatibility Tag */}
                    <View style={[styles.compatibilityTag, { marginTop: 12 }]}>
                        <Text style={styles.compatibilityEmoji}>🧐</Text>
                        <Text style={styles.compatibilityPercent}>{compatibility.score}% </Text>
                        <Text style={styles.compatibilityLabel}>Potential</Text>
                    </View>
                </Animated.View>

                {/* Bio / Match Reason */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.bioCard}>
                    <Text style={styles.bioText}>
                        {profile.bio || "Fellow trail runner and podcast addict. We matched on our love for morning runs!"}
                    </Text>
                </Animated.View>

                {/* Compatibility Breakdown */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>COMPATIBILITY BREAKDOWN</Text>
                    <View style={styles.breakdownCard}>
                        {compatibility.breakdown.map((item, index) => (
                            <View key={index} style={styles.breakdownItem}>
                                <View style={styles.breakdownHeader}>
                                    <View style={styles.labelGroup}>
                                        <Feather
                                            name={
                                                index === 0 ? "heart" :
                                                index === 1 ? "users" :
                                                index === 2 ? "compass" :
                                                index === 3 ? "activity" : "calendar"
                                            }
                                            size={14}
                                            color={colors.textTertiary}
                                        />
                                        <Text style={styles.breakdownLabel}>{item.label} {item.detail}</Text>
                                    </View>
                                    <Text style={[
                                        styles.breakdownPercent,
                                        { color: item.percentage > 70 ? '#4ADE80' : item.percentage > 30 ? colors.primary : colors.textTertiary }
                                    ]}>
                                        {item.percentage}%
                                    </Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${item.percentage}%`,
                                                backgroundColor: index === 0 ? '#F87171' : index === 1 ? '#94A3B8' : index === 2 ? '#94A3B8' : index === 3 ? '#60A5FA' : '#4ADE80'
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Interests — passion meters */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>ALL INTERESTS</Text>
                    {profile.interests && profile.interests.length > 0 ? (
                        <View style={styles.passionMeterContainer}>
                            {[
                                ...((profile as any).sharedInterests ?? []),
                                ...(profile.interests as string[]).filter(
                                    (i: string) => !((profile as any).sharedInterests ?? []).includes(i)
                                )
                            ].map((interest: string) => {
                                const isShared = ((profile as any).sharedInterests ?? []).includes(interest);
                                const weight = ((profile as any).interestWeights as any)?.[interest] ?? 5;
                                return (
                                    <View key={interest} style={styles.interestRow}>
                                        <Text style={[styles.interestLabel, !isShared && { color: colors.textSecondary }]}>
                                            {interest}
                                        </Text>
                                        <PassionDots weight={weight} shared={isShared} />
                                    </View>
                                );
                            })}
                            {((profile as any).sharedInterests ?? []).length > 0 && (
                                <Text style={styles.sharedSummary}>
                                    ✨ You both love: {((profile as any).sharedInterests ?? []).join(' · ')}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.interestsGrid}>
                            {(['Hiking', 'Coffee', 'Running', 'Podcasts']).map((interest: string, index: number) => (
                                <View key={index} style={styles.interestTag}>
                                    <Text style={styles.interestEmoji}>
                                        {interest.toLowerCase().includes('hike') ? '🥾' :
                                         interest.toLowerCase().includes('coffee') ? '☕' :
                                         interest.toLowerCase().includes('run') ? '🏃' : '✨'}
                                    </Text>
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* Details */}
                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>DETAILS</Text>
                    <View style={styles.detailsCard}>
                        <DetailItem
                            icon="users"
                            label="Friendship Style"
                            value={profile.friendshipStyle || "One-on-One"}
                            color="#F87171"
                        />
                        <DetailItem
                            icon="heart"
                            label="Life Stage"
                            value={profile.lifeStage || "Early Career"}
                            color="#F87171"
                        />
                        <DetailItem
                            icon="calendar"
                            label="Available"
                            value={formatAvailability(profile.availability)}
                            color="#F87171"
                        />
                        {formatActivityPrefs(profile.activityPreferences) && (
                            <DetailItem
                                icon="zap"
                                label="Activity Vibe"
                                value={formatActivityPrefs(profile.activityPreferences)!}
                                color="#F87171"
                            />
                        )}
                    </View>
                </Animated.View>

                <View style={{ height: 160 }} />
            </ScrollView>

            {/* Bottom Action Buttons */}
            <View style={styles.footer}>
                {/* Do Together suggestion */}
                {(profile as any).suggestedActivity && (
                    <View style={styles.doTogetherCard}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {(profile as any).suggestedActivity.venueImageUrl ? (
                                <Image
                                    source={{ uri: (profile as any).suggestedActivity.venueImageUrl }}
                                    style={{ width: 72, height: 72, borderRadius: 8 }}
                                />
                            ) : null}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                                    {(profile as any).suggestedActivity.label}
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {(profile as any).suggestedActivity.venueName}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                    {(profile as any).suggestedActivity.distanceKm} km away
                                    {(profile as any).suggestedActivity.isPartner ? '  ★ Partner venue — 10% off with Wave' : ''}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.button, styles.maybeButton]}
                        onPress={() => handleWave('maybe')}
                        accessibilityLabel="Maybe Next Time"
                    >
                        <Text style={styles.maybeButtonText}>Maybe Next Time 🌟</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.waveButton]}
                        onPress={() => handleWave('like')}
                        accessibilityLabel="Wave"
                    >
                        <Text style={styles.waveButtonText}>Wave 👋</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.messageButton}
                        onPress={() => router.push(`/chat/${id}` as any)}
                    >
                        <Feather name="message-circle" size={20} color={colors.surface} />
                        <Text style={styles.messageButtonText}>Message {profile.firstName}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function DetailItem({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
    return (
        <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
                <Feather name={icon} size={18} color={color} />
            </View>
            <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF9', // Warm cream background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBF9',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        height: 110,
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
    },
    photoContainer: {
        alignItems: 'center',
        marginTop: -30,
        marginBottom: spacing.md,
    },
    photoWrapper: {
        position: 'relative',
        ...shadow.md,
    },
    photo: {
        width: width * 0.45,
        height: width * 0.45,
        borderRadius: width * 0.225,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4ADE80',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        ...typography.h2,
        color: colors.secondary,
        fontSize: 32,
    },
    age: {
        ...typography.h2,
        color: colors.textSecondary,
        fontSize: 32,
        fontWeight: 'normal',
    },
    verifiedIcon: {
        marginLeft: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    locationText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textTertiary,
        marginLeft: 4,
    },
    compatibilityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3EFEA',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
    },
    compatibilityEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    compatibilityPercent: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.textSecondary,
    },
    compatibilityLabel: {
        ...typography.body,
        fontSize: 15,
        color: colors.textTertiary,
    },
    bioCard: {
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        marginBottom: spacing.xl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    bioText: {
        ...typography.body,
        fontSize: 16,
        color: colors.textPrimary,
        lineHeight: 24,
        textAlign: 'center',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.small,
        color: colors.textTertiary,
        marginBottom: spacing.md,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    breakdownCard: {
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    breakdownItem: {
        marginBottom: spacing.md,
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breakdownLabel: {
        ...typography.body,
        fontSize: 13,
        color: colors.textSecondary,
        marginLeft: 8,
    },
    breakdownPercent: {
        ...typography.bodyBold,
        fontSize: 13,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    passionMeterContainer: {
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    interestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    interestLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        flex: 1,
    },
    sharedSummary: {
        fontSize: 13,
        color: colors.primary,
        marginTop: 8,
    },
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    interestTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3EFEA',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: radius.xl,
    },
    interestEmoji: {
        fontSize: 14,
        marginRight: 6,
    },
    interestText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textSecondary,
    },
    detailsCard: {
        backgroundColor: '#FFF',
        borderRadius: radius.xxl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    detailIconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailInfo: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        ...typography.body,
        fontSize: 12,
        color: colors.textTertiary,
        marginBottom: 2,
    },
    detailValue: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.secondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        backgroundColor: 'rgba(255, 251, 249, 0.95)',
    },
    doTogetherCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    button: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    maybeButton: {
        backgroundColor: 'rgba(0, 180, 180, 0.1)',
    },
    maybeButtonText: {
        color: '#00B4B4',
        fontWeight: '600',
        fontSize: 16,
    },
    messageButton: {
        flex: 1,
        backgroundColor: '#E07050', // Vibrant orange/terra cotta
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.md,
    },
    messageButtonText: {
        ...typography.bodyBold,
        color: '#FFF',
        fontSize: 16,
        marginLeft: 10,
    },
    waveButton: {
        backgroundColor: colors.primary,
        ...shadow.md,
    },
    waveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    backButton: {
        marginTop: 20,
        padding: 12,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});
