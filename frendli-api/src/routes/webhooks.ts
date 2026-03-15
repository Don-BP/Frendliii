import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/webhooks/revenuecat — RevenueCat subscription lifecycle events
// Public endpoint — verified via shared secret header instead of JWT.
router.post('/revenuecat', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

        if (!secret || authHeader !== `Bearer ${secret}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { event } = req.body;
        if (!event) return res.status(400).json({ error: 'Missing event' });

        const { type, app_user_id } = event;
        if (!app_user_id) return res.status(400).json({ error: 'Missing app_user_id' });

        if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
            await prisma.user.update({
                where: { id: app_user_id },
                data: { isPremium: true, subscriptionTier: 'plus' },
            });
            console.log(`[RevenueCat] ${type}: user ${app_user_id} upgraded to plus`);
        } else if (type === 'CANCELLATION' || type === 'EXPIRATION') {
            await prisma.user.update({
                where: { id: app_user_id },
                data: { isPremium: false, subscriptionTier: 'free' },
            });
            console.log(`[RevenueCat] ${type}: user ${app_user_id} reverted to free`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error processing RevenueCat webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
