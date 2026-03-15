import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, FlatList, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { supabase } from '../../lib/supabase';

interface Member {
    id: string;
    role: string;
    user: {
        id: string;
        profile: {
            firstName: string;
            photos: string[];
        }
    }
}

interface Hangout {
    id: string;
    title: string;
    startTime: string;
    venue: {
        name: string;
    } | null;
    attendees: any[];
}

interface Group {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    privacy: string;
    members: Member[];
    hangouts: Hangout[];
    _count: {
        members: number;
    }
}

export default function GroupDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            if (!supabase) return;
            const { data } = await supabase.auth.getUser();
            setUserId(data.user?.id || null);
        };
        checkUser();
        fetchGroupDetails();
    }, [id]);

    const fetchGroupDetails = async () => {
        if (!supabase) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session?.data.session?.access_token;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/groups/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch group details');
            const data = await response.json();
            setGroup(data);
        } catch (error) {
            console.error('Fetch group details error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!supabase) return;
        setJoining(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session?.data.session?.access_token;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/groups/${id}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to join group');
            }

            Alert.alert('Welcome!', 'You are now a member of this community.');
            fetchGroupDetails();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        Alert.alert(
            'Leave Group',
            'Are you sure you want to leave this community?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        if (!supabase) return;
                        try {
                            const session = await supabase.auth.getSession();
                            const token = session?.data.session?.access_token;

                            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/groups/${id}/leave`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            if (!response.ok) throw new Error('Failed to leave group');

                            Alert.alert('Left', 'You are no longer a member of this community.');
                            fetchGroupDetails();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!group) return null;

    const isMember = group.members.some(m => m.user.id === userId);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerTransparent: true,
                headerTitle: '',
                headerTintColor: '#fff',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" size={24} color="#fff" />
                    </TouchableOpacity>
                ),
                headerRight: () => isMember ? (
                    <TouchableOpacity onPress={handleLeave} style={styles.headerButton}>
                        <Feather name="more-horizontal" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : null
            }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: group.imageUrl || 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?auto=format&fit=crop&w=800&q=80' }}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.heroGradient}
                    />
                </View>

                <View style={styles.content}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.name}>{group.name}</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Feather name="users" size={14} color={colors.textSecondary} />
                                <Text style={styles.statText}>{group._count.members} Members</Text>
                            </View>
                            <View style={styles.stat}>
                                <Feather name={group.privacy === 'private' ? 'lock' : 'globe'} size={14} color={colors.textSecondary} />
                                <Text style={styles.statText}>{group.privacy === 'private' ? 'Private' : 'Public'}</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.description}>{group.description || 'A community for sharing experiences and hosting local meetups.'}</Text>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Members</Text>
                            <TouchableOpacity>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersList}>
                            {group.members.slice(0, 10).map((member) => (
                                <TouchableOpacity 
                                    key={member.id} 
                                    style={styles.memberAvatar}
                                    onPress={() => router.push(`/profile/${member.user.id}` as any)}
                                >
                                    <View style={styles.avatarContainer}>
                                        <Image
                                            source={{ uri: member.user.profile.photos[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }}
                                            style={styles.avatar}
                                        />
                                        <View style={styles.onlineStatusDot} />
                                    </View>
                                    <Text style={styles.memberName} numberOfLines={1}>{member.user.profile.firstName}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Upcoming Hangouts</Text>
                            {isMember && (
                                <TouchableOpacity 
                                    onPress={() => router.push(`/hangouts/create?groupId=${group.id}` as any)}
                                    style={styles.hostBadge}
                                >
                                    <LinearGradient
                                        colors={['#FF7F61', '#FF9F81']}
                                        style={styles.hostGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Feather name="plus" size={14} color="#fff" />
                                        <Text style={styles.hostBadgeText}>Host</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>

                        {group.hangouts.length > 0 ? (
                            group.hangouts.map(hangout => (
                                <TouchableOpacity
                                    key={hangout.id}
                                    style={styles.hangoutCard}
                                    onPress={() => router.push(`/hangouts/${hangout.id}` as any)}
                                >
                                    <View style={styles.hangoutIconBox}>
                                        <Text style={{ fontSize: 24 }}>🎲</Text>
                                    </View>
                                    <View style={styles.hangoutInfo}>
                                        <Text style={styles.hangoutTitle}>{hangout.title}</Text>
                                        <View style={styles.hangoutMeta}>
                                            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textSecondary} />
                                            <Text style={styles.metaText}>{new Date(hangout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                            <Feather name="map-pin" size={12} color={colors.textSecondary} style={{ marginLeft: spacing.md }} />
                                            <Text style={styles.metaText}>{hangout.venue?.name || 'TBD'}</Text>
                                        </View>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyHangouts}>
                                <Text style={styles.emptyText}>No upcoming hangouts.</Text>
                                {isMember && (
                                    <TouchableOpacity
                                        style={styles.inlineHostButton}
                                        onPress={() => router.push(`/hangouts/create?groupId=${group.id}` as any)}
                                    >
                                        <Text style={styles.inlineHostText}>Host the first one!</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {isMember ? (
                    <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => router.push(`/messages/${group.id}` as any)}
                    >
                        <LinearGradient
                            colors={[colors.secondary, '#34495E']}
                            style={styles.fullButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Feather name="message-square" size={20} color="#fff" style={{ marginRight: 10 }} />
                            <Text style={styles.joinButtonText}>Open Group Chat</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.joinButton, joining && styles.disabledButton]}
                        onPress={handleJoin}
                        disabled={joining}
                    >
                        <LinearGradient
                            colors={['#FF7F61', '#FF9F81']}
                            style={styles.fullButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {joining ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.joinButtonText}>Join Community</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    } as ViewStyle,
    backButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.md,
    } as ViewStyle,
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    } as ViewStyle,
    scrollContent: {
        paddingBottom: spacing.xxxl * 2,
    } as ViewStyle,
    heroContainer: {
        width: '100%',
        height: 340,
        position: 'relative',
    } as ViewStyle,
    heroImage: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 160,
    } as ViewStyle,
    content: {
        marginTop: -spacing.xl,
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        paddingTop: spacing.xl,
    } as ViewStyle,
    headerInfo: {
        marginBottom: spacing.xl,
    } as ViewStyle,
    name: {
        ...typography.h1,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        letterSpacing: -0.8,
    } as TextStyle,
    statsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginTop: spacing.xs,
    } as ViewStyle,
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    } as ViewStyle,
    statText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    } as TextStyle,
    section: {
        marginTop: spacing.xxl,
    } as ViewStyle,
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    } as ViewStyle,
    sectionTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        letterSpacing: -0.4,
    } as TextStyle,
    seeAll: {
        ...typography.bodyBold,
        color: colors.primary,
    } as TextStyle,
    description: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 26,
    } as TextStyle,
    membersList: {
        flexDirection: 'row',
        marginHorizontal: -spacing.lg,
        paddingHorizontal: spacing.lg,
    } as ViewStyle,
    memberAvatar: {
        alignItems: 'center',
        marginRight: spacing.lg,
        width: 64,
    } as ViewStyle,
    avatarContainer: {
        position: 'relative',
    } as ViewStyle,
    avatar: {
        width: 60,
        height: 60,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: '#fff',
        ...shadow.sm,
    } as ImageStyle,
    onlineStatusDot: {
        position: 'absolute',
        bottom: spacing.sm + 4,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4ADE80',
        borderWidth: 2,
        borderColor: '#fff',
    } as ViewStyle,
    memberName: {
        ...typography.small,
        color: colors.textPrimary,
        textAlign: 'center',
    } as TextStyle,
    hostBadge: {
        borderRadius: radius.full,
        overflow: 'hidden',
    } as ViewStyle,
    hostGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        gap: 4,
    } as ViewStyle,
    hostBadgeText: {
        ...typography.caption,
        color: '#fff',
        fontWeight: '700',
    } as TextStyle,
    hostLink: {
        ...typography.bodyBold,
        color: colors.primary,
    } as TextStyle,
    hangoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
        ...shadow.card,
    } as ViewStyle,
    hangoutIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
    hangoutInfo: {
        flex: 1,
    } as ViewStyle,
    hangoutTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    } as TextStyle,
    hangoutMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    } as ViewStyle,
    metaText: {
        ...typography.caption,
        color: colors.textSecondary,
    } as TextStyle,
    emptyHangouts: {
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    } as ViewStyle,
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    } as TextStyle,
    inlineHostButton: {
        marginTop: spacing.md,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
    } as ViewStyle,
    inlineHostText: {
        ...typography.bodyMedium,
        color: colors.primary,
    } as TextStyle,
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        paddingBottom: spacing.xl + spacing.sm,
        backgroundColor: 'rgba(255, 251, 247, 0.95)',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    } as ViewStyle,
    joinButton: {
        height: 56,
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadow.premium,
    } as ViewStyle,
    chatButton: {
        height: 56,
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadow.premium,
    } as ViewStyle,
    fullButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    joinButtonText: {
        ...typography.h3,
        fontSize: 16,
        color: '#fff',
    } as TextStyle,
    disabledButton: {
        backgroundColor: colors.textTertiary,
        opacity: 0.8,
    } as ViewStyle,
});
