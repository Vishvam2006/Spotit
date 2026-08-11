import { useRef } from 'react';
import type { ChangeEvent } from 'react';

export const MAX_PARKING_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MIN_PARKING_PHOTOS = 2;

interface PhotoUploaderProps {
  value: string[];
  onChange: (photos: string[]) => void;
  error?: string;
  required?: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploader({
  value,
  onChange,
  error,
  required = true,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) return;

    const room = MAX_PARKING_PHOTOS - value.length;
    if (room <= 0) return;

    const accepted = files.slice(0, room);

    const next: string[] = [...value];
    for (const file of accepted) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_PHOTO_BYTES) continue;
      next.push(await readFileAsDataUrl(file));
    }

    onChange(next);
  };

  const removePhoto = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const missing = required && value.length < MIN_PARKING_PHOTOS;

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">Photos</span>
      <span className="mt-0.5 block text-xs text-slate-500">
        Add at least {MIN_PARKING_PHOTOS} photos of the parking space (max{' '}
        {MAX_PARKING_PHOTOS}, 8MB each).
      </span>

      {value.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((photo, index) => (
            <div
              key={index}
              className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200"
            >
              <img
                src={photo}
                alt={`Parking photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < MAX_PARKING_PHOTOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add photo
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {(error || missing) && (
        <p className="mt-1.5 text-sm text-red-600">
          {error ?? `At least ${MIN_PARKING_PHOTOS} photos are required`}
        </p>
      )}
    </div>
  );
}
