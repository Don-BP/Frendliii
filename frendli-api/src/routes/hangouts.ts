import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateRecurringDates(startDate: Date, endDate: Date, frequency: string): Date[] {
    const dates: Date[] = [startDate];
    const current = new Date(startDate);

    while (true) {
        if (frequency === 'weekly') {
            current.setDate(current.getDate() + 7);
        } else if (frequency === 'monthly') {
            current.setMonth(current.getMonth() + 1);
        } else {
            break;
        }
        if (current > endDate) break;
        dates.push(new Date(current));
    }

    return dates;
}

// ---------------------------------------------------------------------------
// GET /api/hangouts/discovery
// ---------------------------------------------------------------------------
router.get('/discovery', async (req: Request, res: Response) => {
    try {
        const { lat, lng, category, suggested, thisWeek } = req.query;
        const userLat = lat ? parseFloat(lat as string) : null;
        const userLng = lng ? parseFloat(lng as string) : null;
        const isSuggested = suggested === 'true';
        const isThisWeek = thisWeek === 'true';

        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const hangoutWhere: any = {
            status: 'upcoming',
            startTime: {
                gt: now,
                ...(isThisWeek ? { lt: weekFromNow } : {}),
            },
            isPublic: true,
            ...(category ? { category: category as string } : {}),
        };

        const hangouts = await prisma.hangout.findMany({
            where: hangoutWhere,
            include: {
                venue: true,
                creator: { include: { profile: true } },
                attendees: {
                    include: {
                        user: {
                            include: {
                                profile: { select: { photos: true, firstName: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { startTime: 'asc' },
            take: 30,
        });

        const hangoutResults = hangouts.map(h => {
            let distance: string | null = null;
            if (userLat !== null && userLng !== null && h.venue?.latitude && h.venue?.longitude) {
                const km = haversineKm(userLat, userLng, h.venue.latitude, h.venue.longitude);
                distance = `${km.toFixed(1)}km away`;
            }
            return {
                ...h,
                host: {
                    name: h.creator.profile?.firstName || 'User',
                    imageUrl: h.creator.profile?.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                },
                distance,
                spotsLeft: (h.maxAttendees || 6) - h.attendees.length,
                imageUrl: h.imageUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'
            };
        });

        // Non-suggested path: return hangouts only (existing behaviour)
        if (!isSuggested) {
            return res.json(hangoutResults);
        }

        // Suggested path: merge hangouts + partner venues into ranked feed
        // NOTE: Interest-match ranking (user preference scoring) is deferred to a future phase.
        // Current ordering: premier tier first, then perks tier; within each tier by proximity.
        const venues = await prisma.venue.findMany({
            where: {
                partnershipTier: { in: ['perks', 'premier'] },
                isActive: true,
                perks: { some: {} },
                ...(category ? { category: category as string } : {}),
            },
            include: {
                perks: { take: 1, orderBy: { createdAt: 'desc' } },
            },
            take: 10,
        });

        const venueItems = venues.map(v => {
            let distance: string | null = null;
            if (userLat !== null && userLng !== null && v.latitude && v.longitude) {
                const km = haversineKm(userLat, userLng, v.latitude, v.longitude);
                distance = `${km.toFixed(1)}km away`;
            }
            return {
                type: 'venue' as const,
                data: {
                    id: v.id,
                    name: v.name,
                    category: v.category,
                    partnerTier: v.partnershipTier as 'perks' | 'premier',
                    dealText: v.perks[0]?.discountText ?? '',
                    distance,
                    photos: v.photos,
                    address: v.address,
                    openingHours: v.openingHours ?? null,
                }
            };
        });

        const hangoutItems = hangoutResults.map(h => ({ type: 'hangout' as const, data: h }));

        // Simple interleave: 1 venue card per 3 hangout cards
        // Premier venues first, then Perks venues
        const premierVenues = venueItems.filter(v => v.data.partnerTier === 'premier');
        const perksVenues = venueItems.filter(v => v.data.partnerTier === 'perks');
        const orderedVenues = [...premierVenues, ...perksVenues];

        const merged: (typeof hangoutItems[0] | typeof venueItems[0])[] = [];
        let venueIdx = 0;
        hangoutItems.forEach((item, i) => {
            if (i > 0 && i % 3 === 0 && venueIdx < orderedVenues.length) {
                merged.push(orderedVenues[venueIdx++]);
            }
            merged.push(item);
        });
        // Append any remaining venue items
        while (venueIdx < orderedVenues.length) {
            merged.push(orderedVenues[venueIdx++]);
        }

        res.json(merged);
    } catch (error) {
        console.error('Error fetching hangouts discovery:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/hangouts/suggestions  (activity suggestions for 1-on-1 match)
// ---------------------------------------------------------------------------
router.get('/suggestions', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const matchId = req.query.matchId as string;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!matchId) return res.status(400).json({ error: 'matchId is required' });

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                user1: { include: { profile: true } },
                user2: { include: { profile: true } },
            }
        });

        if (!match) return res.status(404).json({ error: 'Match not found' });

        const otherUser = match.user1Id === userId ? match.user2 : match.user1;
        const currentUser = match.user1Id === userId ? match.user1 : match.user2;

        if (!currentUser.profile || !otherUser.profile) {
            return res.status(404).json({ error: 'Profile not found for one or more users' });
        }

        const sharedInterestIds = currentUser.profile.interests.filter(id =>
            otherUser.profile?.interests.includes(id)
        );

        const activityMap: Record<string, { label: string; category: string; emoji: string }> = {
            'coffee':      { label: 'Grab a Coffee',    category: 'cafe',         emoji: '☕' },
            'brunch':      { label: 'Have Brunch',       category: 'restaurant',   emoji: '🥞' },
            'hiking':      { label: 'Go for a Hike',     category: 'park',         emoji: '🥾' },
            'board-games': { label: 'Play Board Games',  category: 'cafe',         emoji: '♟️' },
            'museums':     { label: 'Visit a Museum',    category: 'museum',       emoji: '🏛️' },
            'ramen':       { label: 'Eat Ramen',         category: 'restaurant',   emoji: '🍜' },
            'craft-beer':  { label: 'Try Craft Beers',   category: 'bar',          emoji: '🍺' },
            'wine':        { label: 'Go Wine Tasting',   category: 'bar',          emoji: '🍷' },
            'concerts':    { label: 'See Live Music',    category: 'music_venue',  emoji: '🎸' },
            'karaoke':     { label: 'Sing Karaoke',      category: 'karaoke',      emoji: '🎤' },
            'trivia':      { label: 'Trivia Night',      category: 'bar',          emoji: '🧠' },
            'yoga':        { label: 'Do Yoga',           category: 'gym',          emoji: '🧘' },
            'tennis':      { label: 'Play Tennis',       category: 'park',         emoji: '🎾' },
        };

        const suggestions = sharedInterestIds.map(id => activityMap[id]).filter(Boolean);

        if (suggestions.length === 0) {
            suggestions.push({ label: 'Walk & Talk', category: 'park', emoji: '🚶' });
            suggestions.push({ label: 'Coffee Date', category: 'cafe', emoji: '☕' });
        }

        res.json({ suggestions, sharedInterests: sharedInterestIds });
    } catch (err) {
        console.error('GET /api/hangouts/suggestions error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/hangouts/my
// ---------------------------------------------------------------------------
router.get('/my', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const myHangouts = await prisma.hangout.findMany({
            where: { attendees: { some: { userId } } },
            include: {
                venue: {
                    include: {
                        perks: { take: 1, orderBy: { createdAt: 'desc' } }
                    }
                },
                attendees: { include: { user: { include: { profile: true } } } },
                feedback: { where: { userId } },
            },
            orderBy: { startTime: 'asc' }
        });

        // For each hangout, look up active coupon for this user at this venue
        const couponMap: Record<string, string | null> = {};
        const perkIds = myHangouts
            .map(h => h.venue?.perks?.[0]?.id)
            .filter(Boolean) as string[];

        if (perkIds.length > 0) {
            const coupons = await prisma.coupon.findMany({
                where: {
                    userId,
                    perkId: { in: perkIds },
                    status: 'active',
                    expiresAt: { gt: new Date() },
                },
                select: { perkId: true, code: true }
            });
            coupons.forEach(c => { couponMap[c.perkId] = c.code; });
        }

        const result = myHangouts.map(h => {
            const perkId = h.venue?.perks?.[0]?.id ?? null;
            const activePerksCode = perkId ? (couponMap[perkId] ?? null) : null;
            const feedbackSubmitted = h.feedback.length > 0;

            return {
                ...h,
                activePerksCode,
                feedbackSubmitted,
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching my hangouts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/hangouts/pending-feedback
// ---------------------------------------------------------------------------
router.get('/pending-feedback', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const matchId = req.query.matchId as string;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        let hangoutWhere: any = {
            status: 'upcoming',
            startTime: { 
                lt: new Date(),
                gt: twentyFourHoursAgo
            },
            attendees: { some: { userId } },
            feedback: { none: { userId } }
        };

        if (matchId) {
            const match = await prisma.match.findUnique({
                where: { id: matchId },
                select: { user1Id: true, user2Id: true }
            });
            
            if (!match) {
                // If matchId provided but not found, no relevant feedback
                return res.json(null);
            }

            hangoutWhere.AND = [
                { attendees: { some: { userId: match.user1Id } } },
                { attendees: { some: { userId: match.user2Id } } }
            ];
        }

        const pendingHangout = await prisma.hangout.findFirst({
            where: hangoutWhere,
            include: { venue: true, attendees: { include: { user: { include: { profile: true } } } } },
            orderBy: { startTime: 'desc' }
        });

        if (pendingHangout) {
            console.log(`[PendingFeedback] Found hangout ${pendingHangout.id} for user ${userId}`);
        } else {
            console.log(`[PendingFeedback] No pending hangout for user ${userId}`);
        }

        res.json(pendingHangout);
    } catch (error) {
        console.error('Error fetching pending feedback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/hangouts/recurring/my  —  user's recurring patterns
// ---------------------------------------------------------------------------
router.get('/recurring/my', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const patterns = await prisma.recurringPattern.findMany({
            where: { creatorId: userId, isActive: true },
            include: {
                instances: {
                    where: { status: 'upcoming', startTime: { gt: new Date() } },
                    orderBy: { startTime: 'asc' },
                    take: 1,
                    include: { venue: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(patterns);
    } catch (error) {
        console.error('Error fetching recurring patterns:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/hangouts/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;

        const hangout = await prisma.hangout.findUnique({
            where: { id: id as string },
            include: {
                creator: { include: { profile: true } },
                attendees: { include: { user: { include: { profile: true } } } },
                venue: true,
                joinRequests: {
                    where: { userId: userId as string },
                    select: { status: true }
                }
            }
        });

        if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

        res.json({
            ...hangout,
            myJoinRequest: hangout.joinRequests[0] || null,
        });
    } catch (error) {
        console.error('Error fetching hangout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts  —  create hangout (supports recurring)
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Verify safety briefing completion
        const profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
        if (!profile?.safetyBriefingCompleted) {
            return res.status(403).json({ error: 'Safety briefing required before creating hangouts' });
        }

        // 0. Check Hosting Limits (Dev Doc: 1 group hangout hosted per month for free users)
        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        firstOfMonth.setHours(0, 0, 0, 0);

        const hostedThisMonth = await prisma.hangout.count({
            where: {
                creatorId: userId,
                createdAt: { gte: firstOfMonth }
            }
        });

        const isPremium = (profile.user as any).isPremium || false;
        if (!isPremium && hostedThisMonth >= 1) {
            return res.status(403).json({ 
                error: 'Hosting limit reached', 
                message: 'Free users can host 1 hangout per month. Upgrade to RealConnect Plus for unlimited hosting!' 
            });
        }

        const {
            title, description, startTime, venueId, maxAttendees, imageUrl,
            groupId, matchId, category, isPublic,
            // Recurring fields
            isRecurring, frequency, dayOfWeek, timeOfDay, endDate,
        } = req.body;

        if (!title || !startTime) {
            return res.status(400).json({ error: 'title and startTime are required' });
        }

        // Build base hangout data
        const baseData = {
            title,
            description,
            startTime: new Date(startTime),
            venueId,
            maxAttendees: maxAttendees || 6,
            imageUrl,
            groupId,
            creatorId: userId,
            category: category || null,
            isPublic: isPublic !== false,
        };

        // --- Recurring path ---
        if (isRecurring) {
            if (!frequency || !timeOfDay || !endDate) {
                return res.status(400).json({ error: 'frequency, timeOfDay, and endDate are required for recurring hangouts' });
            }

            const pattern = await prisma.recurringPattern.create({
                data: {
                    creatorId: userId,
                    title,
                    description,
                    category: category || null,
                    venueId,
                    maxAttendees: maxAttendees || 6,
                    isPublic: isPublic !== false,
                    frequency,
                    dayOfWeek: dayOfWeek ?? null,
                    timeOfDay,
                    endDate: new Date(endDate),
                }
            });

            // Generate instances
            const instances = generateRecurringDates(new Date(startTime), new Date(endDate), frequency);
            const created = await Promise.all(instances.map(date =>
                prisma.hangout.create({
                    data: {
                        ...baseData,
                        startTime: date,
                        recurringPatternId: pattern.id,
                        attendees: { create: { userId } }
                    }
                })
            ));

            return res.status(201).json({ pattern, instances: created });
        }

        // --- One-off path ---
        const hangout = await prisma.hangout.create({
            data: {
                ...baseData,
                attendees: { create: { userId } }
            }
        });

        if (matchId) {
            const match = await prisma.match.findUnique({ where: { id: matchId } });
            if (match) {
                const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
                await prisma.hangoutAttendee.create({ data: { hangoutId: hangout.id, userId: otherId } });
            }
        }

        res.status(201).json(hangout);
    } catch (error) {
        console.error('Error creating hangout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/join
// Public hangout → direct join. Private hangout → redirect to request-join.
// ---------------------------------------------------------------------------
router.post('/:id/join', async (req: Request, res: Response) => {
    try {
        const hangoutId = req.params.id as string;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Verify safety briefing completion
        const profile = await prisma.profile.findUnique({ where: { userId } });
        if (!profile?.safetyBriefingCompleted) {
            return res.status(403).json({ error: 'Safety briefing required before joining hangouts' });
        }

        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId as string },
            include: { attendees: true }
        });

        if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

        if (hangout.maxAttendees && hangout.attendees.length >= hangout.maxAttendees) {
            return res.status(400).json({ error: 'Hangout is full' });
        }

        if (!hangout.isPublic) {
            return res.status(400).json({ error: 'This hangout requires a join request. Use POST /request-join instead.' });
        }

        const attendee = await prisma.hangoutAttendee.create({ data: { hangoutId: hangoutId as string, userId: userId as string } });
        res.status(201).json(attendee);
    } catch (error: any) {
        if (error?.code === 'P2002') return res.status(400).json({ error: 'Already joined this hangout' });
        console.error('Error joining hangout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/request-join  —  request to join a private hangout
// ---------------------------------------------------------------------------
router.post('/:id/request-join', requireAuth, async (req: Request, res: Response) => {
    try {
        const hangoutId = req.params.id as string;
        const userId = req.user?.id!;
        const { message } = req.body;

        // Verify safety briefing completion
        const profile = await prisma.profile.findUnique({ where: { userId } });
        if (!profile?.safetyBriefingCompleted) {
            return res.status(403).json({ error: 'Safety briefing required before requesting to join' });
        }

        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId as string },
            include: { attendees: true }
        });

        if (!hangout) return res.status(404).json({ error: 'Hangout not found' });
        if (hangout.isPublic) return res.status(400).json({ error: 'This hangout is open — use POST /join instead.' });
        if (hangout.maxAttendees && hangout.attendees.length >= hangout.maxAttendees) {
            return res.status(400).json({ error: 'Hangout is full' });
        }

        const joinRequest = await prisma.hangoutJoinRequest.create({
            data: { hangoutId: hangoutId as string, userId: userId as string, message: message || null }
        });

        res.status(201).json(joinRequest);
    } catch (error: any) {
        if (error?.code === 'P2002') return res.status(400).json({ error: 'Join request already submitted' });
        console.error('Error submitting join request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/hangouts/:id/requests  —  host views pending join requests
// ---------------------------------------------------------------------------
router.get('/:id/requests', requireAuth, async (req: Request, res: Response) => {
    try {
        const hangoutId = req.params.id;
        const userId = req.user?.id!;

        const hangout = await prisma.hangout.findUnique({ where: { id: hangoutId as string } });
        if (!hangout) return res.status(404).json({ error: 'Hangout not found' });
        if (hangout.creatorId !== userId) return res.status(403).json({ error: 'Only the host can view requests' });

        const requests = await prisma.hangoutJoinRequest.findMany({
            where: { hangoutId: hangoutId as string, status: 'pending' },
            include: { user: { include: { profile: true } } },
            orderBy: { createdAt: 'asc' }
        });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching join requests:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/requests/:requestId/approve
// ---------------------------------------------------------------------------
router.post('/:id/requests/:requestId/approve', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id: hangoutId, requestId } = req.params as any;
        const userId = req.user?.id!;

        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId as string },
            include: { attendees: true }
        });
        if (!hangout) return res.status(404).json({ error: 'Hangout not found' });
        if (hangout.creatorId !== userId) return res.status(403).json({ error: 'Only the host can approve requests' });

        if (hangout.maxAttendees && hangout.attendees.length >= hangout.maxAttendees) {
            return res.status(400).json({ error: 'Hangout is full' });
        }

        const joinRequest = await prisma.hangoutJoinRequest.update({
            where: { id: requestId as string },
            data: { status: 'approved' }
        });

        await prisma.hangoutAttendee.create({
            data: { hangoutId, userId: joinRequest.userId }
        });

        res.json(joinRequest);
    } catch (error) {
        console.error('Error approving join request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/requests/:requestId/decline
// ---------------------------------------------------------------------------
router.post('/:id/requests/:requestId/decline', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id: hangoutId, requestId } = req.params as any;
        const userId = req.user?.id!;

        const hangout = await prisma.hangout.findUnique({ where: { id: hangoutId } });
        if (!hangout) return res.status(404).json({ error: 'Hangout not found' });
        if (hangout.creatorId !== userId) return res.status(403).json({ error: 'Only the host can decline requests' });

        const joinRequest = await prisma.hangoutJoinRequest.update({
            where: { id: requestId as string },
            data: { status: 'declined' }
        });

        res.json(joinRequest);
    } catch (error) {
        console.error('Error declining join request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/hangouts/recurring/:patternId  —  cancel entire series
// ---------------------------------------------------------------------------
router.delete('/recurring/:patternId', requireAuth, async (req: Request, res: Response) => {
    try {
        const { patternId } = req.params;
        const userId = req.user?.id!;

        const pattern = await prisma.recurringPattern.findUnique({ where: { id: patternId as string } });
        if (!pattern) return res.status(404).json({ error: 'Recurring pattern not found' });
        if (pattern.creatorId !== userId) return res.status(403).json({ error: 'Only the creator can cancel this series' });

        // Cancel all future instances
        await prisma.hangout.updateMany({
            where: {
                recurringPatternId: patternId as string,
                status: 'upcoming',
                startTime: { gt: new Date() }
            },
            data: { status: 'cancelled' }
        });

        await prisma.recurringPattern.update({ where: { id: patternId as string }, data: { isActive: false } });

        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling recurring series:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/skip-feedback
// ---------------------------------------------------------------------------
router.post('/:id/skip-feedback', requireAuth, async (req: Request, res: Response) => {
    try {
        const hangoutId = req.params.id;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Check if user was an attendee
        const attendance = await prisma.hangoutAttendee.findUnique({
            where: { hangoutId_userId: { hangoutId: hangoutId as string, userId: userId as string } }
        });

        console.log(`[SkipFeedback] User ${userId} skipping hangout ${hangoutId}`);

        if (!attendance) {
            console.warn(`[SkipFeedback] User ${userId} is not an attendee of hangout ${hangoutId}`);
            return res.status(403).json({ error: 'Only attendees can interact with feedback' });
        }

        // Upsert a feedback record with rating 0 to signify skipped
        console.log(`[SkipFeedback] Upserting feedback for user ${userId} on hangout ${hangoutId}`);
        const feedback = await prisma.hangoutFeedback.upsert({
            where: { hangoutId_userId: { hangoutId: hangoutId as string, userId: userId as string } },
            update: { rating: 0, comment: 'Skipped' },
            create: { hangoutId: hangoutId as string, userId: userId as string, rating: 0, comment: 'Skipped' }
        });

        res.json({ success: true, feedback });
    } catch (error) {
        console.error('Error skipping feedback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/feedback
// ---------------------------------------------------------------------------
router.post('/:id/feedback', async (req: Request, res: Response) => {
    try {
        const hangoutId = req.params.id;
        const userId = req.user?.id;
        const { rating, comment } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (rating === undefined || rating < 0 || rating > 5) {
            return res.status(400).json({ error: 'Valid rating (0-5) is required' });
        }

        const attendance = await prisma.hangoutAttendee.findUnique({
            where: { hangoutId_userId: { hangoutId: hangoutId as string, userId: userId as string } },
            include: { hangout: true }
        });

        if (!attendance) return res.status(403).json({ error: 'Only attendees can leave feedback' });

        const existingFeedback = await prisma.hangoutFeedback.findFirst({ where: { hangoutId: hangoutId as string, userId: userId as string } });
        if (existingFeedback) return res.status(400).json({ error: 'Feedback already submitted' });

        const feedback = await prisma.hangoutFeedback.create({ data: { hangoutId: hangoutId as string, userId: userId as string, rating, comment } });
        res.status(201).json(feedback);
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/check-in
// ---------------------------------------------------------------------------
router.post('/:id/check-in', requireAuth, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const userId = (req as any).user.id;

        const attendee = await prisma.hangoutAttendee.update({
            where: { hangoutId_userId: { hangoutId: id as string, userId: userId as string } },
            data: { checkInAt: new Date() }
        });

        res.json(attendee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check in' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/hangouts/:id/safe
// ---------------------------------------------------------------------------
router.post('/:id/safe', requireAuth, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const userId = (req as any).user.id;

        const attendee = await prisma.hangoutAttendee.update({
            where: { hangoutId_userId: { hangoutId: id as string, userId: userId as string } },
            data: { isSafe: true }
        });

        res.json(attendee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to report safe' });
    }
});

export default router;
