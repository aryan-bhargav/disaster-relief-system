
import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import {
  authenticate,
  authorize,
} from "../middleware/authenticate.js";

const router = Router();

router.get(
  "/stats",
  authenticate,
  authorize("admin", "coordinator"),
  getDashboardStats
);

export default router;
