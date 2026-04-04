// frendli-api/src/routes/__tests__/verification.test.ts
import request from 'supertest';
import express from 'express';

// --- Mocks (must be before imports that use them) ---

const mockVerificationSessionCreate = jest.fn();
const mockPaymentIntentCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();
const mockProfileFindUnique = jest.fn();
const mockProfileUpdate = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        identity: {
            verificationSessions: {
                create: mockVerificationSessionCreate,
            },
        },
        paymentIntents: {
            create: mockPaymentIntentCreate,
        },
        webhooks: {
            constructEvent: mockWebhooksConstructEvent,
        },
    }));
});

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        user: { findUnique: mockUserFindUnique },
        profile: { findUnique: mockProfileFindUnique, update: mockProfileUpdate },
    })),
}));

// --- Import AFTER mocks are set up ---
import verificationRouter from '../verification';

// --- Test App ---
function buildApp(userId = 'user-001') {
    const app = express();
    app.use((req, _res, next) => {
        (req as any).user = { id: userId };
        next();
    });
    // Webhook route needs raw body
    app.use('/webhook', express.raw({ type: 'application/json' }), verificationRouter);
    app.use(express.json());
    app.use('/', verificationRouter);
    return app;
}

// --- Tests ---

describe('POST /initiate — free user', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserFindUnique.mockResolvedValue({
            id: 'user-001',
            subscriptionTier: 'free',
        });
        mockProfileFindUnique.mockResolvedValue({ safetyBadges: [] });
        mockPaymentIntentCreate.mockResolvedValue({ client_secret: 'pi_test_cs_secret' });
        mockVerificationSessionCreate.mockResolvedValue({
            client_secret: 'vsession_test_cs_secret',
            url: 'https://verify.stripe.com/start/test',
        });
    });

    it('returns paymentClientSecret and identityClientSecret for free users', async () => {
        const res = await request(buildApp()).post('/initiate');
        expect(res.status).toBe(200);
        expect(res.body.paymentClientSecret).toBe('pi_test_cs_secret');
        expect(res.body.identityClientSecret).toBe('vsession_test_cs_secret');
        expect(res.body.identityUrl).toBe('https://verify.stripe.com/start/test');
    });

    it('returns 409 if user is already verified', async () => {
        mockProfileFindUnique.mockResolvedValue({ safetyBadges: ['ID Verified'] });
        const res = await request(buildApp()).post('/initiate');
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Already verified');
    });
});

describe('POST /initiate — plus/pro user', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserFindUnique.mockResolvedValue({
            id: 'user-001',
            subscriptionTier: 'plus',
        });
        mockProfileFindUnique.mockResolvedValue({ safetyBadges: [] });
        mockVerificationSessionCreate.mockResolvedValue({
            client_secret: 'vsession_test_cs_secret',
            url: 'https://verify.stripe.com/start/test',
        });
    });

    it('returns only identityClientSecret (no payment) for plus/pro users', async () => {
        const res = await request(buildApp()).post('/initiate');
        expect(res.status).toBe(200);
        expect(res.body.identityClientSecret).toBe('vsession_test_cs_secret');
        expect(res.body.identityUrl).toBe('https://verify.stripe.com/start/test');
        expect(res.body.paymentClientSecret).toBeUndefined();
        expect(mockPaymentIntentCreate).not.toHaveBeenCalled();
    });
});

describe('POST /webhook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockProfileFindUnique.mockResolvedValue({ safetyBadges: [] });
        mockProfileUpdate.mockResolvedValue({ safetyBadges: ['ID Verified'] });
    });

    it('writes ID Verified badge on successful verification event', async () => {
        mockWebhooksConstructEvent.mockReturnValue({
            type: 'identity.verification_session.verified',
            data: { object: { metadata: { userId: 'user-001' } } },
        });

        const res = await request(buildApp())
            .post('/webhook')
            .set('stripe-signature', 'test-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(mockProfileUpdate).toHaveBeenCalledWith({
            where: { userId: 'user-001' },
            data: { safetyBadges: { push: 'ID Verified' } },
        });
    });

    it('is idempotent — skips update if already verified', async () => {
        mockProfileFindUnique.mockResolvedValue({ safetyBadges: ['ID Verified'] });
        mockWebhooksConstructEvent.mockReturnValue({
            type: 'identity.verification_session.verified',
            data: { object: { metadata: { userId: 'user-001' } } },
        });

        const res = await request(buildApp())
            .post('/webhook')
            .set('stripe-signature', 'test-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('ignores unhandled Stripe event types', async () => {
        mockWebhooksConstructEvent.mockReturnValue({
            type: 'payment_intent.succeeded',
            data: { object: {} },
        });

        const res = await request(buildApp())
            .post('/webhook')
            .set('stripe-signature', 'test-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('returns 400 on invalid Stripe signature', async () => {
        mockWebhooksConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const res = await request(buildApp())
            .post('/webhook')
            .set('stripe-signature', 'bad-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(400);
    });
});
