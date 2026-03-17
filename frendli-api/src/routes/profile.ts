import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StyleAnalysisService } from '../services/style-analysis.service';

const router = Router();
const prisma = new PrismaClient();

// GET /api/profile — get current user's profile
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Look up user + profile by Supabase ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.profile) return res.status(404).json({ error: 'Profile not found', hasProfile: false });

        res.json({ profile: user.profile });
    } catch (err) {
        console.error('GET /api/profile error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/profile — create profile (called at end of onboarding)
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { firstName, bio, dob, interests, friendshipStyle, availability, lifeStage, photos } = req.body;

        if (!firstName) return res.status(400).json({ error: 'firstName is required' });

        // Upsert user record first (Supabase user may not be in our DB yet)
        const phoneNumber = req.user?.phone ?? req.user?.phone_number ?? 'unknown';
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                phoneNumber,
                isVerified: true,
            },
        });

        // Create profile (fail if already exists)
        const profile = await prisma.profile.create({
            data: {
                userId,
                firstName,
                bio: bio ?? null,
                dob: dob ? new Date(dob) : null,
                interests: interests ?? [],
                photos: photos ?? [],
                friendshipStyle: friendshipStyle ?? null,
                availability: availability ?? null,
                lifeStage: lifeStage ?? null,
            },
        });

        res.status(201).json({ profile });
    } catch (err: any) {
        if (err?.code === 'P2002') {
            // Unique constraint violation — profile already exists, treat as upsert
            return res.status(409).json({ error: 'Profile already exists. Use PATCH to update.' });
        }
        console.error('POST /api/profile error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /api/profile — update current user's profile
router.patch('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const {
            firstName, bio, dob, interests, interestWeights, friendshipStyle, availability, lifeStage, photos, safetyBriefingCompleted, safetyBadges, activityPreferences
        } = req.body;

        // Validate interestWeights if present
        let validatedWeights: Record<string, number> | undefined = undefined;
        if (interestWeights !== undefined) {
            if (typeof interestWeights !== 'object' || Array.isArray(interestWeights)) {
                return res.status(422).json({ error: 'interestWeights must be an object' });
            }

            // Determine which interests array to validate against
            const baseInterests: string[] = interests !== undefined
                ? (Array.isArray(interests) ? interests : [])
                : ((await prisma.profile.findUnique({ where: { userId: req.user!.id }, select: { interests: true } }))?.interests ?? []);

            const stripped: Record<string, number> = {};
            for (const [key, value] of Object.entries(interestWeights as Record<string, unknown>)) {
                if (!baseInterests.includes(key)) continue; // Strip unknown keys silently
                if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 10) {
                    return res.status(422).json({ error: `interestWeights["${key}"] must be an integer between 1 and 10` });
                }
                stripped[key] = value as number;
            }
            validatedWeights = stripped;
        }

        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(bio !== undefined && { bio }),
                ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
                ...(interests !== undefined && { interests }),
                ...(photos !== undefined && { photos }),
                ...(friendshipStyle !== undefined && { friendshipStyle }),
                ...(availability !== undefined && { availability }),
                ...(lifeStage !== undefined && { lifeStage }),
                ...(safetyBriefingCompleted !== undefined && { safetyBriefingCompleted }),
                ...(safetyBadges !== undefined && { safetyBadges }),
                ...(activityPreferences !== undefined && { activityPreferences }),
                ...(validatedWeights !== undefined && { interestWeights: validatedWeights }),
            },
        });

        res.json({ profile: updatedProfile });
    } catch (err: any) {
        if (err?.code === 'P2025') {
            return res.status(404).json({ error: 'Profile not found' });
        }
        console.error('PATCH /api/profile error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/profile/fcm-token — update current user's FCM token for notifications
router.post('/fcm-token', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ error: 'fcmToken is required' });

        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/profile/fcm-token error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/profile/:userId — get another user's public profile
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;

        const profile = await prisma.profile.findUnique({
            where: { userId },
            select: {
                id: true,
                firstName: true,
                bio: true,
                dob: true,
                interests: true,
                photos: true,
                friendshipStyle: true,
                availability: true,
                lifeStage: true,
                safetyBadges: true,
                activityPreferences: true,
                // Exclude: stylePhotoUrl, stylePhotos (private), userId (internal)
            },
        });

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        res.json({ profile });
    } catch (err) {
        console.error('GET /api/profile/:userId error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/profile/style-photo
 * Uploads and analyzes a style photo to generate tags.
 */
router.post('/style-photo', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { imageUrl } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });

        // Analyze image for style tags
        const tags = await StyleAnalysisService.analyzeImage(imageUrl);

        // Update profile with new photo and tags (appending to existing)
        const profile = await prisma.profile.findUnique({ where: { userId } });
        const currentPhotos: string[] = profile?.stylePhotos || [];
        const currentTags: string[] = profile?.styleTags || [];

        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: {
                stylePhotos: [...currentPhotos, imageUrl],
                styleTags: Array.from(new Set([...currentTags, ...tags]))
            }
        });

        res.json({
            success: true,
            imageUrl,
            allTags: updatedProfile.styleTags as string[]
        });
    } catch (error) {
        console.error('Error analyzing style photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
