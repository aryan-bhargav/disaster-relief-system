export type AllocationStatus =
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface AllocationItem {
  _id: string;
  requestId: {
    _id: string;
    title: string;
    category?: string;
    quantityNeeded?: number;
    quantityFulfilled?: number;
    unit?: string;
    priority?: string;
    status?: string;
    location?: { lat: number; lng: number };
  } | string;
  resourceId: {
    _id: string;
    name: string;
    category?: string;
    unit?: string;
    quantity?: number;
  } | string;
  centreId: {
    _id: string;
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
  } | string;
  quantity: number;
  status: AllocationStatus;
  allocatedBy?: {
    _id: string;
    name: string;
    email?: string;
  } | string;
  dispatchedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAllocationPayload {
  requestId: string;
  resourceId: string;
  quantity: number;
}
