-- CreateEnum
CREATE TYPE "ParkingLotStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "ParkingLot" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "pricePerHour" DOUBLE PRECISION NOT NULL,
    "totalSpaces" INTEGER NOT NULL,
    "availableSpaces" INTEGER NOT NULL,
    "status" "ParkingLotStatus" NOT NULL DEFAULT 'ACTIVE',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParkingLot_city_idx" ON "ParkingLot"("city");

-- CreateIndex
CREATE INDEX "ParkingLot_status_idx" ON "ParkingLot"("status");

-- AddForeignKey
ALTER TABLE "ParkingLot" ADD CONSTRAINT "ParkingLot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

