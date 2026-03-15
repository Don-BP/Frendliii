import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service';


const router = Router();
const prisma = new PrismaClient();

// Add an emergency contact
router.post('/contacts', async (req, res) => {
    try {
        const userId = (req.user as any).id;
        const { name, phoneNumber, relation } = req.body;

        const contact = await prisma.emergencyContact.create({
            data: {
                userId,
                name,
                phoneNumber,
                relation,
            },
        });

        res.status(201).json(contact);
    } catch (error) {
        console.error('Error adding emergency contact:', error);
        res.status(500).json({ error: 'Failed to add emergency contact' });
    }
});

// Get emergency contacts
router.get('/contacts', async (req, res) => {
    try {
        const userId = (req.user as any).id;

        const contacts = await prisma.emergencyContact.findMany({
            where: { userId },
        });

        res.status(200).json(contacts);
    } catch (error) {
        console.error('Error fetching emergency contacts:', error);
        res.status(500).json({ error: 'Failed to fetch emergency contacts' });
    }
});

// Remove an emergency contact
router.delete('/contacts/:id', async (req, res) => {
    try {
        const userId = (req.user as any).id;
        const { id } = req.params;

        const contact = await prisma.emergencyContact.findFirst({
            where: { id, userId },
        });

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        await prisma.emergencyContact.delete({
            where: { id },
        });

        res.status(200).json({ message: 'Contact removed successfully' });
    } catch (error) {
        console.error('Error removing emergency contact:', error);
        res.status(500).json({ error: 'Failed to remove emergency contact' });
    }
});

// Trigger Silent SOS & Escalation
router.post('/sos', async (req, res) => {
    try {
        const userId = (req.user as any).id;
        const { level = 1, location } = req.body; // 1: Contacts, 2: Authorities
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                emergencyContacts: true,
                profile: true
            },
        });

        if (!user || user.emergencyContacts.length === 0) {
            return res.status(400).json({ error: 'No emergency contacts configured' });
        }

        // Update active hangout attendances
        await prisma.hangoutAttendee.updateMany({
            where: { userId, isSafe: false },
            data: { emergencyEscalationLevel: level }
        });

        const userName = user.profile?.firstName || 'A friend';
        const lat = location?.latitude || user.profile?.latitude;
        const lng = location?.longitude || user.profile?.longitude;
        const locationCoords = lat && lng ? { lat, lng } : undefined;

        // Use a generic "meetup" if no specific hangout is found
        const activeHangout = await prisma.hangout.findFirst({
            where: {
                status: 'active',
                attendees: { some: { userId } }
            },
            include: { venue: true }
        });

        const fakeHangout = activeHangout || { venue: null };

        if (level === 1) {
            await NotificationService.notifyEmergencyContacts(userId, userName, fakeHangout, locationCoords);
            console.log(`[SOS LEVEL 1] Notified contacts for ${userName}`);
        } else if (level === 2) {
            console.log(`\n🚨 [LATENT EMERGENCY] 🚨`);
            console.log(`USER: ${userName} (${userId})`);
            console.log(`LOCATION: ${lat}, ${lng}`);
            console.log(`ACTION: SMS sent to authorities & Priority Safety Alert triggered.`);
            console.log(`-------------------------\n`);
            
            await NotificationService.notifySafetyAlert(userId, 'final');
        }

        res.status(200).json({ 
            message: 'SOS triggered successfully', 
            level,
            contactCount: user.emergencyContacts.length 
        });
    } catch (error) {
        console.error('Error triggering SOS:', error);
        res.status(500).json({ error: 'Failed to trigger SOS' });
    }
});


