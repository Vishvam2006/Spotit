import { describe, it, expect } from 'vitest';
import {
  vehicleFolderFor,
  verifyVehicleImage,
  VEHICLE_IMAGE_TRANSFORMATION,
  VEHICLE_IMAGE_ALLOWED_FORMATS,
} from '../src/config/cloudinaryHelpers';

const USER_ID = 'user-123';
const OWN_FOLDER = vehicleFolderFor(USER_ID);
const URL_BASE = 'https://res.cloudinary.com/spotit/image/upload/v1';

describe('verifyVehicleImage (structural checks when Cloudinary is unconfigured)', () => {
  it('accepts an image in the user\'s own folder', async () => {
    const publicId = `${OWN_FOLDER}/abc123`;
    await expect(verifyVehicleImage(USER_ID, publicId, `${URL_BASE}/${publicId}.jpg`)).resolves.toBeUndefined();
  });

  it('accepts a transformed Cloudinary delivery URL for the same publicId', async () => {
    const publicId = `${OWN_FOLDER}/abc123`;
    await expect(
      verifyVehicleImage(
        USER_ID,
        publicId,
        `https://res.cloudinary.com/spotit/image/upload/c_fill,g_auto,w_640,h_640/v123/${publicId}.webp`,
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a publicId outside the user\'s folder', async () => {
    const publicId = 'spotit/vehicles/someone-else/abc123';
    await expect(
      verifyVehicleImage(USER_ID, publicId, `${URL_BASE}/${publicId}.jpg`),
    ).rejects.toThrow('own folder');
  });

  it('rejects a plain folder that is not under the user folder', async () => {
    await expect(
      verifyVehicleImage(USER_ID, 'spotit/vehicles/not-the-user', `${URL_BASE}/x.jpg`),
    ).rejects.toThrow('own folder');
  });

  it('rejects a non-https image URL', async () => {
    const publicId = `${OWN_FOLDER}/abc123`;
    await expect(
      verifyVehicleImage(USER_ID, publicId, `http://res.cloudinary.com/${publicId}.jpg`),
    ).rejects.toThrow('secure https');
  });

  it('rejects a URL that is not from Cloudinary', async () => {
    const publicId = `${OWN_FOLDER}/abc123`;
    await expect(
      verifyVehicleImage(USER_ID, publicId, `https://evil.example.com/${publicId}.jpg`),
    ).rejects.toThrow('Cloudinary');
  });

  it('rejects a URL that does not reference the publicId', async () => {
    const publicId = `${OWN_FOLDER}/abc123`;
    await expect(
      verifyVehicleImage(USER_ID, publicId, `${URL_BASE}/completely-different.jpg`),
    ).rejects.toThrow('does not match');
  });
});

describe('vehicle folder constants', () => {
  it('scopes each user to their own folder', () => {
    expect(vehicleFolderFor('alice')).toBe('spotit/vehicles/alice');
    expect(vehicleFolderFor('bob')).toBe('spotit/vehicles/bob');
  });

  it('enforces square crop and allowed formats', () => {
    expect(VEHICLE_IMAGE_TRANSFORMATION).toContain('c_fill');
    expect(VEHICLE_IMAGE_TRANSFORMATION).toContain('640');
    expect(VEHICLE_IMAGE_ALLOWED_FORMATS).toEqual(['jpg', 'png', 'webp']);
  });
});
