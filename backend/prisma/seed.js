import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Buat admin default
  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: {
      email: 'admin@platform.com',
      password: adminPass,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });

  // Contoh aplikasi
  const apps = [
    {
      name: 'Tesis Builder',
      slug: 'tesis-builder',
      description: 'Bangun kerangka tesis Anda dengan cepat dan terstruktur.',
      longDesc: 'Aplikasi untuk membantu mahasiswa menyusun kerangka tesis, bab per bab, dengan panduan otomatis.',
      price: 99000,
      type: 'ONE_TIME',
      url: 'https://tesis-builder.example.com',
      icon: '📝',
      category: 'Pendidikan',
    },
    {
      name: 'Paten Builder',
      slug: 'paten-builder',
      description: 'Susun dokumen paten Anda secara profesional.',
      longDesc: 'Aplikasi untuk membantu inventor menyusun dokumen paten sesuai standar DJKI.',
      price: 149000,
      type: 'ONE_TIME',
      url: 'https://paten-builder.example.com',
      icon: '⚖️',
      category: 'Hukum',
    },
    {
      name: 'Skripsi Builder Pro',
      slug: 'skripsi-builder-pro',
      description: 'Langganan bulanan untuk bimbingan skripsi digital.',
      longDesc: 'Akses penuh ke semua fitur Skripsi Builder Pro, termasuk template, contoh, dan review otomatis.',
      price: 49000,
      type: 'SUBSCRIPTION',
      url: 'https://skripsi-builder.example.com',
      icon: '🎓',
      category: 'Pendidikan',
    },
  ];

  for (const app of apps) {
    await prisma.application.upsert({
      where: { slug: app.slug },
      update: app,
      create: app,
    });
  }

  console.log('✅ Seed berhasil. Admin: admin@platform.com / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());