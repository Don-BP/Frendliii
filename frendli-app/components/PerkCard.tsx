import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { useCountdown } from '../lib/useCountdown';
import { LinearGradient } from 'expo-linear-gradient';

interface PerkCardProps {
    id: string;
    title: string;
    description: string;
    discountText: string;
    valid_until?: string | null;
    earned?: boolean;
    venue: {
        name: string;
        category: string;
        photos: string[];
    };
    onPress?: () => void;
}

export function PerkCard({
    title,
    description,
    discountText,
    valid_until,
    earned = false,
    venue,
    onPress
}: PerkCardProps) {
    const { label: countdownLabel, isUrgent } = useCountdown(valid_until ?? null);
    const image = venue.photos?.[0] || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=800';
    const category = venue.category;
    const venueName = venue.name;
    const distance = '0.5km'; // Placeholder for now
    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                pressed && { transform: [{ scale: 0.98 }] }
            ]}
            onPress={onPress}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.gradient}
                />
                <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{category}</Text>
                </View>
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discountText}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.venueText}>{venueName} • {distance}</Text>

                <View style={styles.divider}>
                    <View style={styles.dot} />
                    <View style={styles.line} />
                    <View style={styles.dot} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.description} numberOfLines={1}>{description}</Text>
                    <View style={styles.claimButton}>
                        <Text style={styles.claimText}>{earned ? 'View' : 'Unlock'}</Text>
                        <Feather name={earned ? 'chevron-right' : 'lock'} size={14} color={colors.primary} />
                    </View>
                </View>
                {countdownLabel ? (
                    <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
                        {countdownLabel}
                    </Text>
                ) : null}
            </View>

            {/* Locked overlay */}
            {!earned && (
                <View style={styles.lockedOverlay}>
                    <View style={styles.lockBadge}>
                        <Feather name="lock" size={14} color={colors.primary} />
                        <Text style={styles.lockText}>Confirm a hangout here to unlock</Text>
                    </View>
                </View>
            )}

            {/* Scannable "Ticket" effect ears */}
            <View style={styles.leftEar} />
            <View style={styles.rightEar} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        ...shadow.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    imageContainer: {
        height: 120,
        width: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    categoryPill: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
    },
    categoryText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: typography.bodyBold.fontFamily,
        textTransform: 'uppercase',
    },
    discountBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.md,
        ...shadow.sm,
    },
    discountText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: typography.h2.fontFamily,
    },
    content: {
        padding: spacing.md,
    },
    title: {
        fontSize: 18,
        fontFamily: typography.h3.fontFamily,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    venueText: {
        fontSize: 13,
        fontFamily: typography.bodyMedium.fontFamily,
        color: colors.textTertiary,
        marginBottom: spacing.sm,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.sm,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
        borderStyle: 'dashed',
        marginHorizontal: 4,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    description: {
        flex: 1,
        fontSize: 13,
        fontFamily: typography.bodyRegular.fontFamily,
        color: colors.textSecondary,
        marginRight: spacing.sm,
    },
    claimButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    claimText: {
        fontSize: 14,
        fontFamily: typography.bodyBold.fontFamily,
        color: colors.primary,
        marginRight: 2,
    },
    leftEar: {
        position: 'absolute',
        left: -10,
        top: 110,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.background, // Match container background
        borderWidth: 1,
        borderColor: colors.border,
    },
    rightEar: {
        position: 'absolute',
        right: -10,
        top: 110,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.background, // Match container background
        borderWidth: 1,
        borderColor: colors.border,
    },
    lockedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(250,250,248,0.75)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: spacing.md,
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
        ...shadow.sm,
    },
    lockText: {
        fontSize: 12,
        fontFamily: typography.bodyMedium.fontFamily,
        color: colors.primary,
        fontWeight: '600',
    },
    countdown: {
        fontSize: 11,
        fontFamily: typography.bodyRegular.fontFamily,
        color: colors.textTertiary,
        marginTop: 4,
    },
    countdownUrgent: {
        color: colors.primary,
    },
});
