import { PrismaClient, Role } from "@prisma/client";
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
      latitude: 12.9756,
      longitude: 77.6068,
      totalSlots: 100,
      availableSlots: 38,
      pricePerHour: 40,
      isActive: true,
    },
    {
      id: "tech-park-parking",
      ownerId: owner.id,
      name: "Tech Park Visitor Parking",
      description: "Visitor parking near Gate 2",
      address: "Whitefield",
      latitude: 12.9698,
      longitude: 77.7499,
      totalSlots: 60,
      availableSlots: 12,
      pricePerHour: 30,
      isActive: true,
    },
    {
      id: "city-hospital-parking",
      ownerId: owner.id,
      name: "City Hospital Parking",
      description: "Parking for hospital visitors",
      address: "Koramangala",
      latitude: 12.9352,
      longitude: 77.6245,
      totalSlots: 40,
      availableSlots: 25,
      pricePerHour: 25,
      isActive: true,
    },
    {
      id: "railway-station-parking",
      ownerId: owner.id,
      name: "Railway Station Parking",
      description: "Open parking near the station",
      address: "Majestic",
      latitude: 12.9784,
      longitude: 77.5726,
      totalSlots: 80,
      availableSlots: 0,
      pricePerHour: 50,
      isActive: true,
    },
    {
      id: "office-tower-parking",
      ownerId: owner.id,
      name: "Office Tower Parking",
      description: "Private office parking",
      address: "Electronic City",
      latitude: 12.8452,
      longitude: 77.6602,
      totalSlots: 70,
      availableSlots: 70,
      pricePerHour: 35,
      isActive: false,
    },
  ];

  for (const parking of parkingLots) {
    await prisma.parking.upsert({
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