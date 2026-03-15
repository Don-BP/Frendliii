import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../constants/tokens';
import { calculateAge } from '../lib/calculateAge';

const FRIENDSHIP_STYLE_LABEL: Record<string, string> = {
    'one-on-one': 'One-on-One',
    'small-group': 'Small Groups',
    'open-gatherings': 'Open Gatherings',
};

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

interface DiscoveryCardProps {
    profile: Profile;
    onWave?: () => void;
    onView?: () => void;
    isWaved?: boolean;
    index?: number;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = memo(({ 
    profile, 
    onWave, 
    onView,
    isWaved = false,
    index = 0
}) => {
    const imageUrl = profile.photos?.[0] || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=60';
    const matchScore = profile.score ? Math.round(profile.score) : 88;
    const isShared = (profile.sharedInterests?.length || 0) > 0;
    const displayAge = calculateAge(profile.dob) ?? profile.age ?? 24;
    const friendshipStyleLabel = profile.friendshipStyle
        ? (FRIENDSHIP_STYLE_LABEL[profile.friendshipStyle] ?? 'Small Groups')
        : 'Small Groups';

    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 100).duration(500)}
            layout={Layout.springify()}
            style={styles.card}
        >
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={onView}
            >
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: imageUrl }} style={styles.avatar} />
                        {profile.isOnline !== false && <View style={styles.onlineDot} />}
                    </View>
                    
                    <View style={styles.identity}>
                        <View style={styles.nameRow}>
                            <Text style={styles.nameText} numberOfLines={1}>
                                {profile.firstName} {profile.isVerified !== false && (
                                    <MaterialCommunityIcons name="check-decagram" size={16} color={colors.success} style={styles.verifiedIcon} />
                                )}, {displayAge}
                            </Text>
                            
                            <View style={styles.matchBadge}>
                                <Text style={styles.matchEmoji}>🤯</Text>
                                <Text style={styles.matchText}>{matchScore}%</Text>
                            </View>
                        </View>
                        
                        <View style={styles.locationRow}>
                            <Feather name="map-pin" size={12} color={colors.textTertiary} />
                            <Text style={styles.metaSubtitle}>
                                {profile.distance || '1.2 mi away'}
                            </Text>
                        </View>
                        <View style={styles.locationRow}>
                            <Feather name="users" size={12} color={colors.success} />
                            <Text style={[styles.metaSubtitle, { color: colors.success }]}>
                                {friendshipStyleLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bio Section */}
                {profile.bio && (
                    <Text style={styles.bioText} numberOfLines={2}>
                        {profile.bio}
                    </Text>
                )}
                {!profile.bio && (
                    <Text style={styles.bioText} numberOfLines={2}>
                        Product designer who loves trail running and trying every coffee shop in the city. Always down for a ...
                    </Text>
                )}

                {/* Shared Interest highlight if any */}
                {isShared && (
                    <View style={styles.sharedHighlightRow}>
                        <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.primary} />
                        <Text style={styles.sharedHighlightText}>{profile.sharedInterests?.length} shared interest{profile.sharedInterests?.length === 1 ? '' : 's'}</Text>
                    </View>
                )}

                {/* Interests Section */}
                <View style={styles.interestsContainer}>
                    {profile.interests.slice(0, 3).map((interest, index) => {
                        const isInterestShared = profile.sharedInterests?.includes(interest);
                        return (
                            <View key={index} style={[styles.interestChip, isInterestShared && styles.interestChipShared]}>
                                <Text style={[styles.interestText, isInterestShared && styles.interestTextShared]}>
                                    {getInterestEmoji(interest)} {interest}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.waveButton, isWaved && styles.wavedButton]} 
                        onPress={onWave}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons 
                            name="hand-wave" 
                            size={18} 
                            color={isWaved ? colors.primary : colors.surface} 
                        />
                        <Text style={[styles.waveButtonText, isWaved && styles.wavedButtonText]}>
                            {isWaved ? 'Waved!' : 'Wave'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.viewButton} 
                        onPress={onView} 
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Helper for emojis (can be expanded)
const getInterestEmoji = (interest: string) => {
    const lower = interest.toLowerCase();
    if (lower.includes('hiking')) return '🥾';
    if (lower.includes('coffee')) return '☕';
    if (lower.includes('gaming')) return '🎮';
    if (lower.includes('music')) return '🎵';
    if (lower.includes('reading')) return '📚';
    if (lower.includes('cooking')) return '🍳';
    if (lower.includes('travel')) return '✈️';
    if (lower.includes('art')) return '🎨';
    if (lower.includes('running')) return '🏃';
    return '✨';
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 24, // Matches the screenshot more closely
        padding: spacing.lg,
        width: '100%',
        ...shadow.subtle,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    header: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.gray[100],
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    identity: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        marginBottom: 2,
    },
    nameText: {
        ...typography.bodyBold,
        fontSize: 18,
        color: colors.textPrimary,
        flex: 1,
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray[100],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    matchEmoji: {
        fontSize: 12,
        marginRight: 4,
    },
    matchText: {
        ...typography.small,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 4,
    },
    metaSubtitle: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textTertiary,
    },
    bioText: {
        ...typography.bodyRegular,
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    sharedHighlightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 4,
    },
    sharedHighlightText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    interestChip: {
        backgroundColor: '#FFF1EE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,127,97,0.2)',
    },
    interestChipShared: {
        backgroundColor: '#FFF1EE',
        borderColor: colors.primary,
    },
    interestText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '500',
        fontSize: 12,
    },
    interestTextShared: {
        color: colors.primary,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    waveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.badgeBlue,
        height: 44,
        borderRadius: 22,
        gap: 8,
    },
    wavedButton: {
        backgroundColor: `${colors.badgeBlue}10`,
        borderWidth: 1,
        borderColor: `${colors.badgeBlue}20`,
    },
    waveButtonText: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.surface,
    },
    wavedButtonText: {
        color: colors.badgeBlue,
    },
    viewButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.gray[100],
        height: 44,
        borderRadius: 22,
        gap: 8,
    },
    viewButtonText: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.textSecondary,
    },
});


