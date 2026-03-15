import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ActivityIndicator, ViewStyle, TextStyle, ImageStyle, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { useAuthStore } from '../../store/authStore';

interface Message {
    id: string;
    sender: {
        id: string;
        firstName: string;
        photoUrl: string;
    };
    content: string;
    createdAt: string;
}

export default function GroupChatScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { userId } = useAuthStore();
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Mock Data for UI Demonstration
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: { id: 'user2', firstName: 'Sarah', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
            content: "Hey everyone! Who's excited for board games tonight? 🎲",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: '2',
            sender: { id: 'user3', firstName: 'Mike', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
            content: "Can't wait! Should I bring Catan or just stick to the classics? ♟️",
            createdAt: new Date(Date.now() - 3500000).toISOString(),
        },
        {
            id: '3',
            sender: { id: userId || 'me', firstName: 'Me', photoUrl: '' },
            content: "Bring Catan! I've been wanting to play for weeks.",
            createdAt: new Date(Date.now() - 3400000).toISOString(),
        }
    ]);

    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        if (inputText.trim()) {
            const newMessage: Message = {
                id: Date.now().toString(),
                sender: { id: userId || 'me', firstName: 'Me', photoUrl: '' },
                content: inputText.trim(),
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, newMessage]);
            setInputText('');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender.id === userId || item.sender.id === 'me';
        
        return (
            <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                {!isMe && (
                    <TouchableOpacity onPress={() => router.push(`/profile/${item.sender.id}` as any)}>
                        <Image source={{ uri: item.sender.photoUrl }} style={styles.messageAvatar} />
                    </TouchableOpacity>
                )}
                <View style={styles.messageContent}>
                    {!isMe && (
                        <TouchableOpacity onPress={() => router.push(`/profile/${item.sender.id}` as any)}>
                            <Text style={styles.senderName}>{item.sender.firstName}</Text>
                        </TouchableOpacity>
                    )}
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
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.headerInfo}
                    onPress={() => router.push(`/hangouts/${id}` as any)}
                >
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Board Games Night 🎲</Text>
                        <View style={styles.onlineContainer}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>6 Active Members</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        style={styles.sosButton}
                        onPress={() => Alert.alert('Silent SOS', 'Safety services notified.')}
                    >
                        <MaterialCommunityIcons name="alert-octagon" size={20} color={colors.warning} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.infoButton}>
                        <Feather name="more-horizontal" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Safety Banner */}
            <LinearGradient
                colors={['#4ADE80', '#22C55E']}
                style={styles.safetyBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.safetyBannerContent}>
                    <Feather name="shield" size={18} color="#fff" />
                    <Text style={styles.safetyBannerText}>You've arrived at Starbucks! SafeArrival is active.</Text>
                </View>
                <TouchableOpacity style={styles.homeSafeButton}>
                    <Text style={styles.homeSafeText}>I'm Home Safe</Text>
                </TouchableOpacity>
            </LinearGradient>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachButton}>
                    <Feather name="plus" size={24} color={colors.textTertiary} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Message the group..."
                    placeholderTextColor={colors.textTertiary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />

                <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                >
                    <Feather name="send" size={20} color="#fff" />
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
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.bodyBold,
        fontSize: 17,
        color: colors.secondary,
    },
    onlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4ADE80',
    },
    onlineText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sosButton: {
        padding: 8,
        backgroundColor: `${colors.warning}15`,
        borderRadius: 12,
        marginRight: 4,
    },
    infoButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    safetyBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    safetyBannerText: {
        ...typography.small,
        color: '#fff',
        fontWeight: '600',
    },
    homeSafeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    homeSafeText: {
        ...typography.caption,
        color: '#fff',
        fontWeight: '700',
    },
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
    },
    messageWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: spacing.md,
    },
    messageWrapperMe: {
        justifyContent: 'flex-end',
    },
    messageWrapperOther: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: spacing.sm,
        backgroundColor: colors.surface,
    },
    messageContent: {
        maxWidth: '75%',
    },
    senderName: {
        ...typography.caption,
        color: colors.textTertiary,
        marginLeft: spacing.sm,
        marginBottom: 2,
    },
    messageBubble: {
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
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
        color: '#fff',
    },
    messageTextOther: {
        color: colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        borderRadius: 22,
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
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
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.sm,
    },
    sendButtonDisabled: {
        backgroundColor: colors.textTertiary,
        opacity: 0.5,
    },
});
