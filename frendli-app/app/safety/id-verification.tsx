import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { profileApi } from '../../lib/api';

const { width } = Dimensions.get('window');

type Step = 'intro' | 'scanning' | 'verifying' | 'success';

export default function IDVerificationScreen() {
    const [step, setStep] = useState<Step>('intro');
    const router = useRouter();

    const startScanning = () => {
        setStep('scanning');
        // Simulate scanning delay
        setTimeout(() => {
            setStep('verifying');
            // Simulate verification delay
            setTimeout(() => {
                handleSuccess();
            }, 3000);
        }, 3000);
    };

    const handleSuccess = async () => {
        setStep('success');
        try {
            // In a real app, this would be handled by a verification service
            // For now, we update the profile with a 'verified' badge
            await profileApi.update({
                safetyBadges: ['id-verified', 'verified']
            });
        } catch (error) {
            console.error('Error updating verification status:', error);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.cream]}
                style={StyleSheet.absoluteFill}
            />
            
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="x" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Identity Verification</Text>
                    <View style={{ width: 40 }} />
                </View>

                {step === 'intro' && (
                    <Animated.View entering={FadeIn} style={styles.content}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="card-account-details-outline" size={80} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>Secure Your Spot</Text>
                        <Text style={styles.description}>
                            Verifying your ID helps us build a community of real, trustworthy people. 
                            Your document is processed securely and never shared with other users.
                        </Text>
                        
                        <View style={styles.benefitList}>
                            <View style={styles.benefitItem}>
                                <Feather name="check-circle" size={18} color={colors.success} />
                                <Text style={styles.benefitText}>Verified badges on your profile</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <Feather name="check-circle" size={18} color={colors.success} />
                                <Text style={styles.benefitText}>Higher trust for mutual matches</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <Feather name="check-circle" size={18} color={colors.success} />
                                <Text style={styles.benefitText}>Access to premium partner venues</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.primaryBtn} onPress={startScanning}>
                            <Text style={styles.primaryBtnText}>Start Verification</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.privacyNote}>
                            Securely processed by RealConnect Trust Team.
                        </Text>
                    </Animated.View>
                )}

                {step === 'scanning' && (
                    <View style={styles.scannerContainer}>
                        <View style={styles.scannerFrame}>
                            <View style={styles.scannerAperture} />
                            <Animated.View 
                                entering={FadeIn} 
                                style={[styles.scannerLine, { top: '50%' }]} 
                            />
                        </View>
                        <Text style={styles.scanningText}>Align your ID within the frame...</Text>
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                    </View>
                )}

                {step === 'verifying' && (
                    <View style={styles.content}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.title}>Verifying...</Text>
                        <Text style={styles.description}>
                            Our AI is cross-referencing your document with our security standards. 
                            This usually takes about a minute.
                        </Text>
                    </View>
                )}

                {step === 'success' && (
                    <Animated.View entering={SlideInUp} style={styles.content}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.success + '10' }]}>
                            <MaterialCommunityIcons name="check-decagram" size={80} color={colors.success} />
                        </View>
                        <Text style={styles.title}>You're Verified!</Text>
                        <Text style={styles.description}>
                            Congratulations! Your identity has been successfully verified. 
                            The verification badge is now visible on your profile.
                        </Text>
                        
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
                            <Text style={styles.primaryBtnText}>Back to Profile</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        ...typography.h3,
        fontSize: 18,
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
        padding: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    title: {
        fontSize: 32,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    description: {
        fontSize: 18,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: spacing.xxl,
    },
    benefitList: {
        width: '100%',
        gap: 16,
        marginBottom: spacing.xxl,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.lg,
        ...shadow.subtle,
    },
    benefitText: {
        ...typography.bodyMedium,
        fontSize: 15,
        color: colors.textPrimary,
    },
    primaryBtn: {
        width: '100%',
        height: 64,
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.premium,
        marginBottom: spacing.xl,
    },
    primaryBtnText: {
        ...typography.bodyBold,
        color: '#fff',
        fontSize: 18,
    },
    privacyNote: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    scannerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    scannerFrame: {
        width: width - 80,
        height: (width - 80) * 0.63, // ID card aspect ratio
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.1)',
        position: 'relative',
    },
    scannerAperture: {
        ...StyleSheet.absoluteFillObject,
    },
    scannerLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    scanningText: {
        ...typography.bodyBold,
        marginTop: spacing.xl,
        color: colors.textPrimary,
    }
});
