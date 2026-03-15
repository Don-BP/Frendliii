const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttendance() {
  const attendees = await prisma.hangoutAttendee.findMany({
    include: { user: { include: { profile: true } } }
  });
  console.log(JSON.stringify(attendees, null, 2));
  process.exit(0);
}

checkAttendance();
