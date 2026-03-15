import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Platform,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { profileApi } from '../../lib/api';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (typeof id === 'string') {
                    const data = await profileApi.getById(id);
                    setProfile(data.profile);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    const formatActivityPrefs = (prefs: any) => {
        if (!prefs) return null;
        return [prefs.environment, prefs.energy, prefs.social]
            .filter(Boolean)
            .map((v: string) => v.charAt(0).toUpperCase() + v.slice(1))
            .join(' · ') || null;
    };

    const formatAvailability = (avail: any) => {
        if (!avail) return 'Not set';
        const dayMap: Record<string, string> = {
            mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
            fri: 'Fri', sat: 'Sat', sun: 'Sun',
        };
        const timeMap: Record<string, string> = {
            morning: 'Mornings', afternoon: 'Afternoons',
            evening: 'Evenings', night: 'Nights',
        };
        const days = (avail.days || []).map((d: string) => dayMap[d] || d).join(', ');
        const times = (avail.times || []).map((t: string) => timeMap[t] || t).join(', ');
        if (days && times) return `${days} · ${times}`;
        return days || times || 'Not set';
    };

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Profile not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const age = calculateAge(profile.dob);

    // Mock compatibility data for now - could be fetched from backend later
    const compatibility = {
        score: 88,
        breakdown: [
            { label: 'Shared Interests', percentage: 75, detail: '(3 shared)' },
            { label: 'Hangout Style', percentage: 100, detail: '(Matching!)' },
            { label: 'Life Stage', percentage: 33, detail: '' },
            { label: 'Activity Preferences', percentage: 33, detail: '(1 shared)' },
            { label: 'Availability', percentage: 30, detail: '(1 overlaps)' },
        ]
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Feather name="x" size={24} color={colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Feather name="flag" size={20} color={colors.secondary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Photo */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.photoContainer}>
                    <View style={styles.photoWrapper}>
                        <Image 
                            source={{ uri: profile.photos?.[0] || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800' }} 
                            style={styles.photo} 
                        />
                        <View style={styles.onlineDot} />
                    </View>
                </Animated.View>

                {/* Name & Basic Info */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{profile.firstName}</Text>
                        {profile.safetyBadges?.length > 0 && (
                            <MaterialCommunityIcons name="check-decagram" size={20} color="#4ADE80" style={styles.verifiedIcon} />
                        )}
                        {age && <Text style={styles.age}>, {age}</Text>}
                    </View>
                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={14} color={colors.textTertiary} />
                        <Text style={styles.locationText}>0.3 mi away</Text>
                    </View>

                    {/* Compatibility Tag */}
                    <View style={styles.compatibilityTag}>
                        <Text style={styles.compatibilityEmoji}>🧐</Text>
                        <Text style={styles.compatibilityPercent}>{compatibility.score}% </Text>
                        <Text style={styles.compatibilityLabel}>Potential</Text>
                    </View>
                </Animated.View>

                {/* Bio / Match Reason */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.bioCard}>
                    <Text style={styles.bioText}>
                        {profile.bio || "Fellow trail runner and podcast addict. We matched on our love for morning runs!"}
                    </Text>
                </Animated.View>

                {/* Compatibility Breakdown */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>COMPATIBILITY BREAKDOWN</Text>
                    <View style={styles.breakdownCard}>
                        {compatibility.breakdown.map((item, index) => (
                            <View key={index} style={styles.breakdownItem}>
                                <View style={styles.breakdownHeader}>
                                    <View style={styles.labelGroup}>
                                        <Feather 
                                            name={
                                                index === 0 ? "heart" : 
                                                index === 1 ? "users" : 
                                                index === 2 ? "compass" : 
                                                index === 3 ? "activity" : "calendar"
                                            } 
                                            size={14} 
                                            color={colors.textTertiary} 
                                        />
                                        <Text style={styles.breakdownLabel}>{item.label} {item.detail}</Text>
                                    </View>
                                    <Text style={[
                                        styles.breakdownPercent, 
                                        { color: item.percentage > 70 ? '#4ADE80' : item.percentage > 30 ? colors.primary : colors.textTertiary }
                                    ]}>
                                        {item.percentage}%
                                    </Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View 
                                        style={[
                                            styles.progressBarFill, 
                                            { 
                                                width: `${item.percentage}%`,
                                                backgroundColor: index === 0 ? '#F87171' : index === 1 ? '#94A3B8' : index === 2 ? '#94A3B8' : index === 3 ? '#60A5FA' : '#4ADE80'
                                            }
                                        ]} 
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Interests */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>ALL INTERESTS</Text>
                    <View style={styles.interestsGrid}>
                        {(profile.interests || ['Hiking', 'Coffee', 'Running', 'Podcasts']).map((interest: string, index: number) => (
                            <View key={index} style={styles.interestTag}>
                                <Text style={styles.interestEmoji}>
                                    {interest.toLowerCase().includes('hike') ? '🥾' : 
                                     interest.toLowerCase().includes('coffee') ? '☕' : 
                                     interest.toLowerCase().includes('run') ? '🏃' : '✨'}
                                </Text>
                                <Text style={styles.interestText}>{interest}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Details */}
                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>DETAILS</Text>
                    <View style={styles.detailsCard}>
                        <DetailItem 
                            icon="users" 
                            label="Friendship Style" 
                            value={profile.friendshipStyle || "One-on-One"} 
                            color="#F87171" 
                        />
                        <DetailItem 
                            icon="heart" 
                            label="Life Stage" 
                            value={profile.lifeStage || "Early Career"} 
                            color="#F87171" 
                        />
                        <DetailItem
                            icon="calendar"
                            label="Available"
                            value={formatAvailability(profile.availability)}
                            color="#F87171"
                        />
                        {formatActivityPrefs(profile.activityPreferences) && (
                            <DetailItem
                                icon="zap"
                                label="Activity Vibe"
                                value={formatActivityPrefs(profile.activityPreferences)!}
                                color="#F87171"
                            />
                        )}
                    </View>
                </Animated.View>
                
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => router.push(`/chat/${id}` as any)}
                >
                    <Feather name="message-circle" size={20} color={colors.surface} />
                    <Text style={styles.messageButtonText}>Message {profile.firstName}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function DetailItem({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
    return (
        <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
                <Feather name={icon} size={18} color={color} />
            </View>
            <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF9', // Warm cream background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBF9',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        height: 110,
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
    },
    photoContainer: {
        alignItems: 'center',
        marginTop: -30,
        marginBottom: spacing.md,
    },
    photoWrapper: {
        position: 'relative',
        ...shadow.md,
    },
    photo: {
        width: width * 0.45,
        height: width * 0.45,
        borderRadius: width * 0.225,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4ADE80',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        ...typography.h2,
        color: colors.secondary,
        fontSize: 32,
    },
    age: {
        ...typography.h2,
        color: colors.textSecondary,
        fontSize: 32,
        fontWeight: 'normal',
    },
    verifiedIcon: {
        marginLeft: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    locationText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textTertiary,
        marginLeft: 4,
    },
    compatibilityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3EFEA',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
    },
    compatibilityEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    compatibilityPercent: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.textSecondary,
    },
    compatibilityLabel: {
        ...typography.body,
        fontSize: 15,
        color: colors.textTertiary,
    },
    bioCard: {
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        marginBottom: spacing.xl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    bioText: {
        ...typography.body,
        fontSize: 16,
        color: colors.textPrimary,
        lineHeight: 24,
        textAlign: 'center',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.small,
        color: colors.textTertiary,
        marginBottom: spacing.md,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    breakdownCard: {
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    breakdownItem: {
        marginBottom: spacing.md,
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breakdownLabel: {
        ...typography.body,
        fontSize: 13,
        color: colors.textSecondary,
        marginLeft: 8,
    },
    breakdownPercent: {
        ...typography.bodyBold,
        fontSize: 13,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    interestTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3EFEA',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: radius.xl,
    },
    interestEmoji: {
        fontSize: 14,
        marginRight: 6,
    },
    interestText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textSecondary,
    },
    detailsCard: {
        backgroundColor: '#FFF',
        borderRadius: radius.xxl,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    detailIconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailInfo: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        ...typography.body,
        fontSize: 12,
        color: colors.textTertiary,
        marginBottom: 2,
    },
    detailValue: {
        ...typography.bodyBold,
        fontSize: 15,
        color: colors.secondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        backgroundColor: 'rgba(255, 251, 249, 0.95)',
    },
    messageButton: {
        backgroundColor: '#E07050', // Vibrant orange/terra cotta
        flexDirection: 'row',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.md,
    },
    messageButtonText: {
        ...typography.bodyBold,
        color: '#FFF',
        fontSize: 18,
        marginLeft: 10,
    },
    backButton: {
        marginTop: 20,
        padding: 12,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});
