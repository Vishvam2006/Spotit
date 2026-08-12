import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import {
  fetchParkingPhotoUploadSignature,
  type ParkingPhotoUploadSignature,
} from '../../services/parkingApi';
import { notifyError } from '../../utils/notify';

export const MAX_PARKING_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MIN_PARKING_PHOTOS = 1;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoUploaderProps {
  value: string[];
  onChange: (photos: string[]) => void;
  error?: string;
  required?: boolean;
}

function extractUploadError(error: unknown): string {
  if (
    axios.isAxiosError(error) &&
    error.response?.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data &&
    error.response.data.error &&
    typeof error.response.data.error === 'object' &&
    'message' in error.response.data.error &&
    typeof error.response.data.error.message === 'string'
  ) {
    return error.response.data.error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Could not upload the photo. Please try again.';
}

async function uploadPhoto(file: File, signature: ParkingPhotoUploadSignature): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', signature.folder);
  formData.append('transformation', signature.transformation);
  formData.append('allowed_formats', signature.allowedFormats.join(','));
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);

  const { data } = await axios.post<{ secure_url: string }>(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    formData,
  );

  return data.secure_url;
}

export default function PhotoUploader({
  value,
  onChange,
  error,
  required = true,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) return;

    const room = MAX_PARKING_PHOTOS - value.length;
    if (room <= 0) return;

    const accepted: File[] = [];
    for (const file of files.slice(0, room)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        notifyError('Only JPG, PNG or WebP photos are accepted.');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        notifyError('Photo must be 8 MB or smaller.');
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const signature = await fetchParkingPhotoUploadSignature();
      const uploaded = await Promise.all(accepted.map((file) => uploadPhoto(file, signature)));
      onChange([...value, ...uploaded]);
    } catch (error) {
      notifyError(extractUploadError(error));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const missing = required && value.length < MIN_PARKING_PHOTOS;

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">Photos</span>
      <span className="mt-0.5 block text-xs text-slate-500">
        Add at least one photo of the parking space (max {MAX_PARKING_PHOTOS}, 8MB each).
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
          disabled={uploading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? 'Uploading...' : '+ Add photo'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={handleFiles}
        className="hidden"
      />

      {(error || missing) && (
        <p className="mt-1.5 text-sm text-red-600">
          {error ?? 'At least one photo is required'}
        </p>
      )}
    </div>
  );
}
