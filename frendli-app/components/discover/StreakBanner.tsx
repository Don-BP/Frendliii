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
