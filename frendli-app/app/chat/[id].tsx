import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ActivityIndicator, ViewStyle, TextStyle, ImageStyle, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { useAuthStore } from '../../store/authStore';
import { socket } from '../../lib/socket';
import { supabase } from '../../lib/supabase';
import { ICEBREAKER_PROMPTS } from '../../constants/icebreakers';
import { HangoutScheduler } from '../../components/HangoutScheduler';
import { HangoutFeedback } from '../../components/HangoutFeedback';
import { ReportUserModal } from '../../components/ReportUserModal';
import { hangoutApi } from '../../lib/api';

interface Message {
    id: string;
    matchId: string;
    senderId: string;
    content: string;
    createdAt: string;
}

export default function ChatScreen() {
    const { id, otherUserName } = useLocalSearchParams();
    const router = useRouter();
    const { userId } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [showScheduler, setShowScheduler] = useState(false);
    const [pendingHangout, setPendingHangout] = useState<any>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
    const [realMatchId, setRealMatchId] = useState<string>(id as string);
    const [showReportModal, setShowReportModal] = useState(false);
    const [upcomingHangout, setUpcomingHangout] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);

    const formatHangoutTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart.getTime() + 86400000);
        const afterTomorrowStart = new Date(tomorrowStart.getTime() + 86400000);
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (date >= todayStart && date < tomorrowStart) return `Today at ${timeStr}`;
        if (date >= tomorrowStart && date < afterTomorrowStart) return `Tomorrow at ${timeStr}`;
        return (
            date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
            ` at ${timeStr}`
        );
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                if (!supabase) return;
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/messages/${id}`, {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.messages) {
                        setMessages(data.messages);
                        if (data.matchId) {
                            setRealMatchId(data.matchId);
                            // Join the real match room if it's different from the ID in URL
                            if (data.matchId !== id) {
                                socket.emit('join_match', data.matchId);
                            }
                        }
                        if (data.otherUser) {
                            setOtherUserProfile(data.otherUser);
                            try {
                                const hangouts = await hangoutApi.getMy();
                                const now = new Date();
                                const matchHangout = (hangouts as any[])
                                    .filter((h: any) =>
                                        h.status !== 'cancelled' &&
                                        new Date(h.startTime) > now &&
                                        h.attendees.some((a: any) => a.userId === data.otherUser.id)
                                    )
                                    .sort((a: any, b: any) =>
                                        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                                    )[0] ?? null;
                                setUpcomingHangout(matchHangout);
                            } catch (err) {
                                console.error('Error fetching hangout for chat bar:', err);
                            }
                        }
                    } else if (Array.isArray(data)) {
                        setMessages(data);
                    }
                }
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        const checkPendingFeedback = async () => {
            try {
                const data = await hangoutApi.getPendingFeedback(id as string);
                if (data) {
                    setPendingHangout(data);
                    setShowFeedback(true);
                }
            } catch (error) {
                console.error('Error checking pending feedback:', error);
            }
        };

        fetchHistory();
        checkPendingFeedback();

        // Socket setup
        socket.connect();
        socket.emit('join_match', id);

        socket.on('receive_message', (message: Message) => {
            setMessages(prev => [...prev, message]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return () => {
            socket.off('receive_message');
            socket.disconnect();
        };
    }, [id]);

    const handleSend = () => {
        if (inputText.trim() && userId) {
            socket.emit('send_message', {
                matchId: realMatchId,
                senderId: userId,
                content: inputText.trim(),
            });
            setInputText('');
        }
    };

    const handleIcebreaker = (prompt: string) => {
        if (userId) {
            socket.emit('send_message', {
                matchId: id,
                senderId: userId,
                content: prompt,
            });
        }
    };

    const handleHangoutCreated = (hangout: any) => {
        // Send a message about the hangout
        if (userId) {
            socket.emit('send_message', {
                matchId: id,
                senderId: userId,
                content: `✨ I just planned a hangout! Let's go to ${hangout.title} at ${new Date(hangout.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`,
            });
        }
    };

    const handleReport = () => {
        setShowReportModal(true);
    };

    const handleBlock = () => {
        Alert.alert(
            'Block User',
            'Are you sure you want to block this user? You will no longer see their messages or profile.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Block', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!supabase) return;
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;

                            await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/safety/block`, {
                                method: 'POST',
                                headers: { 
                                    'Authorization': `Bearer ${session.access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ blockedId: otherUserProfile?.id || id })
                            });
                            Alert.alert('Blocked', 'User has been blocked.');
                            router.back();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to block user');
                        }
                    }
                }
            ]
        );
    };

    const handleOptions = () => {
        router.push({
            pathname: `/chat/info/${id}`,
            params: { 
                otherUserName: otherUserName || otherUserProfile?.firstName,
                otherUserId: otherUserProfile?.id 
            }
        } as any);
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderId === userId;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                {isMe ? (
                    <LinearGradient
                        colors={['#FF7F61', '#FF9F81']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.messageBubble, styles.messageBubbleMe]}
                    >
                        <Text style={[styles.messageText, styles.messageTextMe]}>
                            {item.content}
                        </Text>
                    </LinearGradient>
                ) : (
                    <View style={[styles.messageBubble, styles.messageBubbleOther]}>
                        <Text style={[styles.messageText, styles.messageTextOther]}>
                            {item.content}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(tabs)/matches');
                        }
                    }}
                >
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerProfile}>
                    <TouchableOpacity 
                        style={styles.headerAvatarContainer} 
                        activeOpacity={0.7}
                        onPress={handleOptions}
                    >
                        {otherUserProfile?.photos?.[0] ? (
                            <Image 
                                source={{ uri: otherUserProfile.photos[0] }} 
                                style={styles.headerAvatar} 
                            />
                        ) : (
                            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                                <Feather name="user" size={18} color={colors.textTertiary} />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.headerName}>{otherUserName || otherUserProfile?.firstName || 'Chat'}</Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPress={() => Alert.alert('Silent SOS', 'Safety services have been notified of your location.')}
                    >
                        <MaterialCommunityIcons name="alert-octagon" size={20} color={colors.warning} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.planButton}
                        onPress={() => setShowScheduler(true)}
                    >
                        <Feather name="calendar" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.infoButton} onPress={handleOptions}>
                        <Feather name="more-horizontal" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {upcomingHangout && (
                <View style={styles.hangoutBar}>
                    <View style={styles.hangoutBarContent}>
                        <View style={styles.hangoutBarIconContainer}>
                            <Text style={styles.hangoutBarIcon}>
                                {upcomingHangout.category === 'games' ? '🎲'
                                    : upcomingHangout.category === 'cafe' ? '☕'
                                    : upcomingHangout.category === 'park' ? '🌿'
                                    : upcomingHangout.category === 'bar' ? '🍺'
                                    : '🗓️'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.hangoutBarTitle}>
                                {upcomingHangout.title}
                            </Text>
                            <Text style={styles.hangoutBarDetails}>
                                {formatHangoutTime(upcomingHangout.startTime)}
                                {upcomingHangout.venue?.name
                                    ? ` · ${upcomingHangout.venue.name}`
                                    : ' · Venue TBD'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {showScheduler && (
                <HangoutScheduler
                    matchId={id as string}
                    onClose={() => setShowScheduler(false)}
                    onHangoutCreated={handleHangoutCreated}
                />
            )}

            {showFeedback && pendingHangout && (
                <HangoutFeedback
                    hangout={pendingHangout}
                    onClose={() => setShowFeedback(false)}
                    onFeedbackSubmitted={() => {
                        setShowFeedback(false);
                        setPendingHangout(null);
                    }}
                    onSkip={async () => {
                        if (pendingHangout) {
                            await hangoutApi.skipFeedback(pendingHangout.id).catch(console.error);
                        }
                        setShowFeedback(false);
                        setPendingHangout(null);
                    }}
                    onReschedule={() => {
                        setShowFeedback(false);
                        setShowScheduler(true);
                    }}
                />
            )}

            <ReportUserModal
                visible={showReportModal}
                reportedUserId={(otherUserProfile?.id ?? id) as string}
                reportedUserName={otherUserProfile?.firstName}
                onClose={() => setShowReportModal(false)}
                onSuccess={() => {}}
            />

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyContent}>
                            <View style={styles.emptyIconContainer}>
                                <MaterialCommunityIcons name="creation" size={42} color={colors.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>New Match! ✨</Text>
                            <Text style={styles.emptySubtitle}>Start the conversation with a fun icebreaker</Text>
                        </View>

                        <View style={styles.icebreakersWrapper}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.icebreakersContainer}
                                decelerationRate="fast"
                                snapToInterval={276} // cardWidth + gap
                            >
                                {ICEBREAKER_PROMPTS.map((prompt, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.icebreakerCard}
                                        onPress={() => handleIcebreaker(prompt)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.icebreakerText}>{prompt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                }
            />

            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachButton}>
                    <Feather name="plus" size={24} color={colors.textTertiary} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textTertiary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                />

                <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                >
                    <Feather name="send" size={20} color={colors.surface} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingTop: 60,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerProfile: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerAvatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    headerAvatarContainer: {
        ...shadow.sm,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerName: {
        ...typography.bodyBold,
        fontSize: 17,
        color: colors.secondary,
    },
    infoButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
    },
    messageWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: spacing.sm,
    },
    messageWrapperMe: {
        justifyContent: 'flex-end',
    },
    messageWrapperOther: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: radius.full,
        marginRight: spacing.xs,
    },
    messageBubble: {
        maxWidth: '78%',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: 20,
    },
    messageBubbleMe: {
        borderBottomRightRadius: 4,
        ...shadow.sm,
    },
    messageBubbleOther: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextMe: {
        color: colors.background,
    },
    messageTextOther: {
        color: colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    attachButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        marginRight: spacing.xs,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        ...typography.body,
        fontSize: 15,
        color: colors.textPrimary,
        marginHorizontal: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.sm,
    },
    sendButtonDisabled: {
        backgroundColor: colors.textTertiary,
        opacity: 0.5,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    emptyContainer: {
        flex: 1,
        minHeight: 500,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyContent: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    emptyIconContainer: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.secondary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    emptySubtitle: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    icebreakersWrapper: {
        width: '100%',
    },
    icebreakersContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    icebreakerCard: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 4,
        borderRadius: radius.xxl,
        width: 260,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
    },
    icebreakerText: {
        ...typography.body,
        color: colors.textPrimary,
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 20,
    },
    sosButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.warning}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.xs,
    } as ViewStyle,
    planButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.xs,
    } as ViewStyle,
    hangoutBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    } as ViewStyle,
    hangoutBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    } as ViewStyle,
    hangoutBarIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
    hangoutBarIcon: {
        fontSize: 18,
    } as TextStyle,
    hangoutBarTitle: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textPrimary,
    } as TextStyle,
    hangoutBarDetails: {
        ...typography.caption,
        color: colors.textSecondary,
    } as TextStyle,
});
