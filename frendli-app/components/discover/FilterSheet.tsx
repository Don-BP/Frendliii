// frendli-app/components/discover/FilterSheet.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow, typography, radius } from '../../constants/tokens';

export interface Filters {
    maxDistanceKm: number | null;
    interests: string[];
    days: string[];
}

interface FilterSheetProps {
    visible: boolean;
    currentFilters: Filters;
    userInterests: string[];
    onApply: (filters: Filters) => void;
    onClose: () => void;
}

const DISTANCE_OPTIONS: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: '2km', value: 2 },
    { label: '5km', value: 5 },
    { label: '10km', value: 10 },
];

const DAYS: { label: string; value: string }[] = [
    { label: 'Mon', value: 'monday' },
    { label: 'Tue', value: 'tuesday' },
    { label: 'Wed', value: 'wednesday' },
    { label: 'Thu', value: 'thursday' },
    { label: 'Fri', value: 'friday' },
    { label: 'Sat', value: 'saturday' },
    { label: 'Sun', value: 'sunday' },
];

export const FilterSheet: React.FC<FilterSheetProps> = ({
    visible,
    currentFilters,
    userInterests,
    onApply,
    onClose,
}) => {
    const [localFilters, setLocalFilters] = useState<Filters>(currentFilters);

    useEffect(() => {
        if (visible) setLocalFilters(currentFilters);
    }, [visible, currentFilters]);

    const toggleInterest = (interest: string) => {
        setLocalFilters(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest],
        }));
    };

    const toggleDay = (dayValue: string) => {
        setLocalFilters(prev => ({
            ...prev,
            days: prev.days.includes(dayValue)
                ? prev.days.filter(d => d !== dayValue)
                : [...prev.days, dayValue],
        }));
    };

    const handleReset = () => {
        setLocalFilters({ maxDistanceKm: null, interests: [], days: [] });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                <View style={styles.handle} />

                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Filters</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Feather name="x" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Distance */}
                    <Text style={styles.groupLabel}>Distance</Text>
                    <View style={styles.segmentedControl}>
                        {DISTANCE_OPTIONS.map((opt) => {
                            const isActive = localFilters.maxDistanceKm === opt.value;
                            return (
                                <TouchableOpacity
                                    key={String(opt.value)}
                                    style={[styles.segment, isActive && styles.segmentActive]}
                                    onPress={() =>
                                        setLocalFilters(prev => ({ ...prev, maxDistanceKm: opt.value }))
                                    }
                                >
                                    <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Interests */}
                    {userInterests.length > 0 && (
                        <>
                            <Text style={styles.groupLabel}>Interests</Text>
                            <View style={styles.chipsContainer}>
                                {userInterests.map((interest) => {
                                    const isSelected = localFilters.interests.includes(interest);
                                    return (
                                        <TouchableOpacity
                                            key={interest}
                                            style={[styles.chip, isSelected && styles.chipActive]}
                                            onPress={() => toggleInterest(interest)}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                                {interest}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Availability */}
                    <Text style={styles.groupLabel}>Availability</Text>
                    <View style={styles.daysRow}>
                        {DAYS.map((day) => {
                            const isSelected = localFilters.days.includes(day.value);
                            return (
                                <TouchableOpacity
                                    key={day.value}
                                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                                    onPress={() => toggleDay(day.value)}
                                >
                                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                                        {day.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyButton} onPress={() => onApply(localFilters)}>
                        <Text style={styles.applyText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray[300],
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sheetTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    scrollArea: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    groupLabel: {
        ...typography.bodyBold,
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.gray[100],
        borderRadius: radius.lg,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: radius.md,
    },
    segmentActive: {
        backgroundColor: colors.surface,
        ...shadow.sm,
    },
    segmentText: {
        ...typography.bodyMedium,
        fontSize: 14,
        color: colors.textSecondary,
    },
    segmentTextActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.full,
        backgroundColor: colors.gray[100],
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: {
        backgroundColor: colors.warmFlame,
        borderColor: colors.primary,
    },
    chipText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    chipTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    daysRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    dayChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: colors.gray[100],
        borderWidth: 1,
        borderColor: colors.border,
    },
    dayChipActive: {
        backgroundColor: colors.secondary,
        borderColor: colors.secondary,
    },
    dayText: {
        ...typography.small,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    dayTextActive: {
        color: colors.surface,
    },
    footer: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    resetButton: {
        flex: 1,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    resetText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    },
    applyButton: {
        flex: 2,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    applyText: {
        ...typography.bodyBold,
        color: colors.surface,
    },
});
