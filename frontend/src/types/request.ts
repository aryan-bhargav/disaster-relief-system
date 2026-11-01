import type { GeoLocation } from "./common";

export type RequestPriority = "critical" | "high" | "medium" | "low";

export type RequestStatus =
  | "pending"
  | "partially_allocated"
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type RequestCategory =
  | "food"
  | "water"
  | "medical"
  | "shelter"
  | "clothing"
  | "other";

export interface ReliefRequestItem {
  _id: string;
  title: string;
  description: string;
  category: RequestCategory | string;
  quantityNeeded: number;
  quantityFulfilled: number;
  unit: string;
  priority: RequestPriority | string;
  status: RequestStatus | string;
  location: GeoLocation;
  assignedCentre?: {
    _id: string;
    name: string;
    address?: string;
  } | string;
  requestedBy?: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
  } | string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRequestPayload {
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  unit: string;
  priority?: RequestPriority;
  location: GeoLocation;
  assignedCentre?: string;
}
