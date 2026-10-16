import express from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/apps — daftar semua aplikasi (publik)
router.get('/', async (req, res) => {
  const apps = await prisma.application.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(apps);
});

// GET /api/apps/:slug — detail aplikasi (publik)
router.get('/:slug', async (req, res) => {
  const app = await prisma.application.findUnique({
    where: { slug: req.params.slug },
  });
  if (!app || !app.isActive) {
    return res.status(404).json({ error: 'Aplikasi tidak ditemukan' });
  }
  res.json(app);
});

// GET /api/apps/:slug/access — cek akses user (butuh login)
router.get('/:slug/access', authenticate, async (req, res) => {
  const app = await prisma.application.findUnique({
    where: { slug: req.params.slug },
  });
  if (!app) return res.status(404).json({ error: 'Aplikasi tidak ditemukan' });

  const access = await prisma.userAccess.findUnique({
    where: {
      userId_applicationId: {
        userId: req.user.id,
        applicationId: app.id,
      },
    },
  });

  const hasAccess = !!access && access.isActive &&
    (!access.expiresAt || access.expiresAt > new Date());

  res.json({ hasAccess, access });
});

export default router;