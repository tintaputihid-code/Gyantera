import express from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma.js';

const router = express.Router();

// POST /api/webhook/midtrans — notifikasi dari Midtrans
router.post('/midtrans', async (req, res) => {
  try {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
      fraud_status,
    } = req.body;

    // Verifikasi signature (keamanan)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (hash !== signature_key) {
      console.warn('Invalid signature from Midtrans');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { orderId: order_id },
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    let newStatus = transaction.status;

    if (transaction_status === 'capture') {
      newStatus = fraud_status === 'accept' ? 'SUCCESS' : 'FAILED';
    } else if (transaction_status === 'settlement') {
      newStatus = 'SUCCESS';
    } else if (['cancel', 'deny'].includes(transaction_status)) {
      newStatus = 'FAILED';
    } else if (transaction_status === 'expire') {
      newStatus = 'EXPIRED';
    } else if (transaction_status === 'refund') {
      newStatus = 'REFUND';
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        paymentType: payment_type,
        midtransResponse: JSON.stringify(req.body),
      },
    });

    // Jika sukses, berikan akses ke user
    if (newStatus === 'SUCCESS') {
      const app = await prisma.application.findUnique({
        where: { id: transaction.applicationId },
      });

      const expiresAt = app.type === 'SUBSCRIPTION'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 hari
        : null;

      await prisma.userAccess.upsert({
        where: {
          userId_applicationId: {
            userId: transaction.userId,
            applicationId: transaction.applicationId,
          },
        },
        update: {
          isActive: true,
          expiresAt,
        },
        create: {
          userId: transaction.userId,
          applicationId: transaction.applicationId,
          expiresAt,
          isActive: true,
        },
      });

      // Jika subscription, catat juga di tabel subscriptions
      if (app.type === 'SUBSCRIPTION') {
        await prisma.subscription.create({
          data: {
            userId: transaction.userId,
            applicationId: transaction.applicationId,
            status: 'ACTIVE',
            expiresAt,
          },
        });
      }
    }

    res.json({ status: 'OK' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;