import type { GeoLocation } from "./common";

export interface ReliefCentreItem {
  _id: string;
  name: string;
  address: string;
  location: GeoLocation;
  contactNumber?: string;
  capacity?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCentrePayload {
  name: string;
  address: string;
  location: GeoLocation;
  contactNumber?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateCentrePayload {
  name?: string;
  address?: string;
  location?: GeoLocation;
  contactNumber?: string;
  capacity?: number;
  isActive?: boolean;
  notes?: string;
}
