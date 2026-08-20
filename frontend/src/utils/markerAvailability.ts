import type { ParkingLot } from '../types/parking';

export type MarkerColor = 'green' | 'orange' | 'red' | 'gray';

export interface MarkerAvailability {
  color: MarkerColor;
  label: string;
}

export function getMarkerAvailability(parking: ParkingLot): MarkerAvailability {
  if (parking.status === 'UNDER_REVIEW') {
    return { color: 'gray', label: 'Under review' };
  }

  if (parking.status !== 'ACTIVE') {
    return { color: 'gray', label: 'Unavailable' };
  }

  if (parking.totalSpaces <= 0) {
    return { color: 'red', label: 'Full' };
  }

  const occupancy = parking.availableSpaces / parking.totalSpaces;

  if (parking.availableSpaces === 0) {
    return { color: 'red', label: 'Full' };
  }

  if (occupancy > 0.5) {
    return { color: 'green', label: 'Available' };
  }

  return { color: 'orange', label: 'Limited' };
}

export const MARKER_COLORS: Record<MarkerColor, string> = {
  green: '#16a34a',
  orange: '#f97316',
  red: '#dc2626',
  gray: '#64748b',
};