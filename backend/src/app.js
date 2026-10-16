import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import appRoutes from './routes/apps.js';
import paymentRoutes from './routes/payment.js';
import webhookRoutes from './routes/webhook.js';
import userRoutes from './routes/user.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ name: 'Platform Apps API', status: 'ok', version: '1.0.0' });
});
app.use('/api/auth', authRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/user', userRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});