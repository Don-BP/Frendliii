// frendli-api/src/routes/friends.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/friends
// Returns the current user's friends: people they've completed a hangout with
// AND left HangoutFeedback with rating >= 4.
router.get('/', async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any).id as string;

        // Step 1: find all completed hangouts this user attended
        const myAttendances = await prisma.hangoutAttendee.findMany({
            where: {
                userId: currentUserId,
                hangout: { status: 'completed' },
            },
            select: { hangoutId: true },
        });

        const completedHangoutIds = myAttendances.map(a => a.hangoutId);

        if (completedHangoutIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Step 2: filter to hangouts where the user left feedback with rating >= 4
        const qualifyingFeedback = await prisma.hangoutFeedback.findMany({
            where: {
                hangoutId: { in: completedHangoutIds },
                userId: currentUserId,
                rating: { gte: 4 },
            },
            select: { hangoutId: true },
        });

        const qualifyingHangoutIds = qualifyingFeedback.map(f => f.hangoutId);

        if (qualifyingHangoutIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Step 3: collect blocked user IDs (either direction)
        const blocks = await prisma.block.findMany({
            where: {
                OR: [
                    { blockerId: currentUserId },
                    { blockedId: currentUserId },
                ],
            },
            select: { blockerId: true, blockedId: true },
        });

        const blockedUserIds = new Set(
            blocks.map(b => b.blockerId === currentUserId ? b.blockedId : b.blockerId)
        );

        // Step 4: get all other attendees of those hangouts, with hangout details
        const otherAttendances = await prisma.hangoutAttendee.findMany({
            where: {
                hangoutId: { in: qualifyingHangoutIds },
                userId: { not: currentUserId },
            },
            include: {
                hangout: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        startTime: true,
                    },
                },
                user: {
                    include: {
                        profile: {
                            select: {
                                firstName: true,
                                photos: true,
                            },
                        },
                    },
                },
            },
        });

        // Step 5: group by friend userId, deduplicate
        const friendMap = new Map<string, {
            userId: string;
            firstName: string;
            profilePhoto: string | null;
            hangoutCount: number;
            lastHangout: { title: string; category: string | null; startTime: Date };
        }>();

        for (const attendance of otherAttendances) {
            const friendUserId = attendance.userId;
            const profile = attendance.user.profile;

            // Exclude blocked users and users with no profile
            if (blockedUserIds.has(friendUserId)) continue;
            if (!profile) continue;

            const hangout = attendance.hangout;
            const existing = friendMap.get(friendUserId);

            if (!existing) {
                friendMap.set(friendUserId, {
                    userId: friendUserId,
                    firstName: profile.firstName,
                    profilePhoto: profile.photos.length > 0 ? profile.photos[0] : null,
                    hangoutCount: 1,
                    lastHangout: {
                        title: hangout.title,
                        category: hangout.category ?? null,
                        startTime: hangout.startTime,
                    },
                });
            } else {
                existing.hangoutCount += 1;
                if (hangout.startTime > existing.lastHangout.startTime) {
                    existing.lastHangout = {
                        title: hangout.title,
                        category: hangout.category ?? null,
                        startTime: hangout.startTime,
                    };
                }
            }
        }

        // Step 6: sort by lastHangout.startTime descending, format response
        const friends = Array.from(friendMap.values())
            .sort((a, b) => b.lastHangout.startTime.getTime() - a.lastHangout.startTime.getTime())
            .map(f => ({
                userId: f.userId,
                firstName: f.firstName,
                profilePhoto: f.profilePhoto,
                hangoutCount: f.hangoutCount,
                lastHangout: {
                    title: f.lastHangout.title,
                    category: f.lastHangout.category,
                    startTime: f.lastHangout.startTime.toISOString(),
                },
            }));

        res.json({ friends });
    } catch (error) {
        console.error('GET /api/friends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
