import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { profileApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

export default function MatchAlikeUploadScreen() {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();
    const { userId, profile, setProfile } = useAuthStore();

    const scanLineY = useSharedValue(0);

    const scanStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: scanLineY.value }],
    }));

    const startScanAnimation = () => {
        scanLineY.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 0 }),
                withTiming(320, { duration: 1500 })
            ),
            -1,
            true
        );
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setImage(uri);
            handleAnalysis(uri);
        }
    };

    const handleAnalysis = async (uri: string) => {
        if (!userId) return;
        
        setAnalyzing(true);
        setUploading(true);
        startScanAnimation();

        try {
            // 1. Upload to Supabase Storage
            const publicUrl = await profileApi.uploadImage(userId, uri, 'style-photos');
            
            // 2. Analyze with Backend AI
            const data = await profileApi.uploadStylePhoto(publicUrl);
            
            setTags(data.allTags);
            
            // 3. Update local profile state
            if (profile) {
                setProfile({
                    ...profile,
                    stylePhotos: [...(profile.stylePhotos || []), publicUrl],
                    styleTags: data.allTags
                });
            }
        } catch (error) {
            console.error('Match Alike Analysis failed:', error);
        } finally {
            setAnalyzing(false);
            setUploading(false);
            scanLineY.value = 0;
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
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Match Alike™</Text>
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>AI SCAN</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.heroText}>Deepen Your Connections</Text>
                    <Text style={styles.description}>
                        Upload a photo of your favorite spot, a hobby, or your daily style. 
                        Our AI analyzes the vibe to find friends who truly align with you.
                    </Text>

                    <View style={styles.mainActionContainer}>
                        <TouchableOpacity 
                            style={[styles.uploadBox, image ? styles.uploadBoxActive : null]} 
                            onPress={pickImage}
                            disabled={analyzing}
                            activeOpacity={0.8}
                        >
                            {image ? (
                                <View style={styles.previewContainer}>
                                    <Image source={{ uri: image }} style={styles.previewImage} />
                                    {analyzing && (
                                        <Animated.View style={[styles.scanLine, scanStyle]} />
                                    )}
                                </View>
                            ) : (
                                <View style={styles.placeholder}>
                                    <View style={styles.iconCircle}>
                                        <MaterialCommunityIcons name="camera-plus-outline" size={32} color={colors.primary} />
                                    </View>
                                    <Text style={styles.placeholderTitle}>Select Style Photo</Text>
                                    <Text style={styles.placeholderSub}>Vibrant colors work best</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {analyzing && (
                            <Animated.View entering={FadeIn} style={styles.analyzingOverlay}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={styles.analyzingText}>Syncing personality traits...</Text>
                            </Animated.View>
                        )}
                    </View>

                    {tags.length > 0 && (
                        <Animated.View entering={FadeInDown} style={styles.resultsWrapper}>
                            <View style={styles.resultsHeader}>
                                <Text style={styles.resultsTitle}>Style Profile Updated</Text>
                                <MaterialCommunityIcons name="auto-fix" size={16} color={colors.secondary} />
                            </View>
                            
                            <View style={styles.tagsGrid}>
                                {tags.map((tag, idx) => (
                                    <Animated.View 
                                        key={tag} 
                                        entering={FadeInDown.delay(idx * 50)}
                                        style={styles.tagChip}
                                    >
                                        <Text style={styles.tagText}>#{tag}</Text>
                                    </Animated.View>
                                ))}
                            </View>

                            <TouchableOpacity 
                                style={styles.continueBtn} 
                                onPress={() => router.back()}
                            >
                                <Text style={styles.continueBtnText}>Save & Continue</Text>
                                <Feather name="arrow-right" size={18} color="#fff" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsTitle}>Analysis Tips</Text>
                        <View style={styles.tipRow}>
                            <Feather name="image" size={14} color={colors.textTertiary} />
                            <Text style={styles.tipText}>Use photos of your environment or aesthetic.</Text>
                        </View>
                        <View style={styles.tipRow}>
                            <Feather name="users" size={14} color={colors.textTertiary} />
                            <Text style={styles.tipText}>Helps us match you with "Alike" personalities.</Text>
                        </View>
                    </View>
                </ScrollView>
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
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        ...typography.h3,
        fontSize: 18,
        color: colors.textPrimary,
    },
    aiBadge: {
        backgroundColor: colors.secondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    aiBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'BricolageGrotesque_700Bold',
    },
    content: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    heroText: {
        fontSize: 32,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 38,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xxl,
        paddingHorizontal: spacing.md,
    },
    mainActionContainer: {
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    uploadBox: {
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...shadow.md,
    },
    uploadBoxActive: {
        borderStyle: 'solid',
        borderColor: colors.primary + '40',
    },
    previewContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    scanLine: {
        position: 'absolute',
        width: '100%',
        height: 3,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        zIndex: 10,
    },
    placeholder: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    placeholderTitle: {
        ...typography.bodyBold,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    placeholderSub: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    analyzingOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: spacing.xl,
        backgroundColor: '#fff',
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        borderRadius: radius.full,
        ...shadow.subtle,
    },
    analyzingText: {
        ...typography.bodyMedium,
        color: colors.textPrimary,
        fontSize: 14,
    },
    resultsWrapper: {
        width: '100%',
        marginTop: spacing.xxl,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: radius.xxl,
        ...shadow.md,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.lg,
        justifyContent: 'center',
    },
    resultsTitle: {
        ...typography.bodyBold,
        color: colors.secondary,
        fontSize: 16,
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    tagChip: {
        backgroundColor: colors.secondary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.secondary + '30',
    },
    tagText: {
        color: colors.secondary,
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Lexend_700Bold',
    },
    continueBtn: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: radius.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        ...shadow.premium,
    },
    continueBtnText: {
        ...typography.bodyBold,
        color: '#fff',
        fontSize: 16,
    },
    tipsContainer: {
        width: '100%',
        marginTop: spacing.xxl,
        paddingHorizontal: spacing.lg,
    },
    tipsTitle: {
        ...typography.caption,
        color: colors.textTertiary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    tipText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 12,
    }
});
