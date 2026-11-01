export interface LocationItem {
  id: string;
  name: string;
  type: "centre" | "request" | "custom";
  lat: number;
  lng: number;
  details: string;
  status?: string;
  priority?: "critical" | "high" | "medium" | "low" | string;
  category?: string;
  quantityNeeded?: number;
  unit?: string;
  isActive?: boolean;
}

export interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][]; // [lng, lat]
  };
}

export interface OsrmResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
}

export interface CalculatedRouteInfo {
  distanceKm: string;
  durationMin: number;
}
