import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Switch, Platform, Image
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { hangoutApi, venueApi } from '../../lib/api';
import { LinearGradient } from 'expo-linear-gradient';

const ACTIVITY_TYPES = [
    { id: 'hiking', label: 'Hiking', icon: '🧗', type: 'emoji' },
    { id: 'board_games', label: 'Board Games', icon: '🎲', type: 'emoji' },
    { id: 'cooking', label: 'Cooking', icon: '🍳', type: 'emoji' },
    { id: 'concerts', label: 'Concerts', icon: '🎸', type: 'emoji' },
    { id: 'photography', label: 'Photography', icon: '📸', type: 'emoji' },
    { id: 'reading', label: 'Reading', icon: '📚', type: 'emoji' },
    { id: 'coffee', label: 'Coffee', icon: '☕', type: 'emoji' },
    { id: 'yoga', label: 'Yoga', icon: '🧘', type: 'emoji' },
    { id: 'rock_climbing', label: 'Rock Climbing', icon: '🧗', type: 'emoji' },
    { id: 'running', label: 'Running', icon: '🏃', type: 'emoji' },
    { id: 'art', label: 'Art', icon: '🎨', type: 'emoji' },
    { id: 'movies', label: 'Movies', icon: '🎬', type: 'emoji' },
];

const ACTIVITY_IMAGES: Record<string, string> = {
    running: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1000',
    board_games: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=1000',
    coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000',
    walk: 'https://images.unsplash.com/photo-1517021897913-0e448b59ebb1?q=80&w=1000',
    hiking: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000',
    movies: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1000',
    other: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000',
    cooking: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000',
    concerts: 'https://images.unsplash.com/photo-1459749411177-042180ce6a90?q=80&w=1000',
    photography: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=1000',
    reading: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000',
    yoga: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000',
    rock_climbing: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1000',
    art: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=1000',
    tennis: 'https://images.unsplash.com/photo-1595435066993-3e3363403309?q=80&w=1000',
    coding: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1000',
};

const TIME_SLOTS = [
    '8:00 AM', '9:00 AM', '10:00 AM',
    '11:00 AM', '12:00 PM', '1:00 PM',
];

