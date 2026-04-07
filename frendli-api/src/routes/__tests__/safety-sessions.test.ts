import request from 'supertest';
import express from 'express';

// --- Mocks ---
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockLimit = jest.fn();
const mockNeq = jest.fn();

const mockChain = {
  select: mockSelect,
  eq: mockEq,
  insert: mockInsert,
  update: mockUpdate,
  order: mockOrder,
  single: mockSingle,
  limit: mockLimit,
  neq: mockNeq,
};

Object.values(mockChain).forEach(fn => (fn as jest.Mock).mockReturnValue(mockChain));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
mockFrom.mockReturnValue(mockChain);

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    profile: { update: jest.fn().mockResolvedValue({}) },
    hangoutAttendee: {
      updateMany: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    hangout: { findUnique: jest.fn().mockResolvedValue(null) },
  })),
}));

jest.mock('../../services/notification.service', () => ({
  NotificationService: { sendToUser: jest.fn() },
}));

import safetyRouter from '../safety';

function buildApp(userId = 'user-001') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: userId };
    next();
  });
  app.use('/', safetyRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('POST /session/start', () => {
  it('inserts a safety_session and returns 201', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage2_delay_min: 10, contact_delay_min: 30, reminder_interval_min: 30, stage4_enabled: false }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { id: 'sess-1' }, error: null });

    const res = await request(buildApp()).post('/session/start').send({
      hangoutId: 'hang-1',
      venueLat: 51.5,
      venueLng: -0.1,
      venueName: 'The Crown',
      venueAddress: '1 High St',
      otherPersonFirstName: 'Alex',
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sessionId');
  });

  it('returns 400 if required fields are missing', async () => {
    const res = await request(buildApp()).post('/session/start').send({ hangoutId: 'hang-1' });
    expect(res.status).toBe(400);
  });
});

describe('POST /session/resolve', () => {
  it('marks session and incident resolved and returns 200', async () => {
    mockEq.mockResolvedValueOnce({ error: null });
    mockEq.mockResolvedValueOnce({ data: [{ id: 'sess-1' }], error: null });
    mockEq.mockResolvedValueOnce({ error: null });

    const res = await request(buildApp()).post('/session/resolve').send({ hangoutId: 'hang-1' });
    expect(res.status).toBe(200);
  });
});

describe('GET /incidents', () => {
  it('returns incident list for the user', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [{ id: 'inc-1', status: 'resolved', created_at: new Date().toISOString() }],
      error: null,
    });

    const res = await request(buildApp()).get('/incidents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