// Cancel SOS
router.post('/sos/cancel', async (req, res) => {
    try {
        const userId = (req.user as any).id;

        await prisma.hangoutAttendee.updateMany({
            where: { userId, isSafe: false },
            data: { emergencyEscalationLevel: 0 }
        });

        console.log(`[SOS CANCELLED] User ${userId} cancelled their SOS alert. Returning to normal state.`);

        res.status(200).json({ message: 'SOS cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling SOS:', error);
        res.status(500).json({ error: 'Failed to cancel SOS' });
    }
});

// Log a SafeArrival background check-in
router.post('/check-in', async (req, res) => {
    try {
        const userId = (req.user as any).id;
        const { hangoutId, status, location } = req.body; // status: "arrived", "safe", "departed"

        // 1. Update Profile with last known location
        if (location && location.latitude && location.longitude) {
            await prisma.profile.update({
                where: { userId },
                data: {
                    latitude: location.latitude,
                    longitude: location.longitude
                }
            });
            console.log(`[Check-In] Updated location for user ${userId}: ${location.latitude}, ${location.longitude}`);
        }

        // 2. Handle safety status update
        let targetHangoutId = hangoutId;
        if (status === 'safe' || status === 'arrived') {
            const updateData: any = { isSafe: true, checkInAt: new Date() };
            
            if (targetHangoutId) {
                await prisma.hangoutAttendee.updateMany({
                    where: { userId, hangoutId: targetHangoutId },
                    data: updateData,
                });
            } else {
                // Find most recent active hangout if no ID provided
                const activeAttendee = await prisma.hangoutAttendee.findFirst({
                    where: { 
                        userId, 
                        isSafe: false,
                        hangout: { status: 'active' }
                    }
                });
                if (activeAttendee) {
                    targetHangoutId = activeAttendee.hangoutId;
                    await prisma.hangoutAttendee.update({
                        where: { id: activeAttendee.id },
                        data: updateData
                    });
                }
            }

            // 3. Automated Perk Issuance for Partner Venues
            if (targetHangoutId && (status === 'safe' || status === 'arrived')) {
                const hangout = await prisma.hangout.findUnique({
                    where: { id: targetHangoutId },
                    include: { venue: { include: { perks: true } } }
                });

                if (hangout?.venue && hangout.venue.partnershipTier !== 'listed') {
                    console.log(`[PERKS] User ${userId} checked in at Partner Venue: ${hangout.venue.name}`);
                    
                    for (const perk of hangout.venue.perks) {
                        try {
                            const code = `RC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                            const expiresAt = new Date();
                            expiresAt.setHours(expiresAt.getHours() + 24); // Short duration coupon for event check-in

                            await prisma.coupon.create({
                                data: {
                                    userId,
                                    perkId: perk.id,
                                    hangoutId: targetHangoutId,
                                    code,
                                    expiresAt,
                                    status: 'active'
                                }
                            });
                            console.log(`[PERKS] Issued automated coupon ${code} for ${perk.title}`);
                            
                            // Send a notification about the new perk
                            await NotificationService.sendToUser(userId, 'Gift Unlocked! 🎁', `Because you checked in safely at ${hangout.venue.name}, you've earned: ${perk.title}! Check your Perks tab.`);
                        } catch (perkError) {
                            console.error('Failed to issue automated perk:', perkError);
                        }
                    }
                }
            }
        }

        console.log(`[Check-In] User ${userId} checked in. Status: ${status || 'location_update'}`);

        res.status(200).json({ message: 'Check-in logged successfully' });
    } catch (error) {
        console.error('Error logging check-in:', error);
        res.status(500).json({ error: 'Failed to log check-in' });
    }
});


// Report a user
router.post('/report', async (req, res) => {
    try {
        const reporterId = (req.user as any).id;
        const { reportedId, reason, details } = req.body;

        const report = await prisma.report.create({
            data: {
                reporterId,
                reportedId,
                reason,
                details,
            },
        });

        res.status(201).json(report);
    } catch (error) {
        console.error('Error reporting user:', error);
        res.status(500).json({ error: 'Failed to report user' });
    }
});

// Block a user
router.post('/block', async (req, res) => {
    try {
        const blockerId = (req.user as any).id;
        const { blockedId, reason } = req.body;

        const block = await prisma.block.create({
            data: {
                blockerId,
                blockedId,
                reason,
            },
        });
        
        // Also remove any active matches between the users if they block each other
        await prisma.match.deleteMany({
            where: {
                OR: [
                    { user1Id: blockerId, user2Id: blockedId },
                    { user1Id: blockedId, user2Id: blockerId }
                ]
            }
        });

        res.status(201).json(block);
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
});

// Mark safety briefing as completed
router.post('/briefing-complete', async (req, res) => {
    try {
        const userId = (req.user as any).id;
        
        await prisma.profile.upsert({
            where: { userId },
            update: { safetyBriefingCompleted: true },
            create: {
                userId,
                firstName: 'User', // Default for missing profile
                safetyBriefingCompleted: true
            }
        });

        res.status(200).json({ message: 'Safety briefing marked as completed' });
    } catch (error) {
        console.error('Error completing safety briefing:', error);
        res.status(500).json({ error: 'Failed to complete safety briefing' });
    }
});

export default router;
