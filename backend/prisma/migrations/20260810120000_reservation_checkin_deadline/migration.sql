-- Split "reservation" from the paid parking session.
-- Rename the booking window columns and add the duration + session fields.

ALTER TABLE "Booking" RENAME COLUMN "startTime" TO "reservedAt";
ALTER TABLE "Booking" RENAME COLUMN "reservedUntil" TO "checkInDeadline";

-- Add new columns (nullable first, we backfill then enforce).
ALTER TABLE "Booking" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "sessionEndsAt" TIMESTAMP(3);

-- durationMinutes = the length of the originally selected window
-- (old rows stored the full duration as reservedUntil - startTime).
UPDATE "Booking"
SET "durationMinutes" = ROUND(
  EXTRACT(EPOCH FROM ("checkInDeadline" - "reservedAt")) / 60
);

-- Legacy RESERVED rows held a slot for the full duration; under the new
-- model the reservation only grants a short check-in window.
UPDATE "Booking"
SET "checkInDeadline" = "reservedAt" + INTERVAL '15 minutes'
WHERE "status" = 'RESERVED';

-- Legacy ACTIVE rows started their session at check-in; carry over the
-- planned session end so the countdown is relative to check-in.
UPDATE "Booking"
SET "sessionEndsAt" = "checkInTime" + ("durationMinutes" || ' minutes')::INTERVAL
WHERE "status" = 'ACTIVE'
  AND "checkInTime" IS NOT NULL;

-- The selected duration is required from now on.
ALTER TABLE "Booking" ALTER COLUMN "durationMinutes" SET NOT NULL;