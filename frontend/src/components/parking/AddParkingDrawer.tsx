import { useState, useRef } from 'react';
import type { FormEvent, TouchEvent } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { getErrorMessage } from '../../services/api';
import { createParkingLot } from '../../services/parking';
import { useAuth } from '../../context/auth-context';
import type { ParkingLotStatus } from '../../types/parking';
import PhotoUploader, { MIN_PARKING_PHOTOS } from './PhotoUploader';
import type { SelectedLocation } from './AddParkingForm';

interface AddParkingDrawerProps {
  selectedLocation: SelectedLocation | null;
  onCreated: () => void;
  onCancel: () => void;
  open: boolean;
}

interface FormState {
  name: string;
  description: string;
  address: string;
  city: string;
  pricePerHour: string;
  totalSpaces: string;
  availableSpaces: string;
  status: ParkingLotStatus;
}

const initial: FormState = {
  name: '', description: '', address: '', city: '',
  pricePerHour: '', totalSpaces: '', availableSpaces: '', status: 'ACTIVE',
};

type FormErrors = Partial<Record<keyof FormState, string>> & { photos?: string };

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-widest text-[var(--pm-color-muted)] ${className}`}>
      {children}
    </p>
  );
}

export default function AddParkingDrawer({ selectedLocation, onCreated, onCancel, open }: AddParkingDrawerProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { applySession } = useAuth();

  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);

  // No reset-on-open effect: the drawer is closed and reopened within a single
  // add-parking session (to re-pin the map, or after an accidental backdrop tap),
  // and wiping the form each time threw away everything the user had typed.
  // Explore remounts this component via `key` to start a genuinely new session.

  const updateField = (field: keyof FormState, value: string) => {
    setForm(c => ({ ...c, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const price = Number(form.pricePerHour);
    const total = Number(form.totalSpaces);
    const avail = Number(form.availableSpaces);
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.address.trim()) next.address = 'Address is required';
    if (!form.city.trim()) next.city = 'City is required';
    if (form.pricePerHour === '' || isNaN(price) || price < 0) next.pricePerHour = 'Price must be 0 or more';
    if (form.totalSpaces === '' || isNaN(total) || total <= 0) next.totalSpaces = 'Must be > 0';
    if (form.availableSpaces === '' || isNaN(avail) || avail < 0) next.availableSpaces = 'Must be >= 0';
    else if (!isNaN(total) && avail > total) next.availableSpaces = 'Cannot exceed total';
    if (photos.length < MIN_PARKING_PHOTOS) next.photos = `At least ${MIN_PARKING_PHOTOS} photo required`;
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!selectedLocation) { setSubmitError('Please pin a location on the map first.'); return; }
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    try {
      const { session } = await createParkingLot({
        name: form.name.trim(), description: form.description.trim() || undefined,
        address: form.address.trim(), city: form.city.trim(),
        latitude: selectedLocation.lat, longitude: selectedLocation.lng,
        pricePerHour: Number(form.pricePerHour), totalSpaces: Number(form.totalSpaces),
        availableSpaces: Number(form.availableSpaces), status: form.status, photos,
      });
      if (session) applySession(session.token, session.user);
      onCreated();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onTouchStart = (e: TouchEvent) => { dragStartY.current = e.touches[0].clientY; dragDelta.current = 0; };
  const onTouchMove = (e: TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0 && drawerRef.current) { dragDelta.current = delta; drawerRef.current.style.transform = `translateY(${delta}px)`; }
  };
  const onTouchEnd = () => {
    if (dragDelta.current > 120) { onCancel(); }
    else if (drawerRef.current) { drawerRef.current.style.transform = ''; }
    dragStartY.current = null; dragDelta.current = 0;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add parking"
        // z-[80] keeps the drawer above the floating mobile bottom nav (z-50),
        // which otherwise sat on top of the footer and swallowed taps on Save.
        // `invisible` when closed so the off-screen panel can't capture touches.
        className={`fixed inset-x-0 bottom-0 z-[80] flex flex-col rounded-t-3xl bg-[var(--pm-color-surface)] shadow-2xl transition-transform duration-300 ease-out md:hidden ${open ? 'translate-y-0' : 'invisible translate-y-full'}`}
        style={{ maxHeight: 'calc(100dvh - 56px)', willChange: 'transform' }}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 cursor-grab px-4 pb-2 pt-3"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--pm-color-border-strong)]" />
        </div>

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--pm-color-border)] px-5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--pm-color-text)]">Add Parking</h2>
            {selectedLocation ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Location pinned — fill in the details
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-[var(--pm-color-muted)]">Tap the map first to pin a location</p>
            )}
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-border-strong)] transition-colors">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          <form id="add-parking-mobile-form" onSubmit={handleSubmit} noValidate>
            {submitError && <div className="mb-4"><Alert variant="error" message={submitError} /></div>}

            {/* Location status */}
            <div className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${selectedLocation ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'}`}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedLocation ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-amber-400 animate-pulse'}`} aria-hidden="true" />
              {selectedLocation
                ? `Pinned at ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`
                : 'Close & tap the map to pin a location'}
            </div>

            {/* Basic Info */}
            <SectionLabel>Basic Info</SectionLabel>
            <div className="mt-3 space-y-3">
              <Input id="mob-name" label="Parking Name" value={form.name} onChange={e => updateField('name', e.target.value)} error={errors.name} />
              <div>
                <label htmlFor="mob-desc" className="block text-sm font-medium text-[var(--pm-color-text)]">Description <span className="text-[var(--pm-color-muted)]">(optional)</span></label>
                <textarea id="mob-desc" value={form.description} onChange={e => updateField('description', e.target.value)} rows={2} placeholder="Describe the parking…" className="mt-1.5 min-h-[72px] w-full rounded-xl border border-[var(--pm-color-border)] px-3.5 py-2.5 text-base text-[var(--pm-color-text)] shadow-sm placeholder:text-[var(--pm-color-muted)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            {/* Location */}
            <SectionLabel className="mt-6">Location</SectionLabel>
            <div className="mt-3 space-y-3">
              <Input id="mob-address" label="Address" value={form.address} onChange={e => updateField('address', e.target.value)} error={errors.address} />
              <Input id="mob-city" label="City" value={form.city} onChange={e => updateField('city', e.target.value)} error={errors.city} />
            </div>

            {/* Capacity & Pricing */}
            <SectionLabel className="mt-6">Capacity &amp; Pricing</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input id="mob-price" label="Price / Hour (₹)" type="number" min={0} step="0.01" value={form.pricePerHour} onChange={e => updateField('pricePerHour', e.target.value)} error={errors.pricePerHour} />
              <div>
                <label htmlFor="mob-status" className="block text-sm font-medium text-[var(--pm-color-text)]">Status</label>
                <select id="mob-status" value={form.status} onChange={e => updateField('status', e.target.value as ParkingLotStatus)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-base text-[var(--pm-color-text)] shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <Input id="mob-total" label="Total Spaces" type="number" min={1} step={1} value={form.totalSpaces} onChange={e => updateField('totalSpaces', e.target.value)} error={errors.totalSpaces} />
              <Input id="mob-avail" label="Available" type="number" min={0} step={1} value={form.availableSpaces} onChange={e => updateField('availableSpaces', e.target.value)} error={errors.availableSpaces} />
            </div>

            {/* Photos */}
            <SectionLabel className="mt-6">Photos</SectionLabel>
            <div className="mt-3">
              <PhotoUploader value={photos} onChange={setPhotos} error={errors.photos} required />
            </div>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="flex flex-shrink-0 gap-3 border-t border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-5 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onCancel} disabled={submitting} className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-sm font-bold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50">
            Back to map
          </button>
          <button type="submit" form="add-parking-mobile-form" disabled={submitting} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : 'Save Parking'}
          </button>
        </div>
      </div>
    </>
  );
}
