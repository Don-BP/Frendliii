import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';

export default function ProfileBasicsScreen() {
    const router = useRouter();
    const { setProfile, profile } = useAuthStore();

    const [firstName, setFirstName] = useState(profile?.firstName || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [dob, setDob] = useState(profile?.dob || '');
    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        if (!firstName.trim()) return;

        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let latitude = null;
            let longitude = null;

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
            }

            setProfile({
                firstName: firstName.trim(),
                bio: bio.trim() || null,
                dob: dob || null,
                latitude,
                longitude,
            });

            router.push('/auth/friendship-style' as any);
        } catch (error) {
            console.error('Error getting location:', error);
            setProfile({
                firstName: firstName.trim(),
                bio: bio.trim() || null,
                dob: dob || null,
            });
            router.push('/auth/friendship-style' as any);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '60%' }]} />
                        </View>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.title}>The Basics</Text>
                    <Text style={styles.subtitle}>Let others know who you are. These will be visible on your profile.</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={[styles.input, firstName.length > 0 && styles.inputActive]}
                            placeholder="Required"
                            placeholderTextColor={colors.textTertiary}
                            value={firstName}
                            onChangeText={setFirstName}
                            autoFocus
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, bio.length > 0 && styles.inputActive]}
                            placeholder="Tell us a bit about yourself..."
                            placeholderTextColor={colors.textTertiary}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{bio.length}/150</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Birthday (YYYY-MM-DD)</Text>
                        <TextInput
                            style={[styles.input, dob.length > 0 && styles.inputActive]}
                            placeholder="e.g. 1995-05-15"
                            placeholderTextColor={colors.textTertiary}
                            value={dob}
                            onChangeText={setDob}
                            keyboardType="default"
                        />
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.nextButton, (!firstName.trim() || loading) && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={!firstName.trim() || loading}
                    >
                        <Text style={styles.nextButtonText}>
                            {loading ? 'Processing...' : 'Next'}
                        </Text>
                        {!loading && <Feather name="arrow-right" size={20} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    keyboardView: {
        flex: 1,
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
    inputGroup: {
        marginBottom: spacing.xl,
    } as ViewStyle,
    label: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    } as TextStyle,
    input: {
        ...typography.body,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    } as TextStyle,
    inputActive: {
        borderColor: colors.primary,
        backgroundColor: colors.surface,
    } as TextStyle,
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    } as TextStyle,
    charCount: {
        ...typography.small,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: spacing.xs,
    } as TextStyle,
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
