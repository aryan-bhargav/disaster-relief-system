
import mongoose, { Document, Schema, Types } from "mongoose";

export type RequestPriority = "low" | "medium" | "high" | "critical";

export type RequestStatus =
  | "pending"
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface IReliefRequest extends Document {
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  unit: string;
  priority: RequestPriority;
  status: RequestStatus;
  location: {
    lat: number;
    lng: number;
  };
  requestedBy: Types.ObjectId;
  assignedCentre?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reliefRequestSchema = new Schema<IReliefRequest>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["food", "water", "medicine", "clothing", "shelter", "other"],
      required: true,
    },
    quantityNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "allocated", "dispatched", "delivered", "cancelled"],
      default: "pending",
      required: true,
    },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedCentre: {
      type: Schema.Types.ObjectId,
      ref: "ReliefCentre",
    },
  },
  { timestamps: true }
);

reliefRequestSchema.index({ status: 1, priority: 1, createdAt: 1 });

const ReliefRequest = mongoose.model<IReliefRequest>(
  "ReliefRequest",
  reliefRequestSchema
);

export default ReliefRequest;
