import { Router } from 'express';

const router = Router();

const INTEREST_CATEGORIES = [
    {
        id: 'outdoors',
        label: 'Outdoors',
        emoji: '🏔️',
        interests: [
            { id: 'hiking', label: 'Hiking', emoji: '🥾' },
            { id: 'cycling', label: 'Cycling', emoji: '🚴' },
            { id: 'climbing', label: 'Climbing', emoji: '🧗' },
            { id: 'camping', label: 'Camping', emoji: '🏕️' },
            { id: 'running', label: 'Running', emoji: '🏃' },
            { id: 'swimming', label: 'Swimming', emoji: '🏊' },
        ],
    },
    {
        id: 'food-drink',
        label: 'Food & Drink',
        emoji: '🍜',
        interests: [
            { id: 'coffee', label: 'Coffee', emoji: '☕' },
            { id: 'cooking', label: 'Cooking', emoji: '👨‍🍳' },
            { id: 'brunch', label: 'Brunch', emoji: '🥞' },
            { id: 'craft-beer', label: 'Craft Beer', emoji: '🍺' },
            { id: 'wine', label: 'Wine', emoji: '🍷' },
            { id: 'ramen', label: 'Ramen', emoji: '🍜' },
        ],
    },
    {
        id: 'arts-culture',
        label: 'Arts & Culture',
        emoji: '🎨',
        interests: [
            { id: 'photography', label: 'Photography', emoji: '📸' },
            { id: 'drawing', label: 'Drawing', emoji: '🎨' },
            { id: 'theatre', label: 'Theatre', emoji: '🎭' },
            { id: 'museums', label: 'Museums', emoji: '🏛️' },
            { id: 'film', label: 'Film', emoji: '🎬' },
            { id: 'writing', label: 'Writing', emoji: '✍️' },
        ],
    },
    {
        id: 'music',
        label: 'Music',
        emoji: '🎵',
        interests: [
            { id: 'concerts', label: 'Concerts', emoji: '🎸' },
            { id: 'piano', label: 'Piano', emoji: '🎹' },
            { id: 'dj', label: 'DJing', emoji: '🎧' },
            { id: 'karaoke', label: 'Karaoke', emoji: '🎤' },
            { id: 'vinyl', label: 'Vinyl / Records', emoji: '💿' },
        ],
    },
    {
        id: 'gaming',
        label: 'Gaming',
        emoji: '🎮',
        interests: [
            { id: 'board-games', label: 'Board Games', emoji: '♟️' },
            { id: 'video-games', label: 'Video Games', emoji: '🎮' },
            { id: 'escape-rooms', label: 'Escape Rooms', emoji: '🔐' },
            { id: 'arcades', label: 'Arcades', emoji: '🕹️' },
        ],
    },
    {
        id: 'sports',
        label: 'Sports',
        emoji: '⚽',
        interests: [
            { id: 'football', label: 'Football', emoji: '⚽' },
            { id: 'basketball', label: 'Basketball', emoji: '🏀' },
            { id: 'tennis', label: 'Tennis', emoji: '🎾' },
            { id: 'yoga', label: 'Yoga', emoji: '🧘' },
            { id: 'martial-arts', label: 'Martial Arts', emoji: '🥋' },
        ],
    },
    {
        id: 'wellness',
        label: 'Wellness',
        emoji: '🌱',
        interests: [
            { id: 'meditation', label: 'Meditation', emoji: '🧘' },
            { id: 'journaling', label: 'Journaling', emoji: '📓' },
            { id: 'nature-walks', label: 'Nature Walks', emoji: '🌿' },
            { id: 'mindfulness', label: 'Mindfulness', emoji: '🌸' },
        ],
    },
    {
        id: 'social',
        label: 'Social',
        emoji: '🤝',
        interests: [
            { id: 'trivia', label: 'Trivia Nights', emoji: '🧠' },
            { id: 'volunteering', label: 'Volunteering', emoji: '💚' },
            { id: 'language-exchange', label: 'Language Exchange', emoji: '🌍' },
            { id: 'book-club', label: 'Book Club', emoji: '📚' },
            { id: 'travel', label: 'Travel', emoji: '✈️' },
        ],
    },
];

// GET /api/interests — public, no auth required
router.get('/', (_req, res) => {
    res.json({ categories: INTEREST_CATEGORIES });
});

export default router;
