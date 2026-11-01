import { Request, Response } from "express";
import mongoose from "mongoose";
import ReliefRequest, {
  RequestPriority,
  RequestStatus,
} from "../models/ReliefRequest.js";
import { AuthRequest } from "../middleware/authenticate.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Allocation from "../models/Allocation.js";
import Resource from "../models/Resource.js";

const categories = [
  "food",
  "water",
  "medicine",
  "clothing",
  "shelter",
  "other",
];

const priorities = ["low", "medium", "high", "critical"];
const statuses: RequestStatus[] = [
  "pending",
  "partially_allocated",
  "allocated",
  "dispatched",
  "delivered",
  "cancelled",
];

const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
  pending: ["partially_allocated", "allocated", "cancelled"],
  partially_allocated: ["allocated", "dispatched", "cancelled"],
  allocated: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function validCoordinates(
  location: unknown
): location is { lat: number; lng: number } {
  if (!location || typeof location !== "object") return false;
  const loc = location as { lat?: unknown; lng?: unknown };
  return (
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    loc.lat >= -90 &&
    loc.lat <= 90 &&
    loc.lng >= -180 &&
    loc.lng <= 180
  );
}

export async function createRequest(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const { title, description, category, quantityNeeded, unit, location } =
      req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150 ||
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 2000 ||
      typeof category !== "string" ||
      !categories.includes(category) ||
      typeof quantityNeeded !== "number" ||
      !Number.isSafeInteger(quantityNeeded) ||
      quantityNeeded < 1 ||
      typeof unit !== "string" ||
      !unit.trim() ||
      unit.trim().length > 40 ||
      !validCoordinates(location)
    ) {
      res.status(400).json({
        success: false,
        message: "Provide valid title, description, category, quantity, unit and coordinates",
      });
      return;
    }

    if (!authReq.user?.id) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const reliefRequest = await ReliefRequest.create({
      title: title.trim(),
      description: description.trim(),
      category,
      quantityNeeded,
      quantityFulfilled: 0,
      unit: unit.trim(),
      location: { lat: location.lat, lng: location.lng },
      requestedBy: authReq.user.id,
      priority: "medium",
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Relief request created",
      data: reliefRequest,
    });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ success: false, message: "Failed to create request" });
  }
}

export async function getRequests(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const filter: Record<string, unknown> = {};

    // Field users see only their own requests.
    if (authReq.user?.role === "field_user") {
      filter.requestedBy = authReq.user.id;
    }

    if (typeof req.query.status === "string") {
      if (!statuses.includes(req.query.status as RequestStatus)) {
        res.status(400).json({ success: false, message: "Invalid status filter" });
        return;
      }
      filter.status = req.query.status;
    }

    if (typeof req.query.priority === "string") {
      if (!priorities.includes(req.query.priority)) {
        res.status(400).json({ success: false, message: "Invalid priority filter" });
        return;
      }
      filter.priority = req.query.priority;
    }

    const requests = await ReliefRequest.find(filter)
      .populate("requestedBy", "name email")
      .populate("assignedCentre", "name address location")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
}

export async function getRequestById(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid request ID" });
      return;
    }

    const authReq = req as AuthRequest;
    const reliefRequest = await ReliefRequest.findById(req.params.id)
      .populate("requestedBy", "name email")
      .populate("assignedCentre", "name address location");

    if (!reliefRequest) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    if (
      authReq.user?.role === "field_user" &&
      String(reliefRequest.requestedBy._id) !== authReq.user.id
    ) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    res.json({ success: true, data: reliefRequest });
  } catch (error) {
    console.error("Get request error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch request" });
  }
}

export async function updateRequestStatus(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid request ID" });
      return;
    }

    const reliefRequest = await ReliefRequest.findById(req.params.id);

    if (!reliefRequest) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    const { status, priority, assignedCentre } = req.body;

    if (status === undefined && priority === undefined && assignedCentre === undefined) {
      res.status(400).json({ success: false, message: "No valid fields provided to update" });
      return;
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !statuses.includes(status as RequestStatus)) {
        res.status(400).json({ success: false, message: "Invalid status value" });
        return;
      }

      const target = status as RequestStatus;

      if (reliefRequest.status !== target) {
        if (reliefRequest.status === "delivered" || reliefRequest.status === "cancelled") {
          res.status(400).json({
            success: false,
            message: `Cannot change status of a request that is already ${reliefRequest.status}`,
          });
          return;
        }

        const allowed = allowedTransitions[reliefRequest.status] ?? [];
        if (!allowed.includes(target)) {
          res.status(400).json({
            success: false,
            message: `Invalid status transition from ${reliefRequest.status} to ${target}`,
          });
          return;
        }

        // If cancelling a request that has allocations, return allocated stock to resources
        if (target === "cancelled") {
          const activeAllocations = await Allocation.find({
            request: reliefRequest._id,
            status: { $in: ["allocated", "dispatched"] },
          });

          for (const alloc of activeAllocations) {
            await Resource.updateOne(
              { _id: alloc.resource },
              { $inc: { quantity: alloc.quantity } }
            );
            alloc.status = "cancelled";
            await alloc.save();
          }

          reliefRequest.quantityFulfilled = 0;
        }

        reliefRequest.status = target;
      }
    }

    if (priority !== undefined) {
      if (typeof priority !== "string" || !priorities.includes(priority)) {
        res.status(400).json({ success: false, message: "Invalid priority" });
        return;
      }
      reliefRequest.priority = priority as RequestPriority;
    }

    if (assignedCentre !== undefined) {
      if (
        typeof assignedCentre !== "string" ||
        !mongoose.isValidObjectId(assignedCentre)
      ) {
        res.status(400).json({ success: false, message: "Invalid centre ID" });
        return;
      }
      const centre = await ReliefCentre.findOne({
        _id: assignedCentre,
        isActive: true,
      });

      if (!centre) {
        res.status(400).json({ success: false, message: "Active centre not found" });
        return;
      }

      reliefRequest.assignedCentre = new mongoose.Types.ObjectId(assignedCentre);
    }

    await reliefRequest.save();

    const populated = await ReliefRequest.findById(reliefRequest._id)
      .populate("requestedBy", "name email")
      .populate("assignedCentre", "name address location");

    res.json({ success: true, message: "Request updated", data: populated });
  } catch (error) {
    console.error("Update request error:", error);
    res.status(500).json({ success: false, message: "Failed to update request" });
  }
}

export async function cancelOwnRequest(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid request ID" });
      return;
    }

    const authReq = req as AuthRequest;

    const reliefRequest = await ReliefRequest.findOne({
      _id: req.params.id,
      requestedBy: authReq.user?.id,
      status: "pending",
    });

    if (!reliefRequest) {
      res.status(404).json({
        success: false,
        message: "Pending request not found or you do not have permission to cancel it",
      });
      return;
    }

    reliefRequest.status = "cancelled";
    await reliefRequest.save();

    res.json({ success: true, message: "Request cancelled", data: reliefRequest });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel request" });
  }
}
