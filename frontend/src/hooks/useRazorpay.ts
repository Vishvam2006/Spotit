import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Razorpay Checkout script URL. This is the official UMD script that exposes
 * `window.Razorpay`. In test mode the same script is used — the key prefix
 * (`rzp_test_`) tells Razorpay to open its sandbox.
 */
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  /** Razorpay Key ID (starts with rzp_test_ or rzp_live_) */
  keyId: string;
  /** Amount in paise */
  amount: number;
  currency: string;
  orderId: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/**
 * Hook that lazily loads the Razorpay Checkout script and exposes an `openCheckout`
 * function. The script is loaded once and cached for the lifetime of the page.
 */
export function useRazorpay() {
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof window !== 'undefined' && !!window.Razorpay,
  );
  const loadingRef = useRef(false);

  useEffect(() => {
    if (scriptLoaded || loadingRef.current) return;

    // Check if already present (e.g. from a previous mount)
    if (typeof window !== 'undefined' && window.Razorpay) {
      setScriptLoaded(true);
      return;
    }

    loadingRef.current = true;

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      setScriptLoaded(true);
      loadingRef.current = false;
    };

    script.onerror = () => {
      console.error('[useRazorpay] Failed to load Razorpay script');
      loadingRef.current = false;
    };

    document.body.appendChild(script);
  }, [scriptLoaded]);

  /**
   * Opens the Razorpay Checkout modal.
   *
   * Returns a promise that:
   * - Resolves with `RazorpaySuccessResponse` on successful payment
   * - Rejects with an error on user cancellation or failure
   */
  const openCheckout = useCallback(
    (options: RazorpayCheckoutOptions): Promise<RazorpaySuccessResponse> => {
      return new Promise((resolve, reject) => {
        if (!window.Razorpay) {
          reject(new Error('Razorpay SDK not loaded'));
          return;
        }

        const rzp = new window.Razorpay({
          key: options.keyId,
          amount: options.amount,
          currency: options.currency,
          name: options.name ?? 'Spotit Parking',
          description: options.description ?? 'Parking Booking Payment',
          order_id: options.orderId,
          prefill: options.prefill ?? {},
          theme: {
            color: '#10b981', // emerald-500 to match Spotit's brand
          },
          handler: (response: RazorpaySuccessResponse) => {
            resolve(response);
          },
          modal: {
            ondismiss: () => {
              reject(new Error('Payment was cancelled'));
            },
          },
        });

        rzp.open();
      });
    },
    [],
  );

  return { scriptLoaded, openCheckout };
}
