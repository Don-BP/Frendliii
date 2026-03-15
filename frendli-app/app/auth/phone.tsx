import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';

const COUNTRY_CODES = [
    { code: '+81', country: 'Japan 🇯🇵' },
    { code: '+1', country: 'USA / Canada 🇺🇸' },
    { code: '+44', country: 'UK 🇬🇧' },
    { code: '+61', country: 'Australia 🇦🇺' },
    { code: '+82', country: 'South Korea 🇰🇷' },
    { code: '+86', country: 'China 🇨🇳' },
    { code: '+91', country: 'India 🇮🇳' },
    { code: '+49', country: 'Germany 🇩🇪' },
    { code: '+33', country: 'France 🇫🇷' },
    { code: '+55', country: 'Brazil 🇧🇷' },
    { code: '+52', country: 'Mexico 🇲🇽' },
    { code: '+62', country: 'Indonesia 🇮🇩' },
    { code: '+63', country: 'Philippines 🇵🇭' },
    { code: '+65', country: 'Singapore 🇸🇬' },
    { code: '+66', country: 'Thailand 🇹🇭' },
    { code: '+60', country: 'Malaysia 🇲🇾' },
    { code: '+84', country: 'Vietnam 🇻🇳' },
    { code: '+971', country: 'UAE 🇦🇪' },
    { code: '+966', country: 'Saudi Arabia 🇸🇦' },
    { code: '+234', country: 'Nigeria 🇳🇬' },
    { code: '+27', country: 'South Africa 🇿🇦' },
    { code: '+7', country: 'Russia 🇷🇺' },
    { code: '+34', country: 'Spain 🇪🇸' },
    { code: '+39', country: 'Italy 🇮🇹' },
    { code: '+31', country: 'Netherlands 🇳🇱' },
    { code: '+46', country: 'Sweden 🇸🇪' },
    { code: '+47', country: 'Norway 🇳🇴' },
    { code: '+45', country: 'Denmark 🇩🇰' },
    { code: '+358', country: 'Finland 🇫🇮' },
    { code: '+48', country: 'Poland 🇵🇱' },
];

export default function PhoneScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [countryCode, setCountryCode] = useState('+81');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    // OTP State
    const OTP_LENGTH = 6;
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const inputRefs = useRef<TextInput[]>([]);

    const handleSendCode = async () => {
        if (phone.length >= 7) {
            if (hasSupabaseConfig && supabase) {
                const { error } = await supabase.auth.signInWithOtp({
                    phone: `${countryCode}${phone}`,
                });
                if (error) {
                    Alert.alert('Error', error.message);
                    return;
                }
            }
            setStep('otp');
        }
    };

    const handleOtpChange = async (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto-advance
        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1].focus();
        }

        // Auto-submit
        if (index === OTP_LENGTH - 1 && text) {
            const finalOtp = newOtp.join('');
            if (hasSupabaseConfig && supabase) {
                const { data, error } = await supabase.auth.verifyOtp({
                    phone: `${countryCode}${phone}`,
                    token: finalOtp,
                    type: 'sms',
                });
                if (error) {
                    Alert.alert('Error', error.message);
                    setOtp(Array(OTP_LENGTH).fill(''));
                    inputRefs.current[0].focus();
                    return;
                }
                if (data.user) {
                    useAuthStore.getState().setAuth(data.user.id);
                }
            }
            router.push('/auth/interests');
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {step === 'phone' ? 'What\'s your number?' : 'Verify your number'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'phone'
                            ? 'We\'ll send a code to verify your account.'
                            : `Enter the 6-digit code we sent to ${countryCode}${phone}`}
                    </Text>
                </View>

                {step === 'phone' ? (
                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={styles.countryPicker}
                            onPress={() => setShowCountryPicker(true)}
                        >
                            <Text style={styles.countryCode}>{countryCode}</Text>
                            <Feather name="chevron-down" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="Phone number"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            autoFocus
                        />
                    </View>
                ) : (
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={el => { if (el) inputRefs.current[index] = el; }}
                                style={[styles.otpInput, digit !== '' && styles.otpInputActive]}
                                value={digit}
                                onChangeText={text => handleOtpChange(text.slice(-1), index)}
                                onKeyPress={e => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.button,
                        (step === 'phone' ? phone.length < 7 : otp.some(d => !d)) && styles.buttonDisabled
                    ]}
                    onPress={handleSendCode}
                    disabled={step === 'phone' ? phone.length < 7 : otp.some(d => !d)}
                >
                    <Text style={styles.buttonText}>
                        {step === 'phone' ? 'Continue' : 'Verify'}
                    </Text>
                </TouchableOpacity>

                {step === 'otp' && (
                    <TouchableOpacity
                        onPress={() => setStep('phone')}
                        style={styles.resendButton}
                    >
                        <Text style={styles.resendText}>Edit phone number</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Modal visible={showCountryPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={COUNTRY_CODES}
                            keyExtractor={item => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.countryItem}
                                    onPress={() => {
                                        setCountryCode(item.code);
                                        setShowCountryPicker(false);
                                    }}
                                >
                                    <Text style={styles.countryItemText}>{item.country}</Text>
                                    <Text style={styles.countryItemCode}>{item.code}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    content: {
        flex: 1,
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 100 : 60,
    } as ViewStyle,
    header: {
        marginBottom: spacing.xxl,
    } as ViewStyle,
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    } as TextStyle,
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 22,
    } as TextStyle,
    inputContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    } as ViewStyle,
    countryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
        ...shadow.subtle,
    } as ViewStyle,
    countryCode: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    } as TextStyle,
    phoneInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        ...shadow.subtle,
    } as TextStyle,
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
        gap: spacing.xs,
    } as ViewStyle,
    otpInput: {
        width: 48,
        height: 56,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        textAlign: 'center',
        ...typography.h3,
        color: colors.textPrimary,
        ...shadow.subtle,
    } as TextStyle,
    otpInputActive: {
        borderColor: colors.primary,
        borderWidth: 2,
    } as TextStyle,
    button: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.md,
    } as ViewStyle,
    buttonDisabled: {
        backgroundColor: colors.textTertiary,
        opacity: 0.6,
    } as ViewStyle,
    buttonText: {
        ...typography.bodyBold,
        color: '#fff',
        fontSize: 18,
    } as TextStyle,
    resendButton: {
        alignItems: 'center',
        marginTop: spacing.xl,
    } as ViewStyle,
    resendText: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '600',
    } as TextStyle,
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    } as ViewStyle,
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        height: '70%',
        padding: spacing.xl,
    } as ViewStyle,
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    } as ViewStyle,
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    } as TextStyle,
    countryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    } as ViewStyle,
    countryItemText: {
        ...typography.body,
        color: colors.textPrimary,
    } as TextStyle,
    countryItemCode: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    } as TextStyle,
});
