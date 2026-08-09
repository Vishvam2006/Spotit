-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "lastLocationAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LocationAudit" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationAudit_bookingId_idx" ON "LocationAudit"("bookingId");

-- AddForeignKey
ALTER TABLE "LocationAudit" ADD CONSTRAINT "LocationAudit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
