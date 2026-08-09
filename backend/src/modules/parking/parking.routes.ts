import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireOwner } from "../../middleware/requireOwner";
import {
  getMyParkings,
  getParkingLots,
  getParkingLot,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
} from "./parking.controller";

const router = Router();

router.get("/mine", authenticate, requireOwner, getMyParkings);

router.get("/", getParkingLots);
router.get("/:id", getParkingLot);

router.post("/", authenticate, createParkingLot);
router.patch("/:id", authenticate, updateParkingLot);
router.delete("/:id", authenticate, deleteParkingLot);

export default router;
