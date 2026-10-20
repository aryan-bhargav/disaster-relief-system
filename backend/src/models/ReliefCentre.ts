
import mongoose, { Document, Schema } from "mongoose";

export interface IReliefCentre extends Document {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  contactNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reliefCentreSchema = new Schema<IReliefCentre>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ReliefCentre = mongoose.model<IReliefCentre>(
  "ReliefCentre",
  reliefCentreSchema
);

export default ReliefCentre;
