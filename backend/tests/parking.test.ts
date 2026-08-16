import { describe, it, expect, beforeEach } from 'vitest';
import { request, app, resetDb, createUser, createParkingLot, auth, testPhotos } from './helpers';

describe('parking lots', () => {
  beforeEach(resetDb);

  it('allows a regular USER to create a lot', async () => {
    const user = await createUser('user@example.com', 'USER');

    const res = await request(app)
      .post('/api/parking-lots')
      .set(auth(user.token))
    .send({
      name: 'My Parking',
      address: 'MG Road',
      city: 'Bengaluru',
      latitude: 12.9756,
      longitude: 77.6068,
      pricePerHour: 40,
      totalSpaces: 10,
      availableSpaces: 5,
      photos: testPhotos,
    })
    .expect(201);

    expect(res.body.data.ownerId).toBe(user.user.id);
  });

  it('requires at least 1 photo when creating a lot', async () => {
    const user = await createUser('user@example.com', 'USER');

    const res = await request(app)
      .post('/api/parking-lots')
      .set(auth(user.token))
      .send({
        name: 'My Parking',
        address: 'MG Road',
        city: 'Bengaluru',
        latitude: 12.9756,
        longitude: 77.6068,
      pricePerHour: 40,
      totalSpaces: 10,
      availableSpaces: 5,
      photos: [],
    })
      .expect(400);

    expect(res.body.errors.fieldErrors.photos).toBeDefined();
  });

  it('allows an OWNER to create a lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');

    const lot = await createParkingLot(owner.token);
    expect(lot.id).toBeTruthy();
    expect(lot.status).toBe('ACTIVE');
  });

  it('lists lots publicly', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    await createParkingLot(owner.token, { name: 'Central Mall Parking' });

    const res = await request(app).get('/api/parking-lots').expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Central Mall Parking');
  });

  it('prevents a non-owner from updating someone else\'s lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const other = await createUser('other@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);

    const res = await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .set(auth(other.token))
      .send({ pricePerHour: 99 })
      .expect(403);

    expect(res.body.message).toBe('Unauthorized');
  });

  it('prevents a non-owner from deleting someone else\'s lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const other = await createUser('other@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);

    await request(app)
      .delete(`/api/parking-lots/${lot.id}`)
      .set(auth(other.token))
      .expect(403);
  });

  it('lets the owner delete their own lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);

    await request(app)
      .delete(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token))
      .expect(204);
  });
});
