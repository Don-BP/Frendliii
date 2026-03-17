// frendli-api/src/lib/__tests__/rank.test.ts
import { getRankFromScore, FRIENDSHIP_RANKS } from '../rank';

describe('getRankFromScore — boundary coverage', () => {
    const cases: [number, string][] = [
        [0,   'Absolute Strangers'],
        [6,   'Absolute Strangers'],
        [7,   'Just Sprouting'],
        [12,  'Just Sprouting'],
        [13,  'Ships Passing'],
        [18,  'Ships Passing'],
        [19,  'Distant Signals'],
        [24,  'Distant Signals'],
        [25,  'Faint Spark'],
        [29,  'Faint Spark'],
        [30,  'Kinda Buds'],
        [34,  'Kinda Buds'],
        [35,  'Something There'],
        [38,  'Something There'],
        [39,  'A Spark of Something'],
        [43,  'A Spark of Something'],
        [44,  'Getting Warmer'],
        [48,  'Getting Warmer'],
        [49,  'Solid Overlap'],
        [52,  'Solid Overlap'],
        [53,  'Clicking a Bit'],
        [56,  'Clicking a Bit'],
        [57,  'On the Same Page'],
        [60,  'On the Same Page'],
        [61,  'Same Tune'],
        [64,  'Same Tune'],
        [65,  'Same Wavelength'],
        [68,  'Same Wavelength'],
        [69,  'Your Kind of People'],
        [72,  'Your Kind of People'],
        [73,  'Mate Material'],
        [75,  'Mate Material'],
        [76,  'Kindred Spirits'],
        [79,  'Kindred Spirits'],
        [80,  'Proper Pals'],
        [82,  'Proper Pals'],
        [83,  'Friendship Goals'],
        [85,  'Friendship Goals'],
        [86,  'Dynamic Duo'],
        [88,  'Dynamic Duo'],
        [89,  'Rare Find'],
        [91,  'Rare Find'],
        [92,  'Best Mate Energy'],
        [94,  'Best Mate Energy'],
        [95,  'Practically Twins'],
        [96,  'Practically Twins'],
        [97,  'Super Best Mates'],
        [98,  'Super Best Mates'],
        [99,  'Friendship Soulmates'],
        [100, 'Friendship Soulmates'],
    ];

    test.each(cases)('score %i → %s', (score, expectedName) => {
        expect(getRankFromScore(score).name).toBe(expectedName);
    });

    it('returns a valid rank object for out-of-range score (> 100)', () => {
        const result = getRankFromScore(150);
        expect(result).toBeDefined();
        expect(result.name).toBeTruthy();
    });

    it('all 25 tiers are present in FRIENDSHIP_RANKS', () => {
        expect(FRIENDSHIP_RANKS).toHaveLength(25);
    });

    it('FRIENDSHIP_RANKS covers 0–100 with no gaps', () => {
        for (let score = 0; score <= 100; score++) {
            const rank = FRIENDSHIP_RANKS.find(r => score >= r.minScore && score <= r.maxScore);
            expect(rank).toBeDefined();
        }
    });
});
