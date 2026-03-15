import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    ViewStyle,
    TextStyle,
    ImageStyle,
    Dimensions,
    Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow, typography } from '../../constants/tokens';
import { hangoutApi, venueApi, profileApi } from '../../lib/api';
import Animated, {
    FadeInDown,
    FadeInRight,
    Layout,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { VenuePromotionCard, PartnerVenue } from '../../components/VenuePromotionCard';
import { VenueDetailSheet } from '../../components/VenueDetailSheet';
import { HangoutsSubToggle } from '../../components/HangoutsSubToggle';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

interface Hangout {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    startTime: string;
    location: string;
    category: string;
    isPublic: boolean;
    spotsLeft: number;
    attendees: { imageUrl: string }[];
    host: { name: string; imageUrl: string };
    activePerksCode?: string | null;
    feedbackSubmitted?: boolean;
    venue?: { id: string; name: string };
}

type DiscoveryItem =
    | { type: 'hangout'; data: Hangout }
    | { type: 'venue'; data: PartnerVenue };

// ─── Category filter config ──────────────────────────────────────────────────

const FIXED_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'suggested', label: 'Suggested' },
    { id: 'this_week', label: 'This Week' },
];

const VENUE_TYPE_CATEGORIES = [
    { id: 'cafe', label: 'Cafe' },
    { id: 'bar', label: 'Bar' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'activities', label: 'Activities' },
];

// Map interest tag slugs to display labels
const INTEREST_LABELS: Record<string, string> = {
    'board-games': 'Board Games',
    'hiking': 'Hiking',
    'coffee': 'Coffee',
    'trivia': 'Trivia',
    'karaoke': 'Karaoke',
    'yoga': 'Yoga',
    'concerts': 'Live Music',
    'running': 'Running',
    'tennis': 'Tennis',
    'wine': 'Wine',
    'craft-beer': 'Craft Beer',
    'museums': 'Museums',
};

// ─── HangoutCard ─────────────────────────────────────────────────────────────

