import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, radius, shadow } from '../constants/tokens';
import { leadsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'starter' | 'growth' | 'enterprise';
type TeamSize = '1-25' | '26-100' | '101-500' | '500+';

// ─── Static data ──────────────────────────────────────────────────────────────

const STATS = [
    { value: '67%', label: 'of remote workers feel lonely at least weekly' },
    { value: '21%', label: 'productivity boost from strong social ties' },
    { value: '40%', label: 'lower turnover among employees with work friendships' },
    { value: '3x', label: 'more likely to report high wellbeing with close friends at work' },
];

const FEATURES = [
    { icon: 'heart-outline' as const, title: 'Reduce Employee Loneliness', desc: 'Real friendships in every city your team calls home.' },
    { icon: 'airplane-outline' as const, title: 'Support Relocation', desc: 'Help new hires build a social network from day one.' },
    { icon: 'trending-up-outline' as const, title: 'Boost Productivity', desc: 'Teams with strong bonds collaborate and ship faster.' },
    { icon: 'leaf-outline' as const, title: 'Mental Health Benefit', desc: 'Friendship reduces stress and improves wellbeing scores.' },
];

const STEPS = [
    { n: '1', title: 'Company Signs Up', desc: 'Choose a plan and invite your team in minutes.' },
    { n: '2', title: 'Employees Get Invited', desc: 'Each employee gets a link to join RealConnect.' },
    { n: '3', title: 'Matches Are Made', desc: 'Our algorithm connects people by city, interest, and style.' },
    { n: '4', title: 'Real Friendships Form', desc: 'Employees meet up, hang out, and bond for real.' },
];

const TESTIMONIALS = [
    {
        quote: '"Since we rolled out RealConnect, our engagement scores in remote cities jumped 34%. People actually have friends at work now."',
        name: 'Head of People, Series B SaaS',
        detail: '60 employees across 8 cities',
    },
    {
        quote: '"New hires used to take 6 months to feel settled. With RealConnect they\'re going to coffee meetups in their first week."',
        name: 'VP of Talent, Remote-first tech company',
        detail: '180 employees, fully remote',
    },
];

const PLANS: { id: Plan; name: string; price: string; seats: string; cta: string; popular: boolean }[] = [
    { id: 'starter', name: 'Starter', price: '$299/month', seats: 'Up to 25 employees', cta: 'Start Free Trial', popular: false },
    { id: 'growth', name: 'Growth', price: '$799/month', seats: 'Up to 100 employees', cta: 'Get a Demo', popular: true },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom pricing', seats: 'Unlimited seats', cta: 'Contact Sales', popular: false },
];

const TEAM_SIZES: TeamSize[] = ['1-25', '26-100', '101-500', '500+'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CorporateScreen() {
    const router = useRouter();
    const { profile, userId } = useAuthStore();

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan>('growth');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState(profile?.firstName || '');
    const [workEmail, setWorkEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [teamSize, setTeamSize] = useState<TeamSize>('26-100');

    const openModal = (plan: Plan) => {
        setSelectedPlan(plan);
        setSubmitted(false);
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!workEmail.trim()) return Alert.alert('Required', 'Please enter your work email.');
        if (!companyName.trim()) return Alert.alert('Required', 'Please enter your company name.');

        setLoading(true);
        try {
            await leadsApi.submit({ firstName, workEmail, companyName, teamSize, plan: selectedPlan, userId: userId || undefined });
            setSubmitted(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.screen}>
            <LinearGradient colors={[colors.background, colors.cream]} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Back button */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    {/* ── Section 1: Hero ── */}
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
                        <View style={styles.heroIconCluster}>
                            <View style={[styles.heroIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="business-outline" size={24} color={colors.success} />
                            </View>
                            <View style={[styles.heroIcon, styles.heroIconCenter, { backgroundColor: colors.primaryLight }]}>
                                <Ionicons name="people-outline" size={28} color={colors.primary} />
                            </View>
                            <View style={[styles.heroIcon, { backgroundColor: '#FCE4EC' }]}>
                                <Ionicons name="heart-outline" size={24} color={colors.error} />
                            </View>
                        </View>

                        <Text style={styles.heroEyebrow}>REALCONNECT FOR BUSINESS</Text>
                        <Text style={styles.heroTitle}>Build a Happier{'\n'}Remote Team</Text>
                        <Text style={styles.heroSubtitle}>
                            Give your remote team the social infrastructure they need to form real friendships — in cities across the country.
                        </Text>

                        <View style={styles.pillRow}>
                            {['Remote-First', 'Multi-City', 'Safe & Private'].map(p => (
                                <View key={p} style={styles.pill}>
                                    <Text style={styles.pillText}>{p}</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Section 2: Stats ── */}
                    <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.section}>
                        <Text style={styles.sectionLabel}>THE DATA IS CLEAR</Text>
                        <View style={styles.statsGrid}>
                            {STATS.map((s, i) => (
                                <View key={i} style={styles.statCard}>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Section 3: Why Companies Choose RealConnect ── */}
                    <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.section}>
                        <Text style={styles.sectionLabel}>WHY COMPANIES CHOOSE REALCONNECT</Text>
                        <View style={styles.featureGrid}>
                            {FEATURES.map((f, i) => (
                                <View key={i} style={styles.featureCard}>
                                    <View style={styles.featureIconBox}>
                                        <Ionicons name={f.icon} size={22} color={colors.primary} />
                                    </View>
                                    <Text style={styles.featureTitle}>{f.title}</Text>
                                    <Text style={styles.featureDesc}>{f.desc}</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Section 4: How It Works ── */}
                    <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.section}>
                        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
                        <View style={styles.whiteCard}>
                            {STEPS.map((s, i) => (
                                <View key={i}>
                                    <View style={styles.stepRow}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>{s.n}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.stepTitle}>{s.title}</Text>
                                            <Text style={styles.stepDesc}>{s.desc}</Text>
                                        </View>
                                    </View>
                                    {i < STEPS.length - 1 && <View style={styles.stepDivider} />}
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Section 5: Testimonials ── */}
                    <Animated.View entering={FadeInUp.delay(250).duration(500)} style={styles.section}>
                        <Text style={styles.sectionLabel}>WHAT PEOPLE ARE SAYING</Text>
                        {TESTIMONIALS.map((t, i) => (
                            <View key={i} style={[styles.testimonialCard, i > 0 && { marginTop: 12 }]}>
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} style={{ marginBottom: 10 }} />
                                <Text style={styles.testimonialQuote}>{t.quote}</Text>
                                <Text style={styles.testimonialName}>{t.name}</Text>
                                <Text style={styles.testimonialDetail}>{t.detail}</Text>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ── Section 6: Pricing ── */}
                    <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.section}>
                        <Text style={styles.sectionLabel}>PRICING</Text>
                        {PLANS.map((plan) => (
                            <View key={plan.id} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
                                {plan.popular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularBadgeText}>⭐ Most Popular</Text>
                                    </View>
                                )}
                                <View style={styles.planHeader}>
                                    <View>
                                        <Text style={styles.planName}>{plan.name}</Text>
                                        <Text style={styles.planSeats}>{plan.seats}</Text>
                                    </View>
                                    <Text style={styles.planPrice}>{plan.price}</Text>
                                </View>
                                <TouchableOpacity
                                    style={plan.popular ? styles.planCtaFilled : styles.planCtaOutlined}
                                    onPress={() => openModal(plan.id)}
                                    activeOpacity={0.8}
                                >
                                    {plan.popular ? (
                                        <LinearGradient
                                            colors={[colors.primary, colors.primaryDark]}
                                            style={styles.planCtaGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Text style={styles.planCtaFilledText}>{plan.cta}</Text>
                                        </LinearGradient>
                                    ) : (
                                        <Text style={styles.planCtaOutlinedText}>{plan.cta}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ── Section 7: Bottom CTA ── */}
                    <Animated.View entering={FadeInUp.delay(350).duration(500)} style={styles.bottomCta}>
                        <View style={styles.bottomCtaIconBox}>
                            <Ionicons name="flash-outline" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.bottomCtaTitle}>Ready to build a happier team?</Text>
                        <Text style={styles.bottomCtaSub}>
                            Book a 20-minute call. We'll show you how RealConnect works for your team size and cities.
                        </Text>
                        <TouchableOpacity style={styles.bottomCtaBtn} onPress={() => openModal('growth')} activeOpacity={0.85}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                style={styles.bottomCtaGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#fff" />
                                <Text style={styles.bottomCtaBtnText}>Book a Free Demo</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.bottomCtaNote}>No commitment. No credit card required.</Text>
                    </Animated.View>

                </ScrollView>
            </SafeAreaView>

            {/* ── Lead Capture Modal ── */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalSheet}>
                        {submitted ? (
                            // ── Success state ──
                            <View style={styles.successState}>
                                <View style={styles.successIcon}>
                                    <Ionicons name="checkmark-circle" size={52} color={colors.success} />
                                </View>
                                <Text style={styles.successTitle}>You're on the list!</Text>
                                <Text style={styles.successBody}>
                                    Thanks! We'll be in touch at{'\n'}
                                    <Text style={{ color: colors.primary }}>{workEmail}</Text>
                                    {'\n'}within 1 business day.
                                </Text>
                                <TouchableOpacity style={styles.successBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.successBtnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            // ── Form ──
                            <>
                                <View style={styles.modalHandle} />
                                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>Get Started</Text>
                                        <Text style={styles.modalSubtitle}>
                                            Plan: <Text style={{ color: colors.primary, fontFamily: 'Lexend_600SemiBold' }}>
                                                {PLANS.find(p => p.id === selectedPlan)?.name}
                                            </Text>
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.fieldLabel}>First Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="Alex"
                                        placeholderTextColor={colors.textTertiary}
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.fieldLabel}>Work Email *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={workEmail}
                                        onChangeText={setWorkEmail}
                                        placeholder="alex@company.com"
                                        placeholderTextColor={colors.textTertiary}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.fieldLabel}>Company Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={companyName}
                                        onChangeText={setCompanyName}
                                        placeholder="Acme Inc."
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.fieldLabel}>Team Size</Text>
                                    <View style={styles.sizeRow}>
                                        {TEAM_SIZES.map(s => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.sizeChip, teamSize === s && styles.sizeChipActive]}
                                                onPress={() => setTeamSize(s)}
                                            >
                                                <Text style={[styles.sizeChipText, teamSize === s && styles.sizeChipTextActive]}>
                                                    {s}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryDark]}
                                        style={styles.submitGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.submitBtnText}>{loading ? 'Sending…' : 'Send My Inquiry'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1 },
    topBar: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: radius.full,
        backgroundColor: colors.surface,
        justifyContent: 'center', alignItems: 'center',
        ...shadow.subtle,
    },
    scroll: { paddingBottom: 60 },

    // Hero
    hero: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    heroIconCluster: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
    heroIcon: {
        width: 48, height: 48, borderRadius: radius.lg,
        justifyContent: 'center', alignItems: 'center',
    },
    heroIconCenter: { width: 56, height: 56, borderRadius: radius.xl, marginTop: -6 },
    heroEyebrow: {
        fontFamily: 'Lexend_600SemiBold', fontSize: 11,
        color: colors.primary, letterSpacing: 1.5,
        textTransform: 'uppercase', marginBottom: spacing.sm,
    },
    heroTitle: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 34, color: colors.textPrimary,
        textAlign: 'center', lineHeight: 42, marginBottom: spacing.md,
    },
    heroSubtitle: {
        fontFamily: 'Lexend_400Regular', fontSize: 16,
        color: colors.textSecondary, textAlign: 'center',
        lineHeight: 26, marginBottom: spacing.lg,
    },
    pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    pill: {
        backgroundColor: colors.sand, borderRadius: radius.full,
        paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: colors.border,
    },
    pillText: { fontFamily: 'Lexend_500Medium', fontSize: 13, color: colors.textSecondary },

    // Section
    section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xxl },
    sectionLabel: {
        fontFamily: 'Lexend_600SemiBold', fontSize: 12,
        color: colors.textTertiary, letterSpacing: 1.2,
        textTransform: 'uppercase', marginBottom: spacing.md,
    },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '47%', backgroundColor: colors.surface,
        borderRadius: radius.xl, padding: spacing.lg,
        ...shadow.card,
    },
    statValue: {
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        fontSize: 32, color: colors.primary, marginBottom: 6,
    },
    statLabel: {
        fontFamily: 'Lexend_400Regular', fontSize: 13,
        color: colors.textSecondary, lineHeight: 19,
    },

    // Features
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: {
        width: '47%', backgroundColor: colors.surface,
        borderRadius: radius.xl, padding: spacing.md,
        ...shadow.subtle,
    },
    featureIconBox: {
        width: 40, height: 40, borderRadius: radius.md,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.sm,
    },
    featureTitle: {
        fontFamily: 'Lexend_600SemiBold', fontSize: 14,
        color: colors.textPrimary, marginBottom: 4, lineHeight: 20,
    },
    featureDesc: {
        fontFamily: 'Lexend_400Regular', fontSize: 13,
        color: colors.textSecondary, lineHeight: 18,
    },

    // How it works
    whiteCard: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: spacing.lg, ...shadow.subtle,
    },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    stepNumber: {
        width: 32, height: 32, borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
    },
    stepNumberText: { fontFamily: 'Lexend_700Bold', fontSize: 14, color: colors.primary },
    stepTitle: { fontFamily: 'Lexend_600SemiBold', fontSize: 15, color: colors.textPrimary },
    stepDesc: { fontFamily: 'Lexend_400Regular', fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
    stepDivider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },

    // Testimonials
    testimonialCard: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: spacing.lg, ...shadow.subtle,
    },
    testimonialQuote: {
        fontFamily: 'Lexend_400Regular', fontSize: 15,
        color: colors.textSecondary, lineHeight: 24,
        fontStyle: 'italic', marginBottom: 12,
    },
    testimonialName: { fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: colors.textPrimary },
    testimonialDetail: { fontFamily: 'Lexend_400Regular', fontSize: 13, color: colors.textTertiary, marginTop: 2 },

    // Pricing
    planCard: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: spacing.lg, marginBottom: 12,
        borderWidth: 1.5, borderColor: colors.border, ...shadow.subtle,
    },
    planCardPopular: { borderColor: colors.primary, ...shadow.premium },
    popularBadge: {
        backgroundColor: colors.primaryLight, borderRadius: radius.full,
        paddingHorizontal: 12, paddingVertical: 4,
        alignSelf: 'flex-start', marginBottom: 12,
    },
    popularBadgeText: { fontFamily: 'Lexend_600SemiBold', fontSize: 12, color: colors.primaryDark },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    planName: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 20, color: colors.textPrimary },
    planSeats: { fontFamily: 'Lexend_400Regular', fontSize: 13, color: colors.textTertiary, marginTop: 2 },
    planPrice: { fontFamily: 'Lexend_700Bold', fontSize: 16, color: colors.textPrimary, textAlign: 'right' },
    planCtaFilled: { borderRadius: radius.xl, overflow: 'hidden' },
    planCtaGradient: { paddingVertical: 14, alignItems: 'center' },
    planCtaFilledText: { fontFamily: 'Lexend_700Bold', fontSize: 15, color: '#fff' },
    planCtaOutlined: {
        borderWidth: 1.5, borderColor: colors.primary,
        borderRadius: radius.xl, paddingVertical: 13,
        alignItems: 'center',
    },
    planCtaOutlinedText: { fontFamily: 'Lexend_600SemiBold', fontSize: 15, color: colors.primary },

    // Bottom CTA
    bottomCta: {
        alignItems: 'center', paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface, borderRadius: radius.xl,
        ...shadow.md,
    },
    bottomCtaIconBox: {
        width: 52, height: 52, borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.md,
    },
    bottomCtaTitle: {
        fontFamily: 'BricolageGrotesque_700Bold', fontSize: 22,
        color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm,
    },
    bottomCtaSub: {
        fontFamily: 'Lexend_400Regular', fontSize: 14,
        color: colors.textSecondary, textAlign: 'center',
        lineHeight: 22, marginBottom: spacing.lg,
    },
    bottomCtaBtn: { width: '100%', borderRadius: radius.xl, overflow: 'hidden', marginBottom: 12 },
    bottomCtaGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, gap: 8,
    },
    bottomCtaBtnText: { fontFamily: 'Lexend_700Bold', fontSize: 16, color: '#fff' },
    bottomCtaNote: { fontFamily: 'Lexend_400Regular', fontSize: 13, color: colors.textTertiary },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 12,
        ...shadow.lg,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
    modalTitle: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 22, color: colors.textPrimary },
    modalSubtitle: { fontFamily: 'Lexend_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    modalCloseBtn: {
        width: 36, height: 36, borderRadius: radius.full,
        backgroundColor: colors.sand, justifyContent: 'center', alignItems: 'center',
    },
    formGroup: { marginBottom: spacing.md },
    fieldLabel: { fontFamily: 'Lexend_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    input: {
        backgroundColor: colors.sand, borderRadius: radius.lg,
        paddingHorizontal: spacing.md, paddingVertical: 14,
        fontFamily: 'Lexend_400Regular', fontSize: 15, color: colors.textPrimary,
        borderWidth: 1, borderColor: colors.border,
    },
    sizeRow: { flexDirection: 'row', gap: 8 },
    sizeChip: {
        flex: 1, borderRadius: radius.lg, borderWidth: 1.5,
        borderColor: colors.border, paddingVertical: 10, alignItems: 'center',
        backgroundColor: colors.sand,
    },
    sizeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    sizeChipText: { fontFamily: 'Lexend_500Medium', fontSize: 13, color: colors.textSecondary },
    sizeChipTextActive: { color: colors.primaryDark, fontFamily: 'Lexend_600SemiBold' },
    submitBtn: { marginTop: spacing.sm, borderRadius: radius.xl, overflow: 'hidden' },
    submitGradient: { paddingVertical: 16, alignItems: 'center' },
    submitBtnText: { fontFamily: 'Lexend_700Bold', fontSize: 16, color: '#fff' },

    // Success
    successState: { alignItems: 'center', paddingVertical: spacing.xl },
    successIcon: { marginBottom: spacing.md },
    successTitle: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 24, color: colors.textPrimary, marginBottom: 12 },
    successBody: {
        fontFamily: 'Lexend_400Regular', fontSize: 15,
        color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: spacing.xl,
    },
    successBtn: {
        backgroundColor: colors.sand, borderRadius: radius.xl,
        paddingHorizontal: spacing.xl, paddingVertical: 14,
    },
    successBtnText: { fontFamily: 'Lexend_600SemiBold', fontSize: 15, color: colors.textPrimary },
});
