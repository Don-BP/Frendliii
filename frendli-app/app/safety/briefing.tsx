import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { useRouter } from 'expo-router';
import Animated, { 
    FadeInDown, 
    FadeOutLeft, 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring,
    SlideInRight,
    SlideOutLeft
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { profileApi, safetyApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

const STEPS = [
    {
        icon: 'shield-check',
        title: 'Safety is a Pillar',
        subtitle: 'Our commitment to you',
        description: 'RealConnect is built on trust. We use real-time location and silent alerts to keep you safe without being intrusive.',
        color: colors.primary,
        gradient: [colors.primary, colors.primary + 'CC']
    },
    {
        icon: 'map-marker-radius',
        title: 'SafeArrival™',
        subtitle: 'Hands-free monitoring',
        description: 'During meetups, we quietly verify your arrival. If you don\'t check in, your emergency contacts are notified automatically.',
        color: colors.secondary,
        gradient: [colors.secondary, colors.secondaryLight]
    },
    {
        icon: 'hand-back-right',
        title: 'Silent SOS',
        subtitle: 'Discreet help',
        description: 'Feel uneasy? Just hold the RealConnect logo for 2 seconds. We\'ll alert your safety team without alerting anyone else.',
        color: colors.error,
        gradient: [colors.error, colors.error + 'CC']
    },
    {
        icon: 'account-group',
        title: 'Partner Venues',
        subtitle: 'Trusted environments',
        description: 'Always meet in the partner venues suggested. They are vetted, public, and safe for and curated for the best experience.',
        color: colors.success,
        gradient: [colors.success, colors.success + 'CC']
    }
];

export default function SafetyBriefingScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const router = useRouter();
    const { setProfile } = useAuthStore();
    const progress = useSharedValue(0.33);

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            progress.value = withSpring((nextStep + 1) / STEPS.length);
        } else {
            setIsUpdating(true);
            try {
                await safetyApi.completeBriefing();
                setProfile({ safetyBriefingCompleted: true });
                router.back();
            } catch (error) {
                console.error('Error updating safety briefing status:', error);
                router.back();
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const step = STEPS[currentStep];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[colors.background, colors.cream]}
                style={StyleSheet.absoluteFill}
            />
            
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBackground}>
                                <Animated.View style={[styles.progressBarFill, progressStyle]} />
                            </View>
                            <Text style={styles.stepIndicator}>STEP {currentStep + 1} OF {STEPS.length}</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={() => router.back()}
                            disabled={isUpdating}
                        >
                            <Feather name="x" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        <Animated.View 
                            key={currentStep}
                            entering={SlideInRight.duration(400)}
                            exiting={SlideOutLeft.duration(400)}
                            style={styles.stepCard}
                        >
                            <LinearGradient
                                colors={step.gradient as [string, string]}
                                style={styles.iconCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <MaterialCommunityIcons name={step.icon as any} size={60} color="#fff" />
                            </LinearGradient>
                            
                            <View style={styles.textContainer}>
                                <Text style={[styles.subtitle, { color: step.color }]}>{step.subtitle}</Text>
                                <Text style={styles.title}>{step.title}</Text>
                                <Text style={styles.description}>{step.description}</Text>
                            </View>
                        </Animated.View>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.infoRow}>
                            <Feather name="info" size={14} color={colors.textTertiary} />
                            <Text style={styles.privacyNote}>All safety features are permanently free.</Text>
                        </View>

                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: step.color }]}
                            onPress={handleNext}
                            activeOpacity={0.8}
                            disabled={isUpdating}
                        >
                            <Text style={styles.buttonText}>
                                {currentStep === STEPS.length - 1 ? 'Finish Review' : 'Next Insight'}
                            </Text>
                            <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    progressContainer: {
        flex: 1,
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    stepIndicator: {
        fontSize: 10,
        fontFamily: 'Lexend_700Bold',
        color: colors.textTertiary,
        letterSpacing: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        padding: spacing.xxl,
        alignItems: 'center',
        ...shadow.lg,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
        ...shadow.md,
    },
    textContainer: {
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 12,
        fontFamily: 'Lexend_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    description: {
        fontSize: 17,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },
    footer: {
        gap: spacing.xl,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    privacyNote: {
        fontSize: 12,
        fontFamily: 'Lexend_400Regular',
        color: colors.textTertiary,
    },
    button: {
        height: 64,
        borderRadius: radius.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.premium,
    },
    buttonText: {
        fontSize: 18,
        fontFamily: 'Lexend_700Bold',
        color: '#fff',
    },
});


