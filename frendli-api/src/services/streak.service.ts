import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StreakService {
    /**
     * Updates the user's streak based on their last activity.
     * Logic:
     * - If lastActiveAt was yesterday (or today), increment/maintain.
     * - If more than 24-48 hours since lastActiveAt, reset to 1 (or 0 if they haven't started).
     */
    static async updateStreak(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { streakCount: true, lastActiveAt: true }
            });

            if (!user) return;

            const now = new Date();
            const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
            
            if (!lastActive) {
                // First time activity
                await prisma.user.update({
                    where: { id: userId },
                    data: { streakCount: 1, lastActiveAt: now }
                });
                return 1;
            }

            // Calculate difference in days
            const diffInMs = now.getTime() - lastActive.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

            let newStreak = user.streakCount;

            if (diffInDays < 1) {
                // Same day, no streak change but update lastActiveAt
                await prisma.user.update({
                    where: { id: userId },
                    data: { lastActiveAt: now }
                });
            } else if (diffInDays >= 1 && diffInDays < 2) {
                // Next day! Increment streak
                newStreak += 1;
                await prisma.user.update({
                    where: { id: userId },
                    data: { streakCount: newStreak, lastActiveAt: now }
                });
            } else {
                // Day missed. Reset streak.
                newStreak = 1;
                await prisma.user.update({
                    where: { id: userId },
                    data: { streakCount: newStreak, lastActiveAt: now }
                });
            }

            return newStreak;
        } catch (error) {
            console.error('Error updating streak:', error);
            return null;
        }
    }
}
