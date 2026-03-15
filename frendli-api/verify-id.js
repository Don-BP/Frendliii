const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkById() {
  const id = '74b97dd4-8a9e-4897-be03-cb95ab925f8b';
  const h = await prisma.hangout.findUnique({ where: { id } });
  console.log('Hangout by ID:', h ? 'Found' : 'NOT FOUND');
}

checkById()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
