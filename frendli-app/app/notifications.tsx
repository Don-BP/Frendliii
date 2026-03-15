import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../constants/tokens';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'wave' | 'match' | 'hangout' | 'safety';
    read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        title: 'New Wave! 👋',
        message: 'Sarah just waved at you. Wave back to start chatting!',
        time: '2m ago',
        type: 'wave',
        read: false,
    },
    {
        id: '2',
        title: 'Upcoming Hangout ☕',
        message: 'Your coffee hangout at Central Perks is starting in 1 hour.',
        time: '45m ago',
        type: 'hangout',
        read: false,
    },
    {
        id: '3',
        title: 'SafeArrival™ Active',
        message: 'We\'ll be monitoring your journey to the hangout.',
        time: '1h ago',
        type: 'safety',
        read: true,
    },
    {
        id: '4',
        title: 'New Connection! ✨',
        message: 'You and Michael are now connected. Say hello!',
        time: '3h ago',
        type: 'match',
        read: true,
    }
];

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const router = useRouter();

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'wave': return { name: 'hand-wave-outline', color: colors.primary };
            case 'match': return { name: 'sparkles', color: colors.secondary };
            case 'hangout': return { name: 'coffee-outline', color: colors.primary };
            case 'safety': return { name: 'shield-check-outline', color: colors.success };
            default: return { name: 'bell-outline', color: colors.textTertiary };
        }
    };

    const renderItem = ({ item, index }: { item: Notification, index: number }) => {
        const iconInfo = getIcon(item.type);
        
        return (
            <Animated.View 
                entering={FadeInRight.delay(index * 100)}
                exiting={FadeOutLeft}
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
            >
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name={iconInfo.name as any} size={24} color={iconInfo.color} />
                </View>
                
                <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.notificationTitle}>{item.title}</Text>
                        <Text style={styles.notificationTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                </View>

                {!item.read && <View style={styles.unreadDot} />}
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity style={styles.markReadButton} onPress={markAllRead}>
                        <Text style={styles.markReadText}>Read All</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Feather name="bell-off" size={48} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>All caught up!</Text>
                            <Text style={styles.emptySubtitle}>We'll notify you when something important happens.</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h3,
        fontSize: 18,
        color: colors.textPrimary,
    },
    markReadButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    markReadText: {
        ...typography.bodyBold,
        fontSize: 14,
        color: colors.primary,
    },
    listContent: {
        paddingVertical: spacing.md,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    unreadCard: {
        backgroundColor: `${colors.primary}05`,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        ...shadow.subtle,
    },
    contentContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    notificationTime: {
        ...typography.body,
        fontSize: 12,
        color: colors.textTertiary,
    },
    notificationMessage: {
        ...typography.body,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        alignSelf: 'center',
        marginLeft: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: spacing.xxl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        ...typography.body,
        fontSize: 15,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
