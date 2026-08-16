import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  isCloudinaryConfigured,
  verifyVehicleImage,
  deleteCloudinaryAsset,
} from '../src/config/cloudinaryHelpers';
import {
  request,
  app,
  prisma,
  resetDb,
  createUser,
  createParkingLot,
  auth,
  completeCheckIn,
} from './helpers';

vi.mock('../src/config/cloudinaryHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config/cloudinaryHelpers')>();
  return {
    ...actual,
    isCloudinaryConfigured: vi.fn(() => true),
    verifyVehicleImage: vi.fn().mockResolvedValue(undefined),
    deleteCloudinaryAsset: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('cloudinary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('cloudinary')>();
  return {
    ...actual,
    v2: {
      config: vi.fn(),
      uploader: {
        upload: vi
          .fn()
          .mockResolvedValue({
            secure_url: 'https://res.cloudinary.com/parkmitra/image/upload/v1/vehicle.jpg',
          }),
        destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
      },
      api: {
        resource: vi.fn().mockResolvedValue({ public_id: 'x' }),
      },
      utils: {
        api_sign_request: vi.fn(() => 'test-signature'),
      },
    },
  };
});

const isCloudinaryConfiguredMock = vi.mocked(isCloudinaryConfigured);
const verifyVehicleImageMock = vi.mocked(verifyVehicleImage);
const deleteCloudinaryAssetMock = vi.mocked(deleteCloudinaryAsset);

const VEHICLE_IMAGE_URL =
  'https://res.cloudinary.com/parkmitra/image/upload/v1/vehicle.jpg';

function vehiclePayload(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    registration: 'GJ01AB1234',
    type: 'FOUR_WHEELER',
    imageUrl: VEHICLE_IMAGE_URL,
    imagePublicId: `parkmitra/vehicles/${userId}/abc123`,
    make: 'Hyundai',
    model: 'i20',
    color: 'White',
    ...overrides,
  };
}

function addVehicle(token: string, userId: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/vehicles')
    .set(auth(token))
    .send(vehiclePayload(userId, overrides));
}

async function setup() {
  const owner = await createUser('owner@example.com', 'OWNER');
  const user = await createUser('user@example.com', 'USER');
  const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
  return { owner, user, lot };
}

function book(token: string, parkingLotId: string, vehicleId: string) {
  return request(app)
    .post('/api/bookings')
    .set(auth(token))
    .send({ parkingLotId, vehicleId, durationMinutes: 120 });
}

