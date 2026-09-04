-- CreateEnum
CREATE TYPE "ReassignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'AUTO_ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_REASSIGNMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContinuityEventType" ADD VALUE 'REASSIGNMENT_OFFERED';
ALTER TYPE "ContinuityEventType" ADD VALUE 'REASSIGNMENT_ACCEPTED';
ALTER TYPE "ContinuityEventType" ADD VALUE 'REASSIGNMENT_AUTO_ACCEPTED';
ALTER TYPE "ContinuityEventType" ADD VALUE 'REASSIGNMENT_DECLINED';

-- CreateTable
CREATE TABLE "BookingReassignment" (
    "id" TEXT NOT NULL,
    "originalBookingId" TEXT NOT NULL,
    "candidateBookingId" TEXT,
    "candidateLotId" TEXT,
    "status" "ReassignmentStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionDeadline" TIMESTAMP(3),
    "respondAt" TIMESTAMP(3),
    "distanceKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingReassignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingReassignment_originalBookingId_key" ON "BookingReassignment"("originalBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingReassignment_candidateBookingId_key" ON "BookingReassignment"("candidateBookingId");

-- CreateIndex
CREATE INDEX "BookingReassignment_status_decisionDeadline_idx" ON "BookingReassignment"("status", "decisionDeadline");

-- AddForeignKey
ALTER TABLE "BookingReassignment" ADD CONSTRAINT "BookingReassignment_originalBookingId_fkey" FOREIGN KEY ("originalBookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReassignment" ADD CONSTRAINT "BookingReassignment_candidateBookingId_fkey" FOREIGN KEY ("candidateBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
