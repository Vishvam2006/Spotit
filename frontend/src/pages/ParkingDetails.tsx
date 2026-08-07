import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import LoadingState from '../components/parking/LoadingState';
import ErrorState from '../components/parking/ErrorState';
import { fetchParkingLotById } from '../services/parkingLots';
import { getErrorMessage } from '../services/api';
import type { ParkingLot } from '../types';

export default function ParkingDetails() {
  const { id } = useParams<{ id: string }>();
  const [lot, setLot] = useState<ParkingLot | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;

    let active = true;

    (async () => {
      try {
        const data = await fetchParkingLotById(id);
        if (!active) return;
        setLot(data);
        setError(null);
        setStatus('success');
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const handleRetry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#0B1220]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/assets/image.png" alt="ParkMitra" className="h-14 w-auto object-contain" />
          </div>
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Parking
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {status === 'loading' ? (
          <LoadingState />
        ) : status === 'error' ? (
          <ErrorState message={error ?? ''} onRetry={handleRetry} />
        ) : lot ? (
          <div className="rounded-[24px] bg-white p-6 shadow-[0_18px_44px_rgb(15_23_42_/_0.10)] ring-1 ring-[#E2E8F0] sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-[#19C7B2]">
              Parking details
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0F172A]">
              {lot.name}
            </h1>
            <p className="mt-3 text-base text-[#64748B]">
              {lot.city} · {lot.address}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <dt className="text-sm font-semibold text-[#64748B]">
                  Price / hour
                </dt>
                <dd className="mt-2 text-2xl font-bold text-[#0F172A]">
                  ₹{lot.pricePerHour}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <dt className="text-sm font-semibold text-[#64748B]">
                  Available
                </dt>
                <dd className="mt-2 text-2xl font-bold text-[#22C55E]">
                  {lot.availableSpaces}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <dt className="text-sm font-semibold text-[#64748B]">
                  Total spaces
                </dt>
                <dd className="mt-2 text-2xl font-bold text-[#0F172A]">
                  {lot.totalSpaces}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <dt className="text-sm font-semibold text-[#64748B]">
                  Status
                </dt>
                <dd className="mt-2 text-2xl font-bold text-[#0F172A]">
                  {lot.status}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-sm text-[#64748B]">
              Booking and detailed parking-lot management are coming in a later
              phase.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
