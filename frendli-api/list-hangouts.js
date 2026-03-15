const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listHangouts() {
  const hangouts = await prisma.hangout.findMany({
    orderBy: { startTime: 'desc' }
  });
  console.log(JSON.stringify(hangouts, null, 2));
  process.exit(0);
}

listHangouts();
