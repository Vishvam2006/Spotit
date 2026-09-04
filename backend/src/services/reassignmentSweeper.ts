import { finalizeDueOffers } from '../modules/reassignment/reassignment.service';
import * as paymentService from '../modules/payment/payment.service';

const DEFAULT_INTERVAL_MS = 30_000;

function parseInterval(value: string | undefined): number {
  if (value === undefined || value === '') {
    return DEFAULT_INTERVAL_MS;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
}

/**
 * Auto-accepts every reassignment offer whose 5-minute decision window has
 * passed, then pre-creates an uncaptured payment order for each one. Kept as
 * a separate orchestrator (rather than folding this into
 * reassignment.service.ts) so the reassignment and payment modules never
 * need to import each other.
 */
export async function sweepPendingReassignments(): Promise<number> {
  const finalized = await finalizeDueOffers();

  for (const booking of finalized) {
    await paymentService.createUncapturedOrderForBooking(booking).catch((error) => {
      console.error(
        `[ReassignmentSweeper] Failed to create payment order for booking ${booking.id}:`,
        error,
      );
    });
  }

  return finalized.length;
}

export function startReassignmentSweeper(): { stop: () => void } {
  const intervalMs = parseInterval(process.env.REASSIGNMENT_SWEEP_INTERVAL_MS);

  const timer = setInterval(() => {
    sweepPendingReassignments().catch((error) => {
      console.error('[ReassignmentSweeper] sweep failed:', error);
    });
  }, intervalMs);

  timer.unref?.();

  return {
    stop: () => {
      clearInterval(timer);
    },
  };
}
