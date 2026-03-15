import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Cleanup existing records - ORDER MATTERS for foreign keys
  await prisma.coupon.deleteMany({});
  await prisma.perk.deleteMany({});
  await prisma.hangoutFeedback.deleteMany({});
  await prisma.hangoutAttendee.deleteMany({});
  await prisma.hangoutJoinRequest.deleteMany({});
  await prisma.hangout.deleteMany({});
  await prisma.recurringPattern.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.wave.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Mock Self User
  const mockUserId = 'mock-user-id';
  await prisma.user.create({
    data: {
      id: mockUserId,
      phoneNumber: '+15551234567',
      isVerified: true,
      profile: {
        create: {
          firstName: 'Me',
          bio: 'Looking for cool people to hang out with.',
          interests: ['coffee', 'tech', 'board-games', 'hiking'],
          friendshipStyle: 'one-on-one',
          availability: { days: ['Mon', 'Wed', 'Fri', 'Sat'], times: ['Evening'] },
          latitude: 40.7128,
          longitude: -74.0060,
          safetyBriefingCompleted: true
        }
      }
    }
  });

  // 3. Create Potential Matches (Recommendations)
  const users = [
    {
      id: 'alice-id',
      phone: '+15550001001',
      profile: {
        firstName: 'Alice',
        age: 24,
        bio: 'Avid hiker and coffee lover. Let\'s explore the city!',
        interests: ['hiking', 'coffee', 'photography'],
        friendshipStyle: 'one-on-one',
        lat: 40.7150,
        lng: -74.0080
      }
    },
    {
      id: 'bob-id',
      phone: '+15550001002',
      profile: {
        firstName: 'Bob',
        age: 28,
        bio: 'Tech enthusiast and board game geek.',
        interests: ['tech', 'board-games', 'video-games'],
        friendshipStyle: 'small-group',
        lat: 40.7200,
        lng: -74.0100
      }
    },
    {
      id: 'charlie-id',
      phone: '+15550001003',
      profile: {
        firstName: 'Charlie',
        age: 26,
        bio: 'Music is my life. Guitarist looking for a jam buddy.',
        interests: ['concerts', 'piano', 'vinyl'],
        friendshipStyle: 'one-on-one',
        lat: 40.7100,
        lng: -74.0020
      }
    }
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        phoneNumber: u.phone,
        isVerified: true,
        profile: {
          create: {
            firstName: u.profile.firstName,
            bio: u.profile.bio,
            interests: u.profile.interests,
            friendshipStyle: u.profile.friendshipStyle,
            latitude: u.profile.lat,
            longitude: u.profile.lng,
          }
        }
      }
    });
  }

  // 4. Create an Incoming Wave (Someone liked us)
  await prisma.wave.create({
    data: {
      senderId: 'alice-id',
      receiverId: mockUserId,
      type: 'like'
    }
  });

  // 5. Create Venues and Hangouts
  const v1 = await prisma.venue.create({
    data: {
      name: 'The Board Room',
      description: 'A cozy board game cafe in the heart of the city.',
      address: '456 Play St, New York, NY',
      latitude: 40.7180,
      longitude: -74.0090,
      category: 'cafe'
    }
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  await prisma.hangout.create({
    data: {
      title: 'Board Game Night',
      description: 'Come play some Settlers of Catan!',
      startTime: tomorrow,
      venueId: v1.id,
      maxAttendees: 6,
      category: 'board-games',
      isPublic: true,
      creatorId: 'bob-id',
      attendees: {
        create: [
          { userId: 'bob-id' }
        ]
      }
    }
  });

  // 6. Create a Pending Feedback Hangout (One that occurred in the past)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(20, 0, 0, 0);

  const oldV = await prisma.venue.create({
    data: {
      name: 'Central Perk',
      address: 'Greenwich Village',
      category: 'cafe'
    }
  });

  await prisma.hangout.create({
    data: {
      title: 'Coffee & Code',
      startTime: yesterday,
      venueId: oldV.id,
      status: 'upcoming', 
      creatorId: 'alice-id',
      attendees: {
        create: [
          { userId: 'alice-id' },
          { userId: mockUserId }
        ]
      }
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
