import express from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/user/me — profil user
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.json(user);
});

// GET /api/user/apps — daftar aplikasi yang dimiliki user
router.get('/apps', authenticate, async (req, res) => {
  const access = await prisma.userAccess.findMany({
    where: {
      userId: req.user.id,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      application: true,
    },
  });

  res.json(access.map((a) => ({
    ...a.application,
    accessExpiresAt: a.expiresAt,
  })));
});

export default router;