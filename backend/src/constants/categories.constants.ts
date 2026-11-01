export const RESOURCE_CATEGORIES = [
  "food",
  "water",
  "medical",
  "shelter",
  "clothing",
  "other",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_UNITS = [
  "litres",
  "kg",
  "packets",
  "boxes",
  "units",
  "kits",
  "pieces",
] as const;

export type ResourceUnit = (typeof RESOURCE_UNITS)[number];
