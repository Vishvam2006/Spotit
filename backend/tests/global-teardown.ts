import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function teardown() {
  try {
    // Clean up after all tests
    await prisma.booking.deleteMany();
    await prisma.parkingLot.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✓ Test database cleaned after tests');
  } catch (error) {
    console.error('Failed to clean database after tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}
