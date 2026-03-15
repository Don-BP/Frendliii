import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

export default function AvailabilityScreen() {
    const router = useRouter();
    const { setProfile, profile } = useAuthStore();

    const [selectedDays, setSelectedDays] = useState<string[]>(profile?.availability?.days || []);
    const [selectedTimes, setSelectedTimes] = useState<string[]>(profile?.availability?.times || []);
    const [loading, setLoading] = useState(false);

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const toggleTime = (time: string) => {
        setSelectedTimes(prev =>
            prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
        );
    };

    const handleFinish = async () => {
        if (selectedDays.length === 0 || selectedTimes.length === 0) {
            Alert.alert('Selection Required', 'Please select at least one day and one time preference.');
            return;
        }

        setLoading(true);
        try {
            // Update local state
            setProfile({ availability: { days: selectedDays, times: selectedTimes } });

            router.push('/auth/photos' as any);
        } catch (error) {
            console.error('Failed to save profile:', error);
            Alert.alert('Error', 'Failed to save your profile. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressFill, { width: '100%' }]} />
                </View>

                <View style={styles.header}>
                    <Text style={styles.stepTitle}>
                        Step 5 of 5
                    </Text>
                    <Text style={styles.mainTitle}>
                        Availability
                    </Text>
                    <Text style={styles.subtitle}>
                        When are you usually free to hang out?
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Days of the Week
                    </Text>
                    <View style={styles.chipGrid}>
                        {DAYS.map(day => (
                            <TouchableOpacity
                                key={day}
                                onPress={() => toggleDay(day)}
                                style={[
                                    styles.chip,
                                    selectedDays.includes(day) && styles.chipSelected
                                ]}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedDays.includes(day) && styles.chipTextSelected
                                ]}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Time of Day
                    </Text>
                    <View style={styles.chipGrid}>
                        {TIMES.map(time => (
                            <TouchableOpacity
                                key={time}
                                onPress={() => toggleTime(time)}
                                style={[
                                    styles.chip,
                                    styles.timeChip,
                                    selectedTimes.includes(time) && styles.chipSelected
                                ]}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedTimes.includes(time) && styles.chipTextSelected
                                ]}>
                                    {time}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        "Your availability helps us suggest group meetups that actually work for everyone."
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handleFinish}
                    disabled={loading || selectedDays.length === 0 || selectedTimes.length === 0}
                    style={[
                        styles.finishButton,
                        (selectedDays.length === 0 || selectedTimes.length === 0) && styles.buttonDisabled
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.surface} />
                    ) : (
                        <>
                            <Text style={styles.finishButtonText}>Complete Profile</Text>
                            <Ionicons name="sparkles" size={20} color={colors.surface} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    scrollContent: {
        padding: spacing.xl,
    } as ViewStyle,
    progressContainer: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: radius.full,
        marginBottom: spacing.xxl,
        overflow: 'hidden',
    } as ViewStyle,
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: radius.full,
    } as ViewStyle,
    header: {
        marginBottom: spacing.xxl,
    } as ViewStyle,
    stepTitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    } as TextStyle,
    mainTitle: {
        ...typography.h1,
        color: colors.primary,
        marginBottom: spacing.sm,
    } as TextStyle,
    subtitle: {
        ...typography.body,
        fontSize: 18,
        color: colors.textSecondary,
    } as TextStyle,
    section: {
        marginBottom: spacing.xxl,
    } as ViewStyle,
    sectionTitle: {
        ...typography.h3,
        color: colors.secondary,
        marginBottom: spacing.md,
    } as TextStyle,
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    } as ViewStyle,
    chip: {
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 85,
        alignItems: 'center',
        ...shadow.sm,
    } as ViewStyle,
    timeChip: {
        minWidth: 110,
    } as ViewStyle,
    chipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    } as ViewStyle,
    chipText: {
        ...typography.bodyBold,
        fontSize: 14,
        color: colors.textPrimary,
    } as TextStyle,
    chipTextSelected: {
        color: colors.surface,
    } as TextStyle,
    infoCard: {
        backgroundColor: colors.cream,
        padding: spacing.lg,
        borderRadius: radius.xl,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
    infoText: {
        ...typography.body,
        fontStyle: 'italic',
        color: colors.textSecondary,
        textAlign: 'center',
        fontSize: 14,
    } as TextStyle,
    footer: {
        padding: spacing.xl,
        paddingBottom: spacing.xxxl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    } as ViewStyle,
    finishButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        height: 60,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        ...shadow.premium,
    } as ViewStyle,
    buttonDisabled: {
        backgroundColor: colors.textTertiary,
        opacity: 0.5,
    } as ViewStyle,
    finishButtonText: {
        color: colors.surface,
        fontSize: 18,
        fontFamily: typography.h3.fontFamily,
        fontWeight: '700',
        marginRight: spacing.xs,
    } as TextStyle,
});

