import type { ParkingLot } from '../../types';

export type MarkerTone = 'plenty' | 'limited' | 'full' | 'inactive';

export function getMarkerTone(lot: ParkingLot): MarkerTone {
  if (lot.status !== 'ACTIVE') return 'inactive';
  if (lot.availableSpaces === 0) return 'full';
  if (lot.availableSpaces / lot.totalSpaces < 0.25) return 'limited';
  return 'plenty';
}

export const MARKER_COLORS: Record<MarkerTone, string> = {
  plenty: '#22C55E',
  limited: '#F59E0B',
  full: '#EF4444',
  inactive: '#64748B',
};