const HangoutCard = ({
    hangout,
    index,
    isPast = false,
}: {
    hangout: Hangout;
    index: number;
    isPast?: boolean;
}) => {
    const router = useRouter();
    const date = new Date(hangout.startTime);
    const dateString = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const inFeedbackWindow = isPast &&
        date > twentyFourHoursAgo &&
        date < now &&
        hangout.feedbackSubmitted === false;

    const handleDoItAgain = () => {
        const params = new URLSearchParams();
        if (hangout.venue?.id) params.set('venueId', hangout.venue.id);
        if (hangout.category) params.set('category', hangout.category);
        router.push(`/hangouts/create?${params.toString()}` as any);
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).duration(600)}
            layout={Layout.springify()}
            style={[styles.cardWrapper, isPast && styles.cardWrapperPast]}
        >
            <TouchableOpacity
                style={[styles.card, isPast && styles.cardPast]}
                onPress={() => router.push(`/hangouts/${hangout.id}` as any)}
                activeOpacity={0.9}
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: hangout.imageUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800' }}
                        style={[styles.cardImage, isPast && styles.cardImagePast]}
                    />
                    {hangout.category === 'board_games' && !isPast && (
                        <View style={styles.repeatBadge}>
                            <Feather name="refresh-cw" size={10} color="#2E7D32" />
                            <Text style={styles.repeatBadgeText}>Every Friday</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{hangout.title}</Text>

                    <View style={styles.metaInfo}>
                        <View style={styles.metaRow}>
                            <Feather name="map-pin" size={12} color={colors.textTertiary} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {hangout.location || 'Local Spot'}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Feather name="clock" size={12} color={colors.textTertiary} />
                            <Text style={styles.metaText}>
                                {dateString} at {timeString}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.attendeesContainer}>
                            {hangout.attendees.slice(0, 3).map((attendee, i) => (
                                <Image
                                    key={i}
                                    source={{ uri: attendee.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }}
                                    style={[styles.attendeeAvatar, { marginLeft: i > 0 ? -12 : 0, zIndex: 10 - i }]}
                                />
                            ))}
                        </View>

                        {/* Past card actions */}
                        {isPast ? (
                            <TouchableOpacity
                                style={inFeedbackWindow ? styles.feedbackChip : styles.doItAgainChip}
                                onPress={inFeedbackWindow
                                    ? () => router.push(`/hangouts/${hangout.id}` as any)
                                    : handleDoItAgain
                                }
                            >
                                <Text style={inFeedbackWindow ? styles.feedbackChipText : styles.doItAgainText}>
                                    {inFeedbackWindow ? "How'd it go? →" : "Do it again →"}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.cardFooterRight}>
                                {/* Deal unlocked chip for upcoming */}
                                {hangout.activePerksCode && (
                                    <TouchableOpacity
                                        style={styles.dealChip}
                                        onPress={() => router.push(`/perks?code=${hangout.activePerksCode}` as any)}
                                    >
                                        <Text style={styles.dealChipText}>🎁 Deal unlocked</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={styles.spotsBadge}>
                                    <Feather name="users" size={12} color={colors.textTertiary} />
                                    <Text style={styles.spotsText}>{hangout.spotsLeft} spots left</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HangoutsScreen() {
    const router = useRouter();

    // Core state
    const [activeTab, setActiveTab] = useState<'my_plans' | 'discover'>('discover');
    const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [profile, setProfile] = useState<any>(null);

    // Discover state
    const [hangouts, setHangouts] = useState<Hangout[]>([]);
    const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Featured venues state
    const [featuredVenues, setFeaturedVenues] = useState<PartnerVenue[]>([]);
    const [venuesLoading, setVenuesLoading] = useState(false);

    // My Plans state
    const [myHangouts, setMyHangouts] = useState<Hangout[]>([]);
    const [myHangoutsLoading, setMyHangoutsLoading] = useState(false);
    const [myHangoutsError, setMyHangoutsError] = useState(false);

    // Venue detail sheet
    const [selectedVenue, setSelectedVenue] = useState<PartnerVenue | null>(null);

    // Geolocation
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // ── Geolocation (once, on mount) ─────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            }
        })();
    }, []);

    // ── Profile fetch (once) ─────────────────────────────────────────────────
    useEffect(() => {
        profileApi.get().then(setProfile).catch(() => {});
    }, []);

    // ── Discovery hangouts ───────────────────────────────────────────────────
    const fetchDiscovery = useCallback(async () => {
        setLoading(true);
        try {
            const categoryParam = ['all', 'suggested', 'this_week'].includes(activeCategory)
                ? undefined
                : activeCategory;

            const data = await hangoutApi.getDiscovery({
                category: categoryParam,
                suggested: activeCategory === 'suggested' ? true : undefined,
                thisWeek: activeCategory === 'this_week' ? true : undefined,
                lat: userLocation?.lat,
                lng: userLocation?.lng,
            });

            if (activeCategory === 'suggested') {
                setDiscoveryItems(Array.isArray(data) ? data as DiscoveryItem[] : []);
            } else {
                setHangouts(Array.isArray(data) ? data as Hangout[] : []);
            }
        } catch (error) {
            console.error('fetchDiscovery error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeCategory, userLocation]);

    // ── Featured venues ──────────────────────────────────────────────────────
    const fetchFeaturedVenues = useCallback(async () => {
        if (activeCategory === 'suggested') return; // venues come from the merged feed
        setVenuesLoading(true);
        try {
            const categoryParam = ['all', 'this_week'].includes(activeCategory)
                ? undefined
                : activeCategory;
            const data = await venueApi.getFeatured({
                lat: userLocation?.lat,
                lng: userLocation?.lng,
                category: categoryParam,
            });
            setFeaturedVenues(Array.isArray(data) ? data as PartnerVenue[] : []);
        } catch {
            setFeaturedVenues([]);
        } finally {
            setVenuesLoading(false);
        }
    }, [activeCategory, userLocation]);

    // ── My hangouts ──────────────────────────────────────────────────────────
    const fetchMyHangouts = useCallback(async () => {
        setMyHangoutsLoading(true);
        setMyHangoutsError(false);
        try {
            const data = await hangoutApi.getMy();
            setMyHangouts(Array.isArray(data) ? data as Hangout[] : []);
        } catch {
            setMyHangoutsError(true);
        } finally {
            setMyHangoutsLoading(false);
        }
    }, []);

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab === 'discover') {
            fetchDiscovery();
            fetchFeaturedVenues();
        }
    }, [activeTab, activeCategory, userLocation]);

    useEffect(() => {
        if (activeTab === 'my_plans') {
            fetchMyHangouts();
        }
    }, [activeTab]);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'discover') {
            fetchDiscovery();
            fetchFeaturedVenues();
        } else {
            fetchMyHangouts().finally(() => setRefreshing(false));
        }
    };

    // ── Derived data ─────────────────────────────────────────────────────────
    const now = new Date();
    const upcomingHangouts = myHangouts.filter(h => new Date(h.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const pastHangouts = myHangouts.filter(h => new Date(h.startTime) <= now)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Build category chips from profile interests + fixed + venue type
    const interestChips = profile?.interests
        ? (profile.interests as string[])
            .filter((id: string) => INTEREST_LABELS[id])
            .map((id: string) => ({ id, label: INTEREST_LABELS[id] }))
        : [];
    const allCategories = [...FIXED_CATEGORIES, ...interestChips, ...VENUE_TYPE_CATEGORIES];

    const showVenueStrip = activeTab === 'discover' && activeCategory !== 'suggested' && featuredVenues.length > 0;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleVenuePress = (venue: PartnerVenue) => setSelectedVenue(venue);
    const handleVenueDetailClose = () => setSelectedVenue(null);
    const handlePlanHangout = (venue: PartnerVenue) => {
        setSelectedVenue(null);
        router.push(`/hangouts/create?venueId=${venue.id}&category=${venue.category}` as any);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>Hangouts</Text>
                        <Text style={styles.headerSubtitle}>
                            {activeTab === 'discover'
                                ? `${hangouts.length || discoveryItems.length} happening near you`
                                : `${upcomingHangouts.length} upcoming`
                            }
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerHostButton}
                        onPress={() => router.push('/hangouts/create' as any)}
                    >
                        <Feather name="plus" size={18} color="#FFF" />
                        <Text style={styles.headerHostButtonText}>Host</Text>
                    </TouchableOpacity>
                </View>

                {/* Main toggle */}
                <View style={styles.mainToggleContainer}>
                    <TouchableOpacity
                        style={[styles.mainToggleButton, activeTab === 'my_plans' && styles.mainToggleButtonActive]}
                        onPress={() => setActiveTab('my_plans')}
                    >
                        <Feather name="calendar" size={16} color={activeTab === 'my_plans' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.mainToggleText, activeTab === 'my_plans' && styles.mainToggleTextActive]}>My Plans</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.mainToggleButton, activeTab === 'discover' && styles.mainToggleButtonActive]}
                        onPress={() => setActiveTab('discover')}
                    >
                        <MaterialCommunityIcons name="compass-outline" size={18} color={activeTab === 'discover' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.mainToggleText, activeTab === 'discover' && styles.mainToggleTextActive]}>Discover</Text>
                    </TouchableOpacity>
                </View>

                {/* Discover-only: Activity Planner + category filter */}
                {activeTab === 'discover' && (
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <TouchableOpacity
                            onPress={() => router.push('/hangouts/plan' as any)}
                            activeOpacity={0.9}
                            style={styles.activityPlannerBannerWrapper}
                        >
                            <LinearGradient
                                colors={['#FF7F61', '#FF9F81']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.activityPlannerBanner}
                            >
                                <View style={styles.plannerBannerContent}>
                                    <View style={styles.plannerBannerLeft}>
                                        <Text style={styles.plannerStarEmoji}>✨</Text>
                                        <Text style={styles.plannerBannerTitle}>Activity Planner — find the perfect venue</Text>
                                    </View>
                                    <Feather name="chevron-right" size={18} color="#FFFFFF" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterStrip}
                        >
                            {allCategories.map((cat, idx) => (
                                <Animated.View
                                    key={cat.id}
                                    entering={FadeInRight.delay(idx * 40).duration(400)}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.filterChip,
                                            activeCategory === cat.id && styles.filterChipActive,
                                        ]}
                                        onPress={() => setActiveCategory(cat.id)}
                                    >
                                        <Text style={[
                                            styles.filterLabel,
                                            activeCategory === cat.id && styles.filterLabelActive,
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}
            </View>

            {/* Body */}
            {loading && !refreshing && activeTab === 'discover' ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {activeTab === 'my_plans' ? (
                        /* ── My Plans ─────────────────────────────────────── */
                        <View>
                            <View style={styles.subToggleWrapper}>
                                <HangoutsSubToggle value={activeSubTab} onChange={setActiveSubTab} />
                            </View>

                            {myHangoutsLoading ? (
                                <View style={styles.centerContainer}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : myHangoutsError ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyTitle}>Something went wrong</Text>
                                    <Text style={styles.emptyText}>
                                        {activeSubTab === 'past'
                                            ? "Couldn't load past hangouts"
                                            : "Couldn't load your plans"}
                                    </Text>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={fetchMyHangouts}>
                                        <Text style={styles.secondaryButtonText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : activeSubTab === 'upcoming' ? (
                                upcomingHangouts.length > 0 ? (
                                    <View style={styles.grid}>
                                        {upcomingHangouts.map((h, i) => (
                                            <HangoutCard key={h.id} hangout={h} index={i} isPast={false} />
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.myPlansEmptyState}>
                                        <Text style={styles.emptyTitle}>No plans yet</Text>
                                        <Text style={styles.emptyText}>
                                            Join a hangout or host your own to see your upcoming plans here.
                                        </Text>
                                        <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveTab('discover')}>
                                            <Text style={styles.primaryButtonText}>Browse Hangouts</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.outlineButton} onPress={() => router.push('/hangouts/create' as any)}>
                                            <Feather name="plus" size={18} color={colors.textPrimary} />
                                            <Text style={styles.outlineButtonText}>Host a Hangout</Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            ) : (
                                /* Past */
                                pastHangouts.length > 0 ? (
                                    <View style={styles.grid}>
                                        {pastHangouts.map((h, i) => (
                                            <HangoutCard key={h.id} hangout={h} index={i} isPast />
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textTertiary} />
                                        <Text style={styles.emptyTitle}>No past hangouts</Text>
                                        <Text style={styles.emptyText}>Your hangout history will appear here.</Text>
                                    </View>
                                )
                            )}
                        </View>
                    ) : (
                        /* ── Discover ─────────────────────────────────────── */
                        <View>
                            {/* "For You" venue strip */}
                            {showVenueStrip && (
                                <View style={styles.venueStripSection}>
                                    <Text style={styles.venueStripTitle}>🎁 Venues with deals near you</Text>
                                    {venuesLoading ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueStripContent}>
                                            {[0, 1, 2].map(i => (
                                                <View key={i} style={styles.venueSkeletonCard} />
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueStripContent}>
                                            {featuredVenues.map(v => (
                                                <VenuePromotionCard
                                                    key={v.id}
                                                    venue={v}
                                                    displayContext="strip"
                                                    onPress={() => handleVenuePress(v)}
                                                />
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            )}

                            {/* Hangouts grid or Suggested merged feed */}
                            <View style={styles.grid}>
                                {activeCategory === 'suggested' ? (
                                    discoveryItems.length > 0 ? (
                                        discoveryItems.map((item, i) =>
                                            item.type === 'hangout' ? (
                                                <HangoutCard key={item.data.id} hangout={item.data} index={i} />
                                            ) : (
                                                <VenuePromotionCard
                                                    key={item.data.id}
                                                    venue={item.data}
                                                    displayContext="feed"
                                                    onPress={() => handleVenuePress(item.data)}
                                                />
                                            )
                                        )
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <MaterialCommunityIcons name="calendar-search" size={48} color={colors.textTertiary} />
                                            <Text style={styles.emptyTitle}>Nothing suggested yet</Text>
                                            <Text style={styles.emptyText}>Complete your profile interests to get personalised suggestions.</Text>
                                        </View>
                                    )
                                ) : (
                                    hangouts.length > 0 ? (
                                        hangouts.map((h, i) => (
                                            <HangoutCard key={h.id} hangout={h} index={i} />
                                        ))
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <MaterialCommunityIcons name="calendar-search" size={48} color={colors.textTertiary} />
                                            <Text style={styles.emptyTitle}>No hangouts found</Text>
                                            <Text style={styles.emptyText}>Try a different category or start your own!</Text>
                                            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/hangouts/create' as any)}>
                                                <Text style={styles.secondaryButtonText}>Host a Hangout</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Venue detail sheet */}
            {selectedVenue && (
                <VenueDetailSheet
                    venue={selectedVenue}
                    onClose={handleVenueDetailClose}
                    onPlanHangout={handlePlanHangout}
                />
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAF8' } as ViewStyle,
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 } as ViewStyle,
    header: { backgroundColor: '#FCFBF9', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 0 } as ViewStyle,
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md } as ViewStyle,
    headerLeft: { flexDirection: 'column', justifyContent: 'center' } as ViewStyle,
    headerTitle: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 32, color: '#2D2D2D', letterSpacing: -1 } as TextStyle,
    headerSubtitle: { ...typography.bodyRegular, color: colors.textSecondary, fontSize: 14, marginTop: 2 } as TextStyle,
    headerHostButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 } as ViewStyle,
    headerHostButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 } as TextStyle,
    mainToggleContainer: { flexDirection: 'row', backgroundColor: '#F5F3F0', padding: 4, borderRadius: 16, marginHorizontal: spacing.lg, marginBottom: spacing.lg } as ViewStyle,
    mainToggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 } as ViewStyle,
    mainToggleButtonActive: { backgroundColor: '#FFFFFF', ...shadow.subtle } as ViewStyle,
    mainToggleText: { ...typography.bodyMedium, color: colors.textSecondary, fontWeight: '600' } as TextStyle,
    mainToggleTextActive: { color: colors.primary, fontWeight: '700' } as TextStyle,
    activityPlannerBannerWrapper: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, ...shadow.md } as ViewStyle,
    activityPlannerBanner: { borderRadius: 16, padding: 16 } as ViewStyle,
    plannerBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
    plannerBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
    plannerStarEmoji: { fontSize: 18 } as TextStyle,
    plannerBannerTitle: { fontSize: 15, fontFamily: 'Lexend_600SemiBold', color: '#FFFFFF' } as TextStyle,
    filterStrip: { paddingLeft: spacing.lg, paddingRight: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm } as ViewStyle,
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3F0', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.full } as ViewStyle,
    filterChipActive: { backgroundColor: '#2D2D2D' } as ViewStyle,
    filterLabel: { ...typography.small, color: '#6E6E6E', fontWeight: '600' } as TextStyle,
    filterLabelActive: { color: '#FFFFFF' } as TextStyle,
    scrollContent: { paddingBottom: 100 } as ViewStyle,
    subToggleWrapper: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg } as ViewStyle,
    // Venue strip
    venueStripSection: { marginBottom: spacing.lg } as ViewStyle,
    venueStripTitle: { ...typography.bodyBold, color: '#2D2D2D', paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: 16 } as TextStyle,
    venueStripContent: { paddingLeft: spacing.lg, paddingRight: spacing.sm } as ViewStyle,
    venueSkeletonCard: { width: 260, height: 140, borderRadius: radius.xl, backgroundColor: '#EEEBE6', marginRight: spacing.md } as ViewStyle,
    // Grid
    grid: { paddingHorizontal: spacing.lg, paddingTop: spacing.md } as ViewStyle,
    // Cards
    cardWrapper: { marginBottom: spacing.lg } as ViewStyle,
    cardWrapperPast: { opacity: 0.75 } as ViewStyle,
    card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.card } as ViewStyle,
    cardPast: { shadowOpacity: 0 } as ViewStyle,
    imageContainer: { width: '100%', height: 180 } as ViewStyle,
    cardImage: { width: '100%', height: '100%' } as ImageStyle,
    cardImagePast: { opacity: 0.7 } as ImageStyle,
    repeatBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md, gap: 4 } as ViewStyle,
    repeatBadgeText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' } as TextStyle,
    cardBody: { padding: spacing.lg } as ViewStyle,
    cardTitle: { ...typography.h3, color: '#2D2D2D', marginBottom: spacing.sm } as TextStyle,
    metaInfo: { marginBottom: spacing.md, gap: 4 } as ViewStyle,
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
    metaText: { ...typography.small, color: colors.textSecondary } as TextStyle,
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm } as ViewStyle,
    cardFooterRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as ViewStyle,
    attendeesContainer: { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
    attendeeAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFF' } as ImageStyle,
    spotsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
    spotsText: { ...typography.small, color: colors.textTertiary, fontWeight: '600' } as TextStyle,
    dealChip: { backgroundColor: `${colors.primary}12`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full } as ViewStyle,
    dealChipText: { fontSize: 11, fontWeight: '600', color: colors.primary } as TextStyle,
    doItAgainChip: { paddingVertical: 4 } as ViewStyle,
    doItAgainText: { fontSize: 13, fontWeight: '700', color: colors.primary } as TextStyle,
    feedbackChip: { paddingVertical: 4 } as ViewStyle,
    feedbackChipText: { fontSize: 13, fontWeight: '700', color: '#E67E22' } as TextStyle,
    // Empty states
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm } as ViewStyle,
    emptyIconContainer: { width: 80, height: 80, borderRadius: radius.xxl, backgroundColor: colors.sand, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg } as ViewStyle,
    emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 } as TextStyle,
    emptyText: { ...typography.bodyRegular, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl } as TextStyle,
    myPlansEmptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: 80 } as ViewStyle,
    secondaryButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.xl, backgroundColor: colors.primary, ...shadow.md } as ViewStyle,
    secondaryButtonText: { ...typography.bodyBold, color: colors.surface } as TextStyle,
    primaryButton: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 24, width: '100%', alignItems: 'center', marginBottom: spacing.md, ...shadow.md } as ViewStyle,
    primaryButtonText: { ...typography.bodyBold, color: '#FFFFFF', fontSize: 16 } as TextStyle,
    outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24, width: '100%', borderWidth: 1, borderColor: colors.border, backgroundColor: '#F5F5F5', gap: 8 } as ViewStyle,
    outlineButtonText: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 } as TextStyle,
});