describe('vehicle management', () => {
  beforeEach(async () => {
    await resetDb();
    isCloudinaryConfiguredMock.mockReturnValue(true);
    verifyVehicleImageMock.mockReset();
    verifyVehicleImageMock.mockResolvedValue(undefined);
    deleteCloudinaryAssetMock.mockClear();
  });

  it('adds a two-wheeler and makes the first vehicle the default', async () => {
    const { user } = await setup();

    const res = await addVehicle(user.token, user.user.id, {
      type: 'TWO_WHEELER',
      registration: 'GJ05XY5678',
    }).expect(201);

    expect(res.body.data.type).toBe('TWO_WHEELER');
    expect(res.body.data.isDefault).toBe(true);
    expect(res.body.data.imageUrl).toBe(VEHICLE_IMAGE_URL);
  });

  it('adds a four-wheeler and keeps the existing default', async () => {
    const { user } = await setup();
    await addVehicle(user.token, user.user.id).expect(201);

    const second = await addVehicle(user.token, user.user.id, {
      registration: 'GJ05XY5678',
    }).expect(201);

    expect(second.body.data.isDefault).toBe(false);
  });

  it('sorts vehicles with the default first', async () => {
    const { user } = await setup();
    await addVehicle(user.token, user.user.id).expect(201);
    const second = await addVehicle(user.token, user.user.id, {
      registration: 'GJ05XY5678',
    }).expect(201);

    await request(app)
      .post(`/api/vehicles/${second.body.data.id}/default`)
      .set(auth(user.token))
      .expect(200);

    const list = await request(app).get('/api/vehicles').set(auth(user.token)).expect(200);
    expect(list.body.data[0].id).toBe(second.body.data.id);
    expect(list.body.data[0].isDefault).toBe(true);
    expect(list.body.data[1].isDefault).toBe(false);
  });

  it('changes the default vehicle', async () => {
    const { user } = await setup();
    const first = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    const second = (
      await addVehicle(user.token, user.user.id, { registration: 'GJ05XY5678' }).expect(201)
    ).body.data;

    await request(app)
      .post(`/api/vehicles/${second.id}/default`)
      .set(auth(user.token))
      .expect(200);

    const list = await request(app).get('/api/vehicles').set(auth(user.token)).expect(200);
    const defaults = list.body.data.filter((v: { isDefault: boolean }) => v.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
    expect(first.id).not.toBe(second.id);
  });

  it('normalizes registration numbers to uppercase without spaces', async () => {
    const { user } = await setup();

    const res = await addVehicle(user.token, user.user.id, {
      registration: '  gj 01 ab 1234  ',
    }).expect(201);

    expect(res.body.data.registration).toBe('GJ01AB1234');
  });

  it('rejects duplicate registration for the same user', async () => {
    const { user } = await setup();
    await addVehicle(user.token, user.user.id).expect(201);

    const res = await addVehicle(user.token, user.user.id, {
      registration: 'gj01ab1234',
      imagePublicId: `parkmitra/vehicles/${user.user.id}/xyz`,
    }).expect(409);

    expect(res.body.message).toContain('already exists');
  });

  it('allows the same registration for different users', async () => {
    const userA = await createUser('a@example.com', 'USER');
    const userB = await createUser('b@example.com', 'USER');

    await addVehicle(userA.token, userA.user.id).expect(201);
    await addVehicle(userB.token, userB.user.id).expect(201);
  });

  it('rejects vehicle creation when the image is missing', async () => {
    const { user } = await setup();

    const payload = vehiclePayload(user.user.id);
    delete payload.imageUrl;
    delete payload.imagePublicId;

    const res = await request(app)
      .post('/api/vehicles')
      .set(auth(user.token))
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeTruthy();
  });

  it('rejects vehicle creation when the image is not in the user folder', async () => {
    const { user } = await setup();
    verifyVehicleImageMock.mockRejectedValueOnce(
      new Error('Vehicle image must be uploaded to your own folder.'),
    );

    const res = await addVehicle(user.token, user.user.id).expect(400);

    expect(res.body.message).toContain('your own folder');
  });

  it('returns 503 and disables vehicle creation when Cloudinary is not configured', async () => {
    const { user } = await setup();
    isCloudinaryConfiguredMock.mockReturnValue(false);

    const res = await addVehicle(user.token, user.user.id).expect(503);

    expect(res.body.message).toContain('Cloudinary is not configured');
    expect(await prisma.vehicle.count()).toBe(0);
  });

  it('edits a vehicle', async () => {
    const { user } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;

    const res = await request(app)
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .send({ make: 'Tata', model: 'Nexon', color: 'Blue' })
      .expect(200);

    expect(res.body.data.make).toBe('Tata');
    expect(res.body.data.model).toBe('Nexon');
    expect(res.body.data.color).toBe('Blue');
  });

  it('replaces the vehicle image on an unused vehicle and deletes the old asset', async () => {
    const { user } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;

    const newPublicId = `parkmitra/vehicles/${user.user.id}/replacement`;
    const res = await request(app)
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .send({
        imageUrl: 'https://res.cloudinary.com/parkmitra/image/upload/v1/new.jpg',
        imagePublicId: newPublicId,
      })
      .expect(200);

    expect(res.body.data.imagePublicId).toBe(newPublicId);
    expect(deleteCloudinaryAssetMock).toHaveBeenCalledWith(vehicle.imagePublicId);
  });

  it('deletes an unused vehicle and removes its cloudinary asset', async () => {
    const { user } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;

    await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .expect(204);

    expect(deleteCloudinaryAssetMock).toHaveBeenCalledWith(vehicle.imagePublicId);
  });

  it('blocks deletion when the vehicle is used by an ACTIVE booking', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await completeCheckIn(user.token, booking.id);

    const res = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .expect(409);

    expect(res.body.message).toContain('active or reserved');
    expect(deleteCloudinaryAssetMock).not.toHaveBeenCalled();
  });

  it('blocks deletion when the vehicle is used by a RESERVED booking', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;

    await book(user.token, lot.id, vehicle.id).expect(201);

    const res = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .expect(409);

    expect(res.body.message).toContain('active or reserved');
  });

  it('allows deletion when used only by completed/cancelled bookings but keeps the asset', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .expect(204);

    // The snapshot still references the image, so the asset must survive.
    expect(deleteCloudinaryAssetMock).not.toHaveBeenCalled();
  });

  it('assigns a new default when the default vehicle is deleted', async () => {
    const { user } = await setup();
    const first = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    const second = (
      await addVehicle(user.token, user.user.id, { registration: 'GJ05XY5678' }).expect(201)
    ).body.data;

    expect(first.isDefault).toBe(true);

    await request(app)
      .delete(`/api/vehicles/${first.id}`)
      .set(auth(user.token))
      .expect(204);

    const list = await request(app).get('/api/vehicles').set(auth(user.token)).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe(second.id);
    expect(list.body.data[0].isDefault).toBe(true);
  });
});

