
import { Request, Response } from "express";
import mongoose from "mongoose";
import Allocation from "../models/Allocation.js";
import { AuthRequest } from "../middleware/authenticate.js";
import { createAllocation } from "../services/allocation.service.js";

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

    const clientErrors: Record<string, { status: number; message: string }> = {
      INVALID_ID: { status: 400, message: "Invalid ID provided" },
      INVALID_QUANTITY: { status: 400, message: "Quantity must be a positive whole number" },
      REQUEST_NOT_FOUND: { status: 404, message: "Relief request not found" },
      RESOURCE_NOT_FOUND: { status: 404, message: "Resource not found" },
      REQUEST_NOT_ALLOCATABLE: { status: 409, message: "This request cannot be allocated" },
      CATEGORY_MISMATCH: { status: 400, message: "Resource category does not match request" },
      UNIT_MISMATCH: { status: 400, message: "Resource unit does not match request unit" },
      CENTRE_MISMATCH: { status: 400, message: "Resource belongs to a different assigned centre" },
      CENTRE_INACTIVE: { status: 409, message: "Resource centre is inactive" },
      INSUFFICIENT_STOCK: { status: 409, message: "Insufficient available stock" },
    };

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
