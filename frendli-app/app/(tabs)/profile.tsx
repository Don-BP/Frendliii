import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle, TextStyle, ImageStyle, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../constants/tokens';
import { useAuthStore } from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { friendApi, perksApi, hangoutApi } from '../../lib/api';

export default function ProfileScreen() {
    const router = useRouter();
    const { profile, setAuth, setOnboarded } = useAuthStore();
    const [friendCount, setFriendCount] = useState(0);
    const [perksCount, setPerksCount] = useState(0);
    const [hangoutCount, setHangoutCount] = useState(0);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const data = await friendApi.getAll();
                setFriendCount(data.friends.length || 0);
                
                const perksResponse = await perksApi.fetchMyCoupons();
                setPerksCount(perksResponse.coupons?.length || 0);

                const myHangouts = await hangoutApi.getMy();
                setHangoutCount(myHangouts.length || 0);
            } catch (err) {
                console.log('Error fetching profile counts:', err);
                // Keeping fallbacks for dev/missing data
                setFriendCount(c => c || 2);
                setPerksCount(c => c || 2);
                setHangoutCount(c => c || 4);
            }
        };
        fetchCounts();
    }, []);

    const wavesCount = Math.max(friendCount * 2, 3); // Mocking waves as friendCount * 2 for now

    const handleLogout = () => {
        setOnboarded(false);
        setAuth('');
        router.replace('/');
    };

    const handleResetOnboarding = () => {
        setOnboarded(false);
        router.push('/auth/phone');
    };

    const firstName = profile?.firstName || 'Don';
    const age = profile?.age || 45;
    const location = profile?.location || 'Osaka';
    const initials = firstName.charAt(0).toUpperCase();

    const getEmoji = (id: string) => {
        const map: Record<string, string> = {
            hiking: '🥾', camping: '🏕️', cycling: '🚴', coffee: '☕',
            cooking: '🧑‍🍳', movies: '🍿', gaming: '🎮', concerts: '🎸',
            travel: '✈️', fitness: '💪', reading: '📚', photography: '📸'
        };
        return map[id.toLowerCase()] || '✨';
    };

    const formatDays = (days: string[]) => {
        if (!days || days.length === 0) return 'Weekend Afternoons, Weekend Evenings';
        if (days.length === 7) return 'Every day';
        return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
    };

    // Mock data for new sections
    const friendAvatars = [
        { id: 1, img: 'https://i.pravatar.cc/100?u=1' },
        { id: 2, img: 'https://i.pravatar.cc/100?u=2' },
        { id: 3, img: 'https://i.pravatar.cc/100?u=3' },
    ];

    const milestones = [
        { id: 1, title: 'First Wave!', date: 'Feb 25', emoji: '👋' },
        { id: 2, title: 'First Connection!', date: 'Feb 26', emoji: '🤝' },
        { id: 3, title: 'First Hangout!', date: 'Feb 28', emoji: '☕' },
        { id: 4, title: '3 Hangouts Strong!', date: 'Mar 3', emoji: '🔥' },
    ];

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => router.push('/settings')}
                >
                    <Ionicons name="settings-sharp" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
            </Animated.View>

            {/* Top Section - Avatar & Name */}
            <Animated.View entering={FadeInUp.delay(200)} style={styles.topSection}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarBorder}>
                        <View style={styles.avatarMain}>
                            {/* In a real app, use profile image if available */}
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={styles.avatarEditBtn} 
                        activeOpacity={0.8}
                        onPress={() => router.push('/edit-profile')}
                    >
                        <Feather name="edit-3" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.nameContainer}>
                    <Text style={styles.nameText}>{firstName}, {age}</Text>
                    {(profile?.safetyBadges?.length ?? 0) > 0 ? (
                        <View style={styles.verifiedRow}>
                            <MaterialCommunityIcons name="check-decagram" size={16} color="#4ADE80" />
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.verifiedRow} onPress={() => router.push('/safety/id-verification' as any)}>
                            <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.textTertiary} />
                            <Text style={styles.getVerifiedText}>Get Verified</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                        <Text style={styles.locationText}>{location}</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Stats Row */}
            <Animated.View entering={FadeInUp.delay(300)} style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{friendCount}</Text>
                    <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{milestones.length}</Text>
                    <Text style={styles.statLabel}>Milestones</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{hangoutCount}</Text>
                    <Text style={styles.statLabel}>Hangouts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{wavesCount}</Text>
                    <Text style={styles.statLabel}>Waves</Text>
                </View>
            </Animated.View>

            {/* My Friends Section */}
            <Animated.View entering={FadeInUp.delay(400)}>
                <TouchableOpacity style={styles.myFriendsCard} activeOpacity={0.7} onPress={() => router.push('/(tabs)/friends' as any)}>
                    <View style={styles.myFriendsIconBox}>
                        <Ionicons name="people-outline" size={22} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.myFriendsTitle}>My Friends</Text>
                        <Text style={styles.myFriendsSub}>{friendCount} connected · 1 online</Text>
                    </View>
                    <View style={[styles.avatarOverlap, { width: 50 + (friendAvatars.slice(0, 3).length * 15) }]}>
                        {friendAvatars.slice(0, 3).map((avatar, i) => (
                            <Image 
                                key={avatar.id} 
                                source={{ uri: avatar.img }} 
                                style={[
                                    styles.overlapAvatar, 
                                    { left: i * 20, zIndex: 3 - i }
                                ]} 
                            />
                        ))}
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ position: 'absolute', right: -10 }} />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* About Section */}
            <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
                <View style={styles.sectionHeaderLine}>
                    <Text style={styles.sectionSubtitle}>ABOUT</Text>
                    <TouchableOpacity style={styles.editCapsule} onPress={() => router.push('/edit-profile')}>
                        <Feather name="edit-2" size={12} color={colors.primary} />
                        <Text style={styles.editCapsuleText}>Edit</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.whiteCard}>
                    <Text style={styles.bioText}>
                        {profile?.bio || 'Add a bio to let others know what kind of friend you are looking for!'}
                    </Text>
                </View>
            </Animated.View>

            {/* Interests Section */}
            <Animated.View entering={FadeInUp.delay(600)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>INTERESTS</Text>
                <View style={styles.interestsGrid}>
                    {(profile?.interests || ['photography', 'movies', 'gaming']).map((id) => (
                        <View key={id} style={styles.interestChip}>
                            <Text style={styles.interestIcon}>{getEmoji(id)}</Text>
                            <Text style={styles.interestLabel}>{id.charAt(0).toUpperCase() + id.slice(1)}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

            {/* My Style Section */}
            <Animated.View entering={FadeInUp.delay(700)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>MY STYLE</Text>
                <View style={styles.whiteCard}>
                    <View style={styles.styleItem}>
                        <View style={styles.styleIconBox}>
                            <Ionicons name="people-outline" size={18} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.styleLabel}>Friendship Style</Text>
                            <Text style={styles.styleValue}>
                                {profile?.friendshipStyle === 'one-on-one' ? '1v1 Personal' : 
                                 profile?.friendshipStyle === 'small-group' ? 'Small Groups (3-6)' : 
                                 profile?.friendshipStyle === 'open' ? 'Open Social' : 'Small Groups (3-6)'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.styleItem}>
                        <View style={styles.styleIconBox}>
                            <Ionicons name="heart-outline" size={18} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.styleLabel}>Life Stage</Text>
                            <Text style={styles.styleValue}>{profile?.lifeStage || 'Parent'}</Text>
                        </View>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.styleItem}>
                        <View style={styles.styleIconBox}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.styleLabel}>Available</Text>
                            <Text style={styles.styleValue}>{formatDays(profile?.availability?.days || [])}</Text>
                        </View>
                    </View>
                    {(() => {
                        const vibe = [
                            profile?.activityPreferences?.environment,
                            profile?.activityPreferences?.energy,
                            profile?.activityPreferences?.social,
                        ].filter(Boolean).map(v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1)).join(' · ');
                        return vibe ? (
                            <>
                                <View style={styles.cardDivider} />
                                <View style={styles.styleItem}>
                                    <View style={styles.styleIconBox}>
                                        <Ionicons name="flash-outline" size={18} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.styleLabel}>Activity Vibe</Text>
                                        <Text style={styles.styleValue}>{vibe}</Text>
                                    </View>
                                </View>
                            </>
                        ) : null;
                    })()}
                </View>
            </Animated.View>

            {/* Milestones Section */}
            <Animated.View entering={FadeInUp.delay(800)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>MILESTONES</Text>
                <View style={styles.milestonesGrid}>
                    {milestones.map((m) => (
                        <View key={m.id} style={styles.milestoneCard}>
                            <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                            <Text style={styles.milestoneTitle}>{m.title}</Text>
                            <Text style={styles.milestoneDate}>{m.date}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

            {/* Upgrade to Plus Banner — hidden for Plus subscribers */}
            {!profile?.isPremium && (
            <Animated.View entering={FadeInUp.delay(900)}>
                <TouchableOpacity
                    style={styles.upgradeBanner}
                    activeOpacity={0.9}
                    onPress={() => router.push('/plus')}
                >
                    <LinearGradient
                        colors={['#FFF9F1', '#FFF2E0']}
                        style={styles.upgradeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.upgradeIconBox}>
                            <Ionicons name="star" size={22} color="#D4A017" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.upgradeTitle}>Upgrade to Plus</Text>
                            <Text style={styles.upgradeSub}>Unlimited connections & more</Text>
                        </View>
                        <View style={styles.priceTag}>
                            <Text style={styles.priceText}>$9.99/mo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#D4A017" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
            )}

            {/* Discover Features Section */}
            <Animated.View entering={FadeInUp.delay(1000)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>DISCOVER FEATURES</Text>
                <TouchableOpacity style={styles.listCardItem} onPress={() => router.push('/match-alike/upload')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#FFF0EE' }]}>
                        <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>Match Alike</Text>
                        <Text style={styles.listSub}>Find friends with your aesthetic</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.listCardItem, { marginTop: 12 }]} onPress={() => router.push('/(tabs)/friends' as any)}>
                    <View style={[styles.listIconBox, { backgroundColor: '#E0F2F1' }]}>
                        <Ionicons name="people-outline" size={20} color="#009688" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>My Friends</Text>
                        <Text style={styles.listSub}>{friendCount} connected</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </Animated.View>

            {/* Perks & Rewards Section */}
            <Animated.View entering={FadeInUp.delay(1100)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>PERKS & REWARDS</Text>
                <TouchableOpacity style={styles.listCardItem} onPress={() => router.push('/perks')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#FFF8E1' }]}>
                        <Ionicons name="pricetag-outline" size={20} color="#FFA000" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>RealConnect Perks</Text>
                        <Text style={styles.listSub}>{perksCount} active coupons</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </Animated.View>

            {/* For Teams Section */}
            <Animated.View entering={FadeInUp.delay(1200)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>FOR TEAMS</Text>
                <TouchableOpacity 
                    style={styles.listCardItem}
                    onPress={() => router.push('/corporate')}
                >
                    <View style={[styles.listIconBox, { backgroundColor: '#E0F2F1' }]}>
                        <Ionicons name="business-outline" size={20} color="#00796B" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>Corporate Wellness</Text>
                        <Text style={styles.listSub}>RealConnect for remote teams</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </Animated.View>

            {/* Safety Section */}
            <Animated.View entering={FadeInUp.delay(1300)} style={styles.section}>
                <Text style={styles.sectionSubtitle}>SAFETY</Text>
                <TouchableOpacity style={styles.listCardItem} onPress={() => router.push('/safety/contacts')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="shield-outline" size={20} color="#43A047" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>Emergency Contact</Text>
                        <Text style={[styles.listSub, !profile?.emergencyContacts?.length && { color: colors.error }]}>
                            {profile?.emergencyContacts?.length ? 'Managed' : 'Not set — tap to add'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.listCardItem, { marginTop: 12 }]} onPress={() => router.push('/safety/escalation')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="shield-outline" size={20} color="#43A047" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>SafeArrival Settings</Text>
                        <Text style={styles.listSub}>Manage check-in & escalation</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.listCardItem, { marginTop: 12 }]} onPress={() => router.push('/safety/briefing')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="shield-outline" size={20} color="#43A047" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>Pre-Meetup Safety Briefing</Text>
                        <Text style={[styles.listSub, profile?.safetyBriefingCompleted && { color: colors.success }]}>
                            {profile?.safetyBriefingCompleted ? 'Completed' : 'Review before your next hangout'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </Animated.View>

            {/* Reset Onboarding / Footer */}
            <Animated.View entering={FadeInUp.delay(1400)}>
                <TouchableOpacity style={styles.resetCard} onPress={handleResetOnboarding}>
                    <Ionicons name="refresh-outline" size={20} color={colors.textTertiary} />
                    <Text style={styles.resetText}>Reset Onboarding</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </Animated.View>

            <Text style={styles.versionLabel}>Frendli Version 2.4.1 (Stable)</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFAF7', // Matching the warm off-white in images
    } as ViewStyle,
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 100,
    } as ViewStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    } as ViewStyle,
    headerTitle: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 32,
        color: colors.textPrimary,
        letterSpacing: -0.5,
    } as TextStyle,
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
    } as ViewStyle,
    topSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    } as ViewStyle,
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    } as ViewStyle,
    avatarBorder: {
        width: 130,
        height: 130,
        borderRadius: 65,
        padding: 4,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    avatarMain: {
        width: 118,
        height: 118,
        borderRadius: 59,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    } as ViewStyle,
    avatarText: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 48,
        color: '#fff',
    } as TextStyle,
    avatarEditBtn: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FCFAF7',
    } as ViewStyle,
    nameContainer: {
        alignItems: 'center',
    } as ViewStyle,
    nameText: {
        fontFamily: 'Lexend_700Bold',
        fontSize: 28,
        color: colors.textPrimary,
    } as TextStyle,
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    } as ViewStyle,
    locationText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 16,
        color: colors.textTertiary,
    } as TextStyle,
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        borderRadius: radius.xl,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        ...shadow.subtle,
        marginBottom: spacing.lg,
    } as ViewStyle,
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    } as ViewStyle,
    statNumber: {
        fontFamily: 'Lexend_700Bold',
        fontSize: 22,
        color: colors.textPrimary,
    } as TextStyle,
    statLabel: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 12,
        color: colors.textTertiary,
    } as TextStyle,
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
        alignSelf: 'center',
    } as ViewStyle,
    myFriendsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F9F4', // Specific green tint from image
        marginHorizontal: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.md,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(0,150,136,0.05)',
    } as ViewStyle,
    myFriendsIconBox: {
        width: 48,
        height: 48,
        borderRadius: radius.lg,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    } as ViewStyle,
    myFriendsTitle: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 18,
        color: colors.textPrimary,
    } as TextStyle,
    myFriendsSub: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 14,
        color: '#43A047',
    } as TextStyle,
    avatarOverlap: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        height: 32,
    } as ViewStyle,
    overlapAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#F3F9F4',
        position: 'absolute',
    } as ImageStyle,
    section: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    } as ViewStyle,
    sectionHeaderLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    } as ViewStyle,
    sectionSubtitle: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 14,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: spacing.md,
    } as TextStyle,
    editCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF2F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
        gap: 4,
    } as ViewStyle,
    editCapsuleText: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 13,
        color: colors.primary,
    } as TextStyle,
    whiteCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        ...shadow.subtle,
    } as ViewStyle,
    bioText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
    } as TextStyle,
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    } as ViewStyle,
    interestChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radius.full,
        gap: 8,
    } as ViewStyle,
    interestIcon: {
        fontSize: 18,
    } as TextStyle,
    interestLabel: {
        fontFamily: 'Lexend_500Medium',
        fontSize: 15,
        color: colors.textSecondary,
    } as TextStyle,
    styleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    } as ViewStyle,
    styleIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#FFF1F0',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    styleLabel: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 13,
        color: colors.textTertiary,
    } as TextStyle,
    styleValue: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 16,
        color: colors.textPrimary,
        marginTop: 2,
    } as TextStyle,
    cardDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 14,
    } as ViewStyle,
    milestonesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    } as ViewStyle,
    milestoneCard: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadow.subtle,
        gap: 4,
    } as ViewStyle,
    milestoneEmoji: {
        fontSize: 24,
        marginBottom: 8,
    } as TextStyle,
    milestoneTitle: {
        fontFamily: 'Lexend_700Bold',
        fontSize: 14,
        color: colors.textPrimary,
        textAlign: 'center',
    } as TextStyle,
    milestoneDate: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 12,
        color: colors.textTertiary,
    } as TextStyle,
    upgradeBanner: {
        marginHorizontal: spacing.lg,
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadow.sm,
        marginBottom: spacing.xl,
    } as ViewStyle,
    upgradeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: 12,
    } as ViewStyle,
    upgradeIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF2CC',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    upgradeTitle: {
        fontFamily: 'Lexend_700Bold',
        fontSize: 18,
        color: '#856404',
    } as TextStyle,
    upgradeSub: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 13,
        color: '#856404',
        opacity: 0.7,
    } as TextStyle,
    priceTag: {
        backgroundColor: '#FEDC6D',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.full,
        marginRight: 4,
    } as ViewStyle,
    priceText: {
        fontFamily: 'Lexend_700Bold',
        fontSize: 12,
        color: '#856404',
    } as TextStyle,
    listCardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.md,
        ...shadow.subtle,
        gap: 12,
    } as ViewStyle,
    listIconBox: {
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    listTitle: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 17,
        color: colors.textPrimary,
    } as TextStyle,
    listSub: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 14,
        color: colors.textTertiary,
        marginTop: 1,
    } as TextStyle,
    resetCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F4F4',
        marginHorizontal: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        gap: 12,
        marginBottom: spacing.xl,
    } as ViewStyle,
    resetText: {
        flex: 1,
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 16,
        color: colors.textSecondary,
    } as TextStyle,
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        height: 56,
        borderRadius: radius.xl,
        backgroundColor: '#FFF2F2',
        borderWidth: 1,
        borderColor: '#FFE0E0',
        marginBottom: spacing.xl,
    } as ViewStyle,
    logoutBtnText: {
        fontFamily: 'Lexend_700Bold',
        fontSize: 16,
        color: colors.error,
    } as TextStyle,
    versionLabel: {
        textAlign: 'center',
        color: colors.textTertiary,
        fontFamily: 'Lexend_400Regular',
        fontSize: 12,
        marginBottom: spacing.xl,
    } as TextStyle,
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        marginBottom: 2,
    } as ViewStyle,
    verifiedText: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 13,
        color: '#4ADE80',
    } as TextStyle,
    getVerifiedText: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 13,
        color: colors.textTertiary,
    } as TextStyle,
});

