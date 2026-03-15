
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const venues = await prisma.venue.findMany();
  console.log('Venues in DB:', venues.length);
  if (venues.length > 0) {
    console.log(JSON.stringify(venues[0], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
