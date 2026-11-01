export type ResourceCategory =
  | "food"
  | "water"
  | "medical"
  | "shelter"
  | "clothing"
  | "other";

export type ResourceUnit =
  | "litres"
  | "kg"
  | "packets"
  | "boxes"
  | "units"
  | "kits";

export interface ResourceItem {
  _id: string;
  name: string;
  category: ResourceCategory | string;
  quantity: number;
  unit: ResourceUnit | string;
  centre: {
    _id: string;
    name: string;
    address?: string;
    isActive?: boolean;
  } | string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateResourcePayload {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  centre: string;
  notes?: string;
}

export interface UpdateResourcePayload {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  centre?: string;
  notes?: string;
}
