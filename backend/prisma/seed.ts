import { PrismaClient, ParkingLotStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const owner = await prisma.user.upsert({
    where: {
      email: "owner@example.com",
    },
    update: {
      role: Role.OWNER,
    },
    create: {
      fullName: "Demo Parking Owner",
      email: "owner@example.com",
      passwordHash,
      role: Role.OWNER,
    },
  });

  const parkingLots = [
    {
      id: "central-mall-parking",
      ownerId: owner.id,
      name: "Central Mall Parking",
      description: "Covered parking near the main entrance",
      address: "MG Road",
      city: "Bengaluru",
      latitude: 12.9756,
      longitude: 77.6068,
      totalSpaces: 100,
      availableSpaces: 38,
      pricePerHour: 40,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/central-mall-parking.jpg",
    },
    {
      id: "tech-park-parking",
      ownerId: owner.id,
      name: "Tech Park Visitor Parking",
      description: "Visitor parking near Gate 2",
      address: "Whitefield",
      city: "Bengaluru",
      latitude: 12.9698,
      longitude: 77.7499,
      totalSpaces: 60,
      availableSpaces: 12,
      pricePerHour: 30,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/tech-park-parking.jpg",
    },
    {
      id: "city-hospital-parking",
      ownerId: owner.id,
      name: "City Hospital Parking",
      description: "Parking for hospital visitors",
      address: "Koramangala",
      city: "Bengaluru",
      latitude: 12.9352,
      longitude: 77.6245,
      totalSpaces: 40,
      availableSpaces: 25,
      pricePerHour: 25,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/city-hospital-parking.jpg",
    },
    {
      id: "railway-station-parking",
      ownerId: owner.id,
      name: "Railway Station Parking",
      description: "Open parking near the station",
      address: "Majestic",
      city: "Bengaluru",
      latitude: 12.9784,
      longitude: 77.5726,
      totalSpaces: 80,
      availableSpaces: 0,
      pricePerHour: 50,
      status: ParkingLotStatus.ACTIVE,
      imageUrl: "https://example.com/railway-station-parking.jpg",
    },
    {
      id: "office-tower-parking",
      ownerId: owner.id,
      name: "Office Tower Parking",
      description: "Private office parking",
      address: "Electronic City",
      city: "Bengaluru",
      latitude: 12.8452,
      longitude: 77.6602,
      totalSpaces: 70,
      availableSpaces: 70,
      pricePerHour: 35,
      status: ParkingLotStatus.INACTIVE,
      imageUrl: "https://example.com/office-tower-parking.jpg",
    },
  ];

  for (const parking of parkingLots) {
    await prisma.parkingLot.upsert({
      where: {
        id: parking.id,
      },
      update: parking,
      create: parking,
    });
  }

  console.log("Parking seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });