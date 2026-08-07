import { z } from "zod";

const parkingBaseSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  totalSlots: z.number().int().positive(),
  availableSlots: z.number().int().min(0),
  pricePerHour: z.number().min(0),
  isActive: z.boolean().optional(),
});

export const createParkingSchema = parkingBaseSchema.refine(
  (data) => data.availableSlots <= data.totalSlots,
  {
    message: "Available slots cannot exceed total slots",
    path: ["availableSlots"],
  },
);

export const updateParkingSchema = parkingBaseSchema.partial().refine(
  (data) =>
    data.availableSlots === undefined ||
    data.totalSlots === undefined ||
    data.availableSlots <= data.totalSlots,
  {
    message: "Available slots cannot exceed total slots",
    path: ["availableSlots"],
  },
);

export type CreateParkingInput = z.infer<typeof createParkingSchema>;
export type UpdateParkingInput = z.infer<typeof updateParkingSchema>;
