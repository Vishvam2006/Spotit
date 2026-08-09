import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getMyParkings,
  getParkingLots,
  getParkingLot,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
} from "./parking.controller";

const router = Router();

// Returns only the authenticated user's own lots, so any signed-in user
// who has created lots can view and manage them.
router.get("/mine", authenticate, getMyParkings);

router.get("/", getParkingLots);
router.get("/:id", getParkingLot);

router.post("/", authenticate, createParkingLot);
router.patch("/:id", authenticate, updateParkingLot);
router.delete("/:id", authenticate, deleteParkingLot);

export default router;
