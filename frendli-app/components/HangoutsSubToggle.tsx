import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../constants/tokens';

interface HangoutsSubToggleProps {
    value: 'upcoming' | 'past';
    onChange: (value: 'upcoming' | 'past') => void;
}

export function HangoutsSubToggle({ value, onChange }: HangoutsSubToggleProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.pill, value === 'upcoming' && styles.pillActive]}
                onPress={() => onChange('upcoming')}
            >
                <Text style={[styles.pillText, value === 'upcoming' && styles.pillTextActive]}>
                    Upcoming
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.pill, value === 'past' && styles.pillActive]}
                onPress={() => onChange('past')}
            >
                <Text style={[styles.pillText, value === 'past' && styles.pillTextActive]}>
                    Past
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F0EDE8',
        borderRadius: radius.full,
        padding: 3,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    } as ViewStyle,
    pill: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 7,
        borderRadius: radius.full,
    } as ViewStyle,
    pillActive: {
        backgroundColor: '#FFFFFF',
    } as ViewStyle,
    pillText: {
        ...typography.small,
        fontWeight: '600',
        color: colors.textSecondary,
        fontSize: 13,
    } as TextStyle,
    pillTextActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    } as TextStyle,
});
