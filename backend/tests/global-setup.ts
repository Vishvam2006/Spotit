import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function setup() {
  try {
    // Just clean the tables - assume migrations have already been run
    // This avoids lock contention issues with prisma migrate commands
    await prisma.booking.deleteMany();
    await prisma.parkingLot.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✓ Test database cleaned and ready');
  } catch (error) {
    console.error('Failed to clean database:', error);
    console.log('Note: Make sure to run `npx prisma migrate deploy` manually if tables don\'t exist');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
