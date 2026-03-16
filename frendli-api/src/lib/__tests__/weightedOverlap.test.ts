// frendli-api/src/lib/__tests__/weightedOverlap.test.ts
import { weightedOverlap } from '../weightedOverlap';

describe('weightedOverlap', () => {
    it('returns 0 when no shared interests', () => {
        const a = { interests: ['hiking'], interestWeights: null };
        const b = { interests: ['coffee'], interestWeights: null };
        expect(weightedOverlap(a, b)).toBe(0);
    });

    it('returns 0 when one user has no interests', () => {
        const a = { interests: [], interestWeights: null };
        const b = { interests: ['coffee'], interestWeights: { coffee: 10 } };
        expect(weightedOverlap(a, b)).toBe(0);
    });

    it('returns 1.0 when both are 10/10 on a single shared interest', () => {
        const a = { interests: ['coffee'], interestWeights: { coffee: 10 } };
        const b = { interests: ['coffee'], interestWeights: { coffee: 10 } };
        expect(weightedOverlap(a, b)).toBe(1.0);
    });

    it('uses 5 as default weight when interestWeights is null', () => {
        const a = { interests: ['coffee'], interestWeights: null };
        const b = { interests: ['coffee'], interestWeights: null };
        expect(weightedOverlap(a, b)).toBe(0.5); // min(5,5)/10
    });

    it('uses min of the two weights', () => {
        const a = { interests: ['hiking'], interestWeights: { hiking: 9 } };
        const b = { interests: ['hiking'], interestWeights: { hiking: 4 } };
        expect(weightedOverlap(a, b)).toBe(0.4); // min(9,4)/10
    });

    it('averages across multiple shared interests', () => {
        // coffee: min(10,10)/10 = 1.0, hiking: min(6,6)/10 = 0.6 → avg = 0.8
        const a = { interests: ['coffee', 'hiking'], interestWeights: { coffee: 10, hiking: 6 } };
        const b = { interests: ['coffee', 'hiking'], interestWeights: { coffee: 10, hiking: 6 } };
        expect(weightedOverlap(a, b)).toBeCloseTo(0.8);
    });

    it('ignores non-shared interests', () => {
        // Only coffee shared: min(10,10)/10 = 1.0
        const a = { interests: ['coffee', 'gaming'], interestWeights: { coffee: 10, gaming: 2 } };
        const b = { interests: ['coffee', 'hiking'], interestWeights: { coffee: 10, hiking: 8 } };
        expect(weightedOverlap(a, b)).toBe(1.0);
    });

    it('handles missing individual weight key with ?? 5 fallback', () => {
        // profileB has no weight entry for coffee → defaults to 5
        const a = { interests: ['coffee'], interestWeights: { coffee: 10 } };
        const b = { interests: ['coffee'], interestWeights: {} };
        expect(weightedOverlap(a, b)).toBe(0.5); // min(10,5)/10
    });
});
