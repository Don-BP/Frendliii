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
