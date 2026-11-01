import { Router } from "express";
import {
  getCentres,
  getCentreById,
  createCentre,
  updateCentre,
  deleteCentre,
} from "../controllers/centre.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", getCentres);
router.get("/:id", getCentreById);

router.post("/", authorize("admin", "coordinator"), createCentre);
router.patch("/:id", authorize("admin", "coordinator"), updateCentre);
router.delete("/:id", authorize("admin"), deleteCentre);

export default router;
