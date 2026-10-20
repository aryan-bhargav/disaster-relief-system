
import { Request, Response } from "express";
import mongoose from "mongoose";
import ReliefCentre from "../models/ReliefCentre";

export async function getCentres(_req: Request, res: Response) {
  try {
    const centres = await ReliefCentre.find().sort({ createdAt: -1 });
    res.json({ success: true, count: centres.length, data: centres });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch centres" });
  }
}

export async function getCentreById(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid centre ID" });
      return;
    }

    const centre = await ReliefCentre.findById(req.params.id);

    if (!centre) {
      res.status(404).json({ success: false, message: "Centre not found" });
      return;
    }

    res.json({ success: true, data: centre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch centre" });
  }
}

export async function createCentre(req: Request, res: Response) {
  try {
    const { name, address, location, contactNumber } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof address !== "string" ||
      !address.trim() ||
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number" ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lng) ||
      location.lat < -90 ||
      location.lat > 90 ||
      location.lng < -180 ||
      location.lng > 180
    ) {
      res.status(400).json({
        success: false,
        message: "Name, address and valid numeric latitude/longitude are required",
      });
      return;
    }

    const centre = await ReliefCentre.create({
      name: name.trim(),
      address: address.trim(),
      location: { lat: location.lat, lng: location.lng },
      contactNumber:
        typeof contactNumber === "string" ? contactNumber.trim() : undefined,
    });

    res.status(201).json({ success: true, data: centre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create centre" });
  }
}

export async function updateCentre(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid centre ID" });
      return;
    }

    const { name, address, location, contactNumber, isActive } = req.body;
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ success: false, message: "Invalid name" });
        return;
      }
      updates.name = name.trim();
    }

    if (address !== undefined) {
      if (typeof address !== "string" || !address.trim()) {
        res.status(400).json({ success: false, message: "Invalid address" });
        return;
      }
      updates.address = address.trim();
    }

    if (location !== undefined) {
      if (
        !location ||
        typeof location.lat !== "number" ||
        typeof location.lng !== "number" ||
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng) ||
        location.lat < -90 ||
        location.lat > 90 ||
        location.lng < -180 ||
        location.lng > 180
      ) {
        res.status(400).json({ success: false, message: "Invalid coordinates" });
        return;
      }
      updates.location = { lat: location.lat, lng: location.lng };
    }

    if (contactNumber !== undefined) {
      if (typeof contactNumber !== "string") {
        res.status(400).json({ success: false, message: "Invalid contact number" });
        return;
      }
      updates.contactNumber = contactNumber.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        res.status(400).json({ success: false, message: "isActive must be boolean" });
        return;
      }
      updates.isActive = isActive;
    }

    const centre = await ReliefCentre.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!centre) {
      res.status(404).json({ success: false, message: "Centre not found" });
      return;
    }

    res.json({ success: true, data: centre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update centre" });
  }
}

export async function deleteCentre(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid centre ID" });
      return;
    }

    // Soft-delete: preserve historical references and allocations.
    const centre = await ReliefCentre.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!centre) {
      res.status(404).json({ success: false, message: "Centre not found" });
      return;
    }

    res.json({ success: true, message: "Centre deactivated", data: centre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to deactivate centre" });
  }
}
