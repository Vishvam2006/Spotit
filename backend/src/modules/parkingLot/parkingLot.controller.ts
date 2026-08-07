import type { Request, Response } from 'express';

interface StubParkingLot {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  pricePerHour: number;
  totalSpaces: number;
  availableSpaces: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const stubOwnerId = '00000000-0000-0000-0000-000000000000';

const stubParkingLots: StubParkingLot[] = [
  {
    id: 'stub-central-mall-parking',
    ownerId: stubOwnerId,
    name: 'Central Mall Parking',
    description: 'Covered parking near the main entrance',
    address: 'MG Road, Ashok Nagar',
    city: 'Bengaluru',
    latitude: 12.9756,
    longitude: 77.6068,
    pricePerHour: 40,
    totalSpaces: 100,
    availableSpaces: 38,
    status: 'ACTIVE',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  {
    id: 'stub-tech-park-visitor-parking',
    ownerId: stubOwnerId,
    name: 'Tech Park Visitor Parking',
    description: 'Visitor parking near Gate 2',
    address: 'Whitefield Main Road',
    city: 'Bengaluru',
    latitude: 12.9698,
    longitude: 77.7499,
    pricePerHour: 30,
    totalSpaces: 60,
    availableSpaces: 12,
    status: 'ACTIVE',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  {
    id: 'stub-koramangala-street-parking',
    ownerId: stubOwnerId,
    name: 'Koramangala Street Parking',
    description: 'Open-air street-level parking',
    address: '80 Feet Road, Koramangala',
    city: 'Bengaluru',
    latitude: 12.9352,
    longitude: 77.6245,
    pricePerHour: 25,
    totalSpaces: 45,
    availableSpaces: 3,
    status: 'ACTIVE',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  {
    id: 'stub-indiranagar-metro-parking',
    ownerId: stubOwnerId,
    name: 'Indiranagar Metro Parking',
    description: 'Multilevel parking beside the metro station',
    address: '100 Feet Road, Indiranagar',
    city: 'Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    pricePerHour: 50,
    totalSpaces: 200,
    availableSpaces: 0,
    status: 'ACTIVE',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  {
    id: 'stub-hsr-layout-community-lot',
    ownerId: stubOwnerId,
    name: 'HSR Layout Community Lot',
    description: 'Community parking near Sector 2',
    address: '27th Main Road, HSR Layout',
    city: 'Bengaluru',
    latitude: 12.9121,
    longitude: 77.6446,
    pricePerHour: 20,
    totalSpaces: 80,
    availableSpaces: 61,
    status: 'ACTIVE',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  {
    id: 'stub-jayanagar-4th-block-lot',
    ownerId: stubOwnerId,
    name: 'Jayanagar 4th Block Lot',
    description: 'Underground parking under renovation',
    address: '4th Block, Jayanagar',
    city: 'Bengaluru',
    latitude: 12.925,
    longitude: 77.5938,
    pricePerHour: 35,
    totalSpaces: 120,
    availableSpaces: 0,
    status: 'INACTIVE',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  {
    id: 'stub-old-airport-road-lot',
    ownerId: stubOwnerId,
    name: 'Old Airport Road Lot',
    description: 'Temporarily closed due to construction',
    address: 'Old Airport Road, Domlur',
    city: 'Bengaluru',
    latitude: 12.9609,
    longitude: 77.6368,
    pricePerHour: 30,
    totalSpaces: 50,
    availableSpaces: 0,
    status: 'CLOSED',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
];

export function list(_req: Request, res: Response): void {
  res.json({ success: true, data: stubParkingLots });
}

export function getById(req: Request, res: Response): void {
  const parkingLot = stubParkingLots.find((lot) => lot.id === req.params.id);

  if (!parkingLot) {
    res.status(404).json({ success: false, message: 'Parking lot not found' });
    return;
  }

  res.json({ success: true, data: parkingLot });
}
