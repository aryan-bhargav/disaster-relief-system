import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Allow all authenticated users; field_user receives scoped metrics
router.get(
  "/stats",
  authenticate,
  getDashboardStats
);

export default router;
