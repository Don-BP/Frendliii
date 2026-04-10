import request from 'supertest';
import express from 'express';

// --- Mocks (must be before imports that use them) ---
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockFrom = jest.fn().mockReturnValue({
  upsert: mockUpsert,
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

import venuesRouter from '../venues';

function buildApp(userId = 'user-1') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: userId };
    next();
  });
  app.use('/api/venues', venuesRouter);
  return app;
}

describe('POST /api/venues/:venueId/interact', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 on success', async () => {
    const res = await request(buildApp()).post('/api/venues/venue-123/interact');
    expect(res.status).toBe(204);
  });

  it('upserts into user_venue_interactions', async () => {
    await request(buildApp()).post('/api/venues/venue-123/interact');
    expect(mockFrom).toHaveBeenCalledWith('user_venue_interactions');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', venue_id: 'venue-123' }),
      expect.objectContaining({ onConflict: 'user_id,venue_id' })
    );
  });
});
