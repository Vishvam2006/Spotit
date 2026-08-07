import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getParkingLots,
  getParkingLot,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
} from "./parking.controller";

const router = Router();

router.get("/", getParkingLots);
router.get("/:id", getParkingLot);

router.post("/", authenticate, createParkingLot);
router.patch("/:id", authenticate, updateParkingLot);
router.delete("/:id", authenticate, deleteParkingLot);

export default router;
