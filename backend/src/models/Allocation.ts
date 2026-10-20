
import mongoose, { Document, Schema, Types } from "mongoose";

export type AllocationStatus =
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface IAllocation extends Document {
  request: Types.ObjectId;
  resource: Types.ObjectId;
  centre: Types.ObjectId;
  quantity: number;
  status: AllocationStatus;
  allocatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IAllocation>(
  {
    request: {
      type: Schema.Types.ObjectId,
      ref: "ReliefRequest",
      required: true,
    },
    resource: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },
    centre: {
      type: Schema.Types.ObjectId,
      ref: "ReliefCentre",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["allocated", "dispatched", "delivered", "cancelled"],
      default: "allocated",
      required: true,
    },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

allocationSchema.index({ request: 1, status: 1 });
allocationSchema.index({ centre: 1, createdAt: -1 });

const Allocation = mongoose.model<IAllocation>(
  "Allocation",
  allocationSchema
);

export default Allocation;
