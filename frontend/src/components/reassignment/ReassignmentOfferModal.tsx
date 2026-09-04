import { useState } from 'react';
import { Sparkles, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown';
import { useRazorpay } from '../../hooks/useRazorpay';
import { useAuth } from '../../context/auth-context';
import { declineReassignment } from '../../services/reassignment';
import { createReassignmentOrder, verifyReassignmentPayment } from '../../services/payment';
import { getErrorMessage } from '../../services/api';
import { notifyError, notifySuccess } from '../../utils/notify';
import { formatINR } from '../../utils/format';
import type { ReassignmentOffer } from '../../types/reassignment';

interface ReassignmentOfferModalProps {
  offer: ReassignmentOffer;
  onResolved: () => void;
}

function formatDistance(distanceKm: number): string {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

/**
 * App-wide popup shown when the Continuity Engine has automatically held a
 * nearby lot for a user whose booking was cancelled by a deactivation. The
 * user can accept (pay now, spot becomes RESERVED immediately) or decline
 * (falls back to SmartSuggest on the original, already-cancelled booking).
 * Left unanswered, the backend auto-accepts at the deadline and the booking
 * becomes RESERVED with payment collected later.
 */
export default function ReassignmentOfferModal({ offer, onResolved }: ReassignmentOfferModalProps) {
  const { user } = useAuth();
  const { openCheckout } = useRazorpay();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const deadlineMs = offer.decisionDeadline
    ? new Date(offer.decisionDeadline).getTime()
    : Date.now();
  const remainingMs = useCountdown(deadlineMs, !timedOut, () => setTimedOut(true));

  const estimatedAmount = offer.estimatedAmount ?? offer.candidateLot.pricePerHour;
  const disabled = timedOut || busy !== null;

  async function handleAccept() {
    if (disabled) return;
    setBusy('accept');
    setError(null);
    try {
      const order = await createReassignmentOrder(offer.id);
      const response = await openCheckout({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.razorpayOrderId,
        name: 'Spotit Parking',
        description: `Held spot at ${order.parkingLotName}`,
        prefill: {
          name: user?.fullName ?? '',
          email: user?.email ?? '',
        },
      });
      await verifyReassignmentPayment(offer.id, {
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
      notifySuccess('Spot confirmed! Your new booking is reserved.');
      onResolved();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Payment was cancelled') {
        setError('Payment was cancelled. You can try again before the offer expires.');
      } else {
        setError(getErrorMessage(err));
        notifyError(err);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline() {
    if (disabled) return;
    setBusy('decline');
    setError(null);
    try {
      await declineReassignment(offer.id);
      notifySuccess('Offer declined. We’ll show you other nearby options.');
      onResolved();
    } catch (err) {
      setError(getErrorMessage(err));
      notifyError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="A nearby parking spot has been held for you"
        className="pm-sheet relative w-full max-w-md animate-slide-up overflow-hidden rounded-t-3xl bg-[var(--pm-color-surface)] shadow-2xl ring-1 ring-[var(--pm-color-border)] sm:rounded-3xl"
      >
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold">We held a spot for you</h2>
              <p className="text-sm text-emerald-50">
                Your original lot was deactivated — here's the nearest alternative.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-xl bg-[var(--pm-color-surface-raised)] p-4 ring-1 ring-[var(--pm-color-border)]">
            <p className="font-bold text-[var(--pm-color-text)]">{offer.candidateLot.name}</p>
            <p className="mt-0.5 flex items-start gap-1 text-sm text-[var(--pm-color-muted)]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {offer.candidateLot.address}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {offer.distanceKm !== null && (
                <span className="text-[var(--pm-color-muted)]">
                  <span className="font-semibold text-[var(--pm-color-text)]">
                    {formatDistance(offer.distanceKm)}
                  </span>{' '}
                  away
                </span>
              )}
              <span className="text-[var(--pm-color-muted)]">
                <span className="font-semibold text-[var(--pm-color-text)]">
                  {formatINR(estimatedAmount)}
                </span>{' '}
                estimated
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-center ring-1 ring-amber-100">
            {timedOut ? (
              <p className="text-sm font-semibold text-amber-900">Finalizing automatically…</p>
            ) : (
              <>
                <p className="text-xs font-medium text-amber-800/80">Respond within</p>
                <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums text-amber-900">
                  {formatCountdown(remainingMs)}
                </p>
                <p className="mt-1 text-xs text-amber-800/80">
                  If you don't respond, this spot is automatically reserved for you.
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4">
              <Alert variant="error" message={error} />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
            <Button onClick={handleAccept} loading={busy === 'accept'} disabled={disabled}>
              Accept & pay
            </Button>
            <Button
              variant="secondary"
              onClick={handleDecline}
              loading={busy === 'decline'}
              disabled={disabled}
            >
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
