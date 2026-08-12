import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { createParking, getParkingErrorMessage, updateParking } from '../../services/parkingApi';
import type { Parking, ParkingInput } from '../../types/parking';
import PhotoUploader, { MIN_PARKING_PHOTOS } from './PhotoUploader';

interface ParkingFormProps {
  mode: 'create' | 'edit';
  initialValues?: Parking;
  onSaved: (parking: Parking) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  totalSlots: string;
  availableSlots: string;
  pricePerHour: string;
  isActive: boolean;
}

const emptyFormState: FormState = {
  name: '',
  description: '',
  address: '',
  latitude: '',
  longitude: '',
  totalSlots: '',
  availableSlots: '',
  pricePerHour: '',
  isActive: true,
};

type FormErrors = Partial<Record<keyof FormState, string>> & { photos?: string };

function toFormState(parking?: Parking): FormState {
  if (!parking) return emptyFormState;

  return {
    name: parking.name,
    description: parking.description ?? '',
    address: parking.address,
    latitude: String(parking.latitude),
    longitude: String(parking.longitude),
    totalSlots: String(parking.totalSlots),
    availableSlots: String(parking.availableSlots),
    pricePerHour: String(parking.pricePerHour),
    isActive: parking.isActive,
  };
}

function toPayload(form: FormState, photos: string[]): ParkingInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    address: form.address.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    totalSlots: Number(form.totalSlots),
    availableSlots: Number(form.availableSlots),
    pricePerHour: Number(form.pricePerHour),
    isActive: form.isActive,
    photos,
  };
}

export default function ParkingForm({
  mode,
  initialValues,
  onSaved,
  onCancel,
}: ParkingFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValues));
  const [photos, setPhotos] = useState<string[]>(() => initialValues?.photos ?? []);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const totalSlots = Number(form.totalSlots);
    const availableSlots = Number(form.availableSlots);
    const pricePerHour = Number(form.pricePerHour);

    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.address.trim()) nextErrors.address = 'Address is required';

    if (form.latitude === '' || Number.isNaN(latitude)) {
      nextErrors.latitude = 'Latitude is required';
    } else if (latitude < -90 || latitude > 90) {
      nextErrors.latitude = 'Latitude must be between -90 and 90';
    }

    if (form.longitude === '' || Number.isNaN(longitude)) {
      nextErrors.longitude = 'Longitude is required';
    } else if (longitude < -180 || longitude > 180) {
      nextErrors.longitude = 'Longitude must be between -180 and 180';
    }

    if (
      form.totalSlots === '' ||
      Number.isNaN(totalSlots) ||
      !Number.isInteger(totalSlots) ||
      totalSlots <= 0
    ) {
      nextErrors.totalSlots = 'Total slots must be a positive integer';
    }

    if (
      form.availableSlots === '' ||
      Number.isNaN(availableSlots) ||
      !Number.isInteger(availableSlots) ||
      availableSlots < 0
    ) {
      nextErrors.availableSlots = 'Available slots must be an integer of 0 or more';
    } else if (!Number.isNaN(totalSlots) && availableSlots > totalSlots) {
      nextErrors.availableSlots = 'Available slots cannot exceed total slots';
    }

    if (form.pricePerHour === '' || Number.isNaN(pricePerHour) || pricePerHour < 0) {
      nextErrors.pricePerHour = 'Price per hour must be 0 or more';
    }

    if (mode === 'create' && photos.length < MIN_PARKING_PHOTOS) {
      nextErrors.photos = `At least ${MIN_PARKING_PHOTOS} photo of the parking space is required`;
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = toPayload(form, photos);
      const saved =
        mode === 'create'
          ? await createParking(payload)
          : await updateParking(initialValues!.id, payload);
      onSaved(saved);
    } catch (error) {
      setSubmitError(getParkingErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {mode === 'create' ? 'Add parking' : 'Edit parking'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'create'
            ? 'Create a new parking lot for your account.'
            : 'Update the details for this parking lot.'}
        </p>
      </div>

      {submitError && (
        <div className="mt-4">
          <Alert variant="error" message={submitError} />
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input
          id="parking-name"
          label="Name"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          error={errors.name}
          className="sm:col-span-2"
          required
        />

        <div className="sm:col-span-2">
          <label
            htmlFor="parking-description"
            className="block text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <textarea
            id="parking-description"
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={3}
            placeholder="Optional description"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Input
          id="parking-address"
          label="Address"
          value={form.address}
          onChange={(event) => updateField('address', event.target.value)}
          error={errors.address}
          className="sm:col-span-2"
          required
        />

        <Input
          id="parking-latitude"
          label="Latitude"
          type="number"
          step="any"
          min={-90}
          max={90}
          value={form.latitude}
          onChange={(event) => updateField('latitude', event.target.value)}
          error={errors.latitude}
          required
        />

        <Input
          id="parking-longitude"
          label="Longitude"
          type="number"
          step="any"
          min={-180}
          max={180}
          value={form.longitude}
          onChange={(event) => updateField('longitude', event.target.value)}
          error={errors.longitude}
          required
        />

        <Input
          id="parking-total-slots"
          label="Total slots"
          type="number"
          min={1}
          step={1}
          value={form.totalSlots}
          onChange={(event) => updateField('totalSlots', event.target.value)}
          error={errors.totalSlots}
          required
        />

        <Input
          id="parking-available-slots"
          label="Available slots"
          type="number"
          min={0}
          step={1}
          value={form.availableSlots}
          onChange={(event) => updateField('availableSlots', event.target.value)}
          error={errors.availableSlots}
          required
        />

        <Input
          id="parking-price"
          label="Price per hour"
          type="number"
          min={0}
          step="0.01"
          value={form.pricePerHour}
          onChange={(event) => updateField('pricePerHour', event.target.value)}
          error={errors.pricePerHour}
          required
        />

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              id="parking-is-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateField('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Active parking lot
          </label>
        </div>

        <div className="sm:col-span-2">
          <PhotoUploader
            value={photos}
            onChange={setPhotos}
            error={errors.photos}
            required={mode === 'create'}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="sm:w-auto"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" className="sm:w-auto" loading={submitting}>
          {mode === 'create' ? 'Add parking' : 'Update parking'}
        </Button>
      </div>
    </form>
  );
}
