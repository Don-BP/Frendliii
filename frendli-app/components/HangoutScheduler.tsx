import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Modal,
    Image,
    Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { hangoutApi, venueApi } from '../lib/api';
import DateTimePicker from '@react-native-community/datetimepicker';

interface HangoutSchedulerProps {
    matchId: string;
    onClose: () => void;
    onHangoutCreated: (hangout: any) => void;
}

interface Suggestion {
    title: string;
    description: string;
    category: string;
}

interface Venue {
    id: string;
    name: string;
    address: string;
    imageUrl: string;
    category: string;
}

export const HangoutScheduler: React.FC<HangoutSchedulerProps> = ({
    matchId,
    onClose,
    onHangoutCreated
}) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const closeButtonRef = useRef<any>(null);

    useEffect(() => {
        // When modal opens, focus the close button to trap focus and resolve aria-hidden warning
        if (Platform.OS === 'web') {
            setTimeout(() => {
                // @ts-ignore - focus exists on web
                closeButtonRef.current?.focus?.();
            }, 100);
        }
    }, []);

    // Form state
    const [selectedActivity, setSelectedActivity] = useState<Suggestion | null>(null);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [startTime, setStartTime] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (step === 1) {
            fetchSuggestions();
        }
    }, [step]);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const data = await hangoutApi.getSuggestions(matchId);
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVenues = async (category: string) => {
        setLoading(true);
        try {
            const data = await venueApi.search(category);
            setVenues(data);
        } catch (error) {
            console.error('Error fetching venues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectActivity = (activity: Suggestion) => {
        setSelectedActivity(activity);
        fetchVenues(activity.category);
        setStep(2);
    };

    const handleSelectVenue = (venue: Venue) => {
        setSelectedVenue(venue);
        setStep(3);
    };

    const handleCreateHangout = async () => {
        if (!selectedActivity || !selectedVenue) return;

        setLoading(true);
        try {
            const hangoutData = {
                matchId,
                title: selectedActivity.title,
                venueId: selectedVenue.id,
                startTime: startTime.toISOString(),
            };
            const newHangout = await hangoutApi.create(hangoutData);
            onHangoutCreated(newHangout);
            onClose();
        } catch (error) {
            console.error('Error creating hangout:', error);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const currentDate = new Date(startTime);
            currentDate.setFullYear(selectedDate.getFullYear());
            currentDate.setMonth(selectedDate.getMonth());
            currentDate.setDate(selectedDate.getDate());
            setStartTime(currentDate);
            if (Platform.OS === 'android') setShowTimePicker(true);
        }
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const currentDate = new Date(startTime);
            currentDate.setHours(selectedTime.getHours());
            currentDate.setMinutes(selectedTime.getMinutes());
            setStartTime(currentDate);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Shared Interests ✨</Text>
            <Text style={styles.stepSubtitle}>We suggested these based on what you both like.</Text>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
                <ScrollView contentContainerStyle={styles.suggestionsList}>
                    {suggestions.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.activityCard}
                            onPress={() => handleSelectActivity(item)}
                        >
                            <View style={styles.activityIcon}>
                                <Feather name="star" size={24} color={colors.primary} />
                            </View>
                            <View style={styles.activityContent}>
                                <Text style={styles.activityTitle}>{item.title}</Text>
                                <Text style={styles.activityDesc}>{item.description}</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={[styles.activityCard, styles.customActivityCard]}
                        onPress={() => handleSelectActivity({ title: 'Something Else', description: 'Plan your own custom adventure', category: 'any' })}
                    >
                        <View style={[styles.activityIcon, { backgroundColor: colors.border }]}>
                            <Feather name="plus" size={24} color={colors.textSecondary} />
                        </View>
                        <View style={styles.activityContent}>
                            <Text style={styles.activityTitle}>Something Else</Text>
                            <Text style={styles.activityDesc}>Plan your own custom adventure</Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Pick a Venue</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
                <ScrollView contentContainerStyle={styles.venuesList}>
                    {venues.map((venue) => (
                        <TouchableOpacity
                            key={venue.id}
                            style={styles.venueCard}
                            onPress={() => handleSelectVenue(venue)}
                        >
                            {venue.imageUrl ? (
                                <Image source={{ uri: venue.imageUrl }} style={styles.venueImage} />
                            ) : (
                                <View style={styles.venueImagePlaceholder}>
                                    <Feather name="map-pin" size={32} color={colors.textTertiary} />
                                </View>
                            )}
                            <View style={styles.venueInfo}>
                                <Text style={styles.venueName}>{venue.name}</Text>
                                <Text style={styles.venueAddress}>{venue.address}</Text>
                                <View style={styles.venueCategoryTag}>
                                    <Text style={styles.venueCategoryText}>{venue.category}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepTitle}>When?</Text>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Feather name="activity" size={20} color={colors.primary} />
                    <Text style={styles.summaryText}>{selectedActivity?.title}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Feather name="map-pin" size={20} color={colors.primary} />
                    <Text style={styles.summaryText}>{selectedVenue?.name}</Text>
                </View>
            </View>

            <View style={styles.timePickerContainer}>
                <TouchableOpacity
                    style={styles.timeOption}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Feather name="calendar" size={24} color={colors.primary} />
                    <View style={styles.timeOptionContent}>
                        <Text style={styles.timeOptionLabel}>Date</Text>
                        <Text style={styles.timeOptionValue}>{startTime.toLocaleDateString()}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.timeOption}
                    onPress={() => setShowTimePicker(true)}
                >
                    <Feather name="clock" size={24} color={colors.primary} />
                    <View style={styles.timeOptionContent}>
                        <Text style={styles.timeOptionLabel}>Time</Text>
                        <Text style={styles.timeOptionValue}>
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={startTime}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                />
            )}

            {showTimePicker && (
                <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                />
            )}

            <TouchableOpacity
                style={[styles.confirmButton, loading && styles.buttonDisabled]}
                onPress={handleCreateHangout}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={colors.surface} />
                ) : (
                    <>
                        <Text style={styles.confirmButtonText}>Send Invitation</Text>
                        <Feather name="send" size={20} color={colors.surface} style={{ marginLeft: spacing.sm }} />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View
                    style={styles.modalContent}
                    accessibilityRole="none"
                    accessibilityViewIsModal={true}
                    accessibilityLabel="Hangout scheduler modal"
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Plan a Hangout</Text>
                        <TouchableOpacity
                            ref={closeButtonRef}
                            onPress={onClose}
                            style={styles.closeButton}
                            accessibilityLabel="Close scheduler"
                            accessibilityRole="button"
                        >
                            <Feather name="x" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        height: '85%',
        paddingBottom: spacing.xxl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    stepContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    backButton: {
        marginRight: spacing.md,
    },
    stepTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    stepSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginBottom: spacing.lg,
    },
    suggestionsList: {
        gap: spacing.md,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.lg,
        ...shadow.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    customActivityCard: {
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    activityIcon: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    activityDesc: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    venuesList: {
        gap: spacing.md,
    },
    venueCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        ...shadow.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    venueImage: {
        width: '100%',
        height: 150,
    },
    venueImagePlaceholder: {
        width: '100%',
        height: 150,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    venueInfo: {
        padding: spacing.md,
    },
    venueName: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    venueAddress: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    venueCategoryTag: {
        alignSelf: 'flex-start',
        backgroundColor: `${colors.primary}10`,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
        marginTop: spacing.sm,
    },
    venueCategoryText: {
        ...typography.caption,
        color: colors.primary,
        fontSize: 10,
        fontWeight: '700',
    },
    summaryCard: {
        backgroundColor: `${colors.primary}05`,
        padding: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    summaryText: {
        ...typography.body,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    timePickerContainer: {
        gap: spacing.md,
        marginBottom: spacing.xxl,
    },
    timeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.lg,
        ...shadow.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timeOptionContent: {
        marginLeft: spacing.md,
    },
    timeOptionLabel: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    timeOptionValue: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    confirmButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        height: 56,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.md,
        marginTop: 'auto',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    confirmButtonText: {
        ...typography.bodyBold,
        color: colors.surface,
        fontSize: 18,
    },
});