const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const shortLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).split(',')[0];
        
        // Match specific format In screenshot: "Sat, Mar 1"
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const fullLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName}, ${monthDay}`;

        dates.push({ full: fullLabel, short: fullLabel, date: d });
    }
    return dates;
};

export default function CreateHangoutScreen() {
    const router = useRouter();
    const { templateId, venueId, venueName, category: initialCategory, title: initialTitle } = useLocalSearchParams();
    
    // State
    const [loading, setLoading] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<string | null>(initialCategory as string || null);
    const [showAllActivities, setShowAllActivities] = useState(false);
    const [title, setTitle] = useState(initialTitle as string || '');
    const [venueNameInput, setVenueNameInput] = useState(venueName as string || '');
    const [addressInput, setAddressInput] = useState('');
    const [coverPhotoMode, setCoverPhotoMode] = useState<'auto' | 'custom' | 'map'>('auto');
    const DATE_OPTIONS = useMemo(() => getDates(), []);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [selectedTime, setSelectedTime] = useState('1:00 PM');
    const [groupSize, setGroupSize] = useState(4);
    const [description, setDescription] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);

    // Initial setup from params
    useEffect(() => {
        if (initialTitle) setTitle(initialTitle as string);
        if (initialCategory) setSelectedActivity(initialCategory as string);
        if (venueName) setVenueNameInput(venueName as string);
    }, [initialTitle, initialCategory, venueId, venueName]);

    const getStartTime = () => {
        const date = DATE_OPTIONS[selectedDateIndex].date;
        const [time, period] = selectedTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        const fullDate = new Date(date);
        fullDate.setHours(hours, minutes, 0, 0);
        return fullDate.toISOString();
    };

    const handleCreate = async () => {
        if (!title.trim() || !selectedActivity || !venueNameInput.trim()) {
            Alert.alert('Incomplete Form', 'Please fill in activity, title, and venue to continue.');
            return;
        }

        setLoading(true);
        try {
            await hangoutApi.create({
                title: title.trim(),
                description: description.trim() || undefined,
                maxAttendees: groupSize,
                venueId: venueId as string || 'custom', 
                startTime: getStartTime(),
                category: selectedActivity,
                isPublic: true,
                isRecurring,
            });

            Alert.alert('Success', 'Your hangout has been created!', [
                { text: 'Awesome', onPress: () => router.push('/(tabs)/hangouts') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create hangout');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = title.trim() && selectedActivity && venueNameInput.trim();

    const renderActivityIcon = (activity: any) => {
        return <Text style={{ fontSize: 16 }}>{activity.icon}</Text>;
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: '',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Feather name="x" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                ),
                headerTransparent: true,
            }} />

            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Activity Type Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>ACTIVITY TYPE</Text>
                    <View style={styles.activityGrid}>
                        {(showAllActivities ? ACTIVITY_TYPES : ACTIVITY_TYPES.slice(0, 10)).map((activity) => (
                            <TouchableOpacity
                                key={activity.id}
                                style={[
                                    styles.activityChip,
                                    selectedActivity === activity.id && styles.activityChipActive
                                ]}
                                onPress={() => setSelectedActivity(activity.id)}
                            >
                                {renderActivityIcon(activity)}
                                <Text style={[
                                    styles.activityChipText,
                                    selectedActivity === activity.id && styles.activityChipTextActive
                                ]}>
                                    {activity.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity 
                        onPress={() => setShowAllActivities(!showAllActivities)}
                        style={styles.showMoreButton}
                    >
                        <Text style={styles.showMoreText}>
                            {showAllActivities ? 'Hide activities' : `Show all ${ACTIVITY_TYPES.length} activities`}
                        </Text>
                        <Feather name={showAllActivities ? "chevron-up" : "chevron-down"} size={16} color="#E6684B" />
                    </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>HANGOUT TITLE</Text>
                    <View style={styles.inputWrapper}>
                        <Feather name="menu" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Give your hangout a name..."
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor={colors.textTertiary}
                        />
                    </View>
                </View>

                {/* Where Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>WHERE</Text>
                    <View style={[styles.inputWrapper, styles.venueInput]}>
                        <Feather name="map-pin" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Venue name (e.g. Mox Boarding House)"
                            value={venueNameInput}
                            onChangeText={setVenueNameInput}
                            placeholderTextColor={colors.textTertiary}
                        />
                    </View>
                    <View style={styles.inputWrapper}>
                        <Feather name="map-pin" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Street address (optional)"
                            value={addressInput}
                            onChangeText={setAddressInput}
                            placeholderTextColor={colors.textTertiary}
                        />
                    </View>
                </View>

                {/* Cover Photo Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>COVER PHOTO</Text>
                    <View style={styles.photoModeRow}>
                        <TouchableOpacity 
                            style={[styles.photoModeButton, coverPhotoMode === 'auto' && styles.photoModeButtonActive]}
                            onPress={() => setCoverPhotoMode('auto')}
                        >
                            <Feather name="zap" size={16} color={coverPhotoMode === 'auto' ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.photoModeText, coverPhotoMode === 'auto' && styles.photoModeTextActive]}>Auto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.photoModeButton, coverPhotoMode === 'custom' && styles.photoModeButtonActive]}
                            onPress={() => setCoverPhotoMode('custom')}
                        >
                            <Feather name="image" size={16} color={coverPhotoMode === 'custom' ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.photoModeText, coverPhotoMode === 'custom' && styles.photoModeTextActive]}>My Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.photoModeButton, coverPhotoMode === 'map' && styles.photoModeButtonActive]}
                            onPress={() => setCoverPhotoMode('map')}
                        >
                            <Feather name="map" size={16} color={coverPhotoMode === 'map' ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.photoModeText, coverPhotoMode === 'map' && styles.photoModeTextActive]}>Map Link</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.photoPreviewContainer}>
                        <Image 
                            source={{ uri: (coverPhotoMode === 'auto' && selectedActivity) 
                                ? ACTIVITY_IMAGES[selectedActivity] || ACTIVITY_IMAGES['other']
                                : 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1000&auto=format&fit=crop' 
                            }} 
                            style={styles.photoPreview}
                        />
                        {coverPhotoMode === 'auto' && (
                            <View style={styles.autoBadge}>
                                <Feather name="zap" size={12} color="#FFF" />
                                <Text style={styles.autoBadgeText}>Auto-selected for {selectedActivity || 'hangout'}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* When Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>WHEN</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {DATE_OPTIONS.map((item, index) => (
                            <TouchableOpacity
                                key={item.full}
                                style={[styles.dateChip, selectedDateIndex === index && styles.dateChipActive]}
                                onPress={() => setSelectedDateIndex(index)}
                            >
                                <Text style={[styles.dateChipText, selectedDateIndex === index && styles.dateChipTextActive]}>{item.short}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Time Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>TIME</Text>
                    <View style={styles.timeGrid}>
                        {TIME_SLOTS.map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={[styles.timeChip, selectedTime === time && styles.timeChipActive]}
                                onPress={() => setSelectedTime(time)}
                            >
                                <Feather name="clock" size={14} color={selectedTime === time ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.timeChipText, selectedTime === time && styles.timeChipTextActive]}>{time}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.showMoreButton}>
                        <Text style={styles.showMoreText}>More times</Text>
                        <Feather name="chevron-down" size={16} color="#E6684B" />
                    </TouchableOpacity>
                </View>

                {/* Group Size Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>GROUP SIZE</Text>
                    <View style={styles.counterCard}>
                        <View style={styles.counterContent}>
                            <TouchableOpacity 
                                style={styles.counterButton}
                                onPress={() => setGroupSize(Math.max(2, groupSize - 1))}
                            >
                                <Feather name="minus" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <View style={styles.counterValueContainer}>
                                <Feather name="users" size={20} color={colors.primary} />
                                <Text style={styles.counterValue}>{groupSize}</Text>
                                <Text style={styles.counterLabel}>people max</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.counterButton}
                                onPress={() => setGroupSize(Math.min(20, groupSize + 1))}
                            >
                                <Feather name="plus" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Description Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DESCRIPTION (optional)</Text>
                    <View style={styles.descriptionWrapper}>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder="Tell people what to expect, what to bring, skill level, etc."
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                            maxLength={300}
                        />
                        <Text style={styles.charCount}>{description.length}/300</Text>
                    </View>
                </View>

                {/* Recurring Section */}
                <View style={styles.section}>
                    <View style={styles.toggleCard}>
                        <View>
                            <Text style={styles.toggleTitle}>Recurring hangout</Text>
                            <Text style={styles.toggleSubtitle}>Make this a weekly standing event</Text>
                        </View>
                        <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            trackColor={{ false: colors.gray[200], true: colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {!isFormValid && (
                    <Text style={styles.footerInstruction}>
                        Fill in activity, title, venue, date & time to continue
                    </Text>
                )}
                <TouchableOpacity
                    style={[
                        styles.createButton,
                        (!isFormValid || loading) && styles.createButtonDisabled
                    ]}
                    onPress={handleCreate}
                    disabled={!isFormValid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Hangout</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF7',
    },
    closeButton: {
        marginLeft: spacing.lg,
        marginTop: Platform.OS === 'ios' ? 0 : 10,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: 100,
        paddingHorizontal: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionLabel: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textTertiary,
        marginBottom: spacing.md,
        letterSpacing: 0.5,
    },
    activityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    activityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: '#F5EEE6',
        borderRadius: radius.full,
        gap: 6,
    },
    activityChipActive: {
        backgroundColor: '#FFF1EE',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    activityChipText: {
        ...typography.caption,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    activityChipTextActive: {
        color: colors.primary,
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: 4,
    },
    showMoreText: {
        ...typography.caption,
        fontWeight: '600',
        color: '#E6684B',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        height: 56,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    venueInput: {
        marginBottom: spacing.sm,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    textInput: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
    },
    photoModeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    photoModeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        backgroundColor: colors.gray[100],
        borderRadius: radius.full,
        gap: 6,
    },
    photoModeButtonActive: {
        backgroundColor: '#FFF1EE',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    photoModeText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    photoModeTextActive: {
        color: colors.primary,
    },
    photoPreviewContainer: {
        height: 180,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...shadow.md,
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    autoBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.md,
        gap: 6,
    },
    autoBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
    },
    horizontalScroll: {
        flexDirection: 'row',
    },
    dateChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.gray[100],
        borderRadius: radius.lg,
        marginRight: spacing.sm,
    },
    dateChipActive: {
        backgroundColor: '#FFF1EE',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    dateChipText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    dateChipTextActive: {
        color: colors.primary,
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '31%',
        paddingVertical: spacing.md,
        backgroundColor: colors.gray[100],
        borderRadius: radius.lg,
        gap: 6,
    },
    timeChipActive: {
        backgroundColor: '#FFF1EE',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    timeChipText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    timeChipTextActive: {
        color: colors.primary,
    },
    counterCard: {
        backgroundColor: '#FFF',
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    counterContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    counterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterValueContainer: {
        alignItems: 'center',
    },
    counterValue: {
        ...typography.h1,
        color: colors.textPrimary,
        marginVertical: 2,
    },
    counterLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    descriptionWrapper: {
        backgroundColor: '#FFF',
        borderRadius: radius.lg,
        padding: spacing.md,
        minHeight: 120,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    descriptionInput: {
        ...typography.body,
        color: colors.textPrimary,
        textAlignVertical: 'top',
        flex: 1,
    },
    charCount: {
        ...typography.small,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: 4,
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: spacing.lg,
        borderRadius: radius.lg,
        ...shadow.subtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    toggleSubtitle: {
        ...typography.small,
        color: colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFBF7',
        padding: spacing.xl,
        paddingBottom: spacing.xxl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    footerInstruction: {
        ...typography.small,
        color: colors.textTertiary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    createButton: {
        backgroundColor: colors.primary,
        width: '100%',
        height: 56,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.premium,
    },
    createButtonDisabled: {
        backgroundColor: '#E0D8CE',
        shadowOpacity: 0,
        elevation: 0,
    },
    createButtonText: {
        ...typography.bodyBold,
        color: '#FFF',
        fontSize: 18,
    }
});

