
import mongoose, { Document, Schema, Types } from "mongoose";

export type ResourceCategory =
  | "food"
  | "water"
  | "medicine"
  | "clothing"
  | "shelter"
  | "other";

export interface IResource extends Document {
  name: string;
  category: ResourceCategory;
  unit: string;
  quantity: number;
  centre: Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["food", "water", "medicine", "clothing", "shelter", "other"],
      required: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    centre: {
      type: Schema.Types.ObjectId,
      ref: "ReliefCentre",
      required: true,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ centre: 1, category: 1 });

const Resource = mongoose.model<IResource>("Resource", resourceSchema);

export default Resource;
