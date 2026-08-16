import { cloudinary } from './cloudinary';

const VEHICLE_FOLDER_ROOT = process.env.CLOUDINARY_VEHICLE_FOLDER ?? 'parkmitra/vehicles';
const PARKING_FOLDER_ROOT = process.env.CLOUDINARY_PARKING_FOLDER ?? 'parkmitra/parking-lots';

/** Square, auto-cropped transformation applied to every vehicle image. */
export const VEHICLE_IMAGE_TRANSFORMATION = 'c_fill,g_auto,w_640,h_640';
export const PARKING_IMAGE_TRANSFORMATION = 'c_fill,g_auto,w_1200,h_800';

export const VEHICLE_IMAGE_ALLOWED_FORMATS = ['jpg', 'png', 'webp'] as const;
export const PARKING_IMAGE_ALLOWED_FORMATS = ['jpg', 'png', 'webp'] as const;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/** Folder restricted to a single user: parkmitra/vehicles/{userId} */
export function vehicleFolderFor(userId: string): string {
  return `${VEHICLE_FOLDER_ROOT}/${userId}`;
}

/** Folder restricted to one owner's parking uploads. */
export function parkingFolderFor(ownerId: string): string {
  return `${PARKING_FOLDER_ROOT}/${ownerId}`;
}

export interface VehicleUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  transformation: string;
  allowedFormats: readonly string[];
  resourceType: 'image';
}

export interface ParkingUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  transformation: string;
  allowedFormats: readonly string[];
  resourceType: 'image';
}

/**
 * Builds a signed Cloudinary upload request for a single user's vehicle
 * folder. The signature is computed on the server using the API secret,
 * which is never exposed to the frontend.
 */
export function createVehicleUploadSignature(userId: string): VehicleUploadSignature {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = vehicleFolderFor(userId);

  const paramsToSign = {
    timestamp,
    folder,
    transformation: VEHICLE_IMAGE_TRANSFORMATION,
    allowed_formats: VEHICLE_IMAGE_ALLOWED_FORMATS.join(','),
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder,
    transformation: VEHICLE_IMAGE_TRANSFORMATION,
    allowedFormats: VEHICLE_IMAGE_ALLOWED_FORMATS,
    resourceType: 'image',
  };
}

export function createParkingUploadSignature(ownerId: string): ParkingUploadSignature {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = parkingFolderFor(ownerId);

  const paramsToSign = {
    timestamp,
    folder,
    transformation: PARKING_IMAGE_TRANSFORMATION,
    allowed_formats: PARKING_IMAGE_ALLOWED_FORMATS.join(','),
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder,
    transformation: PARKING_IMAGE_TRANSFORMATION,
    allowedFormats: PARKING_IMAGE_ALLOWED_FORMATS,
    resourceType: 'image',
  };
}

/**
 * Deletes a Cloudinary asset. Best-effort and safe to call even when
 * Cloudinary is not configured (no-op) or the publicId is empty. The
 * caller is responsible for ensuring the asset is no longer referenced
 * by any booking snapshot.
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured() || !publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Deletion is best-effort; a failed cleanup must never break the API
    // response for the user.
    console.error('[Cloudinary] Failed to delete asset:', publicId, error);
  }
}

/**
 * Verifies that an image claim is legitimate:
 *  - the publicId lives inside the current user's own folder, and
 *  - the imageUrl is a Cloudinary https URL that references the publicId.
 * When Cloudinary is configured we additionally confirm the asset exists.
 */
export async function verifyVehicleImage(
  userId: string,
  imagePublicId: string,
  imageUrl: string,
): Promise<void> {
  const expectedPrefix = vehicleFolderFor(userId);

  if (!imagePublicId.startsWith(`${expectedPrefix}/`)) {
    throw new Error('Vehicle image must be uploaded to your own folder.');
  }

  const url = new URL(imageUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Vehicle image URL must be a secure https URL.');
  }

  if (!url.hostname.endsWith('res.cloudinary.com')) {
    throw new Error('Vehicle image URL must be a Cloudinary URL.');
  }

  const decodedPath = decodeURIComponent(url.pathname);
  const pathWithoutExtension = decodedPath.replace(/\.[a-z0-9]+$/i, '');
  if (!pathWithoutExtension.endsWith(`/${imagePublicId}`)) {
    throw new Error('Vehicle image URL does not match the uploaded asset.');
  }

  if (!isCloudinaryConfigured()) {
    return;
  }

  try {
    const resource = await cloudinary.api.resource(imagePublicId, {
      resource_type: 'image',
    });
    if (!resource) {
      throw new Error('Vehicle image could not be found on Cloudinary.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Cloudinary error';
    throw new Error(`Vehicle image could not be verified on Cloudinary: ${message}`);
  }
}
