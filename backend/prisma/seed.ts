import { PrismaClient, ParkingLotStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const passwordHashPromise = bcrypt.hash("12345678", 10);

interface ParkingLotSeed {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  pricePerHour: number;
  status: ParkingLotStatus;
  imageUrl: string;
}

async function main() {
  const passwordHash = await passwordHashPromise;

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const adminName = process.env.ADMIN_NAME ?? "ParkMitra Admin";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      fullName: adminName,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
    },
    create: {
      fullName: adminName,
      email: adminEmail,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      role: Role.ADMIN,
    },
  });

  await prisma.complaint.deleteMany({});
  await prisma.booking.deleteMany({});

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: { role: Role.OWNER, passwordHash, fullName: "Demo Parking Owner" },
    create: {
      fullName: "Demo Parking Owner",
      email: "owner@example.com",
      passwordHash,
      role: Role.OWNER,
    },
  });

  const parkingLots: ParkingLotSeed[] = [
    {
      id: "central-mall-parking",
      name: "Central Mall Parking",
      description: "Covered parking near the main entrance",
      address: "MG Road",
      city: "Bengaluru",
      latitude: 12.9756,
      longitude: 77.6068,
      totalSpaces: 100,
      pricePerHour: 40,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/central-mall-parking.jpg",
    },
    {
      id: "railway-station-parking",
      name: "Railway Station Parking",
      description: "Open parking near the station",
      address: "Majestic",
      city: "Bengaluru",
      latitude: 12.9784,
      longitude: 77.5726,
      totalSpaces: 80,
      pricePerHour: 50,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/railway-station-parking.jpg",
    },
    {
      id: "metro-gate-parking",
      name: "Metro Gate Parking",
      description: "Compact lot at the metro interchange",
      address: "Sampige Road",
      city: "Bengaluru",
      latitude: 12.992,
      longitude: 77.577,
      totalSpaces: 6,
      pricePerHour: 60,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/metro-gate-parking.jpg",
    },
    {
      id: "tech-park-parking",
      name: "Tech Park Visitor Parking",
      description: "Visitor parking near Gate 2",
      address: "Whitefield",
      city: "Bengaluru",
      latitude: 12.9698,
      longitude: 77.7499,
      totalSpaces: 60,
      pricePerHour: 30,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/tech-park-parking.jpg",
    },
    {
      id: "city-hospital-parking",
      name: "City Hospital Parking",
      description: "Parking for hospital visitors",
      address: "Koramangala",
      city: "Bengaluru",
      latitude: 12.9352,
      longitude: 77.6245,
      totalSpaces: 40,
      pricePerHour: 25,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/city-hospital-parking.jpg",
    },
    {
      id: "airport-arrival-parking",
      name: "Airport Arrival Parking",
      description: "Short-stay parking near the arrival terminal",
      address: "Devanahalli Airport Road",
      city: "Bengaluru",
      latitude: 13.1986,
      longitude: 77.7066,
      totalSpaces: 120,
      pricePerHour: 50,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/airport-arrival-parking.jpg",
    },
    {
      id: "office-tower-parking",
      name: "Office Tower Parking",
      description: "Private office parking (temporarily closed)",
      address: "Electronic City",
      city: "Bengaluru",
      latitude: 12.8452,
      longitude: 77.6602,
      totalSpaces: 70,
      pricePerHour: 35,
      status: ParkingLotStatus.INACTIVE,
      imageUrl: "https://example.com/office-tower-parking.jpg",
    },
    {
      id: "mall-annex-parking",
      name: "Mall Annex Parking",
      description: "Secondary lot behind the shopping mall",
      address: "100 Feet Road, Indiranagar",
      city: "Bengaluru",
      latitude: 12.9784,
      longitude: 77.6408,
      totalSpaces: 45,
      pricePerHour: 30,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/mall-annex-parking.jpg",
    },
    {
      id: "city-market-parking",
      name: "City Market Parking",
      description: "Surface lot beside the wholesale market",
      address: "KR Market, City Market Road",
      city: "Bengaluru",
      latitude: 12.9634,
      longitude: 77.5765,
      totalSpaces: 35,
      pricePerHour: 20,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/city-market-parking.jpg",
    },
  ];

  for (const lot of parkingLots) {
    const { id, ...data } = lot;
    await prisma.parkingLot.upsert({
      where: { id },
      update: { ...data, availableSpaces: data.totalSpaces, ownerId: owner.id },
      create: { id, ...data, availableSpaces: data.totalSpaces, ownerId: owner.id },
    });
  }

  console.log(
    `Seed completed: ${parkingLots.length} parking lots for ${owner.email}, no bookings. ` +
      `Admin: ${admin.email} (role=${admin.role}).`,
  );
}
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
