import express from 'express';
import midtransClient from 'midtrans-client';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// POST /api/payment/create — buat transaksi Midtrans
router.post('/create', authenticate, async (req, res) => {
  try {
    const { applicationId } = req.body;

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!app || !app.isActive) {
      return res.status(404).json({ error: 'Aplikasi tidak ditemukan' });
    }

    // Cek apakah user sudah punya akses aktif
    const existingAccess = await prisma.userAccess.findUnique({
      where: {
        userId_applicationId: {
          userId: req.user.id,
          applicationId: app.id,
        },
      },
    });
    if (existingAccess?.isActive &&
        (!existingAccess.expiresAt || existingAccess.expiresAt > new Date())) {
      return res.status(400).json({ error: 'Anda sudah memiliki akses ke aplikasi ini' });
    }

    const orderId = `ORDER-${Date.now()}-${req.user.id.slice(0, 6)}`;

    // Simpan transaksi di DB
    const transaction = await prisma.transaction.create({
      data: {
        orderId,
        userId: req.user.id,
        applicationId: app.id,
        grossAmount: app.price,
        status: 'PENDING',
      },
    });

    // Buat Snap token
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: app.price,
      },
      item_details: [
        {
          id: app.id,
          name: app.name.substring(0, 50),
          price: app.price,
          quantity: 1,
        },
      ],
      customer_details: {
        first_name: req.user.name,
        email: req.user.email,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/dashboard.html`,
      },
    };

    const snapTransaction = await snap.createTransaction(parameter);

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        snapToken: snapTransaction.token,
        snapUrl: snapTransaction.redirect_url,
      },
    });

    res.json({
      orderId,
      token: snapTransaction.token,
      redirectUrl: snapTransaction.redirect_url,
    });
  } catch (err) {
    console.error('Midtrans error:', err);
    res.status(500).json({ error: 'Gagal membuat transaksi' });
  }
});

// GET /api/payment/transactions — riwayat transaksi user
router.get('/transactions', authenticate, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user.id },
    include: { application: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transactions);
});

export default router;