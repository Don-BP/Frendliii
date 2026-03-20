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
import { hangoutApi, profileApi, safetyApi } from '../../lib/api';
import * as Location from 'expo-location';

// Chat enhancement imports
import { setSafeArrivalConfig, scheduleSafeArrivalEscalation, cancelSafeArrivalNotifications, confirmUserSafe } from '../../lib/safety-location';
import { parseMessage, encodeMessage } from '../../components/chat/messageTypes';
import { ChatImageMessage } from '../../components/chat/ChatImageMessage';
import { ChatLocationCard } from '../../components/chat/ChatLocationCard';
import { ChatHangoutCard } from '../../components/chat/ChatHangoutCard';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { ReplyBar } from '../../components/chat/ReplyBar';
import { ReactionPicker, ReactionChips, Reaction } from '../../components/chat/ReactionPicker';
import { AttachmentMenu } from '../../components/chat/AttachmentMenu';
import { IcebreakerStrip } from '../../components/chat/IcebreakerStrip';
import { SafeArrivalBanner } from '../../components/chat/SafeArrivalBanner';

interface Message {
    id: string;
    matchId: string;
    senderId: string;
    content: string;
    createdAt: string;
}

export default function ChatScreen() {
    const { id, otherUserName, openReport } = useLocalSearchParams();
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

    // Enhancement state
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
    const [pickerTarget, setPickerTarget] = useState<string | null>(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showSafeArrival, setShowSafeArrival] = useState(false);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.messages) {
                        setMessages(data.messages);
                        if (data.matchId) {
                            setRealMatchId(data.matchId);
                            if (data.matchId !== id) socket.emit('join_match', data.matchId);
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
                                const venueLat = matchHangout?.venue?.lat
                                const venueLng = matchHangout?.venue?.lng
                                if (venueLat != null && venueLng != null) {
                                    const saConfig = {
                                        hangoutId: matchHangout.id,
                                        venueLat,
                                        venueLng,
                                        venueName: matchHangout.venue.name,
                                        venueAddress: matchHangout.venue.address || '',
                                        otherPersonFirstName: data.otherUser.firstName,
                                        scheduledTime: matchHangout.startTime,
                                    };
                                    setSafeArrivalConfig(saConfig);
                                    await scheduleSafeArrivalEscalation(saConfig);
                                }
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

        if (openReport === '1') setShowReportModal(true);

        fetchHistory();
        checkPendingFeedback();

        socket.connect();
        socket.emit('join_match', id);

        socket.on('receive_message', (message: Message) => {
            setMessages(prev => [...prev, message]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });
        socket.on('user_typing', () => setIsPartnerTyping(true));
        socket.on('user_stop_typing', () => setIsPartnerTyping(false));
        socket.on('receive_reaction', ({ messageId, emoji, senderId }: any) => {
            setReactions(prev => {
                const existing = prev[messageId] || [];
                const idx = existing.findIndex(r => r.emoji === emoji);
                if (idx >= 0) {
                    const updated = [...existing];
                    updated[idx] = { ...updated[idx], count: updated[idx].count + 1 };
                    return { ...prev, [messageId]: updated };
                }
                return { ...prev, [messageId]: [...existing, { emoji, count: 1, mine: senderId === userId }] };
            });
        });

        return () => {
            socket.off('receive_message');
            socket.off('user_typing');
            socket.off('user_stop_typing');
            socket.off('receive_reaction');
            socket.disconnect();
        };
    }, [id]);

    // Show SafeArrival banner when hangout is within 30 min
    useEffect(() => {
        if (!upcomingHangout) return;
        const hangoutTime = new Date(upcomingHangout.startTime).getTime();
        const now = Date.now();
        const diffMin = (hangoutTime - now) / 60000;
        if (diffMin <= 30 && diffMin >= -60) {
            setShowSafeArrival(true);
        }
    }, [upcomingHangout]);

    const handleSendContent = (content: string) => {
        if (!userId) return;
        const optimistic: Message = {
            id: `local-${Date.now()}`,
            matchId: realMatchId,
            senderId: userId,
            content,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        socket.emit('send_message', { matchId: realMatchId, senderId: userId, content });
    };

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !userId) return;
        const content = replyTo
            ? `[↩ "${replyTo.slice(0, 40)}${replyTo.length > 40 ? '…' : ''}"]\n${text}`
            : text;
        handleSendContent(content);
        setInputText('');
        setReplyTo(null);
    };

    const handleIcebreaker = (prompt: string) => {
        handleSendContent(prompt);
    };

    const handleTextChange = (text: string) => {
        setInputText(text);
        socket.emit('typing_start', { matchId: realMatchId, senderId: userId });
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            socket.emit('typing_stop', { matchId: realMatchId, senderId: userId });
        }, 1500);
    };

    const handleHangoutCreated = (hangout: any) => {
        if (userId) {
            handleSendContent(encodeMessage('hangout', {
                title: hangout.title,
                startTime: hangout.startTime,
                venueName: hangout.venue?.name,
                venueAddress: hangout.venue?.address,
                hangoutId: hangout.id,
            }));
        }
    };

    const handleReport = () => setShowReportModal(true);

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
        const parsed = parseMessage(item.content);
        const msgReactions = reactions[item.id] || [];

        if (parsed.type === 'system') {
            return (
                <View style={styles.systemMsg}>
                    <Text style={styles.systemMsgText}>{parsed.payload.text}</Text>
                </View>
            );
        }

        const bubble = (() => {
            switch (parsed.type) {
                case 'image':
                    return <ChatImageMessage url={parsed.payload.url} isMe={isMe} />;
                case 'location':
                    return <ChatLocationCard payload={parsed.payload} isMe={isMe} />;
                case 'hangout':
                    return <ChatHangoutCard payload={parsed.payload} isMe={isMe} />;
                default: {
                    const content = parsed.payload.text;
                    const replyMatch = content.match(/^\[↩ "(.+?)"\]\n([\s\S]+)$/);
                    return (
                        <TouchableOpacity
                            onLongPress={() => {
                                if (isMe) {
                                    setPickerTarget(item.id);
                                } else {
                                    setReplyTo(item.content);
                                }
                            }}
                            activeOpacity={0.85}
                            delayLongPress={350}
                        >
                            {isMe ? (
                                <LinearGradient
                                    colors={['#FF7F61', '#FF9F81']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={[styles.messageBubble, styles.messageBubbleMe]}
                                >
                                    {replyMatch && (
                                        <Text style={styles.replyQuoteMe}>↩ {replyMatch[1]}</Text>
                                    )}
                                    <Text style={[styles.messageText, styles.messageTextMe]}>
                                        {replyMatch ? replyMatch[2] : content}
                                    </Text>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.messageBubble, styles.messageBubbleOther]}>
                                    {replyMatch && (
                                        <Text style={styles.replyQuoteOther}>↩ {replyMatch[1]}</Text>
                                    )}
                                    <Text style={[styles.messageText, styles.messageTextOther]}>
                                        {replyMatch ? replyMatch[2] : content}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }
            }
        })();

        return (
            <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                <View>
                    {bubble}
                    <ReactionChips reactions={msgReactions} />
                </View>
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
            {/* Header */}
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
                        onPress={() => {
                            Alert.alert(
                                'Send Silent SOS?',
                                'This will alert your emergency contacts with your current location.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Send SOS',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                const { status } = await Location.requestForegroundPermissionsAsync();
                                                const loc = status === 'granted'
                                                    ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
                                                    : null;
                                                await safetyApi.triggerSOS({
                                                    latitude: loc?.coords.latitude ?? 0,
                                                    longitude: loc?.coords.longitude ?? 0,
                                                });
                                                Alert.alert('SOS Sent', 'Your emergency contacts have been alerted.');
                                            } catch {
                                                Alert.alert('Error', 'Failed to send SOS. Please call emergency services directly.');
                                            }
                                        },
                                    },
                                ],
                            );
                        }}
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

            {/* Upcoming hangout bar */}
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
                            <Text style={styles.hangoutBarTitle}>{upcomingHangout.title}</Text>
                            <Text style={styles.hangoutBarDetails}>
                                {formatHangoutTime(upcomingHangout.startTime)}
                                {upcomingHangout.venue?.name ? ` · ${upcomingHangout.venue.name}` : ' · Venue TBD'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* SafeArrival banner */}
            {showSafeArrival && upcomingHangout && (
                <SafeArrivalBanner
                    venueName={upcomingHangout.venue?.name}
                    onConfirmSafe={() => {
                        confirmUserSafe();
                        if (upcomingHangout?.id) cancelSafeArrivalNotifications(upcomingHangout.id);
                        handleSendContent(encodeMessage('system', { text: '✅ SafeArrival confirmed — arrived safely.' }));
                    }}
                    onRunningLate={() => {
                        handleSendContent("Hey, running a little late! On my way soon 🙏");
                        setShowSafeArrival(false);
                    }}
                    onDismiss={() => setShowSafeArrival(false)}
                />
            )}

            {/* Modals */}
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

            <ReactionPicker
                visible={pickerTarget !== null}
                onClose={() => setPickerTarget(null)}
                onSelect={(emoji) => {
                    if (!pickerTarget || !userId) return;
                    socket.emit('send_reaction', { messageId: pickerTarget, emoji, senderId: userId, matchId: realMatchId });
                    setReactions(prev => {
                        const existing = prev[pickerTarget] || [];
                        const idx = existing.findIndex(r => r.emoji === emoji);
                        if (idx >= 0) {
                            const updated = [...existing];
                            updated[idx] = { ...updated[idx], count: updated[idx].count + 1, mine: true };
                            return { ...prev, [pickerTarget]: updated };
                        }
                        return { ...prev, [pickerTarget]: [...existing, { emoji, count: 1, mine: true }] };
                    });
                    setPickerTarget(null);
                }}
            />

            <AttachmentMenu
                visible={showAttachMenu}
                onClose={() => setShowAttachMenu(false)}
                onSendContent={handleSendContent}
                onOpenScheduler={() => setShowScheduler(true)}
                uploadImage={(uri) => profileApi.uploadImage(userId!, uri, 'chat-images')}
            />

            {/* Message list */}
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
                    </View>
                }
            />

            {/* Typing indicator */}
            {isPartnerTyping && (
                <View style={{ paddingHorizontal: spacing.md }}>
                    <TypingIndicator />
                </View>
            )}

            {/* Icebreaker strip (always visible, collapsible) */}
            <IcebreakerStrip onSend={handleSendContent} />

            {/* Reply bar */}
            {replyTo && <ReplyBar replyTo={replyTo} onClear={() => setReplyTo(null)} />}

            {/* Input area */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachButton} onPress={() => setShowAttachMenu(true)}>
                    <Feather name="plus" size={24} color={colors.textTertiary} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textTertiary}
                    value={inputText}
                    onChangeText={handleTextChange}
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
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.sm, paddingTop: 60, paddingBottom: spacing.sm,
        backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    headerAvatar: {
        width: 40, height: 40, borderRadius: 20, marginRight: spacing.sm,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    headerAvatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    headerAvatarContainer: { ...shadow.sm },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerName: { ...typography.bodyBold, fontSize: 17, color: colors.secondary },
    infoButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    messagesList: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.md },
    messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm },
    messageWrapperMe: { justifyContent: 'flex-end' },
    messageWrapperOther: { justifyContent: 'flex-start' },
    messageBubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: 20 },
    messageBubbleMe: { borderBottomRightRadius: 4, ...shadow.sm },
    messageBubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    messageText: { ...typography.body, fontSize: 15, lineHeight: 22 },
    messageTextMe: { color: colors.background },
    messageTextOther: { color: colors.textPrimary },
    systemMsg: {
        alignSelf: 'center', marginVertical: 8,
        backgroundColor: `${colors.primary}12`,
        borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4,
    } as ViewStyle,
    systemMsgText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' } as TextStyle,
    replyQuoteMe: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginBottom: 4 } as TextStyle,
    replyQuoteOther: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic', marginBottom: 4 } as TextStyle,
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
    },
    attachButton: {
        width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.full, marginRight: spacing.xs,
    },
    input: {
        flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.surface,
        borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm,
        ...typography.body, fontSize: 15, color: colors.textPrimary,
        marginHorizontal: spacing.xs, borderWidth: 1, borderColor: colors.border,
    },
    sendButton: {
        width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center', ...shadow.sm,
    },
    sendButtonDisabled: { backgroundColor: colors.textTertiary, opacity: 0.5 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    emptyContainer: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
    emptyContent: { alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xxl },
    emptyIconContainer: {
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: `${colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
    },
    emptyTitle: { ...typography.h3, color: colors.secondary, marginBottom: spacing.xs, textAlign: 'center' },
    emptySubtitle: { ...typography.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    icebreakersWrapper: { width: '100%' },
    icebreakersContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
    icebreakerCard: {
        backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4,
        borderRadius: radius.xxl, width: 260, borderWidth: 1, borderColor: colors.border, ...shadow.card,
    },
    icebreakerText: { ...typography.body, color: colors.textPrimary, textAlign: 'center', fontSize: 15, lineHeight: 20 },
    sosButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.warning}15`,
        justifyContent: 'center', alignItems: 'center', marginRight: spacing.xs,
    } as ViewStyle,
    planButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}10`,
        justifyContent: 'center', alignItems: 'center', marginRight: spacing.xs,
    } as ViewStyle,
    hangoutBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    } as ViewStyle,
    hangoutBarContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as ViewStyle,
    hangoutBarIconContainer: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    } as ViewStyle,
    hangoutBarIcon: { fontSize: 18 } as TextStyle,
    hangoutBarTitle: { ...typography.small, fontWeight: '700', color: colors.textPrimary } as TextStyle,
    hangoutBarDetails: { ...typography.caption, color: colors.textSecondary } as TextStyle,
});
