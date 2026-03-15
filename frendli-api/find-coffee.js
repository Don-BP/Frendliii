const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllFeedback() {
  const feedback = await prisma.hangoutFeedback.findMany({});
  console.log('ALL FEEDBACK:', JSON.stringify(feedback, null, 2));

  const hangouts = await prisma.hangout.findMany({
      where: {
          status: 'upcoming'
      }
  });
  console.log('UPCOMING HANGOUTS:', hangouts.length);
}

checkAllFeedback().catch(console.error).finally(() => prisma.$disconnect());
