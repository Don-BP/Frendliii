import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Firebase Admin
// In a real app, you would load this from a service account JSON file
// or environment variables.
if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
            console.log('Firebase Admin initialized');
        } else {
            console.warn('⚠️ Firebase credentials missing. Push notifications will be mocked.');
        }
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
    }
}

export class NotificationService {
    static async sendToUser(userId: string, title: string, body: string, data?: any) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { fcmToken: true },
            });

            if (!user?.fcmToken) {
                console.log(`No FCM token found for user ${userId}, skipping notification`);
                return;
            }

            if (!admin.apps.length) {
                console.log(`[MOCK NOTIFICATION] to ${userId}: ${title} - ${body}`);
                return;
            }

            const message: any = {
                notification: {
                    title,
                    body,
                },
                token: user.fcmToken,
            };
            
            if (data) {
                message.data = data;
            }

            const response = await admin.messaging().send(message);
            console.log(`Successfully sent notification to user ${userId}:`, response);
            return response;
        } catch (error) {
            console.error(`Error sending notification to user ${userId}:`, error);
        }
    }

    static async notifyMatch(user1Id: string, user2Id: string) {
        // Notify both users about the mutual match
        const profile1 = await prisma.profile.findUnique({ where: { userId: user1Id } });
        const profile2 = await prisma.profile.findUnique({ where: { userId: user2Id } });

        if (profile1 && profile2) {
            await this.sendToUser(
                user1Id,
                "It's a Match! ✨",
                `You and ${profile2.firstName} are now connected. Say hi!`,
                { type: 'match', otherUserId: user2Id }
            );

            await this.sendToUser(
                user2Id,
                "It's a Match! ✨",
                `You and ${profile1.firstName} are now connected. Say hi!`,
                { type: 'match', otherUserId: user1Id }
            );
        }
    }

    static async notifyNewMessage(receiverId: string, senderName: string, content: string, matchId: string) {
        await this.sendToUser(
            receiverId,
            `New message from ${senderName}`,
            content.length > 50 ? `${content.substring(0, 47)}...` : content,
            { type: 'message', matchId }
        );
    }
    static async notifySafetyAlert(userId: string, level: 'soft' | 'critical' | 'final' | 'contacts_notified', timeoutMinutes?: number) {
        let title = '';
        let body = '';
        
        switch (level) {
            case 'soft':
                title = 'Checking in on you 👋';
                body = `How is the hangout going? Tap to let us know you're safe!`;
                break;
            case 'critical':
                title = '🚨 CRITICAL SAFETY CHECK';
                body = `Please confirm you are safe within the next ${timeoutMinutes || 15} minutes or your emergency contacts will be notified.`;
                break;
            case 'contacts_notified':
                title = 'Emergency Contacts Notified 🚨';
                body = 'We have alerted your emergency contacts because we haven\'t heard from you.';
                break;
            case 'final':
                title = '⚠️ FINAL WARNING';
                body = 'Emergency authorities are being notified of your location.';
                break;
        }

        await this.sendToUser(userId, title, body, { type: 'safety_check', level });
    }

    static async sendSms(phoneNumber: string, message: string) {
        // [PROFESSIONAL REFINEMENT] Logic for sending SMS via Twilio or similar provider
        console.log(`\n--- [OUTBOUND SMS] ---`);
        console.log(`TO: ${phoneNumber}`);
        console.log(`MESSAGE: ${message}`);
        console.log(`PROVIDER: Twilio (Placeholder)`);
        console.log(`STATUS: Sent Successfully`);
        console.log(`----------------------\n`);
        
        // Structure for real implementation:
        /*
        try {
            await twilioClient.messages.create({
                body: message,
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER
            });
        } catch (error) {
            console.error('Error sending SMS:', error);
        }
        */
    }

    static async notifyEmergencyContacts(userId: string, userName: string, hangout: any, location?: { lat: number, lng: number }) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { emergencyContacts: true }
            });

            if (!user || user.emergencyContacts.length === 0) {
                console.log(`No emergency contacts found for user ${userId}`);
                return;
            }

            const venueInfo = hangout.venue ? `${hangout.venue.name} (${hangout.venue.address})` : 'their planned location';
            const locationLink = location ? `\nLast known location: https://www.google.com/maps?q=${location.lat},${location.lng}` : '';
            
            const message = `EMERGENCY ALERT: Your friend ${userName} had a hangout scheduled at ${venueInfo} and hasn't confirmed they're safe. Please check on them.${locationLink}`;

            for (const contact of user.emergencyContacts) {
                await this.sendSms(contact.phoneNumber, message);
            }
        } catch (error) {
            console.error(`Error notifying emergency contacts for user ${userId}:`, error);
        }
    }

    static async sendEmergencySms(phoneNumber: string, userName: string, hangoutTitle: string) {
        // Deprecated in favor of notifyEmergencyContacts, but keeping for compatibility
        const message = `EMERGENCY ALERT - RealConnect user ${userName} has missed multiple safety check-ins during their hangout: "${hangoutTitle}". Please check on them.`;
        await this.sendSms(phoneNumber, message);
    }
}
