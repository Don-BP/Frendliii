import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    Dimensions,
    TextInput,
    Platform,
    ImageStyle,
    ViewStyle,
    TextStyle
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../constants/tokens';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TEMPLATES = [
    {
        id: 'coffee',
        title: 'Coffee & Catch Up',
        description: 'Low-pressure, classic first meetup. A coffee can be 20 mins or 2 hours.',
        emoji: '☕',
        groupSize: '1-2',
        duration: '45-90 min',
        vibe: 'Relaxed',
        color: '#E8F5E9',
        textColor: '#2E7D32',
    },
    {
        id: 'board_games',
        title: 'Board Game Night',
        description: 'Games break the ice instantly — silence is okay when it\'s your turn!',
        emoji: '🎲',
        groupSize: '2-5',
        duration: '2-3 hrs',
        vibe: 'Fun',
        color: '#FFF3E0',
        textColor: '#E65100',
    },
    {
        id: 'sunset',
        title: 'Sunset Walk',
        description: 'Walking side-by-side makes conversation flow naturally.',
        emoji: '🌅',
        groupSize: '2-4',
        duration: '1-1.5 hrs',
        vibe: 'Active',
        color: '#E3F2FD',
        textColor: '#1565C0',
    },
    {
        id: 'hiking',
        title: 'Wildwood Trail',
        description: 'Get deep into nature. Forest bathing and fresh air.',
        emoji: '🌲',
        groupSize: '3-6',
        duration: '3-4 hrs',
        vibe: 'Adventurous',
        color: '#F1F8E9',
        textColor: '#33691E',
    },
    {
        id: 'movies',
        title: 'Indie Cinema',
        description: 'Watch a cult classic then discuss it over drinks.',
        emoji: '🎬',
        groupSize: '2-8',
        duration: '3 hrs',
        vibe: 'Cultured',
        color: '#F3E5F5',
        textColor: '#4A148C',
    }
];

