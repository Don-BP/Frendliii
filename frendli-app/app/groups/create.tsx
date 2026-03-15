import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { supabase } from '../../lib/supabase';

export default function CreateGroupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        setLoading(true);
        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    privacy: isPrivate ? 'private' : 'public'
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create group');
            }

            const group = await response.json();
            Alert.alert('Success', 'Community created successfully!');
            router.replace(`/groups/${group.id}` as any);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{
                title: 'Start a Community',
                headerTitleStyle: {
                    fontFamily: 'BricolageGrotesque_700Bold',
                    fontSize: 20,
                    color: colors.primary
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.primary,
            }} />

            <View style={styles.content}>
                <View style={styles.imagePlaceholder}>
                    <Feather name="image" size={40} color={colors.textTertiary} />
                    <Text style={styles.imageText}>Add cover photo (Coming soon)</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Community Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Kyoto Foodies"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="What's this community about?"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                <View style={styles.privacyCard}>
                    <View style={styles.privacyInfo}>
                        <View style={styles.privacyIconContainer}>
                            <Feather name={isPrivate ? 'lock' : 'globe'} size={20} color={colors.primary} />
                        </View>
                        <View style={styles.privacyTextContainer}>
                            <Text style={styles.privacyTitle}>{isPrivate ? 'Private Community' : 'Public Community'}</Text>
                            <Text style={styles.privacySubtitle}>
                                {isPrivate
                                    ? 'Only members can see who is in the group and what they post.'
                                    : 'Anyone can see members and discover the group.'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={isPrivate}
                        onValueChange={setIsPrivate}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.createButton, (!name.trim() || loading) && styles.disabledButton]}
                    onPress={handleCreate}
                    disabled={loading || !name.trim()}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Community</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    scrollContent: {
        paddingBottom: spacing.xxxl,
    } as ViewStyle,
    content: {
        padding: spacing.lg,
    } as ViewStyle,
    imagePlaceholder: {
        width: '100%',
        height: 180,
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
        ...shadow.subtle,
    } as ViewStyle,
    imageText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    } as TextStyle,
    inputGroup: {
        marginBottom: spacing.lg,
    } as ViewStyle,
    label: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    } as TextStyle,
    input: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.subtle,
    } as TextStyle,
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    } as TextStyle,
    privacyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xl,
        ...shadow.subtle,
    } as ViewStyle,
    privacyInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    } as ViewStyle,
    privacyIconContainer: {
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    } as ViewStyle,
    privacyTextContainer: {
        flex: 1,
        paddingRight: spacing.sm,
    } as ViewStyle,
    privacyTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    } as TextStyle,
    privacySubtitle: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    } as TextStyle,
    createButton: {
        backgroundColor: colors.primary,
        height: 60,
        borderRadius: radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
        ...shadow.premium,
    } as ViewStyle,
    disabledButton: {
        opacity: 0.6,
        backgroundColor: colors.textTertiary,
    } as ViewStyle,
    createButtonText: {
        ...typography.h3,
        color: colors.surface,
    } as TextStyle,
});
