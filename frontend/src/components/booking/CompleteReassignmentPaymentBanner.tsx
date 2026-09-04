import { useState } from 'react';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useAuth } from '../../context/auth-context';
import { useRazorpay } from '../../hooks/useRazorpay';
import { verifyReassignmentPayment } from '../../services/payment';
import { getErrorMessage } from '../../services/api';
import { notifyError, notifySuccess } from '../../utils/notify';
import { formatINR } from '../../utils/format';
import type { Booking } from '../../types/booking';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

interface CompleteReassignmentPaymentBannerProps {
  booking: Booking;
  onPaid: () => void;
}

/**
 * Shown on a RESERVED booking that the 5-minute auto-accept timeout finalized
 * without payment (Payment.status stays CREATED until someone completes
 * Checkout for the order the sweeper already created). Reuses that existing
 * order rather than calling create-order again, since the offer is no longer
 * PENDING by this point.
 */
export default function CompleteReassignmentPaymentBanner({
  booking,
  onPaid,
}: CompleteReassignmentPaymentBannerProps) {
  const { user } = useAuth();
  const { openCheckout } = useRazorpay();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payment = booking.payment;
  const reassignmentId = booking.reassignment?.id;

  if (!payment || payment.status !== 'CREATED' || !reassignmentId) {
    return null;
  }

  async function handlePay() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await openCheckout({
        keyId: RAZORPAY_KEY_ID,
        amount: payment!.amount,
        currency: 'INR',
        orderId: payment!.razorpayOrderId,
        name: 'Spotit Parking',
        description: `Parking at ${booking.parkingLot.name}`,
        prefill: {
          name: user?.fullName ?? '',
          email: user?.email ?? '',
        },
      });
      await verifyReassignmentPayment(reassignmentId!, {
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
      notifySuccess('Payment complete! Your spot is confirmed.');
      onPaid();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Payment was cancelled') {
        setError('Payment was cancelled. Your spot is still held — try again anytime.');
      } else {
        setError(getErrorMessage(err));
        notifyError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-6 mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
      <p className="font-semibold">This spot is reserved — payment is still pending.</p>
      <p className="mt-1">
        We automatically held this spot for you after your original booking was cancelled.
        Complete payment of {formatINR(payment.amount / 100)} to keep it.
      </p>
      {error && (
        <div className="mt-3">
          <Alert variant="error" message={error} />
        </div>
      )}
      <Button className="mt-3 max-w-xs" onClick={handlePay} loading={busy}>
        Complete payment
      </Button>
    </div>
  );
}
