import { Router } from "express";
import {
  listUsers,
  updateUserRole,
  toggleUserStatus,
} from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";

const router = Router();

// All user management routes strictly restricted to system administrators
router.use(authenticate, authorize("admin"));

router.get("/", listUsers);
router.patch("/:id/role", updateUserRole);
router.patch("/:id/status", toggleUserStatus);

export default router;
