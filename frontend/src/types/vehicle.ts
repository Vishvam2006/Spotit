export type VehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER';

/** Outcome of the latest AI document verification run against a vehicle. */
export type VehicleVerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';

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
  /** null until the vehicle has been through AI verification at least once. */
  verificationStatus: VehicleVerificationStatus | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
