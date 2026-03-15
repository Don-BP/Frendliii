import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/user/subscription — Returns current subscription status for the logged-in user
router.get('/subscription', async (req, res) => {
    try {
        const userId = (req.user as any).id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPremium: true, subscriptionTier: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json({ isPremium: user.isPremium, subscriptionTier: user.subscriptionTier });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

export default router;
