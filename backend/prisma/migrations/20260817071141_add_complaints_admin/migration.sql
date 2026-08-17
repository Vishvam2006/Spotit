-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parkingLotId" TEXT,
    "bookingId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_userId_createdAt_idx" ON "Complaint"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_parkingLotId_idx" ON "Complaint"("parkingLotId");

-- CreateIndex
CREATE INDEX "Complaint_bookingId_idx" ON "Complaint"("bookingId");

-- CreateIndex
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "ParkingLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
