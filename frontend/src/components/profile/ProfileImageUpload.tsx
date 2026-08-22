import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { notifyError } from '../../utils/notify';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  transformation: string;
  allowedFormats: readonly string[];
  resourceType: string;
}

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  className?: string;
}

export default function ProfileImageUpload({
  currentImageUrl,
  onUploadSuccess,
  className = '',
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notifyError('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      const { data: signatureData } = await api.post<{ success: boolean; data: UploadSignature }>(
        '/uploads/profile-image-signature',
      );
      const { signature, timestamp, apiKey, cloudName, folder, transformation } =
        signatureData.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('transformation', transformation);
      if (signatureData.data.allowedFormats) {
        formData.append('allowed_formats', signatureData.data.allowedFormats.join(','));
      }

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const uploadResult = await uploadResponse.json();
      onUploadSuccess(uploadResult.secure_url);
    } catch (error) {
      notifyError('Image upload failed. Please try again.');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`relative flex flex-col items-center gap-4 ${className}`}>
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-[var(--pm-color-surface)] shadow-md">
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)]">
            <Camera className="h-10 w-10 opacity-50" />
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-[var(--pm-color-surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-border)] disabled:opacity-50"
        >
          {currentImageUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
      </div>
    </div>
  );
}
