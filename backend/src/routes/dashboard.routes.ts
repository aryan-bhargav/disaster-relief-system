import { Router } from "express";
import {
  getDashboardStats,
  getAnalyticsData,
} from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";

const router = Router();

// Allow all authenticated users; field_user receives scoped metrics
router.get("/stats", authenticate, getDashboardStats);

// Allow admin and coordinator to view comprehensive reports & analytics
router.get("/analytics", authenticate, authorize("admin", "coordinator"), getAnalyticsData);

export default router;
