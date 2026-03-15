import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { PerkCard } from '../../components/PerkCard';
import { AppLogo } from '../../components/AppLogo';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { perksApi } from '../../lib/api';

// Types for Perks
interface Perk {
    id: string;
    title: string;
    description: string;
    discountText: string;
    earned?: boolean;
    venue: {
        id: string;
        name: string;
        category: string;
        photos: string[];
    };
}

const CATEGORIES = ['All', 'Food', 'Drinks', 'Activities', 'Coffee'];

export default function PerksScreen() {
    const [perks, setPerks] = useState<Perk[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadPerks();
    }, []);

    const loadPerks = async () => {
        try {
            setLoading(true);
            const data = await perksApi.fetchPerks();
            setPerks(data);
        } catch (error) {
            console.error('Error loading perks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimPerk = (perk: Perk) => {
        setSelectedPerk(perk);
        setShowQR(true);
    };

    const filteredPerks = perks.filter(perk => {
        const matchesCategory = activeCategory === 'All' || perk.venue.category === activeCategory;
        const matchesSearch = perk.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             perk.venue.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <AppLogo size={44} />
                        <View style={styles.headerGreeting}>
                            <Text style={styles.subtitle}>Welcome back</Text>
                            <Text style={typography.h1 as any}>Your Perks</Text>
                        </View>
                    </View>
                    <Pressable style={styles.walletIcon}>
                        <Feather name="credit-card" size={24} color={colors.primary} />
                    </Pressable>
                </View>

                {/* Scannable Card Preview */}
                <Animated.View 
                    entering={FadeInDown.delay(100).duration(800)}
                    style={styles.scannerPreview}
                >
                    <LinearGradient
                        colors={[colors.secondary, colors.secondaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.scannerGradient}
                    >
                        <View style={styles.scannerHeader}>
                            <Text style={styles.scannerTitle}>Quick Scan</Text>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>Ready</Text>
                            </View>
                        </View>
                        <View style={styles.qrPlaceholder}>
                            <Feather name="maximize" size={40} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.qrText}>Tap to open identifier</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Search & Filters */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={20} color={colors.textTertiary} />
                        <TextInput
                            placeholder="Find a venue or deal..."
                            placeholderTextColor={colors.textTertiary}
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <View>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterStrip}
                    >
                        {CATEGORIES.map((category) => (
                            <Pressable
                                key={category}
                                onPress={() => setActiveCategory(category)}
                                style={[
                                    styles.filterChip,
                                    activeCategory === category && styles.filterChipActive
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    activeCategory === category && styles.filterTextActive
                                ]}>
                                    {category}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Perks List */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Deals</Text>
                        <Pressable>
                            <Text style={styles.seeAllText}>See all</Text>
                        </Pressable>
                    </View>

                    {filteredPerks.map((perk, index) => (
                        <Animated.View
                            key={perk.id}
                            entering={FadeInDown.delay(200 + index * 100).duration(600)}
                        >
                            <PerkCard
                                {...perk}
                                earned={perk.earned ?? false}
                                onPress={perk.earned ? () => handleClaimPerk(perk) : undefined}
                            />
                        </Animated.View>
                    ))}
                </View>

                {/* Nearby Venues */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Partner Venues Nearby</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.venueList}
                    >
                        {[1, 2, 3].map((_, i) => (
                            <Animated.View 
                                key={i}
                                entering={FadeInRight.delay(400 + i * 100).duration(600)}
                                style={styles.venueCard}
                            >
                                <View style={styles.venueImagePlaceholder} />
                                <Text style={styles.venueName}>Partner Venue {i + 1}</Text>
                                <Text style={styles.venueDistance}>0.{i + 3}km away</Text>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>

            {/* QR Modal */}
            <Modal
                visible={showQR}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowQR(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.qrModalContent}>
                        <View style={styles.qrHeader}>
                            <Text style={styles.qrModalTitle}>Redeem Perk</Text>
                            <Pressable onPress={() => setShowQR(false)}>
                                <Feather name="x" size={24} color={colors.textPrimary} />
                            </Pressable>
                        </View>

                        {selectedPerk && (
                            <View style={styles.qrBody}>
                                <Text style={styles.qrVenueName}>{selectedPerk.venue.name}</Text>
                                <Text style={styles.qrPerkTitle}>{selectedPerk.title}</Text>
                                
                                <View style={styles.qrContainer}>
                                    <View style={styles.qrMockBody}>
                                        <Feather name="maximize" size={100} color={colors.primary} />
                                        <View style={styles.qrMockPattern}>
                                            {[...Array(16)].map((_, i) => (
                                                <View 
                                                    key={i} 
                                                    style={[
                                                        styles.qrPixel, 
                                                        { backgroundColor: i % 3 === 0 ? colors.primary : 'transparent' }
                                                    ]} 
                                                />
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                <Text style={styles.qrInstructions}>
                                    Show this QR code to the staff at the venue to redeem your perk.
                                </Text>

                                <View style={styles.couponCodeContainer}>
                                    <Text style={styles.couponLabel}>COUPON CODE</Text>
                                    <Text style={styles.couponValue}>RC-{selectedPerk.id.slice(0, 8).toUpperCase()}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerGreeting: {
        marginLeft: spacing.md,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        marginTop: 4,
    },
    walletIcon: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.sm,
    },
    scannerPreview: {
        marginBottom: spacing.xl,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...shadow.lg,
    },
    scannerGradient: {
        padding: spacing.lg,
        height: 160,
        justifyContent: 'space-between',
    },
    scannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scannerTitle: {
        fontSize: 18,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: '#fff',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent,
        marginRight: 6,
    },
    liveText: {
        fontSize: 10,
        fontFamily: 'Lexend_600SemiBold',
        color: '#fff',
        textTransform: 'uppercase',
    },
    qrPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8,
    },
    qrText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Lexend_400Regular',
        marginTop: spacing.xs,
    },
    searchContainer: {
        marginBottom: spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        height: 48,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: 15,
        fontFamily: 'Lexend_400Regular',
        color: colors.textPrimary,
    },
    filterStrip: {
        paddingBottom: spacing.lg,
    },
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontFamily: 'Lexend_500Medium',
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: '#fff',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: colors.textPrimary,
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.primary,
    },
    venueList: {
        paddingRight: spacing.lg,
    },
    venueCard: {
        width: 140,
        marginRight: spacing.md,
    },
    venueImagePlaceholder: {
        width: 140,
        height: 100,
        backgroundColor: colors.sand,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
    },
    venueName: {
        fontSize: 14,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textPrimary,
    },
    venueDistance: {
        fontSize: 12,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    qrModalContent: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        width: '100%',
        padding: spacing.xl,
        ...shadow.lg,
    },
    qrHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    qrModalTitle: {
        fontSize: 22,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: colors.textPrimary,
    },
    qrBody: {
        alignItems: 'center',
    },
    qrVenueName: {
        fontSize: 16,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    qrPerkTitle: {
        fontSize: 20,
        fontFamily: 'Lexend_700Bold',
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    qrContainer: {
        padding: spacing.lg,
        backgroundColor: '#fff',
        borderRadius: radius.lg,
        marginBottom: spacing.xl,
        ...shadow.sm,
    },
    qrMockBody: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    qrMockPattern: {
        position: 'absolute',
        width: 120,
        height: 120,
        flexDirection: 'row',
        flexWrap: 'wrap',
        opacity: 0.2,
    },
    qrPixel: {
        width: 30,
        height: 30,
    },
    qrInstructions: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    couponCodeContainer: {
        backgroundColor: colors.sand,
        padding: spacing.md,
        borderRadius: radius.md,
        width: '100%',
        alignItems: 'center',
    },
    couponLabel: {
        fontSize: 10,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textTertiary,
        marginBottom: 4,
        letterSpacing: 1,
    },
    couponValue: {
        fontSize: 24,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: colors.textPrimary,
        letterSpacing: 2,
    },
});
