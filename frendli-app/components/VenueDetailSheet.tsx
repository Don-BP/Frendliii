import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Modal,
    ViewStyle,
    TextStyle,
    ImageStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../constants/tokens';
import { PartnerVenue } from './VenuePromotionCard';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface VenueDetailSheetProps {
    venue: PartnerVenue;
    onClose: () => void;
    onPlanHangout: (venue: PartnerVenue) => void;
}

export function VenueDetailSheet({ venue, onClose, onPlanHangout }: VenueDetailSheetProps) {
    const imageUrl = venue.photos[0] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';

    const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todayHours = venue.openingHours?.[todayKey];

    return (
        <Modal
            animationType="slide"
            transparent
            visible
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Close button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Feather name="x" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Hero image */}
                        <Image source={{ uri: imageUrl }} style={styles.heroImage} />

                        {/* Venue name + badges */}
                        <View style={styles.nameRow}>
                            <Text style={styles.venueName}>{venue.name}</Text>
                            {venue.partnerTier === 'premier' && (
                                <View style={styles.featuredBadge}>
                                    <Text style={styles.featuredBadgeText}>Featured</Text>
                                </View>
                            )}
                        </View>

                        {/* Category + distance */}
                        <View style={styles.metaRow}>
                            <Feather name="map-pin" size={13} color={colors.textTertiary} />
                            <Text style={styles.metaText}>
                                {venue.address}
                                {venue.distance ? ` · ${venue.distance}` : ''}
                            </Text>
                        </View>

                        {/* Deal */}
                        {venue.dealText ? (
                            <View style={styles.dealCard}>
                                <Text style={styles.dealEmoji}>🎁</Text>
                                <View>
                                    <Text style={styles.dealLabel}>RealConnect Deal</Text>
                                    <Text style={styles.dealText}>{venue.dealText}</Text>
                                    <Text style={styles.dealNote}>Unlocks when you confirm a hangout here</Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Opening hours */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Opening Hours</Text>
                            {venue.openingHours ? (
                                DAYS.map(day => {
                                    const hours = venue.openingHours![day];
                                    return (
                                        <View key={day} style={styles.hoursRow}>
                                            <Text style={[
                                                styles.dayLabel,
                                                day === todayKey && styles.todayLabel
                                            ]}>
                                                {day.charAt(0).toUpperCase() + day.slice(1)}
                                                {day === todayKey ? ' (today)' : ''}
                                            </Text>
                                            <Text style={styles.hoursText}>
                                                {hours ? `${hours.open} – ${hours.close}` : 'Closed'}
                                            </Text>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.noHoursText}>Opening hours not available</Text>
                            )}
                        </View>
                    </ScrollView>

                    {/* CTA */}
                    <View style={styles.ctaContainer}>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => onPlanHangout(venue)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.ctaText}>Plan a Hangout Here</Text>
                            <Feather name="arrow-right" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    } as ViewStyle,
    sheet: {
        backgroundColor: '#FAFAF8',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 32,
    } as ViewStyle,
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    } as ViewStyle,
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    } as ViewStyle,
    scrollContent: {
        paddingBottom: spacing.xl,
    } as ViewStyle,
    heroImage: {
        width: '100%',
        height: 200,
    } as ImageStyle,
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xs,
    } as ViewStyle,
    venueName: {
        ...typography.h2,
        color: '#2D2D2D',
        flex: 1,
    } as TextStyle,
    featuredBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    } as ViewStyle,
    featuredBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    } as TextStyle,
    metaRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    } as ViewStyle,
    metaText: {
        ...typography.small,
        color: colors.textSecondary,
        flex: 1,
    } as TextStyle,
    dealCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: `${colors.primary}10`,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
    } as ViewStyle,
    dealEmoji: {
        fontSize: 24,
        marginTop: 2,
    } as TextStyle,
    dealLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    } as TextStyle,
    dealText: {
        ...typography.bodyBold,
        color: '#2D2D2D',
        marginBottom: 4,
    } as TextStyle,
    dealNote: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    } as ViewStyle,
    sectionTitle: {
        ...typography.bodyBold,
        color: '#2D2D2D',
        marginBottom: spacing.sm,
    } as TextStyle,
    hoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    } as ViewStyle,
    dayLabel: {
        ...typography.small,
        color: colors.textSecondary,
    } as TextStyle,
    todayLabel: {
        color: colors.primary,
        fontWeight: '700',
    } as TextStyle,
    hoursText: {
        ...typography.small,
        color: colors.textPrimary,
    } as TextStyle,
    noHoursText: {
        ...typography.small,
        color: colors.textTertiary,
    } as TextStyle,
    ctaContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    } as ViewStyle,
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 24,
        paddingVertical: 16,
        gap: 8,
        ...shadow.md,
    } as ViewStyle,
    ctaText: {
        ...typography.bodyBold,
        color: '#FFFFFF',
        fontSize: 16,
    } as TextStyle,
});
