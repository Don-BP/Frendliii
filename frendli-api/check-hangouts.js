
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hangouts = await prisma.hangout.findMany({
    include: {
      attendees: true,
      feedback: true
    }
  });
  console.log('Hangouts in DB:', hangouts.length);
  hangouts.forEach(h => {
    console.log(`Hangout: ${h.title} (ID: ${h.id})`);
    console.log(`- Status: ${h.status}`);
    console.log(`- Start: ${h.startTime}`);
    console.log(`- Attendees: ${h.attendees.map(a => a.userId).join(', ')}`);
    console.log(`- Feedback count: ${h.feedback.length}`);
  });

  const matches = await prisma.match.findMany();
  console.log('\nMatches in DB:', matches.length);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
