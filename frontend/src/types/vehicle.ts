export type VehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER';

export interface Vehicle {
  id: string;
  userId: string;
  registration: string;
  type: VehicleType;
  imageUrl: string;
  imagePublicId: string;
  make: string | null;
  model: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
