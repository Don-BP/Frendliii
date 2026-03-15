import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { profileApi } from '../lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

const FRIENDSHIP_STYLES = [
    { id: 'one-on-one', label: '1v1 Hangouts', icon: 'account' },
    { id: 'small-group', label: 'Small Groups', icon: 'account-group' },
    { id: 'open', label: 'Open Gatherings', icon: 'account-multiple-plus' },
];

const DAYS_OF_WEEK = [
    { id: 'mon', label: 'Mon' },
    { id: 'tue', label: 'Tue' },
    { id: 'wed', label: 'Wed' },
    { id: 'thu', label: 'Thu' },
    { id: 'fri', label: 'Fri' },
    { id: 'sat', label: 'Sat' },
    { id: 'sun', label: 'Sun' },
];

const TIME_SLOTS = [
    { id: 'morning', label: '🌅 Mornings' },
    { id: 'afternoon', label: '☀️ Afternoons' },
    { id: 'evening', label: '🌆 Evenings' },
    { id: 'night', label: '🌙 Nights' },
];

const ACTIVITY_PREF_GROUPS = [
    {
        key: 'environment' as const,
        label: 'Environment',
        options: [
            { id: 'indoor', label: '🏠 Indoor' },
            { id: 'outdoor', label: '🌿 Outdoor' },
        ],
    },
    {
        key: 'energy' as const,
        label: 'Energy Level',
        options: [
            { id: 'active', label: '⚡ Active' },
            { id: 'relaxed', label: '🧘 Relaxed' },
        ],
    },
    {
        key: 'social' as const,
        label: 'Social Vibe',
        options: [
            { id: 'social', label: '🎉 Social' },
            { id: 'quiet', label: '☕ Quiet' },
        ],
    },
];

const INTEREST_CATEGORIES = [
    {
        label: 'Outdoors',
        emoji: '🏔️',
        interests: [
            { id: 'hiking', label: 'Hiking', emoji: '🥾' },
            { id: 'camping', label: 'Camping', emoji: '🏕️' },
            { id: 'cycling', label: 'Cycling', emoji: '🚴' },
            { id: 'running', label: 'Running', emoji: '🏃' },
            { id: 'climbing', label: 'Climbing', emoji: '🧗' },
        ]
    },
    {
        label: 'Food & Drink',
        emoji: '🍕',
        interests: [
            { id: 'coffee', label: 'Coffee', emoji: '☕' },
            { id: 'cooking', label: 'Cooking', emoji: '🧑‍🍳' },
            { id: 'wine', label: 'Wine', emoji: '🍷' },
            { id: 'vegan', label: 'Vegan', emoji: '🌱' },
            { id: 'baking', label: 'Baking', emoji: '🥖' },
        ]
    },
    {
        label: 'Arts & Creative',
        emoji: '🎨',
        interests: [
            { id: 'theatre', label: 'Theatre', emoji: '🎭' },
            { id: 'photography', label: 'Photography', emoji: '📸' },
            { id: 'painting', label: 'Painting', emoji: '🎨' },
            { id: 'writing', label: 'Writing', emoji: '✍️' },
            { id: 'design', label: 'Design', emoji: '🖌️' },
        ]
    },
    {
        label: 'Entertainment',
        emoji: '🎬',
        interests: [
            { id: 'movies', label: 'Movies', emoji: '🍿' },
            { id: 'gaming', label: 'Gaming', emoji: '🎮' },
            { id: 'anime', label: 'Anime', emoji: '⛩️' },
            { id: 'concerts', label: 'Concerts', emoji: '🎸' },
            { id: 'reading', label: 'Reading', emoji: '📚' },
        ]
    }
];

