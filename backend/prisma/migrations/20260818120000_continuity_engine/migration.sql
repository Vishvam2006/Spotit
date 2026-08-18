-- CreateEnum
CREATE TYPE "AvailabilityConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('SPACE_UNAVAILABLE', 'LOT_FULL', 'LOT_CLOSED', 'MISLEADING_LISTING', 'ACCESS_BLOCKED', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('MINOR', 'SERIOUS');

-- CreateEnum
CREATE TYPE "ContinuityEventType" AS ENUM ('BOOKING_CREATED', 'CAPACITY_HELD', 'CAPACITY_RELEASED', 'CHECKED_IN', 'CHECKED_OUT', 'BOOKING_CANCELLED', 'BOOKING_EXPIRED', 'BOOKING_DISPUTED', 'ISSUE_REPORTED', 'REPORT_STATUS_CHANGED', 'LOT_CONFIDENCE_CHANGED', 'LOT_UNDER_REVIEW', 'LOT_REINSTATED', 'LOT_DEACTIVATED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'DISPUTED';

-- AlterEnum
ALTER TYPE "ParkingLotStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "disputedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "issueType" "IssueType",
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "severity" "IssueSeverity" NOT NULL DEFAULT 'MINOR';

-- AlterTable
ALTER TABLE "ParkingLot" ADD COLUMN     "availabilityConfidence" "AvailabilityConfidence" NOT NULL DEFAULT 'HIGH',
ADD COLUMN     "statusBeforeReview" "ParkingLotStatus",
ADD COLUMN     "underReviewSince" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContinuityEvent" (
    "id" TEXT NOT NULL,
    "type" "ContinuityEventType" NOT NULL,
    "bookingId" TEXT,
    "parkingLotId" TEXT,
    "complaintId" TEXT,
    "actorId" TEXT,
    "actorRole" "Role",
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContinuityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContinuityEvent_bookingId_createdAt_idx" ON "ContinuityEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "ContinuityEvent_parkingLotId_createdAt_idx" ON "ContinuityEvent"("parkingLotId", "createdAt");

-- CreateIndex
CREATE INDEX "ContinuityEvent_complaintId_createdAt_idx" ON "ContinuityEvent"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "ContinuityEvent_type_createdAt_idx" ON "ContinuityEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_parkingLotId_status_severity_idx" ON "Complaint"("parkingLotId", "status", "severity");

-- CreateIndex
CREATE INDEX "ParkingLot_status_availabilityConfidence_idx" ON "ParkingLot"("status", "availabilityConfidence");

-- AddForeignKey
ALTER TABLE "ContinuityEvent" ADD CONSTRAINT "ContinuityEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityEvent" ADD CONSTRAINT "ContinuityEvent_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "ParkingLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityEvent" ADD CONSTRAINT "ContinuityEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

