
import { Request, Response } from "express";
import mongoose from "mongoose";
import Resource from "../models/Resource";
import ReliefCentre from "../models/ReliefCentre";
import type { ResourceCategory } from "../models/Resource";

const categories: ResourceCategory[] = [
  "food",
  "water",
  "medicine",
  "clothing",
  "shelter",
  "other",
];

function isResourceCategory(value: unknown): value is ResourceCategory {
  return typeof value === "string" &&
    categories.includes(value as ResourceCategory);
}

export async function getResources(req: Request, res: Response) {
  try {
    const filter: Record<string, unknown> = {};

    if (typeof req.query.centre === "string") {
      if (!mongoose.isValidObjectId(req.query.centre)) {
        res.status(400).json({ success: false, message: "Invalid centre ID" });
        return;
      }
      filter.centre = req.query.centre;
    }

    if (typeof req.query.category === "string") {
      if (!isResourceCategory(req.query.category)) {
        res.status(400).json({ success: false, message: "Invalid category" });
        return;
      }
      filter.category = req.query.category;
    }

    const resources = await Resource.find(filter)
      .populate("centre", "name address location isActive")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: resources.length, data: resources });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch resources" });
  }
}

export async function getResourceById(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid resource ID" });
      return;
    }

    const resource = await Resource.findById(req.params.id)
      .populate("centre", "name address location isActive");

    if (!resource) {
      res.status(404).json({ success: false, message: "Resource not found" });
      return;
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch resource" });
  }
}

export async function createResource(req: Request, res: Response) {
  try {
    const { name, category, unit, quantity, centre } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !isResourceCategory(category) ||
      typeof unit !== "string" ||
      !unit.trim() ||
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      !Number.isSafeInteger(quantity) ||
      typeof centre !== "string" ||
      !mongoose.isValidObjectId(centre)
    ) {
      res.status(400).json({
        success: false,
        message: "Provide valid name, category, unit, non-negative whole-number quantity and centre ID",
      });
      return;
    }

    const existingCentre = await ReliefCentre.findOne({
      _id: centre,
      isActive: true,
    });

    if (!existingCentre) {
      res.status(400).json({
        success: false,
        message: "An active relief centre is required",
      });
      return;
    }

    const resource = await Resource.create({
      name: name.trim(),
      category,
      unit: unit.trim(),
      quantity,
      centre,
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create resource" });
  }
}

export async function updateResource(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid resource ID" });
      return;
    }

    const { name, category, unit, quantity, centre } = req.body;
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ success: false, message: "Invalid name" });
        return;
      }
      updates.name = name.trim();
    }

    if (category !== undefined) {
      if (!isResourceCategory(category)) {
        res.status(400).json({ success: false, message: "Invalid category" });
        return;
      }
      updates.category = category;
    }

    if (unit !== undefined) {
      if (typeof unit !== "string" || !unit.trim()) {
        res.status(400).json({ success: false, message: "Invalid unit" });
        return;
      }
      updates.unit = unit.trim();
    }

    if (quantity !== undefined) {
      if (
        typeof quantity !== "number" ||
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isSafeInteger(quantity)
      ) {
        res.status(400).json({ success: false, message: "Quantity must be a non-negative whole number" });
        return;
      }
      updates.quantity = quantity;
    }

    if (centre !== undefined) {
      if (typeof centre !== "string" || !mongoose.isValidObjectId(centre)) {
        res.status(400).json({ success: false, message: "Invalid centre ID" });
        return;
      }

      const existingCentre = await ReliefCentre.findOne({
        _id: centre,
        isActive: true,
      });

      if (!existingCentre) {
        res.status(400).json({ success: false, message: "An active relief centre is required" });
        return;
      }

      updates.centre = centre;
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("centre", "name address location isActive");

    if (!resource) {
      res.status(404).json({ success: false, message: "Resource not found" });
      return;
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update resource" });
  }
}

export async function deleteResource(req: Request, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid resource ID" });
      return;
    }

    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      res.status(404).json({ success: false, message: "Resource not found" });
      return;
    }

    res.json({ success: true, message: "Resource deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete resource" });
  }
}
