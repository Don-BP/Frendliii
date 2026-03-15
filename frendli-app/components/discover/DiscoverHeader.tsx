// frendli-app/components/discover/DiscoverHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography } from '../../constants/tokens';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60';

interface DiscoverHeaderProps {
    profile: { firstName: string; photos: string[] } | null;
    hasActiveFilters: boolean;
    onFilterPress: () => void;
    onNotificationPress: () => void;
    onSOSLongPress: () => void;
}

export const DiscoverHeader: React.FC<DiscoverHeaderProps> = ({
    profile,
    hasActiveFilters,
    onFilterPress,
    onNotificationPress,
    onSOSLongPress,
}) => {
    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity
                    style={styles.headerLeft}
                    onLongPress={onSOSLongPress}
                    delayLongPress={2000}
                    activeOpacity={0.9}
                >
                    <Text style={styles.greetingText}>Hey, {profile?.firstName || 'User'}!</Text>
                    <Text style={styles.greetingSubtext}>Find your people today</Text>
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconButton} onPress={onFilterPress}>
                        <Feather name="sliders" size={20} color={colors.textPrimary} />
                        {hasActiveFilters && <View style={styles.filterActiveDot} />}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerIconButton} onPress={onNotificationPress}>
                        <Feather name="bell" size={20} color={colors.textPrimary} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerAvatarContainer}>
                        <Image
                            source={{ uri: profile?.photos?.[0] || PLACEHOLDER_AVATAR }}
                            style={styles.headerAvatar}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        backgroundColor: colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flex: 1,
    },
    greetingText: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 32,
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    greetingSubtext: {
        ...typography.bodyRegular,
        color: colors.textSecondary,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.subtle,
    },
    filterActiveDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        borderWidth: 1.5,
        borderColor: colors.surface,
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.badgeBlue,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    headerAvatarContainer: {
        borderRadius: 20,
        padding: 2,
        backgroundColor: colors.surface,
        ...shadow.subtle,
        marginLeft: 4,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
});