const VENUE_CATEGORIES = [
    { id: 'all', label: 'All', icon: 'sparkles' },
    { id: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
    { id: 'food', label: 'Food', icon: 'restaurant-outline' },
    { id: 'games', label: 'Games', icon: 'game-controller-outline' },
    { id: 'outdoors', label: 'Outdoors', icon: 'leaf-outline' },
];

const VENUES = [
    {
        id: '1',
        name: 'Multnomah Falls Trail',
        description: 'One of the most iconic hikes in the Pacific Northwest. Breathtaking views and easy conversation.',
        imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
        tags: ['Outdoors', 'Active', 'Moderate'],
        isOpen: true,
        type: 'First Meetup',
        rating: 4.8,
        distance: '12.5 mi',
        price: 'Free',
        vibe: 'Scenic'
    },
    {
        id: '2',
        name: 'Lucky Strike Lanes',
        description: 'Modern bowling alley with craft cocktails. Friendly competition breaks the ice instantly.',
        imageUrl: 'https://images.unsplash.com/photo-1538350665821-09514039281e?w=800',
        tags: ['Games', 'Evening Out', 'Active'],
        isOpen: false,
        type: 'Premier',
        offer: 'First hour free on weekdays',
        rating: 4.5,
        reviewCount: 187,
        distance: '0.5 mi',
        price: '$$',
        vibe: 'Lively'
    },
    {
        id: '3',
        name: 'Heart Coffee Roasters',
        description: 'Award-winning specialty coffee in a cozy, low-key atmosphere. Perfect for one-on-ones.',
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
        tags: ['Coffee', 'First Meetup', 'Cozy'],
        isOpen: true,
        type: 'Perks',
        offer: 'Free drink with any food',
        rating: 4.7,
        reviewCount: 218,
        distance: '0.8 mi',
        price: '$',
        vibe: 'Quiet'
    },
    {
        id: '4',
        name: 'Guardian Games',
        description: 'Huge board game store with an in-house cafe and massive library of games to play.',
        imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800',
        tags: ['Games', 'Social', 'Indoors'],
        isOpen: true,
        type: 'Social Club',
        rating: 4.9,
        reviewCount: 342,
        distance: '1.2 mi',
        price: '$',
        vibe: 'Geeky'
    },
    {
        id: '5',
        name: 'Laurelhurst Park',
        description: 'Beautiful park with a duck pond. Great for group picnics or casual afternoon walks.',
        imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800',
        tags: ['Outdoors', 'Relaxed', 'Picnic'],
        isOpen: true,
        type: 'Nature',
        rating: 4.6,
        distance: '2.1 mi',
        price: 'Free',
        vibe: 'Serene'
    }
];

export default function ActivityPlannerScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [favorites, setFavorites] = useState<string[]>([]);

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFF1EE', '#FCFBF9']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Activity Planner</Text>
                    <Text style={styles.headerSubtitle}>Find the perfect venue</Text>
                </View>
                <TouchableOpacity style={styles.heartButton}>
                    <Feather name="heart" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search venues, activities..."
                        placeholderTextColor={colors.textTertiary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Hangout Templates */}
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FF7F61" />
                    <Text style={styles.sectionTitle}>Hangout Templates</Text>
                </View>
                <Text style={styles.sectionSubtitle}>Pre-built plans, zero effort</Text>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.templatesScroll}
                >
                    {TEMPLATES.map((template, index) => (
                        <Animated.View 
                            key={template.id}
                            entering={FadeInRight.delay(index * 100).duration(500)}
                        >
                            <TouchableOpacity 
                                style={styles.templateCard} 
                                activeOpacity={0.9}
                                onPress={() => router.push({
                                    pathname: '/hangouts/create',
                                    params: { 
                                        templateId: template.id,
                                        title: template.title,
                                        category: template.id === 'board_games' ? 'games' : 
                                                 template.id === 'coffee' ? 'coffee' : 
                                                 template.id === 'sunset' ? 'outdoors' : 'other'
                                    }
                                })}
                            >
                                <View style={styles.templateEmojiContainer}>
                                    <Text style={styles.templateEmoji}>{template.emoji}</Text>
                                </View>
                                <Text style={styles.templateTitle}>{template.title}</Text>
                                <Text style={styles.templateDesc} numberOfLines={2}>{template.description}</Text>
                                
                                <View style={styles.templateMeta}>
                                    <View style={styles.metaItem}>
                                        <Feather name="users" size={12} color={colors.textTertiary} />
                                        <Text style={styles.metaText}>{template.groupSize}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Feather name="clock" size={12} color={colors.textTertiary} />
                                        <Text style={styles.metaText}>{template.duration}</Text>
                                    </View>
                                </View>
                                
                                <View style={[styles.vibeBadge, { backgroundColor: template.color }]}>
                                    <Text style={[styles.vibeBadgeText, { color: template.textColor }]}>{template.vibe}</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>

                {/* All Venues */}
                <View style={styles.sectionHeader}>
                    <Feather name="trending-up" size={20} color={colors.textPrimary} />
                    <Text style={styles.sectionTitle}>All Venues</Text>
                </View>

                {/* Venue Categories */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.categoryScroll}
                >
                    {VENUE_CATEGORIES.map((cat) => (
                        <TouchableOpacity 
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                activeCategory === cat.id && styles.categoryChipActive
                            ]}
                            onPress={() => setActiveCategory(cat.id)}
                        >
                            <Ionicons 
                                name={cat.icon as any} 
                                size={18} 
                                color={activeCategory === cat.id ? '#FFF' : colors.textPrimary} 
                            />
                            <Text style={[
                                styles.categoryLabel,
                                activeCategory === cat.id && styles.categoryLabelActive
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Venue List */}
                <View style={styles.venueList}>
                    {VENUES
                        .filter(v => {
                            if (activeCategory === 'all') return true;
                            return v.tags.some(t => t.toLowerCase().includes(activeCategory.toLowerCase()));
                        })
                        .filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((venue, index) => (
                        <Animated.View 
                            key={venue.id}
                            entering={FadeInDown.delay(index * 100).duration(600)}
                        >
                            <TouchableOpacity 
                                style={styles.venueCard} 
                                activeOpacity={0.9}
                                onPress={() => router.push({
                                    pathname: '/hangouts/create',
                                    params: { 
                                        venueId: venue.id, 
                                        venueName: venue.name,
                                        category: venue.tags[0].toLowerCase() === 'outdoors' ? 'outdoors' :
                                                 venue.tags[0].toLowerCase() === 'coffee' ? 'coffee' :
                                                 venue.tags[0].toLowerCase() === 'groups' ? 'games' : 'other'
                                    }
                                })}
                            >
                                <View style={styles.venueImageContainer}>
                                    <Image source={{ uri: venue.imageUrl }} style={styles.venueImage} />
                                    <View style={styles.venueImageBadges}>
                                        {venue.isOpen !== undefined && (
                                            <View style={styles.openBadge}>
                                                <View style={[styles.dot, { backgroundColor: venue.isOpen ? colors.success : colors.error }]} />
                                                <Text style={styles.openText}>{venue.isOpen ? 'Open Now' : 'Closed'}</Text>
                                            </View>
                                        )}
                                        <TouchableOpacity 
                                            style={[
                                                styles.favoriteButtonIcon,
                                                favorites.includes(venue.id) && { backgroundColor: 'rgba(232, 92, 92, 0.4)' }
                                            ]}
                                            onPress={() => {
                                                if (favorites.includes(venue.id)) {
                                                    setFavorites(favorites.filter(id => id !== venue.id));
                                                } else {
                                                    setFavorites([...favorites, venue.id]);
                                                }
                                            }}
                                        >
                                            <Feather name="heart" size={18} color={favorites.includes(venue.id) ? '#FF4B4B' : "#FFF"} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.firstMeetupBadge}>
                                        <Text style={styles.firstMeetupText}>First Meetup ✓</Text>
                                    </View>
                                </View>

                                <View style={styles.venueBody}>
                                    <View style={styles.venueHeaderRow}>
                                        <View style={styles.venueMainBadges}>
                                            {venue.type === 'Premier' ? (
                                                <View style={styles.premierBadge}>
                                                    <Feather name="star" size={10} color="#E65100" />
                                                    <Text style={styles.premierText}>Premier</Text>
                                                </View>
                                            ) : venue.type === 'Perks' ? (
                                                <View style={styles.perksBadge}>
                                                    <Feather name="tag" size={10} color="#E53935" />
                                                    <Text style={styles.perksText}>Perks</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <View style={styles.vibeLabelContainer}>
                                            <View style={[styles.vibeDot, { backgroundColor: '#FF7F61' }]} />
                                            <Text style={styles.vibeLabelText}>{venue.vibe}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.venueName}>{venue.name}</Text>
                                    <Text style={styles.venueDesc} numberOfLines={2}>{venue.description}</Text>
                                    
                                    {venue.offer && (
                                        <View style={styles.offerBadgeContainer}>
                                            <Feather name="tag" size={14} color="#2E7D32" />
                                            <Text style={styles.offerBadgeText}>{venue.offer}</Text>
                                        </View>
                                    )}

                                    <View style={styles.venueDetails}>
                                        <View style={styles.detailItem}>
                                            <Feather name="map-pin" size={12} color={colors.textTertiary} />
                                            <Text style={styles.detailText}>{venue.distance}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Feather name="star" size={12} color="#FFB000" />
                                            <Text style={styles.detailText}>{venue.rating} {venue.reviewCount ? `(${venue.reviewCount})` : ''}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailText}>{venue.price}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.bestTimeRow}>
                                        <Feather name="clock" size={12} color={colors.textTertiary} />
                                        <Text style={styles.bestTimeText}>Any evening</Text>
                                    </View>

                                    <View style={styles.venueFooterRow}>
                                        <View style={styles.tagsRowCompact}>
                                            {venue.tags.slice(0, 3).map(tag => (
                                                <View key={tag} style={styles.venueTagSmall}>
                                                    <Text style={styles.venueTagTextSmall}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <TouchableOpacity 
                                            style={styles.planLink}
                                            onPress={() => router.push({
                                                pathname: '/hangouts/create',
                                                params: { 
                                                    venueId: venue.id, 
                                                    venueName: venue.name
                                                }
                                            })}
                                        >
                                            <Text style={styles.planLinkText}>Plan Hangout</Text>
                                            <Feather name="chevron-right" size={14} color="#E85C5C" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFBF9',
    } as ViewStyle,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: spacing.md,
    } as ViewStyle,
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.sm,
    } as ViewStyle,
    heartButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.sm,
    } as ViewStyle,
    headerTitle: {
        fontSize: 20,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
        textAlign: 'center',
    } as TextStyle,
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        textAlign: 'center',
    } as TextStyle,
    scrollContent: {
        paddingBottom: spacing.xxxl,
    } as ViewStyle,
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3F0',
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        height: 50,
    } as ViewStyle,
    searchIcon: {
        marginRight: spacing.sm,
    } as TextStyle,
    searchInput: {
        flex: 1,
        fontFamily: 'Lexend_400Regular',
        fontSize: 16,
        color: colors.textPrimary,
    } as TextStyle,
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        gap: 8,
        marginBottom: 4,
    } as ViewStyle,
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
    } as TextStyle,
    sectionSubtitle: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    } as TextStyle,
    templatesScroll: {
        paddingLeft: spacing.lg,
        paddingRight: spacing.md,
        paddingBottom: spacing.xl,
        gap: spacing.md,
    } as ViewStyle,
    templateCard: {
        width: 160,
        backgroundColor: '#FFF',
        borderRadius: radius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: '#EEEAE3',
        ...shadow.subtle,
    } as ViewStyle,
    templateEmojiContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F5F3F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    } as ViewStyle,
    templateEmoji: {
        fontSize: 24,
    } as TextStyle,
    templateTitle: {
        fontSize: 16,
        fontFamily: 'BricolageGrotesque_700Bold',
        color: colors.textPrimary,
        marginBottom: 4,
    } as TextStyle,
    templateDesc: {
        fontSize: 12,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        lineHeight: 16,
        marginBottom: spacing.md,
    } as TextStyle,
    templateMeta: {
        flexDirection: 'column',
        gap: 4,
        marginBottom: spacing.md,
    } as ViewStyle,
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    } as ViewStyle,
    metaText: {
        fontSize: 11,
        fontFamily: 'Lexend_500Medium',
        color: colors.textTertiary,
    } as TextStyle,
    vibeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
    } as ViewStyle,
    vibeBadgeText: {
        fontSize: 10,
        fontFamily: 'Lexend_700Bold',
    } as TextStyle,
    categoryScroll: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: 10,
    } as ViewStyle,
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: '#EEEAE3',
        gap: 8,
    } as ViewStyle,
    categoryChipActive: {
        backgroundColor: '#2D2D2D',
        borderColor: '#2D2D2D',
    } as ViewStyle,
    categoryLabel: {
        fontSize: 14,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textPrimary,
    } as TextStyle,
    categoryLabelActive: {
        color: '#FFF',
    } as TextStyle,
    venueList: {
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
    } as ViewStyle,
    venueCard: {
        backgroundColor: '#FFF',
        borderRadius: radius.xxl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EEEAE3',
        ...shadow.card,
    } as ViewStyle,
    venueImageContainer: {
        width: '100%',
        height: 180,
    } as ViewStyle,
    venueImage: {
        width: '100%',
        height: '100%',
    } as ImageStyle,
    venueImageBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    } as ViewStyle,
    openBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.md,
        gap: 6,
    } as ViewStyle,
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    } as ViewStyle,
    openText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'Lexend_600SemiBold',
    } as TextStyle,
    favoriteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    typeBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.md,
    } as ViewStyle,
    typeText: {
        color: '#FFF',
        fontSize: 11,
        fontFamily: 'Lexend_700Bold',
    } as TextStyle,
    venueBody: {
        padding: spacing.lg,
    } as ViewStyle,
    premierBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    } as ViewStyle,
    premierText: {
        fontSize: 10,
        fontFamily: 'Lexend_700Bold',
        color: '#E65100',
    } as TextStyle,
    perksBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    } as ViewStyle,
    perksText: {
        fontSize: 10,
        fontFamily: 'Lexend_700Bold',
        color: '#E53935',
    } as TextStyle,
    vibeLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: '#FFF1EE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 6,
    } as ViewStyle,
    vibeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    } as ViewStyle,
    vibeLabelText: {
        fontSize: 10,
        fontFamily: 'Lexend_700Bold',
        color: '#FF7F61',
    } as TextStyle,
    venueName: {
        fontSize: 22,
        fontFamily: 'BricolageGrotesque_800ExtraBold',
        color: colors.textPrimary,
        marginTop: 4,
        marginBottom: 8,
    } as TextStyle,
    venueDesc: {
        fontSize: 14,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.md,
    } as TextStyle,
    offerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        gap: 8,
        marginBottom: spacing.md,
    } as ViewStyle,
    offerText: {
        fontSize: 13,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2E7D32',
    } as TextStyle,
    venueFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    } as ViewStyle,
    venueMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    } as ViewStyle,
    venueRating: {
        fontSize: 12,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textSecondary,
    } as TextStyle,
    planButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    } as ViewStyle,
    planButtonText: {
        fontSize: 14,
        fontFamily: 'Lexend_700Bold',
        color: '#E85C5C',
    } as TextStyle,
    tagsContainer: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    } as ViewStyle,
    venueTag: {
        backgroundColor: '#F5F3F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    } as ViewStyle,
    venueTagText: {
        fontSize: 12,
        fontFamily: 'Lexend_500Medium',
        color: colors.textSecondary,
    } as TextStyle,
    favoriteButtonIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    firstMeetupBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.md,
    } as ViewStyle,
    firstMeetupText: {
        color: '#FFF',
        fontSize: 11,
        fontFamily: 'Lexend_700Bold',
    } as TextStyle,
    venueHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    } as ViewStyle,
    venueMainBadges: {
        flexDirection: 'row',
        gap: 8,
    } as ViewStyle,
    offerBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        gap: 8,
        marginBottom: spacing.md,
    } as ViewStyle,
    offerBadgeText: {
        fontSize: 13,
        fontFamily: 'Lexend_600SemiBold',
        color: '#2E7D32',
    } as TextStyle,
    venueDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    } as ViewStyle,
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    } as ViewStyle,
    detailText: {
        fontSize: 12,
        fontFamily: 'Lexend_600SemiBold',
        color: colors.textSecondary,
    } as TextStyle,
    bestTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    } as ViewStyle,
    bestTimeText: {
        fontSize: 12,
        fontFamily: 'Lexend_400Regular',
        color: colors.textSecondary,
    } as TextStyle,
    venueFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    } as ViewStyle,
    tagsRowCompact: {
        flexDirection: 'row',
        gap: 6,
    } as ViewStyle,
    venueTagSmall: {
        backgroundColor: '#F5F3F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    } as ViewStyle,
    venueTagTextSmall: {
        fontSize: 11,
        fontFamily: 'Lexend_500Medium',
        color: colors.textSecondary,
    } as TextStyle,
    planLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    } as ViewStyle,
    planLinkText: {
        fontSize: 14,
        fontFamily: 'Lexend_700Bold',
        color: '#E85C5C',
    } as TextStyle,
});
