
import { Request, Response } from "express";
import mongoose from "mongoose";
import ReliefRequest from "../models/ReliefRequest";
import { AuthRequest } from "../middleware/authenticate";
import ReliefCentre from "../models/ReliefCentre.js";

const categories = [
  "food",
  "water",
  "medicine",
  "clothing",
  "shelter",
  "other",
];

const priorities = ["low", "medium", "high", "critical"];
const statuses = [
  "pending",
  "allocated",
  "dispatched",
  "delivered",
  "cancelled",
];

function validCoordinates(location: any): boolean {
  return (
    location &&
    typeof location.lat === "number" &&
    typeof location.lng === "number" &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
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
      unit: unit.trim(),
      location,
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
      if (!statuses.includes(req.query.status)) {
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

    const { status, priority, assignedCentre } = req.body;
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (typeof status !== "string" || !statuses.includes(status)) {
        res.status(400).json({ success: false, message: "Invalid status" });
        return;
      }
      updates.status = status;
    }

    if (priority !== undefined) {
      if (typeof priority !== "string" || !priorities.includes(priority)) {
        res.status(400).json({ success: false, message: "Invalid priority" });
        return;
      }
      updates.priority = priority;
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

      updates.assignedCentre = assignedCentre;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields provided" });
      return;
    }

    const reliefRequest = await ReliefRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!reliefRequest) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    res.json({ success: true, message: "Request updated", data: reliefRequest });
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

    const reliefRequest = await ReliefRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        requestedBy: authReq.user?.id,
        status: "pending",
      },
      { $set: { status: "cancelled" } },
      { new: true, runValidators: true }
    );

    if (!reliefRequest) {
      res.status(404).json({
        success: false,
        message: "Pending request not found or you do not own it",
      });
      return;
    }

    res.json({ success: true, message: "Request cancelled", data: reliefRequest });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel request" });
  }
}
