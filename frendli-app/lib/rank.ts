// frendli-app/lib/rank.ts

export interface FriendshipRank {
    emoji: string;
    name: string;
}

const FRIENDSHIP_RANKS: Array<FriendshipRank & { minScore: number; maxScore: number }> = [
    { emoji: '🌫️', name: 'Absolute Strangers',     minScore: 0,   maxScore: 6   },
    { emoji: '🌱', name: 'Just Sprouting',          minScore: 7,   maxScore: 12  },
    { emoji: '🚢', name: 'Ships Passing',            minScore: 13,  maxScore: 18  },
    { emoji: '📡', name: 'Distant Signals',          minScore: 19,  maxScore: 24  },
    { emoji: '🕯️', name: 'Faint Spark',             minScore: 25,  maxScore: 29  },
    { emoji: '😊', name: 'Kinda Buds',              minScore: 30,  maxScore: 34  },
    { emoji: '🤔', name: 'Something There',          minScore: 35,  maxScore: 38  },
    { emoji: '✨', name: 'A Spark of Something',    minScore: 39,  maxScore: 43  },
    { emoji: '🌡️', name: 'Getting Warmer',          minScore: 44,  maxScore: 48  },
    { emoji: '🎯', name: 'Solid Overlap',            minScore: 49,  maxScore: 52  },
    { emoji: '🔑', name: 'Clicking a Bit',           minScore: 53,  maxScore: 56  },
    { emoji: '📖', name: 'On the Same Page',         minScore: 57,  maxScore: 60  },
    { emoji: '🎵', name: 'Same Tune',                minScore: 61,  maxScore: 64  },
    { emoji: '📻', name: 'Same Wavelength',          minScore: 65,  maxScore: 68  },
    { emoji: '🤝', name: 'Your Kind of People',      minScore: 69,  maxScore: 72  },
    { emoji: '🌟', name: 'Mate Material',            minScore: 73,  maxScore: 75  },
    { emoji: '🕊️', name: 'Kindred Spirits',         minScore: 76,  maxScore: 79  },
    { emoji: '💪', name: 'Proper Pals',              minScore: 80,  maxScore: 82  },
    { emoji: '🏆', name: 'Friendship Goals',         minScore: 83,  maxScore: 85  },
    { emoji: '⚡', name: 'Dynamic Duo',             minScore: 86,  maxScore: 88  },
    { emoji: '💎', name: 'Rare Find',               minScore: 89,  maxScore: 91  },
    { emoji: '🚀', name: 'Best Mate Energy',         minScore: 92,  maxScore: 94  },
    { emoji: '👯', name: 'Practically Twins',        minScore: 95,  maxScore: 96  },
    { emoji: '🌈', name: 'Super Best Mates',         minScore: 97,  maxScore: 98  },
    { emoji: '💫', name: 'Friendship Soulmates',     minScore: 99,  maxScore: 100 },
];

export function getRankFromScore(score: number): FriendshipRank {
    const clampedScore = Math.max(0, Math.min(100, score));
    const rank = FRIENDSHIP_RANKS.find(r => clampedScore >= r.minScore && clampedScore <= r.maxScore);
    return rank ?? FRIENDSHIP_RANKS[FRIENDSHIP_RANKS.length - 1];
}
