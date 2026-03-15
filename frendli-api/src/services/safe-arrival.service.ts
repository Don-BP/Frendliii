import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { NotificationService } from './notification.service';

const prisma = new PrismaClient();

/**
 * SafeArrivalService
 * Handles the background monitoring of meetups and the 4-stage safety escalation.
 */
export class SafeArrivalService {
    private io: Server;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(io: Server) {
        this.io = io;
    }

    /**
     * Starts the periodic check for active meetups that need safety monitoring.
     */
    public startMonitoring() {
        if (this.checkInterval) return;
        
        // Check every 1 minute
        this.checkInterval = setInterval(() => {
            this.processEscalations();
        }, 60000);
        
        console.log('SafeArrival Monitoring Started');
    }

    /**
     * Main logic for processing safety escalations based on hangout status and timestamps.
     */
    private async processEscalations() {
        const now = new Date();
        
        try {
            // Find all "active" or "scheduled" meetups that should have started
            const targetedHangouts = await prisma.hangout.findMany({
                where: {
                    status: { in: ['active', 'scheduled'] },
                    startTime: { lte: now },
                },
                include: {
                    attendees: {
                        where: {
                            isSafe: false
                        },
                        include: {
                            user: {
                                include: {
                                    emergencyContacts: true
                                }
                            }
                        }
                    }
                }
            });

            for (const hangout of targetedHangouts) {
                // Auto-transition scheduled to active
                if (hangout.status === 'scheduled') {
                    await prisma.hangout.update({
                        where: { id: hangout.id },
                        data: { status: 'active' }
                    });
                }

                for (const attendee of hangout.attendees) {
                    await this.checkUserSafety(attendee, hangout);
                }
            }
        } catch (error) {
            console.error('Error in SafeArrival escalation loop:', error);
        }
    }

    private async checkUserSafety(attendee: any, hangout: any) {
        const user = attendee.user;
        const minutesSinceStart = (new Date().getTime() - new Date(hangout.startTime).getTime()) / 60000;
        const currentLevel = attendee.emergencyEscalationLevel || 0;

        // Fetch user profile for name and location
        const profile = await prisma.profile.findUnique({ where: { userId: user.id } });

        if (minutesSinceStart > 45 && currentLevel < 4) {
            // STAGE 4: Critical Escalation to Authorities/Safety Team
            const isDirectEscalationEnabled = (user as any).directAuthorityEscalationEnabled || false;
            
            console.log(`\n🚨 [LATENT EMERGENCY DISPATCH] 🚨`);
            console.log(`TIME: ${new Date().toISOString()}`);
            console.log(`SAFEARRIVAL: Stage 4 Escalation for ${user.phoneNumber}.`);
            console.log(`USER: ${profile?.firstName || 'Unknown'} (${user.id})`);
            console.log(`PLAN: ${hangout.title}`);
            console.log(`DIRECT ESCALATION: ${isDirectEscalationEnabled ? 'ENABLED' : 'DISABLED'}`);
            
            if (isDirectEscalationEnabled) {
                console.log(`ACTION: Pushing critical data to Emergency Services API...`);
            } else {
                console.log(`ACTION: Sending high-priority reminder to emergency contacts with authority-link.`);
            }
            console.log(`-------------------------\n`);

            await NotificationService.notifySafetyAlert(user.id, 'final');
            await this.updateEscalationLevel(user.id, hangout.id, 4);
        } else if (minutesSinceStart > 27 && currentLevel < 3) { 
            // STAGE 3: Notify Emergency Contacts (15 min after Stage 2)
            console.log(`\n📢 [CONTACTS NOTIFICATION] 📢\nSAFEARRIVAL: Stage 3 Escalation for ${user.phoneNumber}.\nSTATUS: Notifying ${user.emergencyContacts.length} emergency contacts via SMS.\n`);
            
            const userName = profile?.firstName || 'A RealConnect User';
            const location = profile?.latitude && profile?.longitude 
                ? { lat: profile.latitude, lng: profile.longitude } 
                : undefined;

            await NotificationService.notifyEmergencyContacts(user.id, userName, hangout, location);
            await NotificationService.notifySafetyAlert(user.id, 'contacts_notified');
            
            await this.updateEscalationLevel(user.id, hangout.id, 3);
        } else if (minutesSinceStart > 12 && currentLevel < 2) {
            // STAGE 2: Critical Alert (10 min after Stage 1)
            console.log(`SAFEARRIVAL: Stage 2 Escalation for ${user.phoneNumber}. Sending Critical Alert.`);
            this.io.to(user.id).emit('safety_critical_alert', { hangoutId: hangout.id });
            await NotificationService.notifySafetyAlert(user.id, 'critical', 15);
            await this.updateEscalationLevel(user.id, hangout.id, 2);
        } else if (minutesSinceStart > 2 && currentLevel < 1) {
            // STAGE 1: Soft Check (At meetup time + 2 min buffer)
            console.log(`SAFEARRIVAL: Stage 1 Escalation for ${user.phoneNumber}. Sending Soft Check.`);
            this.io.to(user.id).emit('safety_soft_check', { hangoutId: hangout.id });
            await NotificationService.notifySafetyAlert(user.id, 'soft');
            await this.updateEscalationLevel(user.id, hangout.id, 1);
        }
    }


    private async updateEscalationLevel(userId: string, hangoutId: string, level: number) {
        await prisma.hangoutAttendee.updateMany({
            where: { userId, hangoutId },
            data: { emergencyEscalationLevel: level }
        });
    }
}
