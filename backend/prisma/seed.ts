import { prisma } from '../src/prisma/client';
import { seedDatabase } from '../src/services/seed.service';

seedDatabase()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
