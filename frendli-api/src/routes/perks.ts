import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/perks
 * Returns available perks near the user.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id ?? null;

        const perks = await prisma.perk.findMany({
            include: { venue: true },
        });

        // If authenticated, check which perks the user has earned (active coupon)
        let earnedPerkIds = new Set<string>();
        if (userId) {
            const coupons = await prisma.coupon.findMany({
                where: {
                    userId,
                    status: 'active',
                    expiresAt: { gt: new Date() },
                },
                select: { perkId: true },
            });
            earnedPerkIds = new Set(coupons.map(c => c.perkId));
        }

        const result = perks.map(p => ({
            ...p,
            earned: earnedPerkIds.has(p.id),
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching perks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/perks/my
 * Returns active coupons for the authenticated user.
 */
router.get('/my', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const coupons = await prisma.coupon.findMany({
            where: { 
                userId,
                status: 'active',
                expiresAt: { gt: new Date() }
            },
            include: {
                perk: {
                    include: { venue: true }
                }
            }
        });
        res.json(coupons);
    } catch (error) {
        console.error('Error fetching my coupons:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/perks/redeem
 * Marks a coupon as redeemed. Typically called by the Partner Portal.
 * Body: { code: string }
 */
router.post('/redeem', async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Coupon code is required' });

        const coupon = await prisma.coupon.findUnique({
            where: { code },
        });

        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        if (coupon.status !== 'active') return res.status(400).json({ error: `Coupon is already ${coupon.status}` });
        if (coupon.expiresAt < new Date()) {
            await prisma.coupon.update({
                where: { id: coupon.id },
                data: { status: 'expired' }
            });
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        const updatedCoupon = await prisma.coupon.update({
            where: { id: coupon.id },
            data: { status: 'redeemed' },
        });

        res.json({ success: true, message: 'Coupon redeemed successfully', coupon: updatedCoupon });
    } catch (error) {
        console.error('Error redeeming coupon:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/perks/claim
 * Generates a coupon for the user for a specific perk.
 */
router.post('/claim', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { perkId, hangoutId } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!perkId) return res.status(400).json({ error: 'perkId is required' });

        // Check if user already has an active coupon for this perk
        const existing = await prisma.coupon.findFirst({
            where: { 
                userId, 
                perkId, 
                status: 'active',
                expiresAt: { gt: new Date() }
            }
        });

        if (existing) {
            return res.json(existing);
        }

        const code = `RC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

        const coupon = await prisma.coupon.create({
            data: {
                userId,
                perkId,
                hangoutId: hangoutId || '', // Associated hangout if provided
                code,
                expiresAt,
                status: 'active'
            },
            include: {
                perk: { include: { venue: true } }
            }
        });

        res.status(201).json(coupon);
    } catch (error) {
        console.error('Error claiming perk:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
