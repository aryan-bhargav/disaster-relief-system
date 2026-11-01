export const REQUEST_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const REQUEST_STATUSES = [
  "pending",
  "partially_allocated",
  "allocated",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export const ALLOCATION_STATUSES = [
  "allocated",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export const RESOURCE_CATEGORIES = [
  "food",
  "water",
  "medical",
  "shelter",
  "clothing",
  "other",
] as const;

export const RESOURCE_UNITS = [
  "litres",
  "kg",
  "packets",
  "boxes",
  "units",
  "kits",
  "pieces",
] as const;

export const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  partially_allocated: "Partially Allocated",
  allocated: "Allocated",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  active: "Active",
  inactive: "Inactive",
};
