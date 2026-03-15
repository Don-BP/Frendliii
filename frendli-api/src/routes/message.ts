import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all matches for the authenticated user
router.get('/matches', requireAuth, async (req: any, res) => {
    const userId = req.user.id;

    try {
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { user1Id: userId },
                    { user2Id: userId },
                ],
            },
            include: {
                user1: {
                    include: {
                        profile: true,
                    },
                },
                user2: {
                    include: {
                        profile: true,
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
        });

        const formattedMatches = matches.map((match) => {
            const otherUser = match.user1Id === userId ? match.user2 : match.user1;
            return {
                id: match.id,
                otherUser: {
                    id: otherUser.id,
                    firstName: otherUser.profile?.firstName,
                    photoUrl: otherUser.profile?.photos[0],
                },
                lastMessage: match.messages[0] || null,
                createdAt: match.createdAt,
            };
        });

        res.json(formattedMatches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get message history for a specific match
router.get('/:matchId', requireAuth, async (req: any, res) => {
    const { matchId } = req.params;
    const userId = req.user.id;

    try {
        // Verify user is part of the match
        // First try finding by match ID
        let match = await prisma.match.findUnique({
            where: { id: matchId },
        });

        // If not found, check if the ID provided is actually the other person's userId
        if (!match) {
            match = await prisma.match.findFirst({
                where: {
                    OR: [
                        { user1Id: userId, user2Id: matchId },
                        { user1Id: matchId, user2Id: userId },
                    ],
                },
            });
        }

        if (!match) {
            // Return empty instead of 404 to allow UI to show start conversation
            return res.json([]);
        }

        const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
        const otherUser = await prisma.user.findUnique({
            where: { id: otherUserId },
            include: { profile: true }
        });

        const messages = await prisma.message.findMany({
            where: { matchId: match.id },
            orderBy: { createdAt: 'asc' },
        });

        res.json({
            messages,
            matchId: match.id,
            otherUser: otherUser ? {
                id: otherUser.id,
                firstName: otherUser.profile?.firstName,
                photos: otherUser.profile?.photos
            } : null
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
