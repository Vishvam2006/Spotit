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

export const parkingListQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    city: z.string().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    availableOnly: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    sort: z.enum(["newest", "cheapest", "expensive", "nearest"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sort !== "nearest") return;

    if (data.lat === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "lat is required when sorting by nearest",
      });
    }

    if (data.lng === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: "lng is required when sorting by nearest",
      });
    }
  });

export type CreateParkingInput = z.infer<typeof createParkingSchema>;
export type UpdateParkingInput = z.infer<typeof updateParkingSchema>;
export type ParkingListQuery = z.infer<typeof parkingListQuerySchema>;