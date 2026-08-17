import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, AlertTriangle, Compass } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import VehicleSelector from '../components/vehicle/VehicleSelector';
import ComplaintForm from '../components/complaint/ComplaintForm';
import { getErrorMessage } from '../services/api';
import { fetchParkingLot } from '../services/parking';
import { fetchVehicles } from '../services/vehicles';
import { createBooking } from '../services/bookings';
import { formatINR } from '../utils/format';
import { notifyError, notifySuccess } from '../utils/notify';
import { useAuth } from '../context/auth-context';
import type { ParkingLot } from '../types/parking';
import type { Vehicle } from '../types/vehicle';

const DURATION_OPTIONS = [
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 240, label: '4 hours' },
  { minutes: 480, label: '8 hours' },
];

export default function ParkingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const submittingRef = useRef(false);

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

  useEffect(() => {
    let active = true;

    fetchVehicles()
      .then((result) => {
        if (active) {
          setVehicles(result);
          setSelectedVehicleId(
            result.find((vehicle) => vehicle.isDefault)?.id ?? result[0]?.id ?? null,
          );
        }
      })
      .catch(() => {
        if (active) setVehiclesError('Failed to load your vehicles.');
      })
      .finally(() => {
        if (active) setVehiclesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedOption =
    DURATION_OPTIONS.find((option) => option.minutes === durationMinutes) ??
    DURATION_OPTIONS[0];

  const estimatedAmount = parking
    ? parking.pricePerHour * (selectedOption.minutes / 60)
    : 0;

  const handleBook = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedVehicleId) {
      setSubmitError('Please choose a vehicle to book with.');
      return;
    }

    if (!parking) return;

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const booking = await createBooking({
        parkingLotId: parking.id,
        vehicleId: selectedVehicleId,
        durationMinutes,
      });
      notifySuccess('Booking confirmed! Your spot is reserved.');
      navigate(`/booking/confirm/${booking.id}`, { replace: true });
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      notifyError(err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout maxWidth="max-w-none">
        <div className="flex flex-1 items-center justify-center min-h-screen bg-[var(--pm-color-page)]">
          <Spinner className="h-8 w-8 text-[var(--pm-color-action)]" />
        </div>
      </AppLayout>
    );
  }

  if (error || !parking) {
    return (
      <AppLayout maxWidth="max-w-none">
        <main className="mx-auto flex flex-col items-center justify-center px-4 pt-8 pb-24 sm:px-6 min-h-screen bg-[var(--pm-color-page)]">
          <Alert variant="error" message={error ?? 'Parking lot not found.'} />
          <button className="mt-6 rounded-xl bg-[var(--pm-color-surface-raised)] px-6 py-3 font-bold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-border-strong)]" onClick={() => navigate(-1)}>
            Back
          </button>
        </main>
      </AppLayout>
    );
  }

  const isOwner = user?.id === parking.ownerId;
  const imageUrl = parking.photos?.[0] ?? parking.imageUrl;
  const canBook =
    !isOwner && parking.status === 'ACTIVE' && parking.availableSpaces > 0;

  return (
    <AppLayout maxWidth="max-w-none">
      <main className="min-h-screen bg-[var(--pm-color-page)] pb-32">
        {/* Header Strip */}
        <div className="absolute top-0 z-10 w-full p-4 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] transition-all pm-neumorphic pm-neumorphic-active pointer-events-auto"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Hero Image */}
        <div className="relative h-72 bg-[var(--pm-color-surface-raised)] rounded-b-[2rem] overflow-hidden shadow-xl">
          {imageUrl ? (
            <img src={imageUrl} alt={parking.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Compass className="h-16 w-16 text-[var(--pm-color-muted)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] to-transparent pointer-events-none" />
        </div>

        <div className="mx-auto max-w-2xl px-4 sm:px-6 -mt-8 relative z-10">
          {/* Title Card */}
          <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-lg ring-1 ring-[var(--pm-color-border)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-black text-[var(--pm-color-text)]">{parking.name}</h1>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--pm-color-muted)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pm-color-action)]" aria-hidden="true" />
                  <span>
                    {parking.address}, {parking.city}
                  </span>
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  canBook
                    ? 'bg-[var(--pm-color-action-soft)] text-[var(--pm-color-action)] ring-1 ring-[var(--pm-color-action)]/30'
                    : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                }`}
              >
                {canBook ? 'Available' : 'Full'}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--pm-color-border-strong)] pt-5">
              <div>
                <p className="text-xs font-medium text-[var(--pm-color-muted)]">Price</p>
                <p className="mt-1 text-lg font-black text-[var(--pm-color-text)]">₹{parking.pricePerHour}/hr</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--pm-color-muted)]">Available</p>
                <p className="mt-1 text-lg font-black text-[var(--pm-color-action)]">{parking.availableSpaces}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--pm-color-muted)]">Total</p>
                <p className="mt-1 text-lg font-black text-[var(--pm-color-text)]">{parking.totalSpaces}</p>
              </div>
            </div>
          </div>

          {/* Booking Section */}
          <div className="mt-6">
            {isOwner ? (
              <Alert
                variant="error"
                message="You own this parking spot, so you cannot book it."
              />
            ) : parking.status !== 'ACTIVE' ? (
              <Alert variant="error" message="This parking lot is currently not accepting bookings." />
            ) : parking.availableSpaces === 0 ? (
              <Alert variant="error" message="No parking spaces are currently available." />
            ) : (
              <form onSubmit={handleBook} className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-lg ring-1 ring-[var(--pm-color-border)]">
                <h2 className="text-lg font-bold text-[var(--pm-color-text)]">Select Duration</h2>
                
                {submitError && (
                  <div className="mt-4">
                    <Alert variant="error" message={submitError} />
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.minutes}
                      type="button"
                      onClick={() => setDurationMinutes(option.minutes)}
                      aria-pressed={durationMinutes === option.minutes}
                      className={`min-h-12 rounded-xl px-3 text-sm font-bold transition-all focus:outline-none ${
                        durationMinutes === option.minutes
                          ? 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-action)] pm-neumorphic-inset'
                          : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] pm-neumorphic pm-neumorphic-active'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <h2 className="text-lg font-bold text-[var(--pm-color-text)] mb-3">Vehicle Details</h2>
                  {vehiclesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--pm-color-muted)]">
                      <Spinner className="h-4 w-4 text-[var(--pm-color-action)]" />
                      Loading your vehicles…
                    </div>
                  ) : vehiclesError ? (
                    <Alert variant="error" message={vehiclesError} />
                  ) : (
                    <div className="rounded-xl border border-[var(--pm-color-border)] p-1 bg-[var(--pm-color-surface-raised)]">
                      <VehicleSelector
                        vehicles={vehicles}
                        selectedId={selectedVehicleId}
                        onChange={setSelectedVehicleId}
                        onManage={() => navigate('/my-vehicles')}
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>

                {/* Report Issue Secondary Action */}
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-surface-raised)]"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Report an issue
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        {canBook && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--pm-color-border-strong)] bg-[var(--pm-color-surface)]/95 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--pm-color-muted)]">
                  {selectedOption.label} · Total Price
                </p>
                <p className="text-2xl font-black text-[var(--pm-color-text)]">
                  {formatINR(estimatedAmount)}
                </p>
              </div>
              <button
                type="submit"
                onClick={handleBook}
                disabled={submitting || vehicles.length === 0}
                className="flex min-h-14 items-center justify-center rounded-2xl bg-[var(--pm-color-surface-raised)] px-8 text-base font-bold text-[var(--pm-color-action)] transition-all active:scale-[0.98] disabled:opacity-50 pm-neumorphic pm-neumorphic-active"
              >
                {submitting ? <Spinner className="h-5 w-5 text-[var(--pm-color-text)]" /> : 'Start parking'}
              </button>
            </div>
          </div>
        )}
      </main>
      {reportOpen && (
        <ComplaintForm parkingLotId={id} onClose={() => setReportOpen(false)} />
      )}
    </AppLayout>
  );
}
