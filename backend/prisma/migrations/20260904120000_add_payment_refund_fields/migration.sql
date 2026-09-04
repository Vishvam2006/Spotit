-- AlterEnum
ALTER TYPE "ContinuityEventType" ADD VALUE 'PAYMENT_REFUNDED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "razorpayRefundId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
