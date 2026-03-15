import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow, typography } from '../../../constants/tokens';
import { profileApi, hangoutApi } from '../../../lib/api';

const { width } = Dimensions.get('window');

export default function ChatInfoScreen() {
    const { id, otherUserName, otherUserId } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const targetId = (otherUserId as string) || (id as string);
                    const data = await profileApi.getById(targetId);
                    if (data && data.profile) {
                        setProfile(data.profile);
                    }
            } catch (error) {
                console.error('Error fetching chat info details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id]);

    const handleShareProfile = async () => {
        try {
            await Share.share({
                message: `Check out ${profile?.firstName}'s profile on Frendli!`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <TouchableOpacity onPress={handleShareProfile} style={styles.headerAction}>
                    <Feather name="share" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* User Summary Card */}
                <View style={styles.profileCard}>
                    <Image 
                        source={{ uri: profile?.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }} 
                        style={styles.avatar} 
                    />
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>{profile?.firstName || otherUserName}</Text>
                            <MaterialCommunityIcons name="check-decagram" size={18} color="#4ADE80" />
                        </View>
                        <Text style={styles.bio} numberOfLines={2}>
                            {profile?.bio || "Adventurer, coffee lover, and weekend hiker. Let's explore together!"}
                        </Text>
                    </View>
                </View>

                {/* Safety Status - clipboard image (3) inspiration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SAFETY STATUS</Text>
                    <LinearGradient
                        colors={['#4ADE80', '#22C55E']}
                        style={styles.safetyCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.safetyIconLarge}>
                            <MaterialCommunityIcons name="shield-check" size={28} color="#fff" />
                        </View>
                        <View style={styles.safetyInfo}>
                            <Text style={styles.safetyStatusTitle}>SafeArrival Active</Text>
                            <Text style={styles.safetyStatusText}>
                                {profile?.firstName || 'User'} is verified and follows community safety guidelines.
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Shared Context Sections */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MUTUAL INTERESTS</Text>
                    <View style={styles.interestsGrid}>
                        {['Hiking', 'Coffee', 'Photography'].map((interest, index) => (
                            <View key={index} style={styles.interestTag}>
                                <Text style={styles.interestText}>{interest}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Shared Perks - clipboard image (2) inspiration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>OUR SHARED PERKS</Text>
                    <TouchableOpacity style={styles.perkCard}>
                        <LinearGradient
                            colors={['#FFEDD5', '#FFF7ED']}
                            style={styles.perkGradient}
                        >
                            <View style={styles.perkIconContainer}>
                                <FontAwesome5 name="coffee" size={20} color="#F59E0B" />
                            </View>
                            <View style={styles.perkInfo}>
                                <Text style={styles.perkTitle}>2-for-1 Artisan Coffee</Text>
                                <Text style={styles.perkSubtitle}>Available at 12 partner venues</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Upcoming Plans - clipboard image (3) inspiration */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>UPCOMING PLANS</Text>
                        <TouchableOpacity onPress={() => router.push(`/chat/${id}` as any)}>
                            <Text style={styles.planLink}>Plan something</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.hangoutCard}>
                        <View style={[styles.dateBox, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={styles.dateDay}>18</Text>
                            <Text style={styles.dateMonth}>MAR</Text>
                        </View>
                        <View style={styles.hangoutInfo}>
                            <Text style={styles.hangoutTitle}>Board Games Night</Text>
                            <Text style={styles.hangoutMeta}>7:00 PM · Starbucks Reserve</Text>
                        </View>
                        <View style={styles.arrivalStatus}>
                            <MaterialCommunityIcons name="shield-check" size={20} color="#4ADE80" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Safety & Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SETTINGS & SAFETY</Text>
                    <View style={styles.settingsCard}>
                        <TouchableOpacity style={styles.settingItem} onPress={() => setIsMuted(!isMuted)}>
                            <View style={[styles.settingIcon, { backgroundColor: '#F3F4F6' }]}>
                                <Feather name={isMuted ? "bell-off" : "bell"} size={18} color={colors.textSecondary} />
                            </View>
                            <Text style={styles.settingLabel}>Mute Notifications</Text>
                            <View style={[styles.toggle, isMuted && styles.toggleActive]}>
                                <View style={[styles.toggleCircle, isMuted && styles.toggleCircleActive]} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={[styles.settingIcon, { backgroundColor: '#F3F4F6' }]}>
                                <Feather name="shield" size={18} color={colors.textSecondary} />
                            </View>
                            <Text style={styles.settingLabel}>Safety Briefing</Text>
                            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.settingItem, styles.dangerItem]}>
                            <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
                                <Feather name="slash" size={18} color="#EF4444" />
                            </View>
                            <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Block {profile?.firstName}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.settingItem, styles.dangerItem, { borderBottomWidth: 0 }]}>
                            <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
                                <Feather name="flag" size={18} color="#EF4444" />
                            </View>
                            <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Report Concern</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBF9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: spacing.md,
        backgroundColor: '#FFFBF9',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.bodyBold,
        fontSize: 17,
        color: colors.secondary,
    },
    headerAction: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        marginBottom: spacing.xl,
        ...shadow.card,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        marginRight: spacing.lg,
    },
    profileInfo: {
        flex: 1,
    },
    safetyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: radius.xl,
        ...shadow.md,
    },
    safetyIconLarge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    safetyInfo: {
        flex: 1,
    },
    safetyStatusTitle: {
        ...typography.bodyBold,
        color: '#FFF',
        fontSize: 16,
    },
    safetyStatusText: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 16,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    name: {
        ...typography.h3,
        color: colors.secondary,
        fontSize: 20,
    },
    bio: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.small,
        color: colors.textTertiary,
        marginBottom: spacing.md,
        letterSpacing: 1,
    },
    planLink: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    interestTag: {
        backgroundColor: '#F3EFEA',
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
        borderRadius: radius.full,
    },
    interestText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    perkCard: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadow.sm,
    },
    perkGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    perkIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        ...shadow.subtle,
    },
    perkInfo: {
        flex: 1,
    },
    perkTitle: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.secondary,
    },
    perkSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    hangoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: spacing.md,
        borderRadius: radius.xl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dateBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    dateDay: {
        ...typography.bodyBold,
        fontSize: 18,
        color: colors.primary,
        lineHeight: 20,
    },
    dateMonth: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
    },
    hangoutInfo: {
        flex: 1,
    },
    hangoutTitle: {
        ...typography.bodyBold,
        color: colors.secondary,
    },
    hangoutMeta: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    arrivalStatus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsCard: {
        backgroundColor: '#FFF',
        borderRadius: radius.xl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    settingLabel: {
        flex: 1,
        ...typography.body,
        fontSize: 15,
        color: colors.textPrimary,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#4ADE80',
    },
    toggleCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFF',
    },
    toggleCircleActive: {
        marginLeft: 20,
    },
    dangerItem: {
        // Reserved for special styling if needed
    }
});
