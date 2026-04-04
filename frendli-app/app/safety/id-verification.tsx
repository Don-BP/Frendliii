// frendli-app/app/safety/id-verification.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { colors, spacing, radius } from '../../constants/tokens';
import { useAuthStore } from '../../store/authStore';
import { verificationApi, profileApi } from '../../lib/api';

type ScreenState = 'intro' | 'loading' | 'success' | 'error' | 'already_verified';

export default function IdVerificationScreen() {
    const router = useRouter();
    const { profile, setProfile } = useAuthStore();
    const { initPaymentSheet, presentPaymentSheet, handleNextAction } = useStripe();
    const [state, setState] = useState<ScreenState>('intro');
    const [errorMessage, setErrorMessage] = useState('');

    const isVerified = profile?.safetyBadges?.includes('ID Verified') ?? false;
    const isPremium =
        (profile as any)?.subscriptionTier === 'plus' ||
        (profile as any)?.subscriptionTier === 'pro';

    useEffect(() => {
        if (isVerified) setState('already_verified');
    }, [isVerified]);

    const handleVerify = async () => {
        setState('loading');
        try {
            const result = await verificationApi.initiate();

            // Step 1: Payment (free users only)
            if (result.paymentClientSecret) {
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: result.paymentClientSecret,
                    merchantDisplayName: 'Frendli',
                });
                if (initError) throw new Error(initError.message);

                const { error: paymentError } = await presentPaymentSheet();
                if (paymentError) {
                    if (paymentError.code === 'Canceled') {
                        setState('intro');
                        return;
                    }
                    throw new Error(paymentError.message);
                }
            }

            // Step 2: Identity verification — drive the verification session via handleNextAction
            const { error: identityError } = await handleNextAction(result.identityClientSecret);
            if (identityError) {
                if ((identityError as any).code === 'Canceled') {
                    setState('intro');
                    return;
                }
                throw new Error(identityError.message);
            }

            // Refresh profile to pick up badge if webhook already fired
            const updatedProfile = await profileApi.get();
            if (updatedProfile) setProfile(updatedProfile);

            setState('success');
        } catch (err: any) {
            console.error('Verification error:', err);
            setErrorMessage(err?.message || 'Something went wrong. Please try again.');
            setState('error');
        }
    };

    if (state === 'already_verified') {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Feather name="x" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.centeredContent}>
                    <MaterialCommunityIcons name="check-decagram" size={72} color="#4ADE80" />
                    <Text style={styles.title}>You're Verified</Text>
                    <Text style={styles.subtitle}>
                        Your identity has been confirmed. Your verified badge is visible on your profile and in Discover.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (state === 'success') {
        return (
            <View style={styles.container}>
                <View style={styles.centeredContent}>
                    <MaterialCommunityIcons name="check-decagram" size={72} color="#4ADE80" />
                    <Text style={styles.title}>Verification Submitted</Text>
                    <Text style={styles.subtitle}>
                        Your ID is being reviewed. Your verified badge will appear shortly — usually within a few minutes.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (state === 'error') {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Feather name="x" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.centeredContent}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={72} color="#F87171" />
                    <Text style={styles.title}>Verification Failed</Text>
                    <Text style={styles.subtitle}>{errorMessage}</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => setState('intro')}>
                        <Text style={styles.primaryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostButton} onPress={() => router.back()}>
                        <Text style={styles.ghostButtonText}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (state === 'loading') {
        return (
            <View style={styles.container}>
                <View style={styles.centeredContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Setting up verification…</Text>
                </View>
            </View>
        );
    }

    // Intro state
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="shield-account" size={64} color={colors.primary} />
            </View>

            <Text style={styles.title}>Get Verified</Text>
            <Text style={styles.subtitle}>
                Confirm your identity with a government-issued ID and a quick selfie. It takes about 2 minutes.
            </Text>

            <View style={styles.benefitsList}>
                <View style={styles.benefitRow}>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#4ADE80" />
                    <Text style={styles.benefitText}>Verified badge on your profile</Text>
                </View>
                <View style={styles.benefitRow}>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#4ADE80" />
                    <Text style={styles.benefitText}>Visible on your Discover card</Text>
                </View>
                <View style={styles.benefitRow}>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#4ADE80" />
                    <Text style={styles.benefitText}>Build trust before meeting IRL</Text>
                </View>
            </View>

            <View style={styles.privacyNote}>
                <Feather name="lock" size={14} color={colors.textSecondary} />
                <Text style={styles.privacyText}>
                    We only record that you passed — your ID is never stored by Frendli.
                </Text>
            </View>

            <View style={styles.costRow}>
                {isPremium ? (
                    <Text style={styles.costText}>
                        <Text style={styles.costFree}>Free </Text>
                        — included with your membership
                    </Text>
                ) : (
                    <Text style={styles.costText}>
                        <Text style={styles.costAmount}>$1.99 </Text>
                        one-time · no subscription required
                    </Text>
                )}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleVerify}>
                <Text style={styles.primaryButtonText}>Get Verified</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostButton} onPress={() => router.back()}>
                <Text style={styles.ghostButtonText}>Maybe Later</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.xl,
    },
    centeredContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        gap: spacing.md,
    },
    closeButton: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        zIndex: 10,
        padding: spacing.xs,
    },
    heroIcon: {
        alignItems: 'center',
        marginBottom: spacing.md,
        marginTop: spacing.xl,
    },
    title: {
        fontFamily: 'BricolageGrotesque_700Bold',
        fontSize: 28,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.md,
    },
    benefitsList: {
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    benefitText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 14,
        color: colors.textPrimary,
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    privacyText: {
        flex: 1,
        fontFamily: 'Lexend_400Regular',
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    costRow: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    costText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 14,
        color: colors.textSecondary,
    },
    costFree: {
        fontFamily: 'Lexend_600SemiBold',
        color: '#4ADE80',
    },
    costAmount: {
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textPrimary,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    primaryButtonText: {
        fontFamily: 'Lexend_600SemiBold',
        fontSize: 16,
        color: '#fff',
    },
    ghostButton: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    ghostButtonText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 15,
        color: colors.textSecondary,
    },
    loadingText: {
        fontFamily: 'Lexend_400Regular',
        fontSize: 15,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
});
