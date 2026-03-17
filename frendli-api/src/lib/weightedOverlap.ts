// frendli-api/src/lib/weightedOverlap.ts

export interface ProfileForScoring {
    interests: string[];
    interestWeights?: Record<string, number> | null | unknown;
}

/**
 * Returns a value 0.0–1.0 representing weighted interest compatibility.
 * Multiply by 40 to get the interestScore component (0–40).
 */
export function weightedOverlap(profileA: ProfileForScoring, profileB: ProfileForScoring): number {
    const sharedInterests = profileA.interests.filter(i =>
        profileB.interests.includes(i)
    );

    if (sharedInterests.length === 0) return 0;

    const weightsA = (profileA.interestWeights as Record<string, number>) ?? {};
    const weightsB = (profileB.interestWeights as Record<string, number>) ?? {};

    const numerator = sharedInterests.reduce((sum, interest) => {
        const wA = weightsA[interest] ?? 5;
        const wB = weightsB[interest] ?? 5;
        return sum + Math.min(wA, wB) / 10;
    }, 0);

    return numerator / sharedInterests.length; // 0.0 – 1.0
}
