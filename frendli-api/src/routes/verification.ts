// frendli-api/src/routes/verification.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const router = Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia', // Stripe SDK v21 requires this version string (.dahlia is stable, not preview)
});

// POST /api/verification/initiate
// Auth-gated. Creates Stripe session(s) and returns client secrets.
router.post('/initiate', async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        // Check if already verified
        const profile = await prisma.profile.findUnique({ where: { userId } });
        if (profile?.safetyBadges?.includes('ID Verified')) {
            return res.status(409).json({ error: 'Already verified' });
        }

        // Check subscription tier
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isPremium = user.subscriptionTier === 'plus' || user.subscriptionTier === 'pro';

        // Create Identity VerificationSession (always)
        const verificationSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: { userId },
            options: {
                document: {
                    require_matching_selfie: true,
                },
            },
        });

        if (isPremium) {
            return res.status(200).json({
                identityClientSecret: verificationSession.client_secret,
            });
        }

        // Free user — also create a $1.99 PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 199, // $1.99 in cents
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: { userId, purpose: 'id_verification' },
        });

        return res.status(200).json({
            paymentClientSecret: paymentIntent.client_secret,
            identityClientSecret: verificationSession.client_secret,
        });
    } catch (error) {
        console.error('Error initiating verification:', error);
        res.status(500).json({ error: 'Failed to initiate verification' });
    }
});

// POST /api/verification/webhook
// Public, raw body. Stripe calls this when verification completes.
router.post('/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig as string,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'identity.verification_session.verified') {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        const userId = session.metadata?.userId;

        if (!userId) {
            console.error('Webhook: no userId in session metadata');
            return res.status(200).json({ received: true });
        }

        // Idempotency check
        const profile = await prisma.profile.findUnique({ where: { userId } });
        if (profile?.safetyBadges?.includes('ID Verified')) {
            return res.status(200).json({ received: true });
        }

        await prisma.profile.update({
            where: { userId },
            data: { safetyBadges: { push: 'ID Verified' } },
        });

        console.log(`[Verification] User ${userId} verified successfully`);
    }

    res.status(200).json({ received: true });
});

export default router;
