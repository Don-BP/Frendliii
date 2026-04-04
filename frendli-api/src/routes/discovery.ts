import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { StreakService } from '../services/streak.service';
import { weightedOverlap } from '../lib/weightedOverlap';
import { getRankFromScore } from '../lib/rank';
import { INTEREST_TO_CATEGORY, CATEGORY_TO_ACTIVITY_LABEL } from '../lib/activitySuggestions';
import { SNOOZE_DURATION_HOURS } from '../lib/constants';


const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/discovery
 * Fetches potential matches for the current user.
 * Weighted Scoring:
 * - Interests (40%)
 * - Location (30%)
 * - Availability (20%)
 * - Style (10%)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const now = new Date();
        const { lat, lng } = req.query;
        const userLat = lat ? parseFloat(lat as string) : null;
        const userLng = lng ? parseFloat(lng as string) : null;
        const maxDistance = req.query.maxDistance
            ? Math.max(0, Math.min(parseFloat(req.query.maxDistance as string), 500))
            : null;
        const filterInterests = req.query.filterInterests
            ? (req.query.filterInterests as string).split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const filterDays = req.query.filterDays
            ? (req.query.filterDays as string).split(',').map(s => s.trim()).filter(Boolean)
            : [];

        // 1. Get current user's profile for comparison
        const userProfile = await prisma.profile.findUnique({
            where: { userId },
            include: { user: true }
        });
        console.log('Discovery: userProfile fetched', !!userProfile);

        if (!userProfile) return res.status(404).json({ error: 'Profile not found' });

        // Update activity streak
        await StreakService.updateStreak(userId);


        // 2. Get Waves Received (unmatched likes)
        const incomingWaves = await prisma.wave.findMany({
            where: {
                receiverId: userId,
                type: 'like'
            },
            include: {
                sender: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        // Get existing matches to filter out from waves received
        const existingMatches = await prisma.match.findMany({
            where: {
                OR: [
                    { user1Id: userId },
                    { user2Id: userId }
                ]
            }
        });
        const matchedUserIds = existingMatches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id);

        const pendingWaves = incomingWaves.filter(w => !matchedUserIds.includes(w.senderId));

        // 3. Get recommendations (hard + soft exclusion)

        // Hard-excluded: profiles with a like or pass wave (permanent)
        const hardExcluded = await prisma.wave.findMany({
            where: { senderId: userId, type: { in: ['like', 'pass'] } },
            select: { receiverId: true },
        });

        // Soft-excluded: profiles snoozed with an unexpired Snooze record
        const softExcluded = await prisma.snooze.findMany({
            where: { userId, expiresAt: { gt: new Date() } },
            select: { targetId: true },
        });

        // Block-excluded: both sides of any block relationship
        const blocks = await prisma.block.findMany({
            where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
            select: { blockerId: true, blockedId: true },
        });
        const blockedUserIds = blocks.map(b =>
            b.blockerId === userId ? b.blockedId : b.blockerId
        );

        const excludedUserIds = [
            ...hardExcluded.map(w => w.receiverId),
            ...softExcluded.map(s => s.targetId),
            ...blockedUserIds,
            userId, // Exclude self
        ];

        const potentialMatches = await prisma.profile.findMany({
            where: {
                userId: { notIn: excludedUserIds },
            },
            take: 15,
        });

        const recommendations = await Promise.all(potentialMatches.map(async profile => {
            let score = 0;

            // Interest score (40%) — weighted overlap
            const interestScore = weightedOverlap(
                { interests: Array.isArray(userProfile.interests) ? userProfile.interests : [], interestWeights: userProfile.interestWeights },
                { interests: Array.isArray(profile.interests) ? profile.interests : [], interestWeights: profile.interestWeights }
            ) * 40;
            score += interestScore;

            const sharedInterests = (Array.isArray(userProfile.interests) ? userProfile.interests : []).filter(
                (i: string) => (Array.isArray(profile.interests) ? profile.interests : []).includes(i)
            );

            // Location (30%)
            let locationScore = 0;
            let distanceKm: number | null = null;
            if (userLat !== null && userLng !== null && profile.latitude !== null && profile.longitude !== null) {
                const R = 6371;
                const dLat = (profile.latitude - userLat) * Math.PI / 180;
                const dLon = (profile.longitude - userLng) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * Math.PI / 180) * Math.cos(profile.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                locationScore = Math.max(0, (1 - distanceKm / 50) * 30);
            }
            score += locationScore;

            // Availability (20%)
            let availabilityScore = 0;
            const userAvail = userProfile.availability as any;
            const targetAvail = profile.availability as any;
            const userDays = userAvail?.days && Array.isArray(userAvail.days) ? userAvail.days : [];
            const targetDays = targetAvail?.days && Array.isArray(targetAvail.days) ? targetAvail.days : [];
            const userTimes = userAvail?.times && Array.isArray(userAvail.times) ? userAvail.times : [];
            const targetTimes = targetAvail?.times && Array.isArray(targetAvail.times) ? targetAvail.times : [];
            if (userDays.length > 0 && targetDays.length > 0) {
                const overlappingDays = userDays.filter((d: string) => targetDays.includes(d));
                const overlappingTimes = userTimes.filter((t: string) => targetTimes.includes(t));
                availabilityScore = (overlappingDays.length / Math.max(userDays.length, 1)) * 10
                    + (overlappingTimes.length / Math.max(userTimes.length || 1, 1)) * 10;
            }
            score += availabilityScore;

            // Style (10%)
            const friendshipStyleScore = profile.friendshipStyle === userProfile.friendshipStyle ? 10 : 0;
            score += friendshipStyleScore;

            const finalScore = Math.min(100, Math.round(score));
            const rank = getRankFromScore(finalScore);

            // Compute suggestedActivity — highest-weighted shared interest mapped to nearest venue
            let suggestedActivity: {
                label: string;
                reason: string;
                venueName: string;
                venueId: string;
                venueImageUrl?: string;
                isPartner: boolean;
                distanceKm: number;
            } | null = null;

            if (sharedInterests.length > 0 && userLat !== null && userLng !== null) {
                const weightsA = (userProfile.interestWeights as Record<string, number>) ?? {};
                const weightsB = (profile.interestWeights as Record<string, number>) ?? {};

                // Sort shared interests by min weight descending
                const ranked = [...sharedInterests].sort((a, b) => {
                    const wA = Math.min(weightsA[a] ?? 5, weightsB[a] ?? 5);
                    const wB = Math.min(weightsA[b] ?? 5, weightsB[b] ?? 5);
                    return wB - wA;
                });

                for (const interest of ranked) {
                    const category = INTEREST_TO_CATEGORY[interest.toLowerCase()];
                    if (!category) continue;

                    const venue = await prisma.venue.findFirst({
                        where: {
                            category,
                            isActive: true,
                            latitude: { not: null },
                            longitude: { not: null },
                        },
                        orderBy: [
                            { partnershipTier: 'desc' },
                        ],
                    });

                    if (!venue || venue.latitude === null || venue.longitude === null) continue;

                    const dLat = (venue.latitude - userLat) * Math.PI / 180;
                    const dLon = (venue.longitude - userLng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(userLat * Math.PI / 180) * Math.cos(venue.latitude * Math.PI / 180) *
                        Math.sin(dLon / 2) ** 2;
                    const venueDistKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    const maxDist = maxDistance ?? 50;
                    if (venueDistKm > maxDist) continue;

                    const label = CATEGORY_TO_ACTIVITY_LABEL[category] ?? 'Catch-up';

                    suggestedActivity = {
                        label,
                        reason: `You both love ${interest}`,
                        venueName: venue.name,
                        venueId: venue.id,
                        venueImageUrl: venue.photos?.[0] ?? undefined,
                        isPartner: venue.partnershipTier !== 'listed',
                        distanceKm: Math.round(venueDistKm * 10) / 10,
                    };
                    break;
                }
            }

            return {
                ...profile,
                interestWeights: profile.interestWeights,
                safetyBadges: profile.safetyBadges ?? [],
                score: finalScore,
                rank: { emoji: rank.emoji, name: rank.name },
                sharedInterests,
                sharedStyle: (Array.isArray(userProfile.styleTags) ? userProfile.styleTags : []).filter(
                    (tag: string) => (Array.isArray(profile.styleTags) ? profile.styleTags : []).includes(tag)
                ),
                distanceKm: distanceKm ?? null,
                distance: distanceKm ? `${distanceKm.toFixed(1)}km away` : 'Nearby',
                suggestedActivity,
            };
        }));

        // Apply optional filters
        let filteredRecommendations = recommendations;

        if (maxDistance !== null && userLat !== null && userLng !== null) {
            filteredRecommendations = filteredRecommendations.filter(r => {
                return r.distanceKm !== null && r.distanceKm <= maxDistance!;
            });
        }

        if (filterInterests.length > 0) {
            filteredRecommendations = filteredRecommendations.filter(r =>
                (r.sharedInterests as string[]).some(i => filterInterests.includes(i))
            );
        }

        if (filterDays.length > 0) {
            filteredRecommendations = filteredRecommendations.filter(r => {
                const targetAvail = r.availability as any;
                const targetDays = targetAvail?.days && Array.isArray(targetAvail.days) ? targetAvail.days : [];
                return filterDays.some(d => targetDays.includes(d));
            });
        }

        filteredRecommendations.sort((a, b) => b.score - a.score);

        // Count confirmed matches for this user (reuse already-fetched existingMatches array)
        const matchCount = existingMatches.length;

        // Count upcoming hangouts the user is attending
        const upcomingHangoutCount = await prisma.hangoutAttendee.count({
            where: {
                userId,
                hangout: {
                    status: 'upcoming',
                    startTime: { gt: now }
                }
            }
        });

        // 4. Get Happening Soon (Upcoming Hangouts)
        const happeningSoon = await prisma.hangout.findMany({
            where: {
                status: 'upcoming',
                startTime: { gt: now }
            },
            include: {
                venue: true,
                attendees: {
                    include: {
                        user: {
                            include: { profile: true }
                        }
                    }
                }
            },
            orderBy: { startTime: 'asc' },
            take: 5
        });

        res.json({
            wavesReceived: pendingWaves,
            recommendations: filteredRecommendations,
            happeningSoon: happeningSoon.map(h => ({
                ...h,
                spotsLeft: (h.maxAttendees || 6) - (h.attendees || []).length
            })),
            streakCount: (userProfile.user as any).streakCount,
            matchCount,
            upcomingHangoutCount,
        });
    } catch (err) {
        console.error('GET /api/discovery error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: (err as Error).message });
    }
});

/**
 * POST /api/discovery/wave
 * Sends a "Wave" (like or pass) to another user.
 * Body: { receiverId: string, type: 'like' | 'pass' }
 */
router.post('/wave', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { receiverId, type } = req.body;
        if (!receiverId || !['like', 'pass', 'maybe'].includes(type)) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        // 0. Check Wave Limits (Dev Doc Slice 6: 15 per week for free users)
        const sender = await prisma.user.findUnique({ where: { id: userId } });
        const isPremium = (sender as any)?.isPremium || false;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const waveCount = await prisma.wave.count({
            where: {
                senderId: userId,
                type: 'like',
                createdAt: { gte: oneWeekAgo }
            }
        });

        if (!isPremium && waveCount >= 15 && type === 'like') {
            return res.status(403).json({ 
                error: 'Wave limit reached', 
                message: 'You have used all 15 waves for this week. Upgrade to Premium for unlimited waves!' 
            });
        }

        // Guard: reject downgrade from like → maybe
        if (type === 'maybe') {
            const existingWave = await prisma.wave.findUnique({
                where: { senderId_receiverId: { senderId: userId, receiverId } },
            });
            if (existingWave?.type === 'like') {
                return res.status(409).json({ error: 'Cannot downgrade a like to maybe' });
            }
        }

        // 1. Upsert the Wave (supports maybe → like upgrade)
        let matched = false;

        if (type === 'maybe') {
            // Atomic transaction: upsert Wave + upsert Snooze
            const expiresAt = new Date(Date.now() + SNOOZE_DURATION_HOURS * 60 * 60 * 1000);
            await prisma.$transaction([
                prisma.wave.upsert({
                    where: { senderId_receiverId: { senderId: userId, receiverId } },
                    create: { senderId: userId, receiverId, type: 'maybe' },
                    update: { type: 'maybe', createdAt: new Date() },
                }),
                prisma.snooze.upsert({
                    where: { userId_targetId: { userId, targetId: receiverId } },
                    create: { userId, targetId: receiverId, expiresAt },
                    update: { expiresAt },
                }),
            ]);

            return res.status(201).json({ success: true, matched: false });
        }

        await prisma.wave.upsert({
            where: { senderId_receiverId: { senderId: userId, receiverId } },
            create: { senderId: userId, receiverId, type },
            update: { type, createdAt: new Date() },
        });

        // Delete any snooze for this pair when sending a like (like upgrades a maybe)
        if (type === 'like') {
            await prisma.snooze.deleteMany({
                where: { userId, targetId: receiverId },
            });
        }

        // 2. If it's a like, check for mutual match
        if (type === 'like') {
            const mutualWave = await prisma.wave.findUnique({
                where: {
                    senderId_receiverId: {
                        senderId: receiverId,
                        receiverId: userId,
                    },
                },
            });

            if (mutualWave && mutualWave.type === 'like') {
                matched = true;
                // Create Match record
                // Ensure deterministic ordering for the compound unique key
                const [u1, u2] = [userId, receiverId].sort();
                await prisma.match.upsert({
                    where: {
                        user1Id_user2Id: {
                            user1Id: u1,
                            user2Id: u2,
                        },
                    },
                    update: {},
                    create: {
                        user1Id: u1,
                        user2Id: u2,
                    },
                });

                // Trigger a push notification for "Match Found"
                await NotificationService.notifyMatch(userId, receiverId);
            }
        }

        res.status(201).json({ success: true, matched });
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: 'You have already waved at this user' });
        }
        console.error('POST /api/discovery/wave error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/discovery/snoozes
 * Returns active snoozes for the authenticated user only.
 * Sorted by expiresAt ASC (soonest expiry first).
 */
router.get('/snoozes', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const snoozes = await prisma.snooze.findMany({
            where: { userId, expiresAt: { gt: new Date() } },
            include: {
                target: {
                    include: { profile: { select: { firstName: true } } }
                }
            },
            orderBy: { expiresAt: 'asc' },
        });

        res.json({
            snoozes: snoozes.map(s => ({
                targetId: s.targetId,
                targetFirstName: s.target.profile?.firstName ?? 'Unknown',
                expiresAt: s.expiresAt.toISOString(),
            })),
        });
    } catch (err) {
        console.error('GET /api/discovery/snoozes error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
