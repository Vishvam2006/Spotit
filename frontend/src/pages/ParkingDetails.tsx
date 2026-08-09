import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import { getErrorMessage } from '../services/api';
import { fetchParkingLot } from '../services/parking';
import { createBooking } from '../services/bookings';
import { formatINR } from '../utils/format';
import { notifyError, notifySuccess } from '../utils/notify';
import type { ParkingLot } from '../types/parking';

const DURATION_OPTIONS = [
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 240, label: '4 hours' },
  { minutes: 480, label: '8 hours' },
];

export default function ParkingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [vehicleError, setVehicleError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    fetchParkingLot(id)
      .then((lot) => {
        if (active) setParking(lot);
      })
      .catch(() => {
        if (active) setError('Parking lot not found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const selectedOption =
    DURATION_OPTIONS.find((option) => option.minutes === durationMinutes) ??
    DURATION_OPTIONS[0];

  const estimatedAmount = parking
    ? parking.pricePerHour * (selectedOption.minutes / 60)
    : 0;

  const handleBook = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setVehicleError(undefined);

    const trimmed = vehicleNumber.trim();
    if (trimmed.length < 2) {
      setVehicleError('Vehicle number must be at least 2 characters');
      return;
    }

    if (!parking) return;

    setSubmitting(true);
    try {
      const booking = await createBooking({
        parkingLotId: parking.id,
        vehicleNumber: trimmed,
        durationMinutes,
      });
      notifySuccess('Booking confirmed! Your spot is reserved.');
      navigate(`/booking/confirm/${booking.id}`, { replace: true });
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error || !parking) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader />
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <Alert variant="error" message={error ?? 'Parking lot not found.'} />
          <Button variant="secondary" className="mt-4 max-w-xs" onClick={() => navigate('/')}>
            Back to map
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to map
        </button>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
            <h1 className="text-2xl font-bold">{parking.name}</h1>
            <p className="mt-1 text-sm text-blue-100">
              {parking.address}, {parking.city}
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <InfoTile label="Price" value={`${formatINR(parking.pricePerHour)}/hr`} />
            <InfoTile label="Available" value={String(parking.availableSpaces)} />
            <InfoTile label="Total spaces" value={String(parking.totalSpaces)} />
          </div>
        </div>

        {parking.status !== 'ACTIVE' ? (
          <div className="mt-6">
            <Alert variant="error" message="This parking lot is currently not accepting bookings." />
          </div>
        ) : parking.availableSpaces === 0 ? (
          <div className="mt-6">
            <Alert variant="error" message="No parking spaces are currently available." />
          </div>
        ) : (
          <form onSubmit={handleBook} className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Reserve a spot</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your spot is held until check-in. Cancel anytime while reserved.
            </p>

            {submitError && (
              <div className="mt-4">
                <Alert variant="error" message={submitError} />
              </div>
            )}

            <div className="mt-5 space-y-5">
              <div>
                <span className="block text-sm font-medium text-slate-700">Duration</span>
                <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.minutes}
                      type="button"
                      onClick={() => setDurationMinutes(option.minutes)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        durationMinutes === option.minutes
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                id="vehicle-number"
                label="Vehicle number"
                placeholder="e.g. KA01AB1234"
                value={vehicleNumber}
                onChange={(event) => setVehicleNumber(event.target.value)}
                error={vehicleError}
              />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
              <div>
                <p className="text-sm text-slate-500">Estimated amount</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatINR(estimatedAmount)}
                </p>
              </div>
              <Button type="submit" loading={submitting} className="max-w-56">
                Confirm booking
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-slate-900">ParkMitra</span>
        </div>
      </div>
    </header>
  );
}
