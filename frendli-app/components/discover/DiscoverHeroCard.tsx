// frendli-app/components/discover/DiscoverHeroCard.tsx
import React from 'react';
import {
    View, Text, Image, StyleSheet, TouchableOpacity,
    useWindowDimensions
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/tokens';
import { DiscoveryRecommendation } from '../../lib/api';

interface Props {
    profile: DiscoveryRecommendation;
    onWave: (receiverId: string) => void;
    onMaybe: (receiverId: string) => void;
    onSnooze?: (receiverId: string) => void;
}

function PassionDots({ weight, shared }: { weight: number; shared: boolean }) {
    const filled = Math.round(weight);
    return (
        <View style={styles.dotsRow}>
            {Array.from({ length: 10 }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        i < filled
                            ? shared ? styles.dotFilledShared : styles.dotFilledOther
                            : styles.dotEmpty,
                    ]}
                />
            ))}
        </View>
    );
}

export function DiscoverHeroCard({ profile, onWave, onMaybe, onSnooze }: Props) {
    const { width } = useWindowDimensions();
    const photoUri = profile.photos?.[0];
    const displayInterests = profile.sharedInterests.slice(0, 3);
    const weights = (profile.interestWeights ?? {}) as Record<string, number>;

    return (
        <View style={[styles.card, { width: width - spacing.lg * 2 }]}>
            {/* Photo */}
            <View style={styles.photoContainer}>
                {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
                ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]} />
                )}

                {/* Badges overlaid on photo */}
                <View style={styles.badgeRow}>
                    <View style={styles.rankBadge}>
                        <Text style={styles.rankEmoji}>{profile.rank.emoji}</Text>
                        <Text style={styles.rankName}>{profile.rank.name}</Text>
                    </View>
                    {profile.safetyBadges?.includes('ID Verified') && (
                        <View style={styles.verifiedBadge}>
                            <MaterialCommunityIcons name="check-decagram" size={14} color="#4ADE80" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Info panel */}
            <View style={styles.infoPanel}>
                <Text style={styles.nameText}>
                    {profile.firstName}
                    {profile.distanceKm !== null ? `  ·  📍 ${profile.distanceKm.toFixed(1)} km away` : ''}
                </Text>

                {/* Interest passion dots — shared interests only, max 3 */}
                {displayInterests.map(interest => (
                    <View key={interest} style={styles.interestRow}>
                        <Text style={styles.interestLabel}>{interest}</Text>
                        <PassionDots weight={weights[interest] ?? 5} shared={true} />
                    </View>
                ))}

                {/* Do Together */}
                {profile.suggestedActivity && (
                    <View style={styles.doTogetherCard}>
                        <Text style={styles.doTogetherHeader}>Do Together</Text>
                        <View style={styles.doTogetherContent}>
                            {profile.suggestedActivity.venueImageUrl ? (
                                <Image
                                    source={{ uri: profile.suggestedActivity.venueImageUrl }}
                                    style={styles.venueThumb}
                                />
                            ) : null}
                            <View style={styles.doTogetherText}>
                                <Text style={styles.activityLabel}>{profile.suggestedActivity.label}</Text>
                                <Text style={styles.venueName}>{profile.suggestedActivity.venueName}</Text>
                                <Text style={styles.venueDistance}>
                                    {profile.suggestedActivity.distanceKm} km
                                    {profile.suggestedActivity.isPartner ? '  ★ Partner' : ''}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Action buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.maybeButton}
                        onPress={() => onMaybe(profile.userId)}
                        accessibilityLabel="Maybe Next Time"
                        accessibilityHint="Snooze this profile for 48 hours"
                    >
                        <Text style={styles.maybeButtonText}>Maybe Next Time 🌟</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.waveButton}
                        onPress={() => onWave(profile.userId)}
                        accessibilityLabel="Wave"
                        accessibilityHint="Send a wave to this person"
                    >
                        <Text style={styles.waveButtonText}>Wave 👋</Text>
                    </TouchableOpacity>
                </View>

                {/* Snooze — secondary action */}
                {onSnooze && (
                    <TouchableOpacity
                        style={styles.snoozeButton}
                        onPress={() => onSnooze(profile.userId)}
                        accessibilityLabel="Snooze"
                        accessibilityHint="Hide this person from recommendations for 1 hour"
                    >
                        <Feather name="clock" size={13} color={colors.textSecondary} />
                        <Text style={styles.snoozeButtonText}>Snooze</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 4,
    },
    photoContainer: {
        height: 240,
        position: 'relative',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        backgroundColor: colors.border,
    },
    badgeRow: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.sm,
        right: spacing.sm,
        flexDirection: 'row',
    },
    rankBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        gap: 4,
    },
    rankEmoji: { fontSize: 14 },
    rankName: { color: '#fff', fontSize: 12, fontWeight: '600' },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        gap: 4,
        marginLeft: spacing.xs,
    },
    verifiedBadgeText: {
        color: '#4ADE80',
        fontSize: 12,
        fontWeight: '600',
    },
    infoPanel: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    nameText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    interestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    interestLabel: {
        fontSize: 13,
        color: colors.textPrimary,
        width: 100,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 3,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotFilledShared: { backgroundColor: colors.primary },
    dotFilledOther: { backgroundColor: colors.textSecondary },
    dotEmpty: { backgroundColor: colors.border },
    doTogetherCard: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.sm,
        marginTop: spacing.xs,
    },
    doTogetherHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: spacing.xs,
    },
    doTogetherContent: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    venueThumb: {
        width: 56,
        height: 56,
        borderRadius: radius.sm,
    },
    doTogetherText: {
        flex: 1,
        gap: 2,
    },
    activityLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    venueName: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    venueDistance: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    maybeButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: 'rgba(0, 180, 180, 0.1)',
        alignItems: 'center',
    },
    maybeButtonText: {
        color: '#00B4B4',
        fontWeight: '600',
        fontSize: 14,
    },
    waveButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    waveButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    snoozeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.xs,
    },
    snoozeButtonText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
