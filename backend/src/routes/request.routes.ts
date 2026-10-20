
import { Router } from "express";
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  cancelOwnRequest,
} from "../controllers/request.controller";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.post("/", createRequest);
router.get("/", getRequests);
router.get("/:id", getRequestById);

router.patch(
  "/:id/status",
  authorize("admin", "coordinator"),
  updateRequestStatus
);

router.patch("/:id/cancel", cancelOwnRequest);

export default router;
