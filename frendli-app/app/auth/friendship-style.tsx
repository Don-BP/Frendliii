import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';

const OPTIONS = [
    {
        id: 'one-on-one',
        title: 'One-on-One',
        description: 'I prefer deep conversations and meeting people individually.',
        icon: 'account' as const,
    },
    {
        id: 'small-group',
        title: 'Small Groups',
        description: 'I love the dynamic of a few people hanging out together.',
        icon: 'account-group' as const,
    },
    {
        id: 'open',
        title: 'Open to Anything',
        description: 'I am happy to meet one-on-one or join a group activity.',
        icon: 'all-inclusive' as const,
    },
];

export default function FriendshipStyleScreen() {
    const router = useRouter();
    const { setProfile, profile } = useAuthStore();
    const [selected, setSelected] = useState(profile?.friendshipStyle || '');

    const handleNext = () => {
        if (!selected) return;
        setProfile({ friendshipStyle: selected });
        router.push('/auth/availability');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '80%' }]} />
                    </View>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Your Vibe</Text>
                <Text style={styles.subtitle}>How do you prefer to hang out with new friends?</Text>

                <View style={styles.optionsContainer}>
                    {OPTIONS.map((option) => {
                        const isSelected = selected === option.id;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => setSelected(option.id)}
                                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                            >
                                <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                                    <MaterialCommunityIcons
                                        name={option.icon}
                                        size={28}
                                        color={isSelected ? '#fff' : colors.textSecondary}
                                    />
                                </View>
                                <View style={styles.optionInfo}>
                                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                                        {option.title}
                                    </Text>
                                    <Text style={styles.optionDescription}>{option.description}</Text>
                                </View>
                                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, !selected && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={!selected}
                >
                    <Text style={styles.nextButtonText}>Continue</Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
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
        paddingTop: spacing.md,
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
        padding: spacing.xl,
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
    optionsContainer: {
        gap: spacing.md,
    } as ViewStyle,
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        padding: spacing.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        ...shadow.subtle,
    } as ViewStyle,
    optionCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.surface,
        ...shadow.md,
    } as ViewStyle,
    iconContainer: {
        width: 56,
        height: 56,
        backgroundColor: colors.cream,
        borderRadius: radius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
    } as ViewStyle,
    iconContainerSelected: {
        backgroundColor: colors.primary,
    } as ViewStyle,
    optionInfo: {
        flex: 1,
        marginRight: spacing.sm,
    } as ViewStyle,
    optionTitle: {
        ...typography.bodyBold,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 4,
    } as TextStyle,
    optionTitleSelected: {
        color: colors.primary,
    } as TextStyle,
    optionDescription: {
        ...typography.small,
        color: colors.textSecondary,
        lineHeight: 18,
    } as TextStyle,
    radio: {
        width: 24,
        height: 24,
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    radioSelected: {
        borderColor: colors.primary,
    } as ViewStyle,
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    } as ViewStyle,
    footer: {
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    } as ViewStyle,
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
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
