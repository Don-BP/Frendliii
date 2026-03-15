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
