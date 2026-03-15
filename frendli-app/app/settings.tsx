import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';

// ── Types ──────────────────────────────────────────────────────────────────

type Language = 'en' | 'ja';

interface NotificationPrefs {
    waves: boolean;
    messages: boolean;
    hangoutInvites: boolean;
    safetyAlerts: boolean;
    milestones: boolean;
    newMatches: boolean;
}

interface AppPrefs {
    soundEffects: boolean;
    hapticFeedback: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
    return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
    return <View style={styles.sectionCard}>{children}</View>;
}

function PlusBadge() {
    return (
        <View style={styles.plusBadge}>
            <Text style={styles.plusText}>Plus</Text>
        </View>
    );
}

interface RowProps {
    icon: React.ComponentProps<typeof Feather>['name'];
    iconBg: string;
    iconColor: string;
    label: string;
    subtitle?: string;
    isLast?: boolean;
    right?: React.ReactNode;
    onPress?: () => void;
}

function Row({ icon, iconBg, iconColor, label, subtitle, isLast, right, onPress }: RowProps) {
    return (
        <TouchableOpacity
            style={[styles.row, isLast && styles.rowLast]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            accessibilityLabel={label}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    <Feather name={icon} size={18} color={iconColor} />
                </View>
                <View style={styles.rowLabels}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            <View style={styles.rowRight}>{right}</View>
        </TouchableOpacity>
    );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const router = useRouter();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const profile = useAuthStore((state) => state.profile);

    const isPremium = profile?.isPremium ?? false;
    const firstName = profile?.firstName ?? 'You';
    const location = profile?.location ?? '';
    const initial = firstName.charAt(0).toUpperCase();

    const [language, setLanguage] = useState<Language>('en');
    const [notifs, setNotifs] = useState<NotificationPrefs>({
        waves: true,
        messages: true,
        hangoutInvites: true,
        safetyAlerts: true,
        milestones: true,
        newMatches: true,
    });
    const [discoverableProfile, setDiscoverableProfile] = useState(true);
    const [appPrefs, setAppPrefs] = useState<AppPrefs>({
        soundEffects: true,
        hapticFeedback: true,
    });

    const toggleNotif = (key: keyof NotificationPrefs) =>
        setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

    const handleSignOut = () => {
        clearAuth();
        router.replace('/');
    };

    const handlePlusPress = () => router.push('/perks' as any);

    const toggle = (value: boolean, onToggle: () => void) => (
        <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
            ios_backgroundColor={colors.border}
        />
    );

    const chevron = <Feather name="chevron-right" size={20} color={colors.textTertiary} />;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Profile Header ──────────────────────────────── */}
                <View style={styles.profileCard}>
                    <View style={styles.profileLeft}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarInitial}>{initial}</Text>
                        </View>
                        <View>
                            <Text style={styles.profileName}>{firstName}</Text>
                            {!!location && <Text style={styles.profileLocation}>{location}</Text>}
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/edit-profile')}
                        activeOpacity={0.7}
                        accessibilityLabel="Edit profile"
                    >
                        <Text style={styles.editButton}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Language ────────────────────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="LANGUAGE" />
                    <SectionCard>
                        <Row
                            icon="globe"
                            iconBg="#E8F4F8"
                            iconColor="#4B9EBA"
                            label="English"
                            subtitle="Choose app language"
                            onPress={() => setLanguage('en')}
                            right={
                                language === 'en' ? (
                                    <Feather name="check-circle" size={20} color={colors.primary} />
                                ) : chevron
                            }
                        />
                        <Row
                            icon="globe"
                            iconBg="#E8F4F8"
                            iconColor="#4B9EBA"
                            label="日本語"
                            subtitle="Choose app language"
                            isLast
                            onPress={() => setLanguage('ja')}
                            right={
                                language === 'ja' ? (
                                    <Feather name="check-circle" size={20} color={colors.primary} />
                                ) : chevron
                            }
                        />
                    </SectionCard>
                </View>

                {/* ── Notifications ───────────────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="NOTIFICATIONS" />
                    <SectionCard>
                        <Row
                            icon="activity"
                            iconBg="#EBF0FF"
                            iconColor="#4B7BF5"
                            label="Waves"
                            subtitle="When someone waves at you"
                            right={toggle(notifs.waves, () => toggleNotif('waves'))}
                        />
                        <Row
                            icon="message-square"
                            iconBg="#DCFCE7"
                            iconColor="#22C55E"
                            label="Messages"
                            subtitle="New chat messages"
                            right={toggle(notifs.messages, () => toggleNotif('messages'))}
                        />
                        <Row
                            icon="users"
                            iconBg="#FFE5DE"
                            iconColor={colors.primary}
                            label="Hangout Invites"
                            subtitle="When you're invited to a hangout"
                            right={toggle(notifs.hangoutInvites, () => toggleNotif('hangoutInvites'))}
                        />
                        <Row
                            icon="shield"
                            iconBg="#DCFCE7"
                            iconColor="#22C55E"
                            label="Safety Alerts"
                            subtitle="SafeArrival check-ins (always recommended)"
                            right={toggle(notifs.safetyAlerts, () => toggleNotif('safetyAlerts'))}
                        />
                        <Row
                            icon="award"
                            iconBg="#FEF9C3"
                            iconColor="#EAB308"
                            label="Milestones"
                            subtitle="Friendship progress notifications"
                            right={toggle(notifs.milestones, () => toggleNotif('milestones'))}
                        />
                        <Row
                            icon="bell"
                            iconBg="#FFEDD5"
                            iconColor="#F97316"
                            label="New Matches"
                            subtitle="Curated friend suggestions"
                            isLast
                            right={toggle(notifs.newMatches, () => toggleNotif('newMatches'))}
                        />
                    </SectionCard>
                </View>

                {/* ── Privacy & Visibility ────────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="PRIVACY & VISIBILITY" />
                    <SectionCard>
                        <Row
                            icon="eye"
                            iconBg="#FFE5DE"
                            iconColor={colors.primary}
                            label="Discoverable Profile"
                            subtitle="Let others find you in suggestions"
                            right={toggle(discoverableProfile, () => setDiscoverableProfile((v) => !v))}
                        />
                        <Row
                            icon="clock"
                            iconBg="#E0F2FE"
                            iconColor="#0EA5E9"
                            label={'Show "Seen Recently"'}
                            subtitle="Let matches see when you were last active"
                            onPress={isPremium ? undefined : handlePlusPress}
                            right={isPremium ? chevron : <PlusBadge />}
                        />
                        <Row
                            icon="map-pin"
                            iconBg="#F3F4F6"
                            iconColor="#6B7280"
                            label="Location Precision"
                            subtitle="Neighborhood-level only (never exact)"
                            onPress={() => {}}
                            right={chevron}
                        />
                        <Row
                            icon="lock"
                            iconBg="#F3F4F6"
                            iconColor="#6B7280"
                            label="Blocked Users"
                            subtitle="Manage people you've blocked"
                            isLast
                            onPress={() => {}}
                            right={chevron}
                        />
                    </SectionCard>
                </View>

                {/* ── Discovery Preferences ───────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="DISCOVERY PREFERENCES" />
                    <SectionCard>
                        <Row
                            icon="sliders"
                            iconBg="#FFE5DE"
                            iconColor={colors.primary}
                            label="Distance Radius"
                            subtitle="Within 10 miles"
                            onPress={isPremium ? undefined : handlePlusPress}
                            right={isPremium ? chevron : <PlusBadge />}
                        />
                        <Row
                            icon="user"
                            iconBg="#FFE5DE"
                            iconColor={colors.primary}
                            label="Age Range"
                            subtitle="18 – 45"
                            isLast
                            onPress={isPremium ? undefined : handlePlusPress}
                            right={isPremium ? chevron : <PlusBadge />}
                        />
                    </SectionCard>
                </View>

                {/* ── App Preferences ─────────────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="APP PREFERENCES" />
                    <SectionCard>
                        <Row
                            icon="volume-2"
                            iconBg="#FFE5DE"
                            iconColor={colors.primary}
                            label="Sound Effects"
                            subtitle="Audio feedback for actions"
                            right={toggle(appPrefs.soundEffects, () =>
                                setAppPrefs((p) => ({ ...p, soundEffects: !p.soundEffects }))
                            )}
                        />
                        <Row
                            icon="zap"
                            iconBg="#F3F4F6"
                            iconColor="#6B7280"
                            label="Haptic Feedback"
                            subtitle="Vibration on interactions"
                            isLast
                            right={toggle(appPrefs.hapticFeedback, () =>
                                setAppPrefs((p) => ({ ...p, hapticFeedback: !p.hapticFeedback }))
                            )}
                        />
                    </SectionCard>
                </View>

                {/* ── Safety ──────────────────────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="SAFETY" />
                    <SectionCard>
                        <Row
                            icon="shield"
                            iconBg="#DCFCE7"
                            iconColor="#22C55E"
                            label="SafeArrival & Emergency Contact"
                            subtitle="Manage check-in settings"
                            onPress={() => router.push('/settings/safety')}
                            right={chevron}
                        />
                        <Row
                            icon="check-circle"
                            iconBg="#DCFCE7"
                            iconColor="#22C55E"
                            label="Pre-Meetup Safety Briefing"
                            subtitle="Review before your next hangout"
                            isLast
                            onPress={() => router.push('/settings/safety')}
                            right={chevron}
                        />
                    </SectionCard>
                </View>

                {/* ── Account & Data ──────────────────────────────── */}
                <View style={styles.section}>
                    <SectionHeader title="ACCOUNT & DATA" />
                    <SectionCard>
                        <Row
                            icon="help-circle"
                            iconBg="#FFEDD5"
                            iconColor="#F97316"
                            label="Help & FAQ"
                            subtitle="Answers to common questions"
                            onPress={() => {}}
                            right={chevron}
                        />
                        <Row
                            icon="message-circle"
                            iconBg="#EBF0FF"
                            iconColor="#4B7BF5"
                            label="Send Feedback"
                            subtitle="Tell us what you think"
                            onPress={() => {}}
                            right={chevron}
                        />
                        <Row
                            icon="download"
                            iconBg="#F3F4F6"
                            iconColor="#6B7280"
                            label="Export My Data"
                            subtitle="Download a copy of your data (GDPR/CCPA)"
                            onPress={() => {}}
                            right={chevron}
                        />
                        <Row
                            icon="log-out"
                            iconBg="#F3F4F6"
                            iconColor="#6B7280"
                            label="Sign Out"
                            isLast
                            onPress={handleSignOut}
                            right={chevron}
                        />
                    </SectionCard>
                </View>

                {/* ── Delete Account ──────────────────────────────── */}
                <View style={[styles.section, { marginBottom: spacing.xl }]}>
                    <View style={[styles.sectionCard, styles.deleteCard]}>
                        <Row
                            icon="trash-2"
                            iconBg="#FEE2E2"
                            iconColor="#EF4444"
                            label="Delete Account"
                            subtitle="Permanently remove all your data"
                            isLast
                            onPress={() => {}}
                            right={chevron}
                        />
                    </View>
                </View>

                {/* ── Footer ──────────────────────────────────────── */}
                <View style={styles.footer}>
                    <Text style={styles.footerVersion}>RealConnect v1.0.0</Text>
                    <Text style={styles.footerTagline}>
                        The only app where success means you stop using it.
                    </Text>
                    <View style={styles.footerLinks}>
                        <TouchableOpacity accessibilityLabel="Privacy Policy">
                            <Text style={styles.footerLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerDot}>·</Text>
                        <TouchableOpacity accessibilityLabel="Terms of Service">
                            <Text style={styles.footerLink}>Terms of Service</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerDot}>·</Text>
                        <TouchableOpacity accessibilityLabel="Community Guidelines">
                            <Text style={styles.footerLink}>Community Guidelines</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    scroll: {
        flex: 1,
    } as ViewStyle,
    scrollContent: {
        paddingBottom: spacing.xxxl,
    } as ViewStyle,

    // Profile header
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        ...shadow.subtle,
    } as ViewStyle,
    profileLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    } as ViewStyle,
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    avatarInitial: {
        fontSize: 20,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: '#fff',
    } as TextStyle,
    profileName: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    } as TextStyle,
    profileLocation: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    } as TextStyle,
    editButton: {
        ...typography.bodyMedium,
        color: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    } as TextStyle,

    // Section layout
    section: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    } as ViewStyle,
    sectionHeader: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: spacing.sm,
        marginLeft: 4,
    } as TextStyle,
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...shadow.subtle,
    } as ViewStyle,
    deleteCard: {
        borderColor: '#FEE2E2',
    } as ViewStyle,

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    } as ViewStyle,
    rowLast: {
        borderBottomWidth: 0,
    } as ViewStyle,
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.sm,
    } as ViewStyle,
    rowRight: {
        alignItems: 'flex-end',
    } as ViewStyle,
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        flexShrink: 0,
    } as ViewStyle,
    rowLabels: {
        flex: 1,
    } as ViewStyle,
    rowLabel: {
        ...typography.body,
        color: colors.textPrimary,
    } as TextStyle,
    rowSubtitle: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    } as TextStyle,

    // Plus badge
    plusBadge: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
    } as ViewStyle,
    plusText: {
        ...typography.small,
        fontWeight: '700',
        color: '#fff',
    } as TextStyle,

    // Footer
    footer: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        gap: 6,
    } as ViewStyle,
    footerVersion: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
    footerTagline: {
        ...typography.small,
        color: colors.textTertiary,
        fontStyle: 'italic',
        textAlign: 'center',
    } as TextStyle,
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        flexWrap: 'wrap',
        justifyContent: 'center',
    } as ViewStyle,
    footerLink: {
        ...typography.small,
        color: colors.textTertiary,
        textDecorationLine: 'underline',
    } as TextStyle,
    footerDot: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
});
