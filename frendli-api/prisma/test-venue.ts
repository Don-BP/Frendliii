import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Diagnostic: Checking Venue model structure...');
  // We'll try a very minimal create to see the error details
  try {
    const venue = await prisma.venue.create({
      data: {
        name: 'Test Venue',
        address: 'Test Address'
      }
    });
    console.log('Success creating minimal venue:', venue);
  } catch (e: any) {
    console.log('Failed minimal venue creation. Error details:');
    console.log(JSON.stringify(e, null, 2));
    if (e.message) console.log('Message:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