describe('vehicle verification status', () => {
  beforeEach(async () => {
    await resetDb();
    isCloudinaryConfiguredMock.mockReturnValue(true);
    verifyVehicleImageMock.mockReset();
    verifyVehicleImageMock.mockResolvedValue(undefined);
    deleteCloudinaryAssetMock.mockClear();
  });

  it('starts unverified', async () => {
    const { user } = await setup();
    const res = await addVehicle(user.token, user.user.id).expect(201);

    expect(res.body.data.verificationStatus).toBeNull();
    expect(res.body.data.verifiedAt).toBeNull();
  });

  it('exposes the stored verification status to the garage', async () => {
    const { user } = await setup();
    const created = await addVehicle(user.token, user.user.id).expect(201);

    await prisma.vehicle.update({
      where: { id: created.body.data.id },
      data: { verificationStatus: 'VERIFIED', verifiedAt: new Date() },
    });

    const list = await request(app).get('/api/vehicles').set(auth(user.token)).expect(200);
    expect(list.body.data[0].verificationStatus).toBe('VERIFIED');
    expect(list.body.data[0].verifiedAt).toBeTruthy();
  });

  it('clears verification when the registration changes', async () => {
    const { user } = await setup();
    const created = await addVehicle(user.token, user.user.id).expect(201);

    await prisma.vehicle.update({
      where: { id: created.body.data.id },
      data: { verificationStatus: 'VERIFIED', verifiedAt: new Date() },
    });

    const updated = await request(app)
      .patch(`/api/vehicles/${created.body.data.id}`)
      .set(auth(user.token))
      .send({ registration: 'MH12ZZ9999' })
      .expect(200);

    expect(updated.body.data.registration).toBe('MH12ZZ9999');
    expect(updated.body.data.verificationStatus).toBeNull();
    expect(updated.body.data.verifiedAt).toBeNull();
  });

  it('keeps verification when unrelated fields change', async () => {
    const { user } = await setup();
    const created = await addVehicle(user.token, user.user.id).expect(201);

    await prisma.vehicle.update({
      where: { id: created.body.data.id },
      data: { verificationStatus: 'VERIFIED', verifiedAt: new Date() },
    });

    const updated = await request(app)
      .patch(`/api/vehicles/${created.body.data.id}`)
      .set(auth(user.token))
      .send({ color: 'Black' })
      .expect(200);

    expect(updated.body.data.color).toBe('Black');
    expect(updated.body.data.verificationStatus).toBe('VERIFIED');
  });
});

