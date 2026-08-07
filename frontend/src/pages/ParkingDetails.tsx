import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ParkMitra
            </span>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to parking
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {status === 'loading' ? (
          <LoadingState />
        ) : status === 'error' ? (
          <ErrorState message={error ?? ''} onRetry={handleRetry} />
        ) : lot ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Parking details
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {lot.name}
            </h1>
            <p className="mt-2 text-slate-600">
              {lot.city} · {lot.address}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Price / hour
                </dt>
                <dd className="mt-1 text-lg font-bold text-slate-900">
                  ₹{lot.pricePerHour}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Available
                </dt>
                <dd className="mt-1 text-lg font-bold text-emerald-600">
                  {lot.availableSpaces}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total spaces
                </dt>
                <dd className="mt-1 text-lg font-bold text-slate-900">
                  {lot.totalSpaces}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </dt>
                <dd className="mt-1 text-lg font-bold text-slate-900">
                  {lot.status}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-sm text-slate-500">
              Booking and detailed parking-lot management are coming in a later
              phase.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
