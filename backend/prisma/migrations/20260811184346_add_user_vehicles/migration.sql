/*
  Warnings:

  - Added the required column `vehicleImageUrl` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleRegistration` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleType` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TWO_WHEELER', 'FOUR_WHEELER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "vehicleColor" TEXT,
ADD COLUMN     "vehicleId" TEXT,
ADD COLUMN     "vehicleImageUrl" TEXT,
ADD COLUMN     "vehicleMake" TEXT,
ADD COLUMN     "vehicleModel" TEXT,
ADD COLUMN     "vehicleRegistration" TEXT,
ADD COLUMN     "vehicleType" "VehicleType";

-- Backfill existing bookings with a legacy vehicle snapshot so the
-- new NOT NULL columns never break historical records. Legacy bookings
-- have no Cloudinary image, so we record a clear empty image URL and let
-- the frontend render a placeholder for this "legacy vehicle" state.
UPDATE "Booking"
SET
  "vehicleRegistration" = COALESCE("vehicleNumber", ''),
  "vehicleType" = 'FOUR_WHEELER',
  "vehicleImageUrl" = '';

-- Enforce the required snapshot columns now that every row is populated.
ALTER TABLE "Booking"
  ALTER COLUMN "vehicleImageUrl" SET NOT NULL,
  ALTER COLUMN "vehicleRegistration" SET NOT NULL,
  ALTER COLUMN "vehicleType" SET NOT NULL;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imagePublicId" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_userId_registration_key" ON "Vehicle"("userId", "registration");

-- CreateIndex
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
