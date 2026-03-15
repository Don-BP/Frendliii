import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Create a new group
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, privacy } = req.body;
        const userId = (req as any).user.id;

        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        const group = await prisma.group.create({
            data: {
                name,
                description,
                privacy: privacy || 'public',
                creatorId: userId,
                members: {
                    create: {
                        userId,
                        role: 'admin'
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                }
            }
        });

        res.status(201).json(group);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// List all groups (discovery)
router.get('/', requireAuth, async (req, res) => {
    try {
        const groups = await prisma.group.findMany({
            where: {
                privacy: 'public'
            },
            include: {
                _count: {
                    select: { members: true }
                }
            }
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Get user's groups
router.get('/my', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const groups = await prisma.group.findMany({
            where: {
                members: {
                    some: { userId }
                }
            },
            include: {
                _count: {
                    select: { members: true }
                }
            }
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch your groups' });
    }
});

// Get single group details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id as string;
        const group = await prisma.group.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },
                hangouts: {
                    where: {
                        status: 'upcoming'
                    },
                    include: {
                        venue: true,
                        attendees: true
                    }
                },
                _count: {
                    select: { members: true }
                }
            }
        });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch group details' });
    }
});

// Join a group
router.post('/:id/join', requireAuth, async (req, res) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user.id;

        // Check if already a member
        const existing = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId: id,
                    userId
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already a member' });
        }

        const membership = await prisma.groupMember.create({
            data: {
                groupId: id,
                userId,
                role: 'member'
            }
        });

        res.status(201).json(membership);
    } catch (error) {
        res.status(500).json({ error: 'Failed to join group' });
    }
});

// Leave a group
router.delete('/:id/leave', requireAuth, async (req, res) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user.id;

        await prisma.groupMember.delete({
            where: {
                groupId_userId: {
                    groupId: id,
                    userId
                }
            }
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to leave group' });
    }
});

export default router;
