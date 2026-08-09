import { describe, it, expect, beforeEach } from 'vitest';
import { request, app, resetDb, createUser, createParkingLot } from './helpers';

describe('parking lot search and filters', () => {
  beforeEach(resetDb);

  async function seedBaseLots() {
    const owner = await createUser('owner@example.com', 'OWNER');
    const mall = await createParkingLot(owner.token, {
      name: 'Central Mall Parking',
      address: 'MG Road, Bengaluru',
      city: 'Bengaluru',
      pricePerHour: 40,
      totalSpaces: 100,
      availableSpaces: 38,
      latitude: 12.9756,
      longitude: 77.6068,
    });
    const techPark = await createParkingLot(owner.token, {
      name: 'Tech Park Visitor Parking',
      address: 'Whitefield Main Road',
      city: 'Bengaluru',
      pricePerHour: 30,
      totalSpaces: 60,
      availableSpaces: 12,
      latitude: 12.9698,
      longitude: 77.7499,
    });
    const hospital = await createParkingLot(owner.token, {
      name: 'City Hospital Parking',
      address: 'Hanuman Complex, Koramangala',
      city: 'Ahmedabad',
      pricePerHour: 60,
      totalSpaces: 40,
      availableSpaces: 0,
      latitude: 23.0225,
      longitude: 72.5714,
    });
    const inactive = await createParkingLot(owner.token, {
      name: 'Hidden Office Lot',
      address: 'Electronic City',
      city: 'Bengaluru',
      pricePerHour: 50,
      totalSpaces: 50,
      availableSpaces: 20,
      status: 'INACTIVE',
    });
    return { mall, techPark, hospital, inactive };
  }

  it('searches by name case-insensitively', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ q: 'tEcH pArk' }).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Tech Park Visitor Parking');
  });

  it('searches by address', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ q: 'whitefield' }).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].address).toContain('Whitefield');
  });

  it('filters by city', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ city: 'Ahmedabad' }).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].city).toBe('Ahmedabad');
  });

  it('filters by maximum price', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ maxPrice: 40 }).expect(200);
    expect(res.body.data).toHaveLength(2);
    for (const lot of res.body.data) {
      expect(lot.pricePerHour).toBeLessThanOrEqual(40);
    }
  });

  it('filters by availability', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ availableOnly: 'true' }).expect(200);
    expect(res.body.data).toHaveLength(2);
    for (const lot of res.body.data) {
      expect(lot.availableSpaces).toBeGreaterThan(0);
    }
  });

  it('combines multiple filters', async () => {
    await seedBaseLots();
    const res = await request(app)
      .get('/api/parking-lots')
      .query({ city: 'Bengaluru', maxPrice: 35, availableOnly: 'true' })
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Tech Park Visitor Parking');
  });

  it('excludes non-active lots (default and filtered)', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    await createParkingLot(owner.token, { name: 'Active Lot' });
    await createParkingLot(owner.token, { name: 'Hidden Lot', status: 'INACTIVE' });

    const res = await request(app).get('/api/parking-lots').query({ q: 'Lot' }).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Active Lot');
  });

  it('sorts by newest (default)', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    await createParkingLot(owner.token, { name: 'Older Lot' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await createParkingLot(owner.token, { name: 'Newer Lot' });

    const res = await request(app).get('/api/parking-lots').expect(200);
    expect(res.body.data[0].name).toBe('Newer Lot');
  });

  it('sorts by cheapest', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ sort: 'cheapest' }).expect(200);
    const prices = res.body.data.map((lot: { pricePerHour: number }) => lot.pricePerHour);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('sorts by most expensive', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').query({ sort: 'expensive' }).expect(200);
    const prices = res.body.data.map((lot: { pricePerHour: number }) => lot.pricePerHour);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it('sorts by nearest and attaches distance', async () => {
    await seedBaseLots();
    const res = await request(app)
      .get('/api/parking-lots')
      .query({ sort: 'nearest', lat: 12.9698, lng: 77.7499 })
      .expect(200);

    expect(res.body.data[0].name).toBe('Tech Park Visitor Parking');
    expect(res.body.data[0].distanceKm).toBeTypeOf('number');
    const [closest, ...others] = res.body.data;
    for (const lot of others) {
      expect(lot.distanceKm).toBeGreaterThanOrEqual(closest.distanceKm);
    }
  });

  it('rejects an invalid sort value', async () => {
    const res = await request(app).get('/api/parking-lots').query({ sort: 'random' }).expect(400);
    expect(res.body.message).toBe('Invalid filters');
  });

  it('rejects invalid maxPrice values', async () => {
    for (const maxPrice of ['-1', '0', 'abc']) {
      const res = await request(app).get('/api/parking-lots').query({ maxPrice }).expect(400);
      expect(res.body.message).toBe('Invalid filters');
    }
  });

  it('rejects an invalid availableOnly value', async () => {
    const res = await request(app).get('/api/parking-lots').query({ availableOnly: 'yes' }).expect(400);
    expect(res.body.message).toBe('Invalid filters');
  });

  it('rejects malformed numbers', async () => {
    const res = await request(app).get('/api/parking-lots').query({ lat: 'abc' }).expect(400);
    expect(res.body.message).toBe('Invalid filters');
  });

  it('requires lat and lng when sorting by nearest', async () => {
    await request(app).get('/api/parking-lots').query({ sort: 'nearest' }).expect(400);
    const missingLng = await request(app)
      .get('/api/parking-lots')
      .query({ sort: 'nearest', lat: 23.0225 })
      .expect(400);
    expect(missingLng.body.message).toBe('Invalid filters');
  });

  it('keeps default shape and public access', async () => {
    await seedBaseLots();
    const res = await request(app).get('/api/parking-lots').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});