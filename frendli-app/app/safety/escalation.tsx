import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const STAGES = [
    {
        level: 1,
        title: 'Check-in Reminder',
        subtitle: 'Are you at the venue?',
        description: 'We noticed you haven\'t checked in yet. Please confirm your arrival.',
        action: 'I\'m Here',
        color: colors.primary,
        icon: 'map-marker-check',
    },
    {
        level: 2,
        title: 'Safety Ping',
        subtitle: 'Is everything okay?',
        description: 'You missed your check-in window. We\'re sending a notification to your phone.',
        action: 'I\'m Safe',
        color: colors.warning,
        icon: 'bell-ring',
    },
    {
        level: 3,
        title: 'Emergency Contact Alert',
        subtitle: 'Notifying your circle',
        description: 'Since we haven\'t heard from you, we\'re alerting your emergency contacts of your last location.',
        action: 'Cancel Alert',
        color: colors.error,
        icon: 'account-alert',
    },
    {
        level: 4,
        title: 'Critical Response',
        subtitle: 'Emergency services standby',
        description: 'Final stage escalation. Our safety team is monitoring your live location.',
        action: 'Safe Now',
        color: '#000',
        icon: 'shield-alert',
    }
];

export default function SafeArrivalEscalationScreen() {
    const { stage: initialStage } = useLocalSearchParams<{ stage: string }>();
    const [currentStageIndex, setCurrentStageIndex] = useState(initialStage ? parseInt(initialStage) - 1 : 0);
    const router = useRouter();

    const stage = STAGES[currentStageIndex];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: stage.color }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="chevron-left" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SafeArrival Escalation</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Animated.View 
                    key={currentStageIndex}
                    entering={FadeIn.duration(400)}
                    style={styles.card}
                >
                    <View style={[styles.iconBadge, { backgroundColor: stage.color + '20' }]}>
                        <MaterialCommunityIcons name={stage.icon as any} size={48} color={stage.color} />
                    </View>
                    
                    <Text style={[styles.stageBadge, { color: stage.color }]}>STAGE {stage.level}</Text>
                    <Text style={styles.title}>{stage.title}</Text>
                    <Text style={styles.subtitle}>{stage.subtitle}</Text>
                    <Text style={styles.description}>{stage.description}</Text>

                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: stage.color }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.actionButtonText}>{stage.action}</Text>
                    </TouchableOpacity>

                    {currentStageIndex < STAGES.length - 1 && (
                        <TouchableOpacity 
                            style={styles.nextButton}
                            onPress={() => setCurrentStageIndex(currentStageIndex + 1)}
                        >
                            <Text style={styles.nextButtonText}>Simulate Next Stage</Text>
                            <Feather name="arrow-right" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Stage {stage.level} of 4 • {stage.level < 3 ? 'Monitoring' : 'Active Escalation'}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Lexend_600SemiBold',
        color: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: radius.xxl,
        padding: spacing.xxl,
        alignItems: 'center',
        ...shadow.lg,
    },
    iconBadge: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    stageBadge: {
        fontSize: 12,
        fontFamily: 'Lexend_700Bold',
        marginBottom: spacing.xs,
        letterSpacing: 2,
    },
    title: {
        fontSize: 24,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Lexend_400Regular',
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    actionButton: {
        width: '100%',
        height: 60,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.md,
    },
    actionButtonText: {
        fontSize: 18,
        fontFamily: 'Lexend_600SemiBold',
        color: '#fff',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
        gap: spacing.xs,
    },
    nextButtonText: {
        fontSize: 14,
        fontFamily: 'Lexend_500Medium',
        color: colors.textTertiary,
    },
    footer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        fontFamily: 'Lexend_500Medium',
        color: '#fff',
        opacity: 0.8,
    },
});
