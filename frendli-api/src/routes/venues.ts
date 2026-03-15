import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/venues/search
 * Suggests venues based on user interests and location.
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const category = req.query.category as string;

        // Mock venues for now as we don't have Google Places API key yet
        const allVenues = [
            {
                id: 'v1',
                name: 'Central Park - Wildwood Trail',
                address: 'New York, NY',
                latitude: 40.785091,
                longitude: -73.968285,
                category: 'park',
                imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f'
            },
            {
                id: 'v2',
                name: 'Blue Bottle Coffee',
                address: '123 Main St, New York, NY',
                latitude: 40.712776,
                longitude: -74.005974,
                category: 'cafe',
                imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb'
            },
            {
                id: 'v3',
                name: 'Uncommons Board Game Cafe',
                address: '230 Thompson St, New York, NY',
                latitude: 40.730610,
                longitude: -73.935242,
                category: 'cafe',
                imageUrl: 'https://images.unsplash.com/photo-1610819013583-699784251ce7'
            },
            {
                id: 'v4',
                name: 'Katz\'s Delicatessen',
                address: '205 E Houston St, New York, NY',
                latitude: 40.722210,
                longitude: -73.987501,
                category: 'restaurant',
                imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'
            },
            {
                id: 'v5',
                name: 'The Dead Rabbit',
                address: '30 Water St, New York, NY',
                latitude: 40.703277,
                longitude: -74.011024,
                category: 'bar',
                imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b'
            }
        ];

        let venues = allVenues;
        if (category) {
            venues = allVenues.filter(v => v.category === category);
            // If no match for category, return all as fallback
            if (venues.length === 0) venues = allVenues;
        }

        res.json(venues);
    } catch (error) {
        console.error('Error fetching venues:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Haversine helper (local to venues.ts — used for distance display and sorting)
function venueHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/venues/featured
 * Returns Perks and Premier partner venues near the user.
 * Query params: lat (float), lng (float), category (slug, optional)
 * Response: PartnerVenue[]
 */
router.get('/featured', async (req: Request, res: Response) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
        const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
        const category = req.query.category as string | undefined;

        const venues = await prisma.venue.findMany({
            where: {
                partnershipTier: { in: ['perks', 'premier'] },
                isActive: true,
                ...(category ? { category } : {}),
                perks: { some: {} }, // Only venues with at least one Perk
            },
            include: {
                perks: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
            take: 20, // Over-fetch so sort can trim to 10
        });

        // Sort: premier first, then perks; within each tier by haversine proximity
        const sorted = venues.sort((a, b) => {
            // Tier sort: premier first
            if (a.partnershipTier === 'premier' && b.partnershipTier !== 'premier') return -1;
            if (a.partnershipTier !== 'premier' && b.partnershipTier === 'premier') return 1;
            // Proximity sort within tier using haversine (not Euclidean)
            if (lat !== null && lng !== null && a.latitude && a.longitude && b.latitude && b.longitude) {
                const distA = venueHaversineKm(lat, lng, a.latitude, a.longitude);
                const distB = venueHaversineKm(lat, lng, b.latitude, b.longitude);
                return distA - distB;
            }
            return 0;
        }).slice(0, 10);

        const result = sorted.map(v => {
            let distance: string | null = null;
            if (lat !== null && lng !== null && v.latitude && v.longitude) {
                const km = venueHaversineKm(lat, lng, v.latitude, v.longitude);
                distance = `${km.toFixed(1)}km away`;
            }

            return {
                id: v.id,
                name: v.name,
                category: v.category,
                partnerTier: v.partnershipTier as 'perks' | 'premier',
                dealText: v.perks[0]?.discountText ?? '',
                distance,
                photos: v.photos,
                address: v.address,
                openingHours: v.openingHours ?? null,
            };
        });

        res.json(result);
    } catch (error) {
        console.error('GET /api/venues/featured error:', error);
        res.json([]); // Always return empty array on error — non-critical surface
    }
});

/**
 * GET /api/venues/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const venue = await prisma.venue.findUnique({
            where: { id: id as string }
        });

        if (!venue) return res.status(404).json({ error: 'Venue not found' });
        res.json(venue);
    } catch (error) {
        console.error('Error fetching venue details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