describe('vehicle authorization', () => {
  beforeEach(resetDb);

  it('lists only the current user\'s vehicles', async () => {
    const userA = await createUser('a@example.com', 'USER');
    const userB = await createUser('b@example.com', 'USER');
    await addVehicle(userA.token, userA.user.id).expect(201);

    const res = await request(app).get('/api/vehicles').set(auth(userB.token)).expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('does not expose another user\'s vehicle image URLs', async () => {
    const userA = await createUser('a@example.com', 'USER');
    const userB = await createUser('b@example.com', 'USER');
    await addVehicle(userA.token, userA.user.id).expect(201);

    const res = await request(app).get('/api/vehicles').set(auth(userB.token)).expect(200);
    expect(JSON.stringify(res.body)).not.toContain(VEHICLE_IMAGE_URL);
  });

  it('cannot edit another user\'s vehicle', async () => {
    const userA = await createUser('a@example.com', 'USER');
    const userB = await createUser('b@example.com', 'USER');
    const vehicle = (await addVehicle(userA.token, userA.user.id).expect(201)).body.data;

    const res = await request(app)
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(auth(userB.token))
      .send({ color: 'Black' })
      .expect(404);

    expect(res.body.message).toBe('Vehicle not found');
  });

  it('cannot delete another user\'s vehicle', async () => {
    const userA = await createUser('a@example.com', 'USER');
    const userB = await createUser('b@example.com', 'USER');
    const vehicle = (await addVehicle(userA.token, userA.user.id).expect(201)).body.data;

    await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set(auth(userB.token))
      .expect(404);
  });

  it('cannot set another user\'s vehicle as default', async () => {
    const userA = await createUser('a@example.com', 'USER');
    const userB = await createUser('b@example.com', 'USER');
    const vehicle = (await addVehicle(userA.token, userA.user.id).expect(201)).body.data;

    await request(app)
      .post(`/api/vehicles/${vehicle.id}/default`)
      .set(auth(userB.token))
      .expect(404);
  });

  it('cannot use another user\'s vehicle while booking', async () => {
    const { user, lot } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const otherVehicle = (await addVehicle(other.token, other.user.id).expect(201)).body.data;

    await book(user.token, lot.id, otherVehicle.id).expect(404);
  });

  it('requires authentication for all vehicle routes', async () => {
    await request(app).get('/api/vehicles').expect(401);
    await request(app).post('/api/vehicles').expect(401);
    await request(app).patch('/api/vehicles/some-id').expect(401);
    await request(app).delete('/api/vehicles/some-id').expect(401);
    await request(app).post('/api/vehicles/some-id/default').expect(401);
  });

  it('rejects expired tokens on vehicle routes', async () => {
    const { user } = await setup();
    const expired = jwt.sign(
      { id: user.user.id, email: 'user@example.com', role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' },
    );

    await request(app).get('/api/vehicles').set(auth(expired)).expect(401);
  });
});

describe('booking vehicle snapshot', () => {
  beforeEach(async () => {
    await resetDb();
    deleteCloudinaryAssetMock.mockClear();
  });

  it('stores the correct vehicle snapshot on booking', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id, {
      make: 'Honda',
      model: 'Activa',
      color: 'Black',
      type: 'TWO_WHEELER',
      registration: 'GJ05XY5678',
    }).expect(201)).body.data;

    const res = await book(user.token, lot.id, vehicle.id).expect(201);

    expect(res.body.data.vehicle).toEqual({
      id: vehicle.id,
      registration: 'GJ05XY5678',
      type: 'TWO_WHEELER',
      imageUrl: vehicle.imageUrl,
      make: 'Honda',
      model: 'Activa',
      color: 'Black',
    });
    expect(res.body.data.vehicleRegistration).toBe('GJ05XY5678');
  });

  it('keeps the old booking unchanged after the vehicle is edited', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await request(app)
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .send({ registration: 'MH12ZZ9999', color: 'Black' })
      .expect(200);

    const after = await request(app)
      .get(`/api/bookings/${booking.id}`)
      .set(auth(user.token))
      .expect(200);

    expect(after.body.data.vehicle.registration).toBe('GJ01AB1234');
    expect(after.body.data.vehicle.color).toBe('White');
    expect(after.body.data.vehicleNumber).toBe('GJ01AB1234');
  });

  it('keeps the old booking image after the vehicle image is replaced', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await request(app)
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(auth(user.token))
      .send({
        imageUrl: 'https://res.cloudinary.com/parkmitra/image/upload/v1/new.jpg',
        imagePublicId: `parkmitra/vehicles/${user.user.id}/replacement`,
      })
      .expect(200);

    // The image is still referenced by the booking snapshot, so it is kept.
    expect(deleteCloudinaryAssetMock).not.toHaveBeenCalled();

    const after = await request(app)
      .get(`/api/bookings/${booking.id}`)
      .set(auth(user.token))
      .expect(200);

    expect(after.body.data.vehicle.imageUrl).toBe(vehicle.imageUrl);
  });

  it('shows vehicle details in booking history', async () => {
    const { user, lot } = await setup();
    const vehicle = (await addVehicle(user.token, user.user.id).expect(201)).body.data;
    await book(user.token, lot.id, vehicle.id).expect(201);

    const history = await request(app).get('/api/bookings').set(auth(user.token)).expect(200);

    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].vehicle.registration).toBe(vehicle.registration);
    expect(history.body.data[0].vehicle.type).toBe(vehicle.type);
  });
});

