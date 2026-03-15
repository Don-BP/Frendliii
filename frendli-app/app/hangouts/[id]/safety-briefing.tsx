import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../../constants/tokens';

export default function SafetyBriefingScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="x" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Safety Briefing</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.heroSection}>
                    <View style={styles.heroIconContainer}>
                        <Feather name="shield" size={48} color="#4F46E5" />
                    </View>
                    <Text style={styles.heroTitle}>Your Safety Matters</Text>
                    <Text style={styles.heroSubtitle}>
                        Before you meet up, please review these essential safety tips to ensure a great experience.
                    </Text>
                </View>

                <View style={styles.tipsContainer}>
                    <TipItem 
                        icon="map-pin" 
                        title="Meet in Public Places" 
                        description="Always arrange to meet for the first time in a populated, public area. Never meet in a private or secluded location."
                    />
                    <TipItem 
                        icon="share-2" 
                        title="Share Your Plans" 
                        description="Tell a friend or family member where you are going and who you are meeting. Set up Emergency Contacts in Settings."
                    />
                    <TipItem 
                        icon="smartphone" 
                        title="Keep Your Phone Charged" 
                        description="Make sure your phone is fully charged before you leave. Be aware of the Silent SOS feature (long-press the app header) if you need help."
                    />
                    <TipItem 
                        icon="alert-octagon" 
                        title="Trust Your Instincts" 
                        description="If you feel uncomfortable or unsafe at any point, you can leave. You don't owe anyone an explanation."
                    />
                </View>

                <TouchableOpacity 
                    style={styles.acknowledgeButton} 
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.acknowledgeButtonText}>I Understand</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={() => router.push('/settings/safety')}
                >
                    <Text style={styles.secondaryButtonText}>Set up Emergency Contacts</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

function TipItem({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <View style={styles.tipItem}>
            <View style={styles.tipIconBox}>
                <Feather name={icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{title}</Text>
                <Text style={styles.tipDescription}>{description}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    heroIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#F0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    heroTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    heroSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
    },
    tipsContainer: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.subtle,
        marginBottom: spacing.xxl,
    },
    tipItem: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    tipIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    tipDescription: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    acknowledgeButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        alignItems: 'center',
        marginBottom: spacing.md,
        ...shadow.md,
    },
    acknowledgeButtonText: {
        ...typography.bodyBold,
        color: '#fff',
    },
    secondaryButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    secondaryButtonText: {
        ...typography.bodyBold,
        color: colors.primary,
    },
});
