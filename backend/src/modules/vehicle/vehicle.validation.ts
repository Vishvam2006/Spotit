import { z } from 'zod';

export const vehicleTypeEnum = z.enum(['TWO_WHEELER', 'FOUR_WHEELER']);

export const VEHICLE_REGISTRATION_MAX = 20;
export const VEHICLE_REGISTRATION_MIN = 2;

const registrationSchema = z
  .string()
  .trim()
  .min(VEHICLE_REGISTRATION_MIN)
  .max(VEHICLE_REGISTRATION_MAX);

const imageUrlSchema = z.string().url();

const optionalDetail = z
  .string()
  .trim()
  .max(60)
  .transform((value) => (value === '' ? null : value))
  .nullable();

export const createVehicleSchema = z.object({
  registration: registrationSchema,
  type: vehicleTypeEnum,
  imageUrl: imageUrlSchema,
  imagePublicId: z.string().min(1),
  make: optionalDetail.optional(),
  model: optionalDetail.optional(),
  color: optionalDetail.optional(),
  isDefault: z.boolean().optional(),
});

export const updateVehicleSchema = z
  .object({
    registration: registrationSchema.optional(),
    type: vehicleTypeEnum.optional(),
    imageUrl: imageUrlSchema.optional(),
    imagePublicId: z.string().min(1).optional(),
    make: optionalDetail.optional(),
    model: optionalDetail.optional(),
    color: optionalDetail.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (data) =>
      (data.imageUrl === undefined) === (data.imagePublicId === undefined),
    { message: 'imageUrl and imagePublicId must be provided together', path: ['imageUrl'] },
  )
  .refine(
    (data) => data.registration !== undefined || data.type !== undefined || data.imageUrl !== undefined || data.make !== undefined || data.model !== undefined || data.color !== undefined || data.isDefault !== undefined,
    { message: 'At least one field is required', path: ['registration'] },
  );

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleType = z.infer<typeof vehicleTypeEnum>;
