import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, ViewStyle, TextStyle, ImageStyle, ScrollView, Animated, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { Feather } from '@expo/vector-icons';
import { messageApi, hangoutApi } from '../../lib/api';

interface Match {
    id: string;
    otherUser: {
        id: string;
        firstName: string;
        photoUrl: string;
        isOnline?: boolean;
        isSafe?: boolean;
    };
    lastMessage: {
        id: string;
        content: string;
        createdAt: string;
        isUnread?: boolean;
    } | null;
    createdAt: string;
    isHangoutGroup?: boolean;
    hangoutTitle?: string;
    hangoutImage?: string;
    activityIcon?: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
    cafe:        '☕',
    restaurant:  '🍽️',
    park:        '🌿',
    museum:      '🏛️',
    bar:         '🍺',
    music_venue: '🎸',
    karaoke:     '🎤',
    gym:         '🏋️',
    games:       '🎲',
    any:         '✨',
};
const DEFAULT_EMOJI = '🎉';

export default function MessagesScreen() {
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeHangouts, setActiveHangouts] = useState<any[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchAnim = useRef(new Animated.Value(0)).current;

    const openSearch = () => {
        setShowSearch(true);
        Animated.timing(searchAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const closeSearch = () => {
        Animated.timing(searchAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setShowSearch(false);
            setSearchQuery('');
        });
    };

    const fetchMatches = async () => {
        try {
            const [data, hangoutsRaw] = await Promise.all([
                messageApi.getMatches(),
                hangoutApi.getMy().catch((err: any) => {
                    console.error('Error fetching hangouts:', err);
                    return [];
                }),
            ]);

            const now = new Date();
            const upcoming = (hangoutsRaw as any[])
                .filter((h: any) =>
                    new Date(h.startTime) > now && h.status !== 'cancelled'
                )
                .sort((a: any, b: any) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );
            setActiveHangouts(upcoming);

            const enhancedData = data.map((item: any, index: number) => ({
                ...item,
                otherUser: {
                    ...item.otherUser,
                    isOnline: index % 3 === 0,
                    isSafe: index === 0,
                },
                lastMessage: item.lastMessage
                    ? { ...item.lastMessage, isUnread: index < 2 }
                    : null,
            }));
            setMatches(enhancedData);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMatches();
    }, []);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const renderItem = ({ item }: { item: Match }) => {
        const unreadCount = item.lastMessage?.isUnread ? 1 : 0;
        const isHangout = item.isHangoutGroup;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => router.push(isHangout ? `/messages/${item.id}` as any : `/chat/${item.id}?otherUserName=${item.otherUser.firstName}` as any)}
            >
                <View style={styles.avatarContainer}>
                    {isHangout ? (
                        <View style={styles.hangoutAvatarGrid}>
                            <Image 
                                source={{ uri: item.hangoutImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200' }} 
                                style={styles.avatar} 
                            />
                            <View style={styles.activityBadgeMini}>
                                <Text style={styles.activityBadgeTextMini}>{item.activityIcon || '🎲'}</Text>
                            </View>
                        </View>
                    ) : (
                        item.otherUser.photoUrl ? (
                            <View>
                                {item.otherUser.isSafe && (
                                    <View style={styles.safeRing} />
                                )}
                                <Image source={{ uri: item.otherUser.photoUrl }} style={styles.avatar} />
                            </View>
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Feather name="user" size={24} color={colors.textTertiary} />
                            </View>
                        )
                    )}
                    {item.otherUser.isOnline && !isHangout && <View style={styles.onlineBadge} />}
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.name} numberOfLines={1}>
                            {isHangout ? item.hangoutTitle : item.otherUser.firstName}
                        </Text>
                        <Text style={[styles.time, unreadCount > 0 && styles.timeUnread]}>
                            {item.lastMessage ? formatTime(item.lastMessage.createdAt) : formatTime(item.createdAt)}
                        </Text>
                    </View>
                    <View style={styles.messageRow}>
                        <Text
                            style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageUnread]}
                            numberOfLines={1}
                        >
                            {isHangout ? `${item.otherUser.firstName}: ${item.lastMessage?.content || "Started the group"}` : (item.lastMessage?.content || "No messages yet. Say hi!")}
                        </Text>
                        {unreadCount > 0 && (
                            <LinearGradient
                                colors={['#FF7F61', '#FF9F81']}
                                style={styles.unreadCountBadge}
                            >
                                <Text style={styles.unreadCountText}>1</Text>
                            </LinearGradient>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const q = searchQuery.toLowerCase().trim();
    const filteredMatches = q
        ? matches.filter(
            (m) =>
                m.otherUser.firstName.toLowerCase().includes(q) ||
                (m.hangoutTitle ?? '').toLowerCase().includes(q)
        )
        : matches;

    const newMatches = filteredMatches.filter((m) => !m.lastMessage);
    const recentChats = filteredMatches.filter((m) => m.lastMessage);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {!showSearch ? (
                    <View style={styles.headerInner}>
                        <View>
                            <Text style={styles.headerTitle}>Chats</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.iconCircle} onPress={openSearch}>
                                <Feather name="search" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconCircle, styles.iconCircleActive]}
                                onPress={() => router.push('/(tabs)/friends' as any)}
                            >
                                <Feather name="edit" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <Animated.View style={[styles.headerInner, styles.searchRow, { opacity: searchAnim }]}>
                        <TouchableOpacity onPress={closeSearch} style={styles.cancelButton}>
                            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TextInput
                            autoFocus
                            style={styles.searchInput}
                            placeholder="Search chats..."
                            placeholderTextColor={colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                style={styles.clearButton}
                            >
                                <Feather name="x" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {activeHangouts.length > 0 && (
                    <View style={styles.activeHangoutsGroup}>
                        <Text style={styles.sectionHeaderLabel}>Active Hangouts</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScroll}
                        >
                            {activeHangouts.map((hangout) => {
                                const emoji = CATEGORY_EMOJI[hangout.category ?? ''] ?? DEFAULT_EMOJI;
                                return (
                                    <TouchableOpacity
                                        key={hangout.id}
                                        style={styles.activeHangoutItem}
                                        onPress={() => {}}
                                    >
                                        <View style={styles.activeHangoutAvatarContainer}>
                                            {hangout.imageUrl ? (
                                                <Image
                                                    source={{ uri: hangout.imageUrl }}
                                                    style={styles.activeHangoutAvatar}
                                                />
                                            ) : (
                                                <View style={[styles.activeHangoutAvatar, styles.activeHangoutAvatarEmoji]}>
                                                    <Text style={styles.activeHangoutEmojiText}>{emoji}</Text>
                                                </View>
                                            )}
                                            <View style={styles.activeActivityBadge}>
                                                <Text style={styles.activeActivityIcon}>{emoji}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.activeHangoutName} numberOfLines={1}>
                                            {hangout.title}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {newMatches.length > 0 && (
                    <View style={styles.newMatchesSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeaderLabel}>New Waves</Text>
                            <Text style={styles.badgeLabel}>{newMatches.length}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {newMatches.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.newMatchItem}
                                    onPress={() => router.push(`/chat/${item.id}?otherUserName=${item.otherUser.firstName}`)}
                                >
                                    <View style={styles.newMatchAvatarContainer}>
                                        {item.otherUser.photoUrl ? (
                                            <Image source={{ uri: item.otherUser.photoUrl }} style={styles.newMatchAvatar} />
                                        ) : (
                                            <View style={[styles.newMatchAvatar, styles.avatarPlaceholder]}>
                                                <Feather name="user" size={24} color={colors.textTertiary} />
                                            </View>
                                        )}
                                        {item.otherUser.isOnline && <View style={styles.onlineBadge} />}
                                    </View>
                                    <Text style={styles.newMatchName} numberOfLines={1}>{item.otherUser.firstName}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
                
                <View style={styles.messagesSectionHeader}>
                    <Text style={styles.sectionHeaderLabel}>Recent Messages</Text>
                </View>

                <View style={styles.recentChatsSection}>
                    {recentChats.length === 0 && newMatches.length === 0 ? (
                        <View style={styles.centeredPlaceholder}>
                            <Feather name="message-square" size={48} color={colors.textTertiary} />
                            <Text style={styles.emptyText}>No matches yet. Keep waving!</Text>
                        </View>
                    ) : recentChats.length === 0 ? (
                        <View style={styles.centeredPlaceholder}>
                            <Text style={styles.emptyText}>Start a conversation with your new matches!</Text>
                        </View>
                    ) : (
                        recentChats.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {renderItem({ item })}
                                {index < recentChats.length - 1 && <View style={styles.separator} />}
                            </React.Fragment>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    scrollContent: {
        paddingBottom: spacing.xxxl,
    } as ViewStyle,
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: 80,
        paddingBottom: spacing.lg,
    } as ViewStyle,
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    } as ViewStyle,
    searchRow: {
        gap: spacing.sm,
    } as ViewStyle,
    cancelButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    searchInput: {
        flex: 1,
        height: 40,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        ...typography.body,
        fontSize: 15,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    } as TextStyle,
    clearButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    headerTitle: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 34,
        color: colors.secondary,
        letterSpacing: -1,
    } as TextStyle,
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    } as ViewStyle,
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.subtle,
    } as ViewStyle,
    iconCircleActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryLight,
    } as ViewStyle,
    newMatchesSection: {
        marginBottom: spacing.xl,
    } as ViewStyle,
    horizontalScroll: {
        paddingLeft: spacing.lg,
        paddingRight: spacing.sm,
    } as ViewStyle,
    newMatchItem: {
        alignItems: 'center',
        marginRight: spacing.lg,
        width: 80,
    } as ViewStyle,
    newMatchAvatarContainer: {
        position: 'relative',
        marginBottom: spacing.xs,
    } as ViewStyle,
    newMatchAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.surface,
        ...shadow.sm,
    } as ImageStyle,
    newMatchName: {
        ...typography.small,
        fontWeight: '600',
        color: colors.textPrimary,
        width: '100%',
        textAlign: 'center',
    } as TextStyle,
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4ADE80',
        borderWidth: 2,
        borderColor: colors.background,
    } as ViewStyle,
    recentChatsSection: {
        flex: 1,
    } as ViewStyle,
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    } as ViewStyle,
    avatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    } as ViewStyle,
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.surface,
        ...shadow.subtle,
    } as ImageStyle,
    unreadDotBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.background,
    } as ViewStyle,
    chatInfo: {
        flex: 1,
        justifyContent: 'center',
    } as ViewStyle,
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    } as ViewStyle,
    name: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    } as TextStyle,
    time: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
    timeUnread: {
        color: colors.primary,
        ...typography.small,
    } as TextStyle,
    lastMessage: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: 14,
        flex: 1,
        paddingRight: spacing.sm,
    } as TextStyle,
    lastMessageUnread: {
        color: colors.textPrimary,
        ...typography.bodyMedium,
        fontSize: 14,
    } as TextStyle,
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    } as ViewStyle,
    unreadCountBadge: {
        paddingHorizontal: 6,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 20,
    } as ViewStyle,
    unreadCountText: {
        color: colors.surface,
        fontSize: 11,
        fontFamily: 'Lexend_600SemiBold',
    } as TextStyle,
    hangoutAvatarGrid: {
        position: 'relative',
        width: 64,
        height: 64,
    } as ViewStyle,
    activityBadgeMini: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: colors.surface,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
    activityBadgeTextMini: {
        fontSize: 12,
    } as TextStyle,
    safeRing: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#4ADE80',
    } as ViewStyle,
    activeHangoutsGroup: {
        marginBottom: spacing.xl,
    } as ViewStyle,
    sectionHeaderLabel: {
        fontFamily: 'BricolageGrotesque_700Bold',
        fontSize: 18,
        color: colors.textPrimary,
        marginLeft: spacing.lg,
        marginBottom: spacing.md,
    } as TextStyle,
    activeHangoutItem: {
        alignItems: 'center',
        marginRight: spacing.lg,
        width: 72,
    } as ViewStyle,
    activeHangoutAvatarContainer: {
        position: 'relative',
        marginBottom: spacing.xs,
    } as ViewStyle,
    activeHangoutAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.surface,
        ...shadow.sm,
    } as ImageStyle,
    activeHangoutAvatarEmoji: {
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    activeHangoutEmojiText: {
        fontSize: 28,
    } as TextStyle,
    activeActivityBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: colors.surface,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
    activeActivityIcon: {
        fontSize: 12,
    } as TextStyle,
    safeArrivalRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: '#4ADE80',
        borderStyle: 'dashed',
    } as ViewStyle,
    activeHangoutName: {
        ...typography.small,
        fontWeight: '600',
        color: colors.textPrimary,
        width: '100%',
        textAlign: 'center',
    } as TextStyle,
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingRight: spacing.lg,
    } as ViewStyle,
    badgeLabel: {
        backgroundColor: colors.primaryLight,
        color: colors.primary,
        fontSize: 12,
        fontFamily: 'Lexend_600SemiBold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: spacing.sm,
        marginBottom: spacing.md,
    } as TextStyle,
    messagesSectionHeader: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    } as ViewStyle,
    icebreakerSnippet: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E7',
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.sm,
        marginTop: spacing.xs,
        gap: 6,
    } as ViewStyle,
    icebreakerSnippetText: {
        ...typography.small,
        color: '#D99B59',
        fontWeight: '600',
    } as TextStyle,
    separator: {
        height: 1,
        backgroundColor: colors.border,
        opacity: 0.5,
        marginLeft: 96,
        marginRight: spacing.lg,
    } as ViewStyle,
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    } as ViewStyle,
    centeredPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
    } as ViewStyle,
    emptyText: {
        ...typography.body,
        color: colors.textTertiary,
        marginTop: spacing.lg,
        textAlign: 'center',
    } as TextStyle,
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
});
