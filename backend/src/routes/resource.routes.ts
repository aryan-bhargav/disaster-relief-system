import { Router } from "express";
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", getResources);
router.get("/:id", getResourceById);

router.post("/", authorize("admin", "coordinator"), createResource);
router.patch("/:id", authorize("admin", "coordinator"), updateResource);
router.delete("/:id", authorize("admin", "coordinator"), deleteResource);

export default router;
