const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPending() {
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    const userId = user.id;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const pendingHangouts = await prisma.hangout.findMany({
      where: {
        status: 'upcoming',
        startTime: { 
          lt: new Date(),
          gt: twentyFourHoursAgo
        },
        attendees: { some: { userId } },
        feedback: { none: { userId } }
      },
      include: {
        feedback: true,
        attendees: true
      }
    });

    if (pendingHangouts.length > 0) {
      console.log(`User ${userId} has ${pendingHangouts.length} pending hangouts:`);
      pendingHangouts.forEach(h => {
        console.log(`- ID: ${h.id}, Title: ${h.title}, StartTime: ${h.startTime}`);
      });
    } else {
      console.log(`User ${userId} has no pending hangouts.`);
    }
  }
}

checkPending()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
