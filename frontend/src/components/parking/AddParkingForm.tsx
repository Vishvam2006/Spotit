import { useState } from 'react';
import type { FormEvent } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { getErrorMessage } from '../../services/api';
import { createParkingLot } from '../../services/parking';
import type { ParkingLotStatus } from '../../types/parking';
import PhotoUploader, { MIN_PARKING_PHOTOS } from './PhotoUploader';

export interface SelectedLocation {
  lat: number;
  lng: number;
}

interface AddParkingFormProps {
  selectedLocation: SelectedLocation | null;
  onCreated: () => void;
  onCancel: () => void;
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

const initialFormState: FormState = {
  name: '',
  description: '',
  address: '',
  city: '',
  pricePerHour: '',
  totalSpaces: '',
  availableSpaces: '',
  status: 'ACTIVE',
};

type FormErrors = Partial<Record<keyof FormState, string>> & { photos?: string };

export default function AddParkingForm({
  selectedLocation,
  onCreated,
  onCancel,
}: AddParkingFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const price = Number(form.pricePerHour);
    const totalSpaces = Number(form.totalSpaces);
    const availableSpaces = Number(form.availableSpaces);

    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.address.trim()) nextErrors.address = 'Address is required';
    if (!form.city.trim()) nextErrors.city = 'City is required';
    if (form.pricePerHour === '' || Number.isNaN(price) || price < 0) {
      nextErrors.pricePerHour = 'Price must be 0 or more';
    }
    if (form.totalSpaces === '' || Number.isNaN(totalSpaces) || totalSpaces <= 0) {
      nextErrors.totalSpaces = 'Total spaces must be greater than 0';
    }
    if (form.availableSpaces === '' || Number.isNaN(availableSpaces) || availableSpaces < 0) {
      nextErrors.availableSpaces = 'Available spaces must be 0 or more';
    } else if (
      !Number.isNaN(totalSpaces) &&
      availableSpaces > totalSpaces
    ) {
      nextErrors.availableSpaces = 'Available spaces cannot exceed total spaces';
    }

    if (photos.length < MIN_PARKING_PHOTOS) {
      nextErrors.photos = `At least ${MIN_PARKING_PHOTOS} photos of the parking space are required`;
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedLocation) {
      setErrors({});
      setSubmitError('Please select a location on the map.');
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createParkingLot({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        pricePerHour: Number(form.pricePerHour),
        totalSpaces: Number(form.totalSpaces),
        availableSpaces: Number(form.availableSpaces),
        status: form.status,
        photos,
      });
      onCreated();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Add Parking</h2>
          <p className="mt-1 text-sm text-slate-500">
            Click anywhere on the map to choose the parking location.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="mt-4">
          <Alert variant="error" message={submitError} />
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input
          id="parking-name"
          label="Parking Name"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          error={errors.name}
          className="sm:col-span-2"
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
            placeholder="Describe the parking (optional)"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <Input
          id="parking-address"
          label="Address"
          value={form.address}
          onChange={(event) => updateField('address', event.target.value)}
          error={errors.address}
        />
        <Input
          id="parking-city"
          label="City"
          value={form.city}
          onChange={(event) => updateField('city', event.target.value)}
          error={errors.city}
        />
        <Input
          id="parking-price"
          label="Price Per Hour"
          type="number"
          min={0}
          step="0.01"
          value={form.pricePerHour}
          onChange={(event) => updateField('pricePerHour', event.target.value)}
          error={errors.pricePerHour}
        />
        <Input
          id="parking-total-spaces"
          label="Total Spaces"
          type="number"
          min={0}
          step={1}
          value={form.totalSpaces}
          onChange={(event) => updateField('totalSpaces', event.target.value)}
          error={errors.totalSpaces}
        />
        <Input
          id="parking-available-spaces"
          label="Available Spaces"
          type="number"
          min={0}
          step={1}
          value={form.availableSpaces}
          onChange={(event) => updateField('availableSpaces', event.target.value)}
          error={errors.availableSpaces}
        />
        <div>
          <label
            htmlFor="parking-status"
            className="block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="parking-status"
            value={form.status}
            onChange={(event) =>
              updateField('status', event.target.value as ParkingLotStatus)
            }
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <Input
          id="parking-latitude"
          label="Latitude"
          value={selectedLocation ? selectedLocation.lat.toFixed(6) : ''}
          readOnly
          placeholder="Select a location on the map"
          className="cursor-not-allowed"
        />
        <Input
          id="parking-longitude"
          label="Longitude"
          value={selectedLocation ? selectedLocation.lng.toFixed(6) : ''}
          readOnly
          placeholder="Select a location on the map"
          className="cursor-not-allowed"
        />
        <div className="sm:col-span-2">
          <PhotoUploader
            value={photos}
            onChange={setPhotos}
            error={errors.photos}
            required
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}