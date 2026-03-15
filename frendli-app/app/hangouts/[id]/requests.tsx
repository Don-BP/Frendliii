import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../../constants/tokens';
import { hangoutApi } from '../../../lib/api';

interface JoinRequest {
    id: string;
    status: string;
    message?: string;
    createdAt: string;
    user: {
        id: string;
        profile: {
            firstName: string;
            photos: string[];
            bio?: string;
            interests: string[];
        }
    }
}

export default function ManageRequestsScreen() {
    const { id: hangoutId } = useLocalSearchParams<{ id: string }>();
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        try {
            const data = await hangoutApi.getRequests(hangoutId);
            setRequests(data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    }, [hangoutId]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async (requestId: string, firstName: string) => {
        setProcessing(requestId);
        try {
            await hangoutApi.approveRequest(hangoutId, requestId);
            setRequests(prev => prev.filter(r => r.id !== requestId));
            Alert.alert('Approved!', `${firstName} has been added to your hangout.`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to approve request');
        } finally {
            setProcessing(null);
        }
    };

    const handleDecline = async (requestId: string, firstName: string) => {
        Alert.alert(
            'Decline request?',
            `${firstName}'s request will be declined.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(requestId);
                        try {
                            await hangoutApi.declineRequest(hangoutId, requestId);
                            setRequests(prev => prev.filter(r => r.id !== requestId));
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to decline request');
                        } finally {
                            setProcessing(null);
                        }
                    }
                }
            ]
        );
    };

    const renderRequest = ({ item }: { item: JoinRequest }) => {
        const isProcessing = processing === item.id;
        const photo = item.user.profile.photos?.[0];

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Feather name="user" size={24} color={colors.textSecondary} />
                        </View>
                    )}
                    <View style={styles.cardInfo}>
                        <Text style={styles.name}>{item.user.profile.firstName}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {item.message ? (
                    <View style={styles.messageBox}>
                        <Text style={styles.messageText}>"{item.message}"</Text>
                    </View>
                ) : null}

                {item.user.profile.bio ? (
                    <Text style={styles.bio} numberOfLines={2}>{item.user.profile.bio}</Text>
                ) : null}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.declineButton, isProcessing && styles.disabledButton]}
                        onPress={() => handleDecline(item.id, item.user.profile.firstName)}
                        disabled={isProcessing}
                        accessibilityLabel={`Decline ${item.user.profile.firstName}'s request`}
                    >
                        <Feather name="x" size={16} color={colors.error} />
                        <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.approveButton, isProcessing && styles.disabledButton]}
                        onPress={() => handleApprove(item.id, item.user.profile.firstName)}
                        disabled={isProcessing}
                        accessibilityLabel={`Approve ${item.user.profile.firstName}'s request`}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Feather name="check" size={16} color="#fff" />
                                <Text style={styles.approveText}>Approve</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Join Requests',
                headerTitleStyle: { fontFamily: 'BricolageGrotesque_700Bold' }
            }} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        requests.length > 0 ? (
                            <Text style={styles.headerText}>
                                {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Feather name="inbox" size={48} color={colors.accent} />
                            <Text style={styles.emptyTitle}>No pending requests</Text>
                            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    headerText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: radius.lg,
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarPlaceholder: {
        backgroundColor: colors.sand,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    name: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    timestamp: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    },
    messageBox: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        ...typography.body,
        color: colors.textPrimary,
        fontStyle: 'italic',
    },
    bio: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    declineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.error + '50',
        backgroundColor: colors.error + '10',
        gap: spacing.xs,
    },
    declineText: {
        ...typography.bodyMedium,
        color: colors.error,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: radius.xl,
        backgroundColor: colors.primary,
        gap: spacing.xs,
        ...shadow.md,
    },
    approveText: {
        ...typography.bodyMedium,
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.5,
    },
    empty: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyTitle: {
        marginTop: spacing.lg,
        ...typography.h3,
        color: colors.textPrimary,
    },
    emptySubtitle: {
        marginTop: spacing.xs,
        ...typography.body,
        color: colors.textSecondary,
    },
});
