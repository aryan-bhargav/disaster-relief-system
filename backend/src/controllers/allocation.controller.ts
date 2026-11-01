import { Request, Response } from "express";
import mongoose from "mongoose";
import Allocation, { AllocationStatus } from "../models/Allocation.js";
import { AuthRequest } from "../middleware/authenticate.js";
import {
  createAllocation,
  updateAllocationStatus,
} from "../services/allocation.service.js";

const clientErrors: Record<string, { status: number; message: string }> = {
  INVALID_ID: { status: 400, message: "Invalid ID provided" },
  INVALID_QUANTITY: { status: 400, message: "Quantity must be a positive whole number" },
  REQUEST_NOT_FOUND: { status: 404, message: "Relief request not found" },
  RESOURCE_NOT_FOUND: { status: 404, message: "Resource not found" },
  REQUEST_NOT_ALLOCATABLE: { status: 409, message: "This request cannot be allocated in its current state" },
  REQUEST_ALREADY_FULFILLED: { status: 409, message: "This request has already been fully allocated" },
  QUANTITY_EXCEEDS_REMAINING: { status: 400, message: "Quantity exceeds remaining amount needed for this request" },
  CONCURRENT_ALLOCATION_CONFLICT: { status: 409, message: "Allocation conflict due to concurrent activity. Please retry." },
  CATEGORY_MISMATCH: { status: 400, message: "Resource category does not match request category" },
  UNIT_MISMATCH: { status: 400, message: "Resource unit does not match request unit" },
  CENTRE_MISMATCH: { status: 400, message: "Resource belongs to a different assigned centre" },
  CENTRE_INACTIVE: { status: 409, message: "Resource centre is inactive" },
  INSUFFICIENT_STOCK: { status: 409, message: "Insufficient available stock" },
  ALLOCATION_NOT_FOUND: { status: 404, message: "Allocation not found" },
  INVALID_TARGET_STATUS: { status: 400, message: "Invalid target status provided" },
  INVALID_STATUS_TRANSITION: { status: 400, message: "Invalid allocation status transition" },
};

export async function allocateResource(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const { requestId, resourceId, quantity } = req.body;

    if (
      typeof requestId !== "string" ||
      typeof resourceId !== "string" ||
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      res.status(400).json({
        success: false,
        message: "Valid requestId, resourceId and positive whole-number quantity are required",
      });
      return;
    }

    if (!authReq.user?.id) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const allocation = await createAllocation({
      requestId,
      resourceId,
      quantity,
      allocatedBy: authReq.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Resource allocated successfully",
      data: allocation,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const clientError = clientErrors[code];

    if (clientError) {
      res.status(clientError.status).json({
        success: false,
        message: clientError.message,
      });
      return;
    }

    console.error("Allocation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to allocate resource",
    });
  }
}

export async function updateAllocationStatusHandler(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid allocation ID",
      });
      return;
    }

    if (
      typeof status !== "string" ||
      !["allocated", "dispatched", "delivered", "cancelled"].includes(status)
    ) {
      res.status(400).json({
        success: false,
        message: "Valid status (allocated, dispatched, delivered, cancelled) is required",
      });
      return;
    }

    const allocation = await updateAllocationStatus(
      id,
      status as AllocationStatus
    );

    res.json({
      success: true,
      message: `Allocation status updated to ${status}`,
      data: allocation,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const clientError = clientErrors[code];

    if (clientError) {
      res.status(clientError.status).json({
        success: false,
        message: clientError.message,
      });
      return;
    }

    console.error("Update allocation status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update allocation status",
    });
  }
}

export async function getAllocations(req: Request, res: Response) {
  try {
    const filter: Record<string, unknown> = {};

    for (const field of ["request", "resource", "centre"] as const) {
      const value = req.query[field];

      if (typeof value === "string") {
        if (!mongoose.isValidObjectId(value)) {
          res.status(400).json({
            success: false,
            message: `Invalid ${field} ID`,
          });
          return;
        }

        filter[field] = value;
      }
    }

    const allocations = await Allocation.find(filter)
      .populate("request")
      .populate("resource")
      .populate("centre")
      .populate("allocatedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: allocations.length,
      data: allocations,
    });
  } catch (error) {
    console.error("Fetch allocations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch allocations",
    });
  }
}
