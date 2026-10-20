
import mongoose from "mongoose";
import Resource from "../models/Resource.js";
import ReliefRequest from "../models/ReliefRequest.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Allocation from "../models/Allocation.js";

interface CreateAllocationInput {
  requestId: string;
  resourceId: string;
  quantity: number;
  allocatedBy: string;
}

export async function createAllocation(input: CreateAllocationInput) {
  const { requestId, resourceId, quantity, allocatedBy } = input;

  if (
    !mongoose.isValidObjectId(requestId) ||
    !mongoose.isValidObjectId(resourceId) ||
    !mongoose.isValidObjectId(allocatedBy)
  ) {
    throw new Error("INVALID_ID");
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("INVALID_QUANTITY");
  }

  const reliefRequest = await ReliefRequest.findById(requestId);

  if (!reliefRequest) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  if (["cancelled", "delivered"].includes(reliefRequest.status)) {
    throw new Error("REQUEST_NOT_ALLOCATABLE");
  }

  const resource = await Resource.findById(resourceId);

  if (!resource) {
    throw new Error("RESOURCE_NOT_FOUND");
  }

  if (resource.category !== reliefRequest.category) {
    throw new Error("CATEGORY_MISMATCH");
  }

  if (resource.unit.toLowerCase() !== reliefRequest.unit.toLowerCase()) {
    throw new Error("UNIT_MISMATCH");
  }

  if (
    reliefRequest.assignedCentre &&
    String(reliefRequest.assignedCentre) !== String(resource.centre)
  ) {
    throw new Error("CENTRE_MISMATCH");
  }

  const centre = await ReliefCentre.findOne({
    _id: resource.centre,
    isActive: true,
  });

  if (!centre) {
    throw new Error("CENTRE_INACTIVE");
  }

  // Atomic conditional update prevents concurrent requests from
  // allocating more stock than is available.
  const stockUpdate = await Resource.updateOne(
    {
      _id: resource._id,
      quantity: { $gte: quantity },
    },
    {
      $inc: { quantity: -quantity },
    }
  );

  if (stockUpdate.modifiedCount !== 1) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  let allocation;

  try {
    allocation = await Allocation.create({
      request: reliefRequest._id,
      resource: resource._id,
      centre: resource.centre,
      quantity,
      allocatedBy,
      status: "allocated",
    });

    // Assign the centre only if it hasn't already been assigned.
    if (!reliefRequest.assignedCentre) {
      reliefRequest.assignedCentre = resource.centre;
    }

    reliefRequest.status = "allocated";
    await reliefRequest.save();

    return allocation;
  } catch (error) {
    // Compensate if creating the allocation or updating the request fails.
    await Resource.updateOne(
      { _id: resource._id },
      { $inc: { quantity } }
    );

    if (allocation?._id) {
      await Allocation.deleteOne({ _id: allocation._id });
    }

    throw error;
  }
}
