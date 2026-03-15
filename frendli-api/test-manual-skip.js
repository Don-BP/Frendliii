const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSkip() {
  const hangoutId = '864bb916-87df-4d58-afa5-becc8214cfce';
  const userId = 'mock-user-id';

  console.log('Attempting skip for hangout', hangoutId, 'user', userId);

  try {
    const feedback = await prisma.hangoutFeedback.upsert({
      where: { hangoutId_userId: { hangoutId, userId } },
      update: { rating: 0, comment: 'Skipped' },
      create: { hangoutId, userId, rating: 0, comment: 'Skipped' }
    });
    console.log('Feedback created/updated:', feedback);
  } catch (err) {
    console.error('Error during upsert:', err);
  }
}

testSkip()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
