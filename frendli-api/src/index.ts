import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './middleware/auth';
import { NotificationService } from './services/notification.service';
import profileRouter from './routes/profile';
import interestsRouter from './routes/interests';
import discoveryRouter from './routes/discovery';
import messageRouter from './routes/message';
import hangoutRoutes from './routes/hangouts';
import venueRoutes from './routes/venues';
import groupRoutes from './routes/groups';
import safetyRoutes from './routes/safety';
import perksRouter from './routes/perks';
import leadsRouter from './routes/leads';
import subscriptionRouter from './routes/subscription';
import webhooksRouter from './routes/webhooks';
import friendsRouter from './routes/friends';
import { SafeArrivalService } from './services/safe-arrival.service';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
    },
});

const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'Frendli API is running' });
});

// Public routes
app.use('/api/interests', interestsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/webhooks', webhooksRouter);

// Auth-gated routes
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/discovery', requireAuth, discoveryRouter);
app.use('/api/messages', requireAuth, messageRouter);
app.use('/api/hangouts', requireAuth, hangoutRoutes);
app.use('/api/venues', requireAuth, venueRoutes);
app.use('/api/groups', requireAuth, groupRoutes);
app.use('/api/safety', requireAuth, safetyRoutes);
app.use('/api/perks', requireAuth, perksRouter);
app.use('/api/user', requireAuth, subscriptionRouter);
app.use('/api/friends', requireAuth, friendsRouter);

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_match', (matchId: string) => {
        socket.join(matchId);
        console.log(`Socket ${socket.id} joined room ${matchId}`);
    });

    socket.on('send_message', async (data: { matchId: string, senderId: string, content: string }) => {
        try {
            const message = await prisma.message.create({
                data: {
                    matchId: data.matchId,
                    senderId: data.senderId,
                    content: data.content,
                },
            });

            // Broadcast to both users in the room
            io.to(data.matchId).emit('receive_message', message);

            // Notify the receiver (if they aren't in the room, handled by Firebase)
            const match = await prisma.match.findUnique({
                where: { id: data.matchId },
                include: {
                    user1: { include: { profile: true } },
                    user2: { include: { profile: true } },
                },
            });

            if (match) {
                const receiverId = match.user1Id === data.senderId ? match.user2Id : match.user1Id;
                const senderProfile = match.user1Id === data.senderId ? match.user1.profile : match.user2.profile;

                if (senderProfile) {
                    await NotificationService.notifyNewMessage(
                        receiverId,
                        senderProfile.firstName,
                        data.content,
                        data.matchId
                    );
                }
            }
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Legacy: users list
app.get('/api/users', requireAuth, async (_req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

httpServer.listen(port, () => {
    console.log(`API Server running on port ${port}`);
    
    // Start Safety Monitoring
    const safeArrival = new SafeArrivalService(io);
    safeArrival.startMonitoring();
});
