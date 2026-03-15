import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../constants/tokens';
import { calculateAge } from '../lib/calculateAge';

interface WaveReceivedProps {
    profile: {
        id: string;
        firstName: string;
        photos: string[];
        score?: number;
        sharedInterests?: string[];
        dob?: string;
    };
    onWaveBack?: () => void;
    onDismiss?: () => void;
    index?: number;
    timeAgo?: string;
}

export const WaveReceivedCard: React.FC<WaveReceivedProps> = memo(({ profile, onWaveBack, onDismiss, index = 0, timeAgo = '5 min ago' }) => {
    const imageUrl = profile.photos?.[0] || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=60';
    const matchScore = profile.score || 88;
    const _displayAge = calculateAge(profile.dob);
    const sharedCount = profile.sharedInterests?.length || 3;

    return (
        <Animated.View 
            entering={FadeInRight.delay(index * 100).duration(500)}
            layout={Layout.springify()}
            style={styles.container}
        >
            <View style={styles.row}>
                {/* Left: Avatar */}
                <Image source={{ uri: imageUrl }} style={styles.avatar} />

                {/* Middle: Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.nameText} numberOfLines={1}>{profile.firstName}</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.matchBadge}>
                            <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.primary} />
                            <Text style={styles.matchText}>{matchScore}% match</Text>
                        </View>
                        <Text style={styles.sharedText}>{sharedCount} shared{'\n'}interests</Text>
                    </View>
                    
                    <Text style={styles.timeText}>{timeAgo}</Text>
                </View>

                {/* Right: Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={styles.waveBackButton} 
                        onPress={onWaveBack}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="hand-wave" size={14} color={colors.surface} />
                        <Text style={styles.waveBackText}>Wave Back</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.dismissButton}
                        onPress={onDismiss} 
                        hitSlop={10}
                    >
                        <Feather name="x" size={14} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        ...shadow.subtle,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.gray[100],
    },
    infoContainer: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    nameText: {
        ...typography.bodyBold,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1EE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    matchText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.primary,
        marginLeft: 2,
    },
    sharedText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 14,
    },
    timeText: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    actionsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    waveBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.badgeBlue,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    waveBackText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.surface,
    },
    dismissButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
});
