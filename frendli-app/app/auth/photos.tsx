import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Dimensions, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { profileApi } from '../../lib/api';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - spacing.xl * 2 - spacing.md * 2) / 3;

export default function PhotosScreen() {
    const router = useRouter();
    const { setProfile, profile, userId, setOnboarded } = useAuthStore();

    const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
    const [stylePhoto, setStylePhoto] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async (index: number | 'style') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            if (index === 'style') {
                setStylePhoto(uri);
            } else {
                const newPhotos = [...photos];
                if (typeof index === 'number' && index < photos.length) {
                    newPhotos[index] = uri;
                } else {
                    newPhotos.push(uri);
                }
                setPhotos(newPhotos);
            }
        }
    };

    const removePhoto = (index: number | 'style') => {
        if (index === 'style') {
            setStylePhoto(null);
        } else {
            setPhotos(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleFinish = async () => {
        if (photos.length === 0) {
            Alert.alert('Photo Required', 'Please upload at least one profile photo.');
            return;
        }

        setUploading(true);
        try {
            if (!userId) throw new Error('User ID not found');

            // 1. Upload photos to Supabase
            const uploadedUrls = await Promise.all(
                photos.map(uri =>
                    uri.startsWith('http') ? uri : profileApi.uploadImage(userId, uri)
                )
            );

            let uploadedStyleUrl = null;
            if (stylePhoto) {
                uploadedStyleUrl = stylePhoto.startsWith('http')
                    ? stylePhoto
                    : await profileApi.uploadImage(userId, stylePhoto);
            }

            // 2. Update backend profile
            const finalProfile = {
                ...profile,
                photos: uploadedUrls,
                stylePhotoUrl: uploadedStyleUrl
            };

            await profileApi.create(finalProfile);

            // 3. Update local state
            setProfile({
                photos: uploadedUrls,
            });
            setOnboarded(true);
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Failed to save photos:', error);
            Alert.alert('Upload Error', 'Failed to upload photos. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressFill, { width: '100%' }]} />
                </View>

                <View style={styles.header}>
                    <Text style={styles.stepTitle}>
                        Step 6 of 6
                    </Text>
                    <Text style={styles.mainTitle}>
                        Profile Photos
                    </Text>
                    <Text style={styles.subtitle}>
                        Add photos that show off your personality!
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Public Photos (Max 4)
                    </Text>
                    <View style={styles.photoGrid}>
                        {[0, 1, 2, 3].map(index => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => pickImage(index)}
                                style={[
                                    styles.photoSquare,
                                    photos[index] ? styles.photoSquareSolid : styles.photoSquareDashed
                                ]}
                            >
                                {photos[index] ? (
                                    <>
                                        <Image source={{ uri: photos[index] }} style={styles.fullImage} />
                                        <TouchableOpacity
                                            onPress={() => removePhoto(index)}
                                            style={styles.removeButton}
                                        >
                                            <Ionicons name="close" size={16} color="white" />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <Ionicons name="add" size={32} color={colors.textTertiary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.aestheticCard}>
                    <View style={styles.aestheticHeader}>
                        <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.aestheticIcon} />
                        <Text style={styles.aestheticTitle}>Match Alike Photo</Text>
                        <Text style={styles.aestheticOptional}>(Optional)</Text>
                    </View>
                    <Text style={styles.aestheticDescription}>
                        Upload a photo of your style or home aesthetic. We use this to find people who share your vibe! (Private)
                    </Text>

                    <TouchableOpacity
                        onPress={() => pickImage('style')}
                        style={[
                            styles.stylePhotoArea,
                            stylePhoto ? styles.photoSquareSolid : styles.photoSquareDashed
                        ]}
                    >
                        {stylePhoto ? (
                            <>
                                <Image source={{ uri: stylePhoto }} style={styles.fullImage} />
                                <TouchableOpacity
                                    onPress={() => removePhoto('style')}
                                    style={styles.removeButtonStyle}
                                >
                                    <Ionicons name="close" size={20} color="white" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="camera-outline" size={40} color={colors.primary} />
                                <Text style={styles.uploadText}>Upload Aesthetic Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.tipContainer}>
                    <Text style={styles.tipText}>
                        Tip: Clear, high-quality photos help you make better connections.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handleFinish}
                    disabled={uploading || photos.length === 0}
                    style={[
                        styles.finishButton,
                        photos.length === 0 && styles.buttonDisabled
                    ]}
                >
                    {uploading ? (
                        <ActivityIndicator color={colors.surface} />
                    ) : (
                        <Text style={styles.finishButtonText}>Launch Frendli</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    scrollContent: {
        padding: spacing.xl,
    } as ViewStyle,
    progressContainer: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: radius.full,
        marginBottom: spacing.xxl,
        overflow: 'hidden',
    } as ViewStyle,
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: radius.full,
    } as ViewStyle,
    header: {
        marginBottom: spacing.xxl,
    } as ViewStyle,
    stepTitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    } as TextStyle,
    mainTitle: {
        ...typography.h1,
        color: colors.primary,
        marginBottom: spacing.sm,
    } as TextStyle,
    subtitle: {
        ...typography.body,
        fontSize: 18,
        color: colors.textSecondary,
    } as TextStyle,
    section: {
        marginBottom: spacing.xxl,
    } as ViewStyle,
    sectionTitle: {
        ...typography.h3,
        color: colors.secondary,
        marginBottom: spacing.md,
    } as TextStyle,
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    } as ViewStyle,
    photoSquare: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...shadow.sm,
    } as ViewStyle,
    photoSquareSolid: {
        borderStyle: 'solid',
    } as ViewStyle,
    photoSquareDashed: {
        borderStyle: 'dashed',
    } as ViewStyle,
    fullImage: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    removeButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 2,
    } as ViewStyle,
    removeButtonStyle: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
    } as ViewStyle,
    aestheticCard: {
        backgroundColor: colors.primary + '08',
        padding: spacing.lg,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.primary + '15',
    } as ViewStyle,
    aestheticHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    } as ViewStyle,
    aestheticIcon: {
        marginRight: spacing.xs,
    } as TextStyle,
    aestheticTitle: {
        ...typography.h3,
        color: colors.primary,
        fontSize: 18,
    } as TextStyle,
    aestheticOptional: {
        ...typography.small,
        color: colors.textTertiary,
        marginLeft: spacing.xs,
    } as TextStyle,
    aestheticDescription: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    } as TextStyle,
    stylePhotoArea: {
        width: '100%',
        height: 160,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...shadow.sm,
    } as ViewStyle,
    uploadPlaceholder: {
        alignItems: 'center',
    } as ViewStyle,
    uploadText: {
        ...typography.bodyMedium,
        fontSize: 14,
        color: colors.primary,
        marginTop: spacing.xs,
    } as TextStyle,
    tipContainer: {
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    } as ViewStyle,
    tipText: {
        ...typography.body,
        fontStyle: 'italic',
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
    } as TextStyle,
    footer: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    } as ViewStyle,
    finishButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        height: 60,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        ...shadow.premium,
    } as ViewStyle,
    buttonDisabled: {
        backgroundColor: colors.textTertiary,
        opacity: 0.5,
    } as ViewStyle,
    finishButtonText: {
        color: colors.surface,
        fontSize: 18,
        fontFamily: typography.h2.fontFamily,
        fontWeight: '700',
    } as TextStyle,
});

