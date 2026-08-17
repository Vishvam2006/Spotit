import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import VehicleImageUpload from './VehicleImageUpload';
import type { Vehicle } from '../../types/vehicle';
import type { VehicleImageClaim } from '../../services/vehicles';

export interface VehicleFormValues {
  registration: string;
  type: 'TWO_WHEELER' | 'FOUR_WHEELER';
  make: string;
  model: string;
  color: string;
  image: VehicleImageClaim | null;
}

interface VehicleFormProps {
  initial?: Vehicle;
  submitting?: boolean;
  submitError?: string | null;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: VehicleFormValues) => void;
}

export default function VehicleForm({
  initial,
  submitting = false,
  submitError = null,
  submitLabel = 'Save vehicle',
  onCancel,
  onSubmit,
}: VehicleFormProps) {
  const [registration, setRegistration] = useState(initial?.registration ?? '');
  const [registrationError, setRegistrationError] = useState<string | undefined>();
  const [type, setType] = useState<'TWO_WHEELER' | 'FOUR_WHEELER'>(
    initial?.type ?? 'FOUR_WHEELER',
  );
  const [make, setMake] = useState(initial?.make ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [image, setImage] = useState<VehicleImageClaim | null>(
    initial ? { imageUrl: initial.imageUrl, imagePublicId: initial.imagePublicId } : null,
  );
  const [imageError, setImageError] = useState<string | undefined>();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setRegistrationError(undefined);
    setImageError(undefined);

    const trimmed = registration.trim();
    if (trimmed.length < 2) {
      setRegistrationError('Registration number must be at least 2 characters');
      return;
    }

    if (!image || !image.imageUrl || !image.imagePublicId) {
      setImageError('Please add a photo of your vehicle.');
      return;
    }

    onSubmit({
      registration: trimmed,
      type,
      make: make.trim(),
      model: model.trim(),
      color: color.trim(),
      image,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="vehicle-registration"
          label="Registration number"
          placeholder="e.g. KA01AB1234"
          value={registration}
          onChange={(event) => setRegistration(event.target.value.toUpperCase())}
          error={registrationError}
        />
        <div>
          <span className="block text-sm font-medium text-[var(--pm-color-text)]">Vehicle type</span>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {(
              [
                { value: 'TWO_WHEELER', label: 'Two wheeler' },
                { value: 'FOUR_WHEELER', label: 'Four wheeler' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  type === option.value
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] text-[var(--pm-color-text)] hover:bg-[var(--pm-color-surface-raised)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          id="vehicle-make"
          label="Make (optional)"
          placeholder="e.g. Hyundai"
          value={make}
          onChange={(event) => setMake(event.target.value)}
        />
        <Input
          id="vehicle-model"
          label="Model (optional)"
          placeholder="e.g. i20"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
        <Input
          id="vehicle-color"
          label="Color (optional)"
          placeholder="e.g. White"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </div>

      <VehicleImageUpload value={image} onChange={setImage} disabled={submitting} />

      {imageError && <p className="text-sm text-red-600">{imageError}</p>}
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
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
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
