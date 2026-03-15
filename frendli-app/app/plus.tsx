import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, radius, shadow } from '../constants/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'yearly';

// ─── Feature list data ────────────────────────────────────────────────────────

const PLUS_FEATURES: { icon: string; label: string; active: boolean }[] = [
    { icon: 'people-outline', label: 'Unlimited connections & matches', active: true },
    { icon: 'options-outline', label: 'Advanced filters: age, life stage, interests', active: false },
    { icon: 'star-outline', label: 'Priority placement in hangout discovery', active: false },
    { icon: 'calendar-outline', label: 'Unlimited hosted hangouts', active: true },
    { icon: 'document-text-outline', label: 'Hangout planning templates', active: false },
    { icon: 'eye-outline', label: '"Seen recently" — know when matches are active', active: false },
    { icon: 'flash-outline', label: 'Early access to new features', active: false },
];

const FREE_FEATURES: { label: string }[] = [
    { label: 'Up to 5 friend connections' },
    { label: '1 group hangout hosted/month' },
    { label: 'Basic interest matching' },
    { label: 'Unlimited chat' },
    { label: 'Safety features (always free)' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlusScreen() {
    const router = useRouter();
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');

    const monthlyPrice = '$9.99';
    const yearlyMonthlyPrice = '$4.99';
    const yearlyTotal = '$59.99';

    const handleUpgrade = () => {
        Alert.alert(
            'Coming Soon',
            'In-app purchases will be available once our App Store and Play Store products are live. Stay tuned!',
            [{ text: 'Got it', style: 'default' }]
        );
    };

    const handleRestore = () => {
        Alert.alert('Coming Soon', 'Purchase restoration will be available when RevenueCat is configured.');
    };

    return (
        <View style={styles.screen}>
            <LinearGradient
                colors={[colors.secondary, colors.primary]}
                style={styles.heroBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Back button */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    {/* ── Hero ── */}
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
                        <View style={styles.crownBox}>
                            <MaterialCommunityIcons name="crown" size={32} color="#FFD700" />
                        </View>
                        <Text style={styles.heroEyebrow}>REALCONNECT</Text>
                        <Text style={styles.heroTitle}>Plus</Text>
                        <Text style={styles.heroSubtitle}>Unlimited connections. Deeper friendships.</Text>
                    </Animated.View>

                    {/* ── White card section ── */}
                    <View style={styles.card}>

                        {/* Billing toggle */}
                        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleTab, billingCycle === 'monthly' && styles.toggleTabActive]}
                                onPress={() => setBillingCycle('monthly')}
                            >
                                <Text style={[styles.toggleTabText, billingCycle === 'monthly' && styles.toggleTabTextActive]}>
                                    Monthly
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleTab, billingCycle === 'yearly' && styles.toggleTabActive]}
                                onPress={() => setBillingCycle('yearly')}
                            >
                                <Text style={[styles.toggleTabText, billingCycle === 'yearly' && styles.toggleTabTextActive]}>
                                    Yearly
                                </Text>
                                {billingCycle === 'monthly' && (
                                    <View style={styles.saveBadge}>
                                        <Text style={styles.saveBadgeText}>50% OFF</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Price display */}
                        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.priceBlock}>
                            <Text style={styles.priceMain}>
                                {billingCycle === 'monthly' ? monthlyPrice : yearlyMonthlyPrice}
                                <Text style={styles.pricePer}>/month</Text>
                            </Text>
                            {billingCycle === 'yearly' && (
                                <Text style={styles.priceSub}>Billed as {yearlyTotal}/year · Save 50%</Text>
                            )}
                        </Animated.View>

                        {/* CTA button */}
                        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                            <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.85}>
                                <LinearGradient
                                    colors={[colors.primary, colors.primaryDark]}
                                    style={styles.upgradeBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <MaterialCommunityIcons name="crown" size={18} color="#fff" />
                                    <Text style={styles.upgradeBtnText}>Upgrade to Plus</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <Text style={styles.cancelNote}>Cancel anytime. No questions asked.</Text>
                        </Animated.View>

                        <View style={styles.divider} />

                        {/* Everything in Plus */}
                        <Animated.View entering={FadeInUp.delay(250).duration(400)}>
                            <Text style={styles.featureSectionLabel}>EVERYTHING IN PLUS</Text>
                            {PLUS_FEATURES.map((f, i) => (
                                <View key={i} style={[styles.featureRow, f.active && styles.featureRowActive]}>
                                    <View style={[styles.featureIconBox, f.active && styles.featureIconBoxActive]}>
                                        <Ionicons
                                            name={f.icon as any}
                                            size={16}
                                            color={f.active ? colors.primary : colors.textTertiary}
                                        />
                                    </View>
                                    <Text style={[styles.featureLabel, f.active && styles.featureLabelActive]}>
                                        {f.label}
                                    </Text>
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={18}
                                        color={f.active ? colors.primary : colors.border}
                                    />
                                </View>
                            ))}
                        </Animated.View>

                        <View style={styles.divider} />

                        {/* Free tier */}
                        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
                            <Text style={styles.featureSectionLabel}>FREE TIER INCLUDES</Text>
                            {FREE_FEATURES.map((f, i) => (
                                <View key={i} style={styles.freeRow}>
                                    <Ionicons name="checkmark" size={16} color={colors.textSecondary} />
                                    <Text style={styles.freeLabel}>{f.label}</Text>
                                </View>
                            ))}
                        </Animated.View>

                        <View style={styles.divider} />

                        {/* Safety note */}
                        <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.safetyNote}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.info} style={{ marginTop: 1 }} />
                            <Text style={styles.safetyNoteText}>
                                <Text style={{ fontFamily: 'Lexend_600SemiBold' }}>Safety features</Text>
                                {' '}— SafeArrival, Silent SOS, emergency contacts — are permanently free on every account tier and will never be paywalled.
                            </Text>
                        </Animated.View>

                        {/* Restore purchases */}
                        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
                            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
                        </TouchableOpacity>

                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.secondary },
    heroBg: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 320,
    },
    topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    backBtn: {
        width: 40, height: 40, borderRadius: radius.full,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    scroll: { paddingBottom: 60 },

    // Hero
    hero: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.xxl },
    crownBox: {
        width: 64, height: 64, borderRadius: radius.full,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.md,
    },
    heroEyebrow: {
        fontFamily: 'Lexend_600SemiBold', fontSize: 11,
        color: 'rgba(255,255,255,0.7)', letterSpacing: 2,
        textTransform: 'uppercase', marginBottom: 4,
    },
    heroTitle: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 48, color: '#fff', letterSpacing: -1,
    },
    heroSubtitle: {
        fontFamily: 'Lexend_400Regular', fontSize: 15,
        color: 'rgba(255,255,255,0.8)', marginTop: 8,
    },

    // Card
    card: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl,
        minHeight: 600,
    },

    // Billing toggle
    toggleRow: {
        flexDirection: 'row', backgroundColor: colors.sand,
        borderRadius: radius.xl, padding: 4, marginBottom: spacing.lg,
    },
    toggleTab: {
        flex: 1, paddingVertical: 10, borderRadius: radius.lg,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    toggleTabActive: { backgroundColor: colors.surface, ...shadow.subtle },
    toggleTabText: { fontFamily: 'Lexend_500Medium', fontSize: 14, color: colors.textTertiary },
    toggleTabTextActive: { fontFamily: 'Lexend_700Bold', color: colors.textPrimary },
    saveBadge: {
        backgroundColor: colors.primary, borderRadius: radius.full,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    saveBadgeText: { fontFamily: 'Lexend_700Bold', fontSize: 10, color: '#fff' },

    // Price
    priceBlock: { alignItems: 'center', marginBottom: spacing.lg },
    priceMain: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 52, color: colors.textPrimary, lineHeight: 60,
    },
    pricePer: { fontFamily: 'Lexend_400Regular', fontSize: 20, color: colors.textSecondary },
    priceSub: { fontFamily: 'Lexend_400Regular', fontSize: 14, color: colors.success, marginTop: 4 },

    // CTA
    upgradeBtn: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: 12 },
    upgradeBtnGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 17, gap: 8,
    },
    upgradeBtnText: { fontFamily: 'Lexend_700Bold', fontSize: 17, color: '#fff' },
    cancelNote: {
        fontFamily: 'Lexend_400Regular', fontSize: 13,
        color: colors.textTertiary, textAlign: 'center',
    },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },

    // Plus features
    featureSectionLabel: {
        fontFamily: 'Lexend_600SemiBold', fontSize: 11,
        color: colors.textTertiary, letterSpacing: 1.2,
        textTransform: 'uppercase', marginBottom: spacing.md,
    },
    featureRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, borderRadius: radius.lg,
        paddingHorizontal: 8, marginBottom: 4,
    },
    featureRowActive: { backgroundColor: colors.primaryLight },
    featureIconBox: {
        width: 28, height: 28, borderRadius: radius.sm,
        backgroundColor: colors.sand, justifyContent: 'center', alignItems: 'center',
    },
    featureIconBoxActive: { backgroundColor: colors.primaryLight },
    featureLabel: {
        flex: 1, fontFamily: 'Lexend_400Regular',
        fontSize: 14, color: colors.textSecondary,
    },
    featureLabelActive: { fontFamily: 'Lexend_600SemiBold', color: colors.textPrimary },

    // Free features
    freeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    freeLabel: { fontFamily: 'Lexend_400Regular', fontSize: 14, color: colors.textSecondary },

    // Safety note
    safetyNote: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        backgroundColor: '#EFF6FF', borderRadius: radius.lg,
        padding: spacing.md, borderWidth: 1, borderColor: colors.waveBlue + '55',
    },
    safetyNoteText: {
        flex: 1, fontFamily: 'Lexend_400Regular',
        fontSize: 13, color: colors.info, lineHeight: 20,
    },

    // Restore
    restoreBtn: { alignItems: 'center', marginTop: spacing.lg },
    restoreBtnText: { fontFamily: 'Lexend_400Regular', fontSize: 13, color: colors.textTertiary },
});
