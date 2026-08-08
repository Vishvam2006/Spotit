import { z } from "zod";

export const parkingLotStatusEnum = z.enum(["ACTIVE", "INACTIVE", "CLOSED"]);

const parkingBaseSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(2),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pricePerHour: z.number().min(0),
  totalSpaces: z.number().int().min(1),
  availableSpaces: z.number().int().min(0),
  status: parkingLotStatusEnum.optional(),
  imageUrl: z.string().optional(),
});

export const createParkingSchema = parkingBaseSchema.refine(
  (data) => data.availableSpaces <= data.totalSpaces,
  {
    message: "Available spaces cannot exceed total spaces",
    path: ["availableSpaces"],
  },
);

export const updateParkingSchema = parkingBaseSchema.partial().refine(
  (data) =>
    data.availableSpaces === undefined ||
    data.totalSpaces === undefined ||
    data.availableSpaces <= data.totalSpaces,
  {
    message: "Available spaces cannot exceed total spaces",
    path: ["availableSpaces"],
  },
);

export type CreateParkingInput = z.infer<typeof createParkingSchema>;
export type UpdateParkingInput = z.infer<typeof updateParkingSchema>;