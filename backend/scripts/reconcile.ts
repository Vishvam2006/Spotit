import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const FIX = process.argv.includes('--fix');

interface LotReport {
  id: string;
  name: string;
  totalSpaces: number;
  actualAvailable: number;
  expectedAvailable: number;
  drift: number;
}

async function main() {
  const now = new Date();

  const lots = await prisma.parkingLot.findMany({
    select: { id: true, name: true, totalSpaces: true, availableSpaces: true },
  });

  const heldBookings = await prisma.booking.findMany({
    where: {
      OR: [{ status: 'ACTIVE' }, { status: 'RESERVED', reservedUntil: { gte: now } }],
    },
    select: { parkingLotId: true },
  });

  const heldCount = new Map<string, number>();
  for (const booking of heldBookings) {
    heldCount.set(booking.parkingLotId, (heldCount.get(booking.parkingLotId) ?? 0) + 1);
  }

  const reports: LotReport[] = lots.map((lot) => {
    const held = heldCount.get(lot.id) ?? 0;
    const expected = Math.max(0, Math.min(lot.totalSpaces, lot.totalSpaces - held));
    return {
      id: lot.id,
      name: lot.name,
      totalSpaces: lot.totalSpaces,
      actualAvailable: lot.availableSpaces,
      expectedAvailable: expected,
      drift: expected - lot.availableSpaces,
    };
  });

  const drifted = reports.filter((report) => report.drift !== 0);

  if (drifted.length === 0) {
    console.log(
      `Reconcile: OK — ${reports.length} lot(s) checked, no drift in availableSpaces.`,
    );
    return;
  }

  console.log(`Reconcile: found ${drifted.length} lot(s) with drift:\n`);
  for (const report of drifted) {
    const sign = report.drift > 0 ? '+' : '';
    console.log(
      `  ${report.name}: total=${report.totalSpaces} actual=${report.actualAvailable} expected=${report.expectedAvailable} drift=${sign}${report.drift}`,
    );
  }

  if (!FIX) {
    console.log('\nRun with --fix to correct availableSpaces.');
    process.exitCode = 1;
    return;
  }

  for (const report of drifted) {
    await prisma.parkingLot.update({
      where: { id: report.id },
      data: { availableSpaces: report.expectedAvailable },
    });
  }

  console.log(`\nFixed ${drifted.length} lot(s).`);
}

main()
  .catch((error) => {
    console.error('Reconcile failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