export default function EditProfileScreen() {
    const router = useRouter();
    const { profile, setProfile } = useAuthStore();

    const [firstName, setFirstName] = useState(profile?.firstName || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [friendshipStyle, setFriendshipStyle] = useState(profile?.friendshipStyle || 'small-group');
    const [availabilityDays, setAvailabilityDays] = useState<string[]>(profile?.availability?.days || []);
    const [availabilityTimes, setAvailabilityTimes] = useState<string[]>(profile?.availability?.times || []);
    const [lifeStage, setLifeStage] = useState(profile?.lifeStage || '');
    const [interests, setInterests] = useState<string[]>(profile?.interests || []);
    const [activityPrefs, setActivityPrefs] = useState<{
        environment: 'indoor' | 'outdoor' | null;
        energy: 'active' | 'relaxed' | null;
        social: 'social' | 'quiet' | null;
    }>({
        environment: profile?.activityPreferences?.environment ?? null,
        energy: profile?.activityPreferences?.energy ?? null,
        social: profile?.activityPreferences?.social ?? null,
    });

    const toggleDay = (day: string) => {
        setAvailabilityDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const toggleTime = (time: string) => {
        setAvailabilityTimes(prev =>
            prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
        );
    };

    const toggleInterest = (id: string) => {
        setInterests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!firstName.trim()) {
            Alert.alert('Error', 'First name is required');
            return;
        }

        try {
            const updates = {
                firstName: firstName.trim(),
                bio: bio.trim() || null,
                friendshipStyle,
                availability: { days: availabilityDays, times: availabilityTimes },
                lifeStage: lifeStage.trim() || null,
                interests,
                activityPreferences: activityPrefs,
            };

            // Update backend
            await profileApi.update(updates);

            // Update local state
            setProfile(updates);

            Alert.alert('Success', 'Profile updated!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to update profile:', error);
            Alert.alert('Error', 'Failed to save changes to the server.');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.cream]}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Feather name="arrow-left" size={24} color={colors.secondary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <Animated.View entering={FadeInDown.duration(600)}>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Basic Info</Text>
                                <View style={styles.card}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>First Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            placeholder="Your name"
                                            placeholderTextColor={colors.textTertiary}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Bio</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={bio}
                                            onChangeText={setBio}
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                            placeholder="Tell potential friends about yourself..."
                                            placeholderTextColor={colors.textTertiary}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Life Stage (Optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={lifeStage}
                                            onChangeText={setLifeStage}
                                            placeholder="e.g. Early career, Parent, Student"
                                            placeholderTextColor={colors.textTertiary}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Friendship Style</Text>
                                <View style={styles.styleGrid}>
                                    {FRIENDSHIP_STYLES.map((style) => (
                                        <TouchableOpacity
                                            key={style.id}
                                            style={[
                                                styles.styleOption,
                                                friendshipStyle === style.id && styles.styleOptionActive
                                            ]}
                                            onPress={() => setFriendshipStyle(style.id)}
                                        >
                                            <MaterialCommunityIcons 
                                                name={style.icon as any} 
                                                size={24} 
                                                color={friendshipStyle === style.id ? '#fff' : colors.primary} 
                                            />
                                            <Text style={[
                                                styles.styleLabel,
                                                friendshipStyle === style.id && styles.styleLabelActive
                                            ]}>
                                                {style.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>General Availability</Text>
                                <View style={styles.card}>
                                    <Text style={styles.sectionDesc}>Which days are you usually free?</Text>
                                    <View style={styles.dayGrid}>
                                        {DAYS_OF_WEEK.map((day) => (
                                            <TouchableOpacity
                                                key={day.id}
                                                style={[
                                                    styles.dayChip,
                                                    availabilityDays.includes(day.id) && styles.dayChipActive
                                                ]}
                                                onPress={() => toggleDay(day.id)}
                                            >
                                                <Text style={[
                                                    styles.dayText,
                                                    availabilityDays.includes(day.id) && styles.dayTextActive
                                                ]}>
                                                    {day.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <Text style={[styles.sectionDesc, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                                        What times of day work best?
                                    </Text>
                                    <View style={styles.dayGrid}>
                                        {TIME_SLOTS.map((slot) => (
                                            <TouchableOpacity
                                                key={slot.id}
                                                style={[
                                                    styles.dayChip,
                                                    availabilityTimes.includes(slot.id) && styles.dayChipActive
                                                ]}
                                                onPress={() => toggleTime(slot.id)}
                                            >
                                                <Text style={[
                                                    styles.dayText,
                                                    availabilityTimes.includes(slot.id) && styles.dayTextActive
                                                ]}>
                                                    {slot.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Activity Preferences</Text>
                                <Text style={[styles.sectionDesc, { marginLeft: 4, marginBottom: spacing.md }]}>
                                    How do you like to spend your time?
                                </Text>
                                {ACTIVITY_PREF_GROUPS.map((group) => (
                                    <View key={group.key} style={[styles.card, { marginBottom: spacing.md }]}>
                                        <Text style={styles.label}>{group.label}</Text>
                                        <View style={[styles.dayGrid, { marginTop: spacing.xs }]}>
                                            {group.options.map((opt) => {
                                                const isActive = activityPrefs[group.key] === opt.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={opt.id}
                                                        style={[styles.dayChip, { flex: 1 }, isActive && styles.dayChipActive]}
                                                        onPress={() => setActivityPrefs(prev => ({ ...prev, [group.key]: isActive ? null : opt.id as any }))}
                                                    >
                                                        <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                                                            {opt.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Interests</Text>
                                <Text style={[styles.sectionDesc, { marginLeft: 4, marginBottom: spacing.md }]}>
                                    {interests.length} selected — tap to update
                                </Text>
                                {INTEREST_CATEGORIES.map((category) => (
                                    <View key={category.label} style={styles.categorySection}>
                                        <Text style={styles.categoryTitle}>
                                            {category.emoji} {category.label}
                                        </Text>
                                        <View style={styles.pillContainer}>
                                            {category.interests.map((interest) => {
                                                const isSelected = interests.includes(interest.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={interest.id}
                                                        style={[styles.pill, isSelected && styles.pillSelected]}
                                                        onPress={() => toggleInterest(interest.id)}
                                                    >
                                                        <Text style={styles.pillEmoji}>{interest.emoji}</Text>
                                                        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                                                            {interest.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Animated.View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={styles.saveButton}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    } as ViewStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    } as ViewStyle,
    backButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.subtle,
    } as ViewStyle,
    headerTitle: {
        ...typography.h3,
        color: colors.secondary,
    } as TextStyle,
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 40,
    } as ViewStyle,
    section: {
        marginBottom: spacing.xl,
    } as ViewStyle,
    sectionTitle: {
        ...typography.bodyBold,
        color: colors.primary,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 12,
        marginLeft: 4,
    } as TextStyle,
    sectionDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    } as TextStyle,
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        padding: spacing.lg,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
    inputGroup: {
        marginBottom: spacing.lg,
    } as ViewStyle,
    label: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        marginLeft: 2,
    } as TextStyle,
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    } as TextStyle,
    textArea: {
        minHeight: 100,
        paddingTop: spacing.md,
    } as TextStyle,
    styleGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    } as ViewStyle,
    styleOption: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.subtle,
        gap: 8,
    } as ViewStyle,
    styleOptionActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    } as ViewStyle,
    styleLabel: {
        fontSize: 12,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textSecondary,
        textAlign: 'center',
    } as TextStyle,
    styleLabelActive: {
        color: '#fff',
    } as TextStyle,
    dayGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    } as ViewStyle,
    dayChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: radius.full,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 55,
        alignItems: 'center',
    } as ViewStyle,
    dayChipActive: {
        backgroundColor: colors.secondary,
        borderColor: colors.secondary,
    } as ViewStyle,
    dayText: {
        fontSize: 13,
        fontFamily: 'Lexend_500Medium',
        color: colors.textSecondary,
    } as TextStyle,
    dayTextActive: {
        color: '#fff',
    } as TextStyle,
    footer: {
        padding: spacing.xl,
        backgroundColor: 'transparent',
    } as ViewStyle,
    saveButton: {
        height: 60,
        borderRadius: radius.full,
        overflow: 'hidden',
        ...shadow.md,
    } as ViewStyle,
    saveGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    saveButtonText: {
        ...typography.bodyBold,
        color: '#fff',
        fontSize: 18,
    } as TextStyle,
    categorySection: {
        marginBottom: spacing.lg,
    } as ViewStyle,
    categoryTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        marginLeft: 2,
    } as TextStyle,
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    } as ViewStyle,
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.full,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        ...shadow.subtle,
    } as ViewStyle,
    pillSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    } as ViewStyle,
    pillEmoji: {
        fontSize: 15,
        marginRight: spacing.xs,
    } as TextStyle,
    pillText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textPrimary,
    } as TextStyle,
    pillTextSelected: {
        color: '#fff',
        fontWeight: '600',
    } as TextStyle,
});

