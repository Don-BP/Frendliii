// frendli-api/src/lib/activitySuggestions.ts

/**
 * Maps interest IDs (from Profile.interests) to Venue.category values.
 * Used by GET /api/discovery to compute suggestedActivity per recommendation.
 */
export const INTEREST_TO_CATEGORY: Record<string, string> = {
    'coffee':       'cafe',
    'board games':  'board_games',
    'board_games':  'board_games',
    'gaming':       'gaming',
    'hiking':       'outdoor',
    'cycling':      'outdoor',
    'running':      'outdoor',
    'climbing':     'outdoor',
    'camping':      'outdoor',
    'cooking':      'restaurant',
    'wine':         'bar',
    'theatre':      'arts',
    'photography':  'arts',
    'painting':     'arts',
    'music':        'music_venue',
    'concerts':     'music_venue',
    'yoga':         'fitness',
    'fitness':      'fitness',
    'movies':       'cinema',
    'anime':        'cafe',
    'reading':      'bookshop',
    'baking':       'cafe',
    'vegan':        'restaurant',
};

/**
 * Maps Venue.category to a human-readable activity label.
 */
export const CATEGORY_TO_ACTIVITY_LABEL: Record<string, string> = {
    'cafe':         'Coffee catch-up',
    'board_games':  'Board game night',
    'gaming':       'Gaming session',
    'outdoor':      'Outdoor adventure',
    'restaurant':   'Foodie outing',
    'bar':          'Evening drinks',
    'arts':         'Creative session',
    'music_venue':  'Live music night',
    'fitness':      'Fitness session',
    'cinema':       'Movie night',
    'bookshop':     'Book browse + coffee',
};
