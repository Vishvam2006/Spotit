-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "overallStatus" TEXT NOT NULL,
    "overallConfidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_createdAt_idx" ON "VerificationRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_checkInDeadline_idx" ON "Booking"("status", "checkInDeadline");

-- CreateIndex
CREATE INDEX "LocationAudit_bookingId_eventType_accepted_idx" ON "LocationAudit"("bookingId", "eventType", "accepted");

-- CreateIndex
CREATE INDEX "ParkingLot_ownerId_idx" ON "ParkingLot"("ownerId");

-- CreateIndex
CREATE INDEX "Vehicle_userId_isDefault_idx" ON "Vehicle"("userId", "isDefault");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
