import React from 'react';
import { useCountdown } from '../lib/useCountdown';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ViewStyle,
    TextStyle,
    ImageStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';

export interface PartnerVenue {
    id: string;
    name: string;
    category: string | null;
    partnerTier: 'perks' | 'premier';
    dealText: string;
    valid_until?: string | null;
    distance: string | null;
    photos: string[];
    address: string;
    openingHours: Record<string, { open: string; close: string } | null> | null;
}

interface VenuePromotionCardProps {
    venue: PartnerVenue;
    displayContext: 'strip' | 'feed';
    onPress: () => void;
}

export function VenuePromotionCard({ venue, displayContext, onPress }: VenuePromotionCardProps) {
    const { label: countdownLabel, isUrgent } = useCountdown(venue.valid_until ?? null);
    const imageUrl = venue.photos[0] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';
    const isFeed = displayContext === 'feed';

    return (
        <TouchableOpacity
            style={[styles.card, isFeed ? styles.cardFeed : styles.cardStrip]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={[styles.imageContainer, isFeed ? styles.imageFeed : styles.imageStrip]}>
                <Image source={{ uri: imageUrl }} style={styles.image} />

                {/* Premier badge — strip mode only */}
                {!isFeed && venue.partnerTier === 'premier' && (
                    <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>Featured</Text>
                    </View>
                )}

                {/* Suggested label — feed mode only */}
                {isFeed && (
                    <View style={styles.suggestedLabel}>
                        <Text style={styles.suggestedLabelText}>Suggested for you</Text>
                    </View>
                )}
            </View>

            <View style={styles.body}>
                <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>

                <View style={styles.metaRow}>
                    <Feather name="map-pin" size={11} color={colors.textTertiary} />
                    <Text style={styles.metaText} numberOfLines={1}>
                        {venue.category}{venue.distance ? ` · ${venue.distance}` : ''}
                    </Text>
                </View>

                {venue.dealText ? (
                    <View style={styles.dealRow}>
                        <Text style={styles.dealEmoji}>🎁</Text>
                        <Text style={styles.dealText} numberOfLines={1}>{venue.dealText}</Text>
                    </View>
                ) : null}
                {countdownLabel ? (
                    <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
                        {countdownLabel}
                    </Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
    } as ViewStyle,
    cardStrip: {
        width: 260,
        marginRight: spacing.md,
    } as ViewStyle,
    cardFeed: {
        width: '100%',
        marginBottom: spacing.lg,
    } as ViewStyle,
    imageContainer: {
        width: '100%',
    } as ViewStyle,
    imageStrip: {
        height: 130,
    } as ViewStyle,
    imageFeed: {
        height: 180,
    } as ViewStyle,
    image: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    featuredBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    } as ViewStyle,
    featuredBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    } as TextStyle,
    suggestedLabel: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    } as ViewStyle,
    suggestedLabelText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    } as TextStyle,
    body: {
        padding: spacing.md,
        gap: 4,
    } as ViewStyle,
    venueName: {
        ...typography.bodyBold,
        color: '#2D2D2D',
        fontSize: 14,
    } as TextStyle,
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    } as ViewStyle,
    metaText: {
        ...typography.small,
        color: colors.textSecondary,
        fontSize: 12,
        textTransform: 'capitalize',
    } as TextStyle,
    dealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    } as ViewStyle,
    dealEmoji: {
        fontSize: 12,
    } as TextStyle,
    dealText: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '600',
        fontSize: 12,
        flex: 1,
    } as TextStyle,
    countdown: {
        fontSize: 11,
        fontFamily: typography.bodyRegular.fontFamily,
        color: colors.textTertiary,
        marginTop: 2,
    } as TextStyle,
    countdownUrgent: {
        color: colors.primary,
    } as TextStyle,
});
