import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, ViewStyle, TextStyle, ImageStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { hangoutApi, profileApi } from '../../lib/api';
import { HangoutFeedback } from '../../components/HangoutFeedback';
import { supabase } from '../../lib/supabase';
import { startLocationTracking, stopLocationTracking } from '../../lib/safety-location';

interface Attendee {
    id: string;
    user: {
        profile: {
            firstName: string;
            photos: string[];
        }
    }
}

interface Hangout {
    id: string;
    title: string;
    description: string;
    startTime: string;
    maxAttendees: number;
    imageUrl?: string;
    isPublic: boolean;
    venue?: {
        name: string;
        address: string;
    };
    attendees: Attendee[];
    creatorId: string;
    creator?: {
        id: string;
        firstName: string;
        lastName: string;
        photos: string[];
        bio?: string;
    };
    activityType?: string;
    vibe?: string;
    price?: string;
    distance?: string;
    myJoinRequest?: { status: 'pending' | 'approved' | 'declined' } | null;
}

export default function HangoutDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [hangout, setHangout] = useState<Hangout | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [hasFeedback, setHasFeedback] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [checkedIn, setCheckedIn] = useState(false);
    const [isSafe, setIsSafe] = useState(false);
    const [joinRequestStatus, setJoinRequestStatus] = useState<'pending' | 'approved' | 'declined' | null>(null);

    useEffect(() => {
        const getUserId = async () => {
            if (supabase) {
                const { data } = await supabase.auth.getUser();
                setUserId(data.user?.id || null);
            }
        };
        getUserId();
    }, []);

    const fetchHangoutDetails = async () => {
        try {
            // Reusing search or specific endpoint if implemented
            // For now we might need a specific get route, but let's assume we can fetch it
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/hangouts/${id}`, {
                headers: {
                    'Authorization': `Bearer ${(await (require('../../lib/supabase').supabase?.auth.getSession())).data.session?.access_token}`,
                },
            });
            const data = await response.json();
            setHangout(data);

            if (data && data.attendees) {
                const myAttendance = data.attendees.find((a: any) => a.userId === userId || a.id === userId);
                if (myAttendance) {
                    setCheckedIn(!!myAttendance.checkInAt);
                    setIsSafe(!!myAttendance.isSafe);
                }
            }

            // Join request status
            if (data.myJoinRequest) {
                setJoinRequestStatus(data.myJoinRequest.status);
            }
        } catch (error) {
            console.error('Error fetching hangout details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchHangoutDetails();
    }, [id]);

    const handleCheckIn = async () => {
        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/hangouts/${id}/check-in`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Check-in failed');
            setCheckedIn(true);
            
            // Start the location tracking service
            await startLocationTracking();
            Alert.alert('Checked in!', 'Have a great time! SafeArrival is enabled.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleReportSafe = async () => {
        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/hangouts/${id}/safe`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Safety report failed');
            setIsSafe(true);
            
            // Stop the location tracking service
            await stopLocationTracking();
            Alert.alert('Safe!', 'Glad you enjoyed the hangout.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleJoin = async () => {
        try {
            setJoining(true);
            const { profile } = await profileApi.get();
            if (!profile.safetyBriefingCompleted) {
                Alert.alert(
                    'Safety Briefing Required',
                    'Please complete the quick safety briefing before joining your first hangout.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Start Briefing', onPress: () => router.push('/safety/briefing' as any) }
                    ]
                );
                return;
            }
            await hangoutApi.join(id as string);
            Alert.alert('Success', "You've joined the hangout!");
            fetchHangoutDetails();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to join hangout');
        } finally {
            setJoining(false);
        }
    };

    const handleRequestJoin = async () => {
        try {
            setRequesting(true);
            const { profile } = await profileApi.get();
            if (!profile.safetyBriefingCompleted) {
                Alert.alert(
                    'Safety Briefing Required',
                    'Please complete the quick safety briefing before requesting to join.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Start Briefing', onPress: () => router.push('/safety/briefing' as any) }
                    ]
                );
                return;
            }
            await hangoutApi.requestJoin(id as string);
            setJoinRequestStatus('pending');
            Alert.alert('Request sent!', 'The host will review your request.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send join request');
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!hangout) return null;

    const isPast = new Date(hangout.startTime) < new Date();
    const isAttendee = hangout.attendees?.some(a => a.id === userId) || false;
    const isHost = hangout.creatorId === userId;
    const spotsLeft = (hangout.maxAttendees || 6) - (hangout.attendees?.length || 0);
    const date = new Date(hangout.startTime);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTransparent: true,
                headerTitle: '',
                headerLeft: () => (
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        style={styles.headerIconButton}
                    >
                        <Feather name="chevron-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity 
                        style={styles.headerIconButton}
                    >
                        <Feather name="share-2" size={20} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                bounces={false}
            >
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: hangout.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200' }}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.heroOverlay}
                    />
                    
                    <View style={styles.heroMeta}>
                        <View style={styles.activityBadge}>
                            <Text style={styles.activityBadgeIcon}>
                                {(hangout as any).activityIcon || '🎲'}
                            </Text>
                            <Text style={styles.activityBadgeText}>{hangout.activityType || 'Social'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{hangout.title}</Text>
                            <TouchableOpacity style={styles.locationContainer}>
                                <Feather name="map-pin" size={12} color={colors.textTertiary} />
                                <Text style={styles.locationText}>
                                    {hangout.venue?.name || 'Local Spot'} • {hangout.distance || '1.2 mi'} away
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {isAttendee && (
                            <View style={styles.attendingStatusBadge}>
                                <Feather name="check-circle" size={16} color="#4CAF50" />
                                <Text style={styles.attendingStatusText}>Attending</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.metadataGrid}>
                        <View style={styles.metadataBox}>
                            <View style={styles.metadataIconBg}>
                                <Feather name="calendar" size={18} color="#FF7F61" />
                            </View>
                            <View>
                                <Text style={styles.metadataLabel}>DATE</Text>
                                <Text style={styles.metadataValue}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.metadataBox}>
                            <View style={styles.metadataIconBg}>
                                <Feather name="clock" size={18} color="#FF7F61" />
                            </View>
                            <View>
                                <Text style={styles.metadataLabel}>TIME</Text>
                                <Text style={styles.metadataValue}>
                                    {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>The Vibe</Text>
                        <Text style={styles.descriptionText}>{hangout.description || 'No description provided.'}</Text>
                        
                        <View style={styles.tagsContainer}>
                            <View style={styles.infoTag}>
                                <Text style={styles.infoTagText}>✨ {hangout.vibe || 'Chill'}</Text>
                            </View>
                            <View style={styles.infoTag}>
                                <Text style={styles.infoTagText}>💰 {hangout.price || 'Free'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Who's coming</Text>
                        <View style={styles.attendeesRow}>
                            <View style={styles.avatarsOverlap}>
                                {hangout.attendees?.slice(0, 5).map((attendee, index) => (
                                    <View key={attendee.id} style={[styles.avatarBorder, { marginLeft: index === 0 ? 0 : -15, zIndex: 10 - index }]}>
                                        <Image
                                            source={{ uri: attendee.user.profile.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                                            style={styles.avatarImage}
                                        />
                                    </View>
                                ))}
                            </View>
                            <View style={styles.spotsInfo}>
                                <Text style={styles.spotsMainText}>{hangout.attendees?.length || 0}/{hangout.maxAttendees || 6} Joined</Text>
                                <Text style={styles.spotsSubText}>{spotsLeft} spots left</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Hosted by</Text>
                        <TouchableOpacity 
                            style={styles.hostSection}
                            onPress={() => router.push(`/profile/${hangout.creatorId}` as any)}
                        >
                            <Image
                                source={{ uri: hangout.creator?.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                                style={styles.hostImage}
                            />
                            <View style={styles.hostInfo}>
                                <View style={styles.hostNameRow}>
                                    <Text style={styles.hostNameText}>{hangout.creator?.firstName || 'Host'}</Text>
                                    <View style={styles.verifiedIcon}>
                                        <MaterialCommunityIcons name="check-decagram" size={14} color="#0066FF" />
                                    </View>
                                </View>
                                <Text style={styles.hostBioText} numberOfLines={2}>
                                    {hangout.creator?.bio || 'Ready for a fun hangout! Let\'s connect and have a great time.'}
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    {isAttendee && !isPast && (
                        <View style={styles.attendingActions}>
                            {!checkedIn ? (
                                <TouchableOpacity style={styles.arrivalButton} onPress={handleCheckIn}>
                                    <Feather name="map-pin" size={20} color="#fff" />
                                    <Text style={styles.arrivalButtonText}>I've Arrived (SafeArrival)</Text>
                                </TouchableOpacity>
                            ) : !isSafe && isPast ? (
                                <TouchableOpacity style={[styles.arrivalButton, { backgroundColor: '#4CAF50' }]} onPress={handleReportSafe}>
                                    <Feather name="shield" size={20} color="#fff" />
                                    <Text style={styles.arrivalButtonText}>I'm Home Safe</Text>
                                </TouchableOpacity>
                            ) : null}
                            
                            <TouchableOpacity 
                                style={styles.chatButton}
                                onPress={() => router.push(`/messages/${hangout.id}` as any)}
                            >
                                <Feather name="message-circle" size={20} color={colors.primary} />
                                <Text style={styles.chatButtonText}>Group Chat</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isHost && !isPast && (
                        <TouchableOpacity
                            style={styles.manageButton}
                            onPress={() => router.push(`/hangouts/${id}/requests` as any)}
                        >
                            <Feather name="settings" size={18} color={colors.primary} />
                            <Text style={styles.manageButtonText}>Manage Hangout & Requests</Text>
                            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <View style={styles.bottomFooter}>
                {isPast ? (
                    <View style={styles.footerStatus}>
                        <Text style={styles.footerStatusText}>This hangout ended on {date.toLocaleDateString()}</Text>
                    </View>
                ) : isAttendee ? (
                    <TouchableOpacity style={[styles.mainActionButton, styles.attendingButton]} disabled>
                        <Feather name="check" size={20} color="#FFF" />
                        <Text style={styles.mainActionButtonText}>You're Going!</Text>
                    </TouchableOpacity>
                ) : joinRequestStatus === 'pending' ? (
                    <View style={[styles.mainActionButton, styles.pendingActionButton]}>
                        <ActivityIndicator size="small" color="#666" style={{ marginRight: 8 }} />
                        <Text style={[styles.mainActionButtonText, { color: '#666' }]}>Request Pending...</Text>
                    </View>
                ) : spotsLeft === 0 ? (
                    <View style={[styles.mainActionButton, styles.disabledActionButton]}>
                        <Text style={styles.mainActionButtonText}>Waitlist Only (Full)</Text>
                    </View>
                ) : hangout.isPublic ? (
                    <TouchableOpacity
                        onPress={handleJoin}
                        disabled={joining}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#FF7F61', '#FF9F81']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.mainActionButton}
                        >
                            {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainActionButtonText}>Join Hangout</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleRequestJoin}
                        disabled={requesting}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#FF7F61', '#FF9F81']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.mainActionButton}
                        >
                            {requesting ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainActionButtonText}>Request to Join</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>


            <Modal
                visible={showFeedback}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFeedback(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <HangoutFeedback
                            hangout={hangout}
                            onClose={() => setShowFeedback(false)}
                            onFeedbackSubmitted={() => {
                                setHasFeedback(true);
                                setShowFeedback(false);
                            }}
                            onReschedule={() => {
                                setShowFeedback(false);
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    spacer: {
        height: 400,
    } as ViewStyle,
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    } as ViewStyle,
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.md,
        marginRight: spacing.md,
    } as ViewStyle,
    heroContainer: {
        width: '100%',
        height: 420,
        position: 'relative',
    } as ViewStyle,
    heroImage: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
    } as ViewStyle,
    heroMeta: {
        position: 'absolute',
        bottom: 50,
        left: spacing.xl,
        right: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    } as ViewStyle,
    activityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        ...shadow.md,
    } as ViewStyle,
    activityBadgeIcon: {
        fontSize: 16,
    } as TextStyle,
    activityBadgeText: {
        fontSize: 14,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2D2D2D',
    } as TextStyle,
    content: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -32,
        padding: spacing.xl,
        minHeight: 600,
    } as ViewStyle,
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    } as ViewStyle,
    title: {
        fontSize: 28,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: '#2D2D2D',
        letterSpacing: -0.5,
        lineHeight: 34,
        marginBottom: 4,
    } as TextStyle,
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    } as ViewStyle,
    locationText: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: '#6E6E6E',
    } as TextStyle,
    attendingStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    } as ViewStyle,
    attendingStatusText: {
        fontSize: 12,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2E7D32',
    } as TextStyle,
    metadataGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    } as ViewStyle,
    metadataBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FCFBF9',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0EBE5',
        gap: 12,
    } as ViewStyle,
    metadataIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF1EE',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    metadataLabel: {
        fontSize: 10,
        fontFamily: 'Lexend_600SemiBold',
        color: '#A09890',
        letterSpacing: 0.5,
    } as TextStyle,
    metadataValue: {
        fontSize: 14,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2D2D2D',
    } as TextStyle,
    section: {
        marginBottom: 32,
    } as ViewStyle,
    sectionHeading: {
        fontSize: 18,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: '#2D2D2D',
        marginBottom: 12,
    } as TextStyle,
    descriptionText: {
        fontSize: 15,
        fontFamily: 'Lexend_400Regular',
        color: '#4A4A4A',
        lineHeight: 24,
        marginBottom: 16,
    } as TextStyle,
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    } as ViewStyle,
    infoTag: {
        backgroundColor: '#F7F5F2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    } as ViewStyle,
    infoTagText: {
        fontSize: 13,
        fontFamily: 'Lexend_500Medium',
        color: '#2D2D2D',
    } as TextStyle,
    attendeesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FCFBF9',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0EBE5',
    } as ViewStyle,
    avatarsOverlap: {
        flexDirection: 'row',
        alignItems: 'center',
    } as ViewStyle,
    avatarBorder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        backgroundColor: '#F0F0F0',
        overflow: 'hidden',
    } as ViewStyle,
    avatarImage: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    spotsInfo: {
        alignItems: 'flex-end',
    } as ViewStyle,
    spotsMainText: {
        fontSize: 15,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2D2D2D',
    } as TextStyle,
    spotsSubText: {
        fontSize: 12,
        fontFamily: 'Lexend_500Medium',
        color: '#FF7F61',
    } as TextStyle,
    hostSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0EBE5',
        ...shadow.subtle,
    } as ViewStyle,
    hostImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    } as ImageStyle,
    hostInfo: {
        flex: 1,
    } as ViewStyle,
    hostNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    } as ViewStyle,
    hostNameText: {
        fontSize: 16,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2D2D2D',
    } as TextStyle,
    verifiedIcon: {
        marginTop: 2,
    } as ViewStyle,
    hostBioText: {
        fontSize: 13,
        fontFamily: 'Lexend_400Regular',
        color: '#6E6E6E',
        lineHeight: 18,
    } as TextStyle,
    attendingActions: {
        marginTop: 8,
        gap: 12,
    } as ViewStyle,
    arrivalButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
        ...shadow.md,
    } as ViewStyle,
    arrivalButtonText: {
        fontSize: 16,
        fontFamily: 'Lexend_700Bold',
        color: '#FFFFFF',
    } as TextStyle,
    chatButton: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.primary,
        gap: 10,
    } as ViewStyle,
    chatButtonText: {
        fontSize: 16,
        fontFamily: 'Lexend_700Bold',
        color: colors.primary,
    } as TextStyle,
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECF4FF',
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#D4E8FF',
    } as ViewStyle,
    manageButtonText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Lexend_600SemiBold',
        color: '#0066FF',
        marginLeft: 12,
    } as TextStyle,
    bottomFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0EBE5',
        ...shadow.lg,
    } as ViewStyle,
    mainActionButton: {
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        ...shadow.md,
    } as ViewStyle,
    mainActionButtonText: {
        fontSize: 18,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: '#FFFFFF',
    } as TextStyle,
    attendingButton: {
        backgroundColor: '#2D2D2D',
        gap: 10,
    } as ViewStyle,
    pendingActionButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    } as ViewStyle,
    disabledActionButton: {
        backgroundColor: '#A0A0A0',
    } as ViewStyle,
    footerStatus: {
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    footerStatusText: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: '#6E6E6E',
    } as TextStyle,
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    } as ViewStyle,
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
    } as ViewStyle,
});
