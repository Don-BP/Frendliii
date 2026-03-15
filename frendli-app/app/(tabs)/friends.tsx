import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    Dimensions, ViewStyle, TextStyle, ImageStyle,
    ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { friendApi } from '../../lib/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const FRIEND_CATEGORY_EMOJI: Record<string, string> = {
    coffee:   '☕',
    food:     '🍽️',
    outdoors: '🌿',
    games:    '🎮',
    music:    '🎸',
    arts:     '🎨',
    fitness:  '💪',
    other:    '🎉',
};
const DEFAULT_FRIEND_EMOJI = '🎉';

type FriendCard = {
    userId: string;
    firstName: string;
    profilePhoto: string | null;
    hangoutCount: number;
    lastHangout: {
        title: string;
        category: string | null;
        startTime: string;
    };
};

export default function FriendsScreen() {
    const router = useRouter();
    const [friends, setFriends] = useState<FriendCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchFriends = useCallback(async (refreshing = false) => {
        try {
            if (refreshing) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }
            const data = await friendApi.getAll();
            setFriends(data.friends);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load friends');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const renderItem = useCallback(({ item, index }: { item: FriendCard; index: number }) => {
        const emoji = FRIEND_CATEGORY_EMOJI[item.lastHangout.category ?? ''] ?? DEFAULT_FRIEND_EMOJI;
        const parsedDate = item.lastHangout.startTime ? new Date(item.lastHangout.startTime) : null;
        const date = parsedDate && !isNaN(parsedDate.getTime())
            ? parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';
        const badgeText = `${item.hangoutCount} hangout${item.hangoutCount !== 1 ? 's' : ''}`;

        return (
            <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push(`/profile/${item.userId}` as any)}
                >
                    <View style={styles.friendCard}>
                        {item.profilePhoto ? (
                            <Image source={{ uri: item.profilePhoto }} style={styles.cardImage} />
                        ) : (
                            <View style={[styles.cardImage, styles.placeholderImage]}>
                                <Text style={styles.placeholderInitial}>
                                    {item.firstName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.cardGradient} />

                        <View style={styles.hangoutBadge}>
                            <Text style={styles.hangoutBadgeText}>{badgeText}</Text>
                        </View>

                        <View style={styles.cardInfo}>
                            <Text style={styles.friendName} numberOfLines={1}>
                                {item.firstName}
                            </Text>
                            <Text style={styles.lastHangout} numberOfLines={1}>
                                {emoji} {item.lastHangout.title} · {date}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [router]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchFriends()}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Friends</Text>
                    <Text style={styles.headerSubtitle}>People you've met up with</Text>
                </View>
            </View>

            <FlatList
                data={friends}
                keyExtractor={item => item.userId}
                renderItem={renderItem}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchFriends(true)}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🤝</Text>
                        <Text style={styles.emptyTitle}>No friends yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Complete a hangout and leave positive feedback to add friends!
                        </Text>
                        <TouchableOpacity
                            style={styles.discoverButton}
                            onPress={() => router.push('/(tabs)/hangouts' as any)}
                        >
                            <Text style={styles.discoverButtonText}>Find a Hangout</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cream,
    } as ViewStyle,
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    } as TextStyle,
    errorText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    } as TextStyle,
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    } as ViewStyle,
    retryButtonText: {
        ...typography.bodyBold,
        color: '#fff',
    } as TextStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: spacing.lg,
    } as ViewStyle,
    headerTitle: {
        ...typography.h1,
        fontSize: 34,
        color: colors.secondary,
        letterSpacing: -1,
    } as TextStyle,
    headerSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    } as TextStyle,
    gridContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
        flexGrow: 1,
    } as ViewStyle,
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    } as ViewStyle,
    friendCard: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.45,
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        overflow: 'hidden',
        position: 'relative',
        ...shadow.card,
        borderWidth: 1,
        borderColor: 'rgba(45,30,75,0.05)',
    } as ViewStyle,
    cardImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    } as ImageStyle,
    placeholderImage: {
        backgroundColor: colors.primary + '22',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    placeholderInitial: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 48,
        color: colors.primary,
    } as TextStyle,
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(45,30,75,0.2)',
        marginTop: '60%',
    } as ViewStyle,
    hangoutBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.full,
        zIndex: 10,
        ...shadow.sm,
    } as ViewStyle,
    hangoutBadgeText: {
        ...typography.small,
        fontWeight: '800',
        fontSize: 10,
        color: colors.surface,
        letterSpacing: 0.5,
    } as TextStyle,
    cardInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
    } as ViewStyle,
    friendName: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 16,
        color: colors.surface,
        marginBottom: 2,
    } as TextStyle,
    lastHangout: {
        ...typography.small,
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    } as TextStyle,
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: spacing.xxxl,
        paddingHorizontal: spacing.xl,
    } as ViewStyle,
    emptyIcon: {
        fontSize: 56,
        marginBottom: spacing.lg,
    } as TextStyle,
    emptyTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    } as TextStyle,
    emptySubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    } as TextStyle,
    discoverButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        ...shadow.premium,
    } as ViewStyle,
    discoverButtonText: {
        ...typography.bodyBold,
        color: '#fff',
    } as TextStyle,
});
