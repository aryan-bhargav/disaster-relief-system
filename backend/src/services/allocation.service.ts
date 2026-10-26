import mongoose from "mongoose";
import Resource from "../models/Resource.js";
import ReliefRequest, { RequestStatus } from "../models/ReliefRequest.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Allocation, { AllocationStatus } from "../models/Allocation.js";

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

  if (["cancelled", "delivered", "allocated"].includes(reliefRequest.status)) {
    throw new Error("REQUEST_NOT_ALLOCATABLE");
  }

  const currentFulfilled = reliefRequest.quantityFulfilled ?? 0;
  const remainingNeeded = reliefRequest.quantityNeeded - currentFulfilled;

  if (remainingNeeded <= 0) {
    throw new Error("REQUEST_ALREADY_FULFILLED");
  }

  if (quantity > remainingNeeded) {
    throw new Error("QUANTITY_EXCEEDS_REMAINING");
  }

  const resource = await Resource.findById(resourceId);

  if (!resource) {
    throw new Error("RESOURCE_NOT_FOUND");
  }

  if (resource.category !== reliefRequest.category) {
    throw new Error("CATEGORY_MISMATCH");
  }

  if (resource.unit.trim().toLowerCase() !== reliefRequest.unit.trim().toLowerCase()) {
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

  // 1. Atomically deduct stock from Resource if sufficient inventory exists
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

  // 2. Atomically increment quantityFulfilled on ReliefRequest if not over-allocated
  const maxAllowedCurrent = reliefRequest.quantityNeeded - quantity;
  const requestUpdate = await ReliefRequest.updateOne(
    {
      _id: reliefRequest._id,
      status: { $in: ["pending", "partially_allocated"] },
      quantityFulfilled: { $lte: maxAllowedCurrent },
    },
    {
      $inc: { quantityFulfilled: quantity },
    }
  );

  if (requestUpdate.modifiedCount !== 1) {
    // Roll back resource stock deduction
    await Resource.updateOne({ _id: resource._id }, { $inc: { quantity } });
    throw new Error("CONCURRENT_ALLOCATION_CONFLICT");
  }

  // 3. Create allocation record and finalize request status
  let allocation;
  try {
    const newFulfilled = currentFulfilled + quantity;
    const isFullyAllocated = newFulfilled >= reliefRequest.quantityNeeded;
    const targetStatus: RequestStatus = isFullyAllocated
      ? "allocated"
      : "partially_allocated";

    await ReliefRequest.updateOne(
      { _id: reliefRequest._id },
      {
        $set: {
          status: targetStatus,
          assignedCentre: reliefRequest.assignedCentre ?? resource.centre,
        },
      }
    );

    allocation = await Allocation.create({
      request: reliefRequest._id,
      resource: resource._id,
      centre: resource.centre,
      quantity,
      allocatedBy,
      status: "allocated",
    });

    return allocation;
  } catch (error) {
    // Compensate both resource and request fulfillment
    await Resource.updateOne({ _id: resource._id }, { $inc: { quantity } });
    await ReliefRequest.updateOne(
      { _id: reliefRequest._id },
      { $inc: { quantityFulfilled: -quantity } }
    );

    if (allocation?._id) {
      await Allocation.deleteOne({ _id: allocation._id });
    }

    throw error;
  }
}

const validAllocationTransitions: Record<AllocationStatus, AllocationStatus[]> = {
  allocated: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export async function updateAllocationStatus(
  allocationId: string,
  targetStatus: AllocationStatus
) {
  if (!mongoose.isValidObjectId(allocationId)) {
    throw new Error("INVALID_ID");
  }

  const validStatuses: AllocationStatus[] = [
    "allocated",
    "dispatched",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(targetStatus)) {
    throw new Error("INVALID_TARGET_STATUS");
  }

  const allocation = await Allocation.findById(allocationId);

  if (!allocation) {
    throw new Error("ALLOCATION_NOT_FOUND");
  }

  if (allocation.status === targetStatus) {
    return allocation;
  }

  const allowed = validAllocationTransitions[allocation.status] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  if (targetStatus === "cancelled") {
    // 1. Return stock to Resource
    await Resource.updateOne(
      { _id: allocation.resource },
      { $inc: { quantity: allocation.quantity } }
    );

    // 2. Reduce fulfilled quantity on ReliefRequest
    const reliefRequest = await ReliefRequest.findById(allocation.request);
    if (reliefRequest) {
      const newFulfilled = Math.max(
        0,
        (reliefRequest.quantityFulfilled ?? 0) - allocation.quantity
      );
      reliefRequest.quantityFulfilled = newFulfilled;

      if (newFulfilled === 0) {
        reliefRequest.status = "pending";
      } else if (newFulfilled < reliefRequest.quantityNeeded) {
        reliefRequest.status = "partially_allocated";
      } else {
        reliefRequest.status = "allocated";
      }

      await reliefRequest.save();
    }

    allocation.status = "cancelled";
    await allocation.save();
    return allocation;
  }

  allocation.status = targetStatus;
  await allocation.save();

  // If dispatched or delivered, check if request status should progress
  const allRequestAllocations = await Allocation.find({
    request: allocation.request,
    status: { $ne: "cancelled" },
  });

  if (allRequestAllocations.length > 0) {
    const allDispatchedOrDelivered = allRequestAllocations.every(
      (a) => a.status === "dispatched" || a.status === "delivered"
    );
    const allDelivered = allRequestAllocations.every(
      (a) => a.status === "delivered"
    );

    const reliefRequest = await ReliefRequest.findById(allocation.request);
    if (reliefRequest && reliefRequest.status !== "cancelled") {
      if (allDelivered) {
        reliefRequest.status = "delivered";
        await reliefRequest.save();
      } else if (allDispatchedOrDelivered) {
        reliefRequest.status = "dispatched";
        await reliefRequest.save();
      }
    }
  }

  return allocation;
}
