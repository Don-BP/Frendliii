import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/leads — Submit a corporate wellness lead inquiry
// Public endpoint (no auth required), though in practice callers are logged-in users.
router.post('/', async (req, res) => {
    try {
        const { firstName, workEmail, companyName, teamSize, plan, userId } = req.body;

        if (!workEmail) return res.status(400).json({ error: 'workEmail is required' });
        if (!companyName) return res.status(400).json({ error: 'companyName is required' });
        if (!plan) return res.status(400).json({ error: 'plan is required' });

        const lead = await prisma.lead.create({
            data: {
                userId: userId || null,
                firstName: firstName || '',
                workEmail,
                companyName,
                teamSize: teamSize || '',
                plan,
            },
        });

        // TODO: Send confirmation email to workEmail when email service is added.
        console.log(`[Leads] New corporate lead: ${companyName} (${workEmail}), plan: ${plan}`);

        res.status(201).json(lead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Failed to submit lead' });
    }
});

export default router;
