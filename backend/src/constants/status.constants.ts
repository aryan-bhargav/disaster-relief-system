export const REQUEST_STATUS = {
  PENDING: "pending",
  PARTIALLY_ALLOCATED: "partially_allocated",
  ALLOCATED: "allocated",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const ALLOCATION_STATUS = {
  ALLOCATED: "allocated",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const PRIORITY_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;
