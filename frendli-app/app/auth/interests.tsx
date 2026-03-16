import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { useAuthStore } from '../../store/authStore';

const CATEGORIES = [
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
            { id: 'design', label: 'Design', emoji: '🎨' },
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

export default function InterestsScreen() {
    const router = useRouter();
    const { profile, setProfile } = useAuthStore();
    const [selected, setSelected] = useState<string[]>(profile?.interests || []);
    const [interestWeights, setInterestWeights] = useState<Record<string, number>>({});

    const toggleInterest = (id: string) => {
        if (selected.includes(id)) {
            setSelected(prev => prev.filter(i => i !== id));
            setInterestWeights(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } else {
            setSelected(prev => [...prev, id]);
            setInterestWeights(prev => ({ ...prev, [id]: 5 }));
        }
    };

    const handleNext = () => {
        if (selected.length < 3) return;
        setProfile({ interests: selected, interestWeights });
        router.push('/auth/profile-basics' as any);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '40%' }]} />
                    </View>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPadding}>
                <Text style={styles.title}>What are you into?</Text>
                <Text style={styles.subtitle}>Pick at least 3 things you enjoy. This helps us find your people.</Text>

                {CATEGORIES.map((category) => (
                    <View key={category.label} style={styles.categorySection}>
                        <Text style={styles.categoryTitle}>{category.emoji} {category.label}</Text>
                        <View style={styles.pillContainer}>
                            {category.interests.map((interest) => {
                                const isSelected = selected.includes(interest.id);
                                return (
                                    <View key={interest.id} style={styles.pillWrapper}>
                                        <TouchableOpacity
                                            style={[styles.pill, isSelected && styles.pillSelected]}
                                            onPress={() => toggleInterest(interest.id)}
                                        >
                                            <Text style={styles.pillEmoji}>{interest.emoji}</Text>
                                            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                                                {interest.label}
                                            </Text>
                                        </TouchableOpacity>
                                        {isSelected && (
                                            <View style={styles.sliderContainer}>
                                                <Text style={styles.sliderLabel}>Casual</Text>
                                                <Slider
                                                    style={styles.slider}
                                                    minimumValue={1}
                                                    maximumValue={10}
                                                    step={1}
                                                    value={interestWeights[interest.id] ?? 5}
                                                    onValueChange={(val) =>
                                                        setInterestWeights(prev => ({ ...prev, [interest.id]: val }))
                                                    }
                                                    minimumTrackTintColor={colors.primary}
                                                    maximumTrackTintColor={colors.border}
                                                />
                                                <Text style={styles.sliderLabel}>Obsessed</Text>
                                                <Text style={styles.sliderValue}>{interestWeights[interest.id] ?? 5}/10</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.countText}>{selected.length} selected (min 3)</Text>
                <TouchableOpacity
                    style={[styles.nextButton, selected.length < 3 && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={selected.length < 3}
                >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    } as ViewStyle,
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    } as ViewStyle,
    progressContainer: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    } as ViewStyle,
    progressBar: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: radius.full,
        overflow: 'hidden',
    } as ViewStyle,
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    } as ViewStyle,
    scrollContent: {
        flex: 1,
    } as ViewStyle,
    scrollPadding: {
        padding: spacing.xl,
        paddingBottom: 100,
    } as ViewStyle,
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    } as TextStyle,
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xxl,
    } as TextStyle,
    categorySection: {
        marginBottom: spacing.xl,
    } as ViewStyle,
    categoryTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    } as TextStyle,
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    } as ViewStyle,
    pillWrapper: {
        flexDirection: 'column',
    } as ViewStyle,
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.full,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        ...shadow.subtle,
    } as ViewStyle,
    pillSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    } as ViewStyle,
    pillEmoji: {
        fontSize: 16,
        marginRight: spacing.xs,
    } as TextStyle,
    pillText: {
        ...typography.body,
        color: colors.textPrimary,
    } as TextStyle,
    pillTextSelected: {
        color: '#fff',
        fontWeight: '600',
    } as TextStyle,
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs ?? 4,
        paddingHorizontal: spacing.sm ?? 8,
        paddingBottom: spacing.sm ?? 8,
    } as ViewStyle,
    slider: { flex: 1 },
    sliderLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    } as TextStyle,
    sliderValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        width: 32,
        textAlign: 'right',
    } as TextStyle,
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    } as ViewStyle,
    countText: {
        ...typography.small,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    } as TextStyle,
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        width: '100%',
        height: 56,
        borderRadius: radius.full,
        gap: spacing.sm,
        ...shadow.md,
    } as ViewStyle,
    nextButtonDisabled: {
        backgroundColor: colors.textTertiary,
        opacity: 0.6,
    } as ViewStyle,
    nextButtonText: {
        ...typography.bodyBold,
        color: '#fff',
        fontSize: 18,
    } as TextStyle,
});
