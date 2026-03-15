import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { StreakService } from '../services/streak.service';


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

        // 3. Get recommendations (Existing Discovery Logic)
        const existingWaves = await prisma.wave.findMany({
            where: { senderId: userId },
            select: { receiverId: true },
        });
        const excludedUserIds = existingWaves.map(w => w.receiverId);
        excludedUserIds.push(userId); // Exclude self

        const potentialMatches = await prisma.profile.findMany({
            where: {
                userId: { notIn: excludedUserIds },
            },
            take: 20,
        });

        const recommendations = potentialMatches.map(profile => {
            let score = 0;

            // Simplified matching score based on interests
            const venueInterests = Array.isArray(profile.interests) ? profile.interests : [];
            const userInterests = Array.isArray((userProfile as any).interests) ? (userProfile as any).interests : [];
            
            const commonTags = venueInterests.filter((tag: string) =>
                userInterests.includes(tag)
            );
            
            const interestScore = userInterests.length > 0
                ? (commonTags.length / Math.max(userInterests.length, 1)) * 40
                : 0;
            score += interestScore;

            // Location (30%)
            let locationScore = 0;
            let distanceKm = null;
            if (userLat !== null && userLng !== null && profile.latitude !== null && profile.longitude !== null) {
                const R = 6371;
                const dLat = (profile.latitude - userLat) * Math.PI / 180;
                const dLon = (profile.longitude - userLng) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * Math.PI / 180) * Math.cos(profile.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distanceKm = R * c;
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
                const dayMatch = (overlappingDays.length / Math.max(userDays.length, 1));
                const timeMatch = (overlappingTimes.length / Math.max(userTimes.length || 1, 1));
                availabilityScore = (dayMatch * 10) + (timeMatch * 10);
            }
            score += availabilityScore;

            // Style Compatibility (10%) - Friendship Style
            const friendshipStyleScore = profile.friendshipStyle === userProfile.friendshipStyle ? 10 : 0;
            score += friendshipStyleScore;

            // Match Alike Boost (Optional Supplementary - up to 5%)
            let styleAlikeBoost = 0;
            const targetStyleTags = Array.isArray(profile.styleTags) ? profile.styleTags : [];
            const userStyleTags = Array.isArray(userProfile.styleTags) ? userProfile.styleTags : [];
            
            if (userStyleTags.length > 0 && targetStyleTags.length > 0) {
                const commonStyleTags = userStyleTags.filter((tag: string) => 
                    targetStyleTags.includes(tag)
                );
                // Boost of up to 5 points based on style overlap
                styleAlikeBoost = (commonStyleTags.length / Math.max(userStyleTags.length, 1)) * 5;
            }
            score += styleAlikeBoost;

            return {
                ...profile,
                score: Math.round(score),
                sharedInterests: commonTags,
                sharedStyle: userStyleTags.filter((tag: string) => targetStyleTags.includes(tag)),
                distanceKm: distanceKm ?? null,
                distance: distanceKm ? `${distanceKm.toFixed(1)}km away` : 'Nearby'
            };
        });

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
        if (!receiverId || !['like', 'pass'].includes(type)) {
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
                createdAt: { gte: oneWeekAgo }
            }
        });

        if (!isPremium && waveCount >= 15 && type === 'like') {
            return res.status(403).json({ 
                error: 'Wave limit reached', 
                message: 'You have used all 15 waves for this week. Upgrade to Premium for unlimited waves!' 
            });
        }

        // 1. Create the Wave
        const wave = await prisma.wave.create({
            data: {
                senderId: userId,
                receiverId,
                type,
            },
        });

        let matched = false;

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

export default router;