describe('vehicle image upload signature', () => {
  beforeEach(async () => {
    await resetDb();
    isCloudinaryConfiguredMock.mockReturnValue(true);
  });

  it('requires authentication', async () => {
    await request(app).post('/api/uploads/vehicle-image-signature').expect(401);
  });

  it('returns 503 when Cloudinary is not configured', async () => {
    const { user } = await setup();
    isCloudinaryConfiguredMock.mockReturnValue(false);

    const res = await request(app)
      .post('/api/uploads/vehicle-image-signature')
      .set(auth(user.token))
      .expect(503);

    expect(res.body.message).toContain('Cloudinary is not configured');
  });

  it('returns signed upload parameters scoped to the user folder', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'parkmitra';
    process.env.CLOUDINARY_API_KEY = 'test-api-key';
    process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    const { user } = await setup();

    const res = await request(app)
      .post('/api/uploads/vehicle-image-signature')
      .set(auth(user.token))
      .expect(200);

    const { data } = res.body;
    expect(data.cloudName).toBeTruthy();
    expect(data.apiKey).toBeTruthy();
    expect(data.signature).toBeTruthy();
    expect(data.timestamp).toBeTypeOf('number');
    expect(data.folder).toBe(`parkmitra/vehicles/${user.user.id}`);
    expect(data.resourceType).toBe('image');
    expect(JSON.stringify(data)).not.toContain('api_secret');
  });
});

describe('parking photo upload signature', () => {
  beforeEach(async () => {
    await resetDb();
    isCloudinaryConfiguredMock.mockReturnValue(true);
  });

  it('requires authentication', async () => {
    await request(app).post('/api/uploads/parking-photo-signature').expect(401);
  });

  it('returns signed upload parameters scoped to the owner folder', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'parkmitra';
    process.env.CLOUDINARY_API_KEY = 'test-api-key';
    process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    const { owner } = await setup();

    const res = await request(app)
      .post('/api/uploads/parking-photo-signature')
      .set(auth(owner.token))
      .expect(200);

    const { data } = res.body;
    expect(data.cloudName).toBeTruthy();
    expect(data.apiKey).toBeTruthy();
    expect(data.signature).toBeTruthy();
    expect(data.timestamp).toBeTypeOf('number');
    expect(data.folder).toBe(`parkmitra/parking-lots/${owner.user.id}`);
    expect(data.resourceType).toBe('image');
    expect(JSON.stringify(data)).not.toContain('api_secret');
  });
});
