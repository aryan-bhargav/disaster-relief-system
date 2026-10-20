
import { Router } from "express";
import {
  allocateResource,
  getAllocations,
} from "../controllers/allocation.controller.js";
import {
  authenticate,
  authorize,
} from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("admin", "coordinator"),
  getAllocations
);

router.post(
  "/",
  authorize("admin", "coordinator"),
  allocateResource
);

export default router;
