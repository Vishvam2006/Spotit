import { useRef, useState } from 'react';
import axios from 'axios';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { fetchVehicleUploadSignature, type VehicleImageClaim } from '../../services/vehicles';
import { notifyError } from '../../utils/notify';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

interface VehicleImageUploadProps {
  value: VehicleImageClaim | null;
  onChange: (claim: VehicleImageClaim | null) => void;
  disabled?: boolean;
}

function extractCloudinaryError(error: unknown): string {
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
  return 'Could not upload the image. Please try again.';
}

export default function VehicleImageUpload({
  value,
  onChange,
  disabled = false,
}: VehicleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      notifyError('Only JPG, PNG or WebP images are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      notifyError('Image must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const signature = await fetchVehicleUploadSignature();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', signature.folder);
      formData.append('transformation', signature.transformation);
      formData.append('allowed_formats', signature.allowedFormats.join(','));
      formData.append('api_key', signature.apiKey);
      formData.append('timestamp', String(signature.timestamp));
      formData.append('signature', signature.signature);

      const { data } = await axios.post<{ public_id: string; secure_url: string }>(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
        },
      );

      onChange({
        imagePublicId: data.public_id,
        imageUrl: data.secure_url,
      });
    } catch (error) {
      notifyError(extractCloudinaryError(error));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">Vehicle photo</span>
      <div className="mt-1.5 flex items-start gap-4">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            disabled || uploading
              ? 'cursor-not-allowed opacity-60'
              : 'border-slate-300 hover:border-emerald-400'
          }`}
          aria-label="Choose a vehicle photo"
        >
          {value ? (
            <img
              src={value.imageUrl}
              alt="Vehicle preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-slate-400">
              <ImagePlus className="h-7 w-7" />
              <span className="px-2 text-[11px] font-medium leading-tight">
                Add photo
              </span>
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </span>
          )}
        </button>

        <div className="flex-1">
          {uploading ? (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                <Upload className="h-4 w-4" />
                Uploading {progress}%
              </p>
            </div>
          ) : value ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-600">Photo added.</p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                Replace photo
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(null)}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remove photo
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600">JPG, PNG or WebP up to 5 MB.</p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                Choose a photo
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleFile(file);
          }
          event.target.value = '';
        }}
      />
    </div>
  );
}
