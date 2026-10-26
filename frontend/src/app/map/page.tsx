"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Navigation,
  Layers,
  Building2,
  AlertTriangle,
  RotateCcw,
  X,
  ExternalLink,
  ArrowRight,
  List,
  Map as MapIcon,
} from "lucide-react";
import {
  AppShell,
  Button,
  StatusBadge,
  PriorityBadge,
  Toast,
} from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";
import type { LocationItem } from "./ReliefMap";

// Dynamic import with ssr: false for Leaflet
const ReliefMap = dynamic(() => import("./ReliefMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--surface-muted)] text-[var(--text-muted)] text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <span>Loading geospatial map engine...</span>
      </div>
    </div>
  ),
});

interface CentreApi {
  _id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  contactNumber?: string;
  isActive: boolean;
}

interface RequestApi {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  quantityFulfilled?: number;
  unit: string;
  priority: "critical" | "high" | "medium" | "low" | string;
  status: string;
  location: { lat: number; lng: number };
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][]; // [lng, lat]
  };
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
}

export default function MapPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  // Raw data from API
  const [centres, setCentres] = useState<CentreApi[]>([]);
  const [requests, setRequests] = useState<RequestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Layer & filter controls
  const [showCentres, setShowCentres] = useState(true);
  const [showRequests, setShowRequests] = useState(true);
  const [showInactiveCentres, setShowInactiveCentres] = useState(false);
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Selection & Routing state
  const [selectedItem, setSelectedItem] = useState<LocationItem | null>(null);
  const [originItem, setOriginItem] = useState<LocationItem | null>(null);
  const [destinationItem, setDestinationItem] = useState<LocationItem | null>(null);

  const [routing, setRouting] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: string;
    durationMin: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Auth check
  useEffect(() => {
    const savedToken = sessionStorage.getItem("authToken");
    const savedUser = sessionStorage.getItem("authUser");

    if (!savedToken || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      setToken(savedToken);
      setUser(JSON.parse(savedUser) as AuthUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // Load locations from backend
  const loadLocations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");

    try {
      const [centreRes, reqRes] = await Promise.all([
        apiRequest<ApiResponse<CentreApi>>("/centres", { token }),
        apiRequest<ApiResponse<RequestApi>>("/requests", { token }),
      ]);

      setCentres(centreRes.data || []);
      setRequests(reqRes.data || []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load spatial location data."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  // Handle URL query parameters (e.g. ?centreId=... or ?requestId=...)
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    const params = new URLSearchParams(window.location.search);
    const targetCentreId = params.get("centreId");
    const targetRequestId = params.get("requestId");

    if (targetCentreId) {
      const match = centres.find((c) => c._id === targetCentreId);
      if (match && match.location) {
        setSelectedItem({
          id: match._id,
          name: match.name,
          type: "centre",
          lat: match.location.lat,
          lng: match.location.lng,
          details: match.address,
          status: match.isActive ? "active" : "inactive",
          isActive: match.isActive,
        });
      }
    } else if (targetRequestId) {
      const match = requests.find((r) => r._id === targetRequestId);
      if (match && match.location) {
        setSelectedItem({
          id: match._id,
          name: match.title,
          type: "request",
          lat: match.location.lat,
          lng: match.location.lng,
          details: `${match.quantityNeeded} ${match.unit} (${match.category})`,
          status: match.status,
          priority: match.priority,
          category: match.category,
          quantityNeeded: match.quantityNeeded,
          unit: match.unit,
        });
      }
    }
  }, [loading, centres, requests]);

  // Compute valid location items and excluded items count
  const { validItems, excludedCount } = useMemo(() => {
    let excluded = 0;
    const items: LocationItem[] = [];

    // Process centres
    centres.forEach((c) => {
      if (!showCentres) return;
      if (!c.isActive && !showInactiveCentres) return;

      const hasValidCoords =
        c.location &&
        typeof c.location.lat === "number" &&
        typeof c.location.lng === "number" &&
        Number.isFinite(c.location.lat) &&
        Number.isFinite(c.location.lng) &&
        c.location.lat >= -90 &&
        c.location.lat <= 90 &&
        c.location.lng >= -180 &&
        c.location.lng <= 180;

      if (hasValidCoords) {
        items.push({
          id: c._id,
          name: c.name,
          type: "centre",
          lat: c.location.lat,
          lng: c.location.lng,
          details: c.address,
          status: c.isActive ? "active" : "inactive",
          isActive: c.isActive,
        });
      } else {
        excluded++;
      }
    });

    // Process requests
    requests.forEach((r) => {
      if (!showRequests) return;
      // Do not plot cancelled or fully delivered requests on operations map
      if (r.status === "cancelled" || r.status === "delivered") return;

      if (requestPriorityFilter !== "all" && r.priority !== requestPriorityFilter) {
        return;
      }

      const hasValidCoords =
        r.location &&
        typeof r.location.lat === "number" &&
        typeof r.location.lng === "number" &&
        Number.isFinite(r.location.lat) &&
        Number.isFinite(r.location.lng) &&
        r.location.lat >= -90 &&
        r.location.lat <= 90 &&
        r.location.lng >= -180 &&
        r.location.lng <= 180;

      if (hasValidCoords) {
        items.push({
          id: r._id,
          name: r.title,
          type: "request",
          lat: r.location.lat,
          lng: r.location.lng,
          details: `${r.quantityNeeded} ${r.unit} (${r.category})`,
          status: r.status,
          priority: r.priority,
          category: r.category,
          quantityNeeded: r.quantityNeeded,
          unit: r.unit,
        });
      } else {
        excluded++;
      }
    });

    return { validItems: items, excludedCount: excluded };
  }, [centres, requests, showCentres, showRequests, showInactiveCentres, requestPriorityFilter]);

  // Calculate real road route using OSRM
  async function calculateRoute() {
    if (!originItem || !destinationItem) {
      setRouteError("Select both an origin (A) and a destination (B).");
      return;
    }

    if (originItem.id === destinationItem.id) {
      setRouteError("Origin and destination must be distinct physical locations.");
      return;
    }

    setRouting(true);
    setRouteError("");
    setRouteInfo(null);
    setRouteCoordinates(null);

    try {
      // OSRM coordinates query format: {lng},{lat};{lng},{lat}
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originItem.lng},${originItem.lat};${destinationItem.lng},${destinationItem.lat}?overview=full&geometries=geojson`;

      const response = await fetch(osrmUrl);
      if (!response.ok) {
        throw new Error(`Routing service returned HTTP status ${response.status}`);
      }

      const data = (await response.json()) as OsrmResponse;

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error(
          data.message || "No accessible road route found between coordinates."
        );
      }

      const route = data.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.max(1, Math.round(route.duration / 60));

      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      const leafletCoords: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );

      setRouteInfo({ distanceKm, durationMin });
      setRouteCoordinates(leafletCoords);
      setToastMessage({
        text: `Route calculated: ${distanceKm} km (${durationMin} min).`,
        type: "success",
      });
    } catch (err) {
      setRouteError(
        err instanceof Error
          ? err.message
          : "Routing service is unavailable. Please verify network or retry."
      );
    } finally {
      setRouting(false);
    }
  }

  function clearRoute() {
    setRouteCoordinates(null);
    setRouteInfo(null);
    setRouteError("");
  }

  return (
    <AppShell user={user} fullBleed={true}>
      <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-[var(--canvas)]">
        {/* Left Tool Panel (360px wide, docked beside map) */}
        <aside className="w-full lg:w-[360px] h-[45vh] lg:h-full flex flex-col bg-white border-r border-[var(--border)] shrink-0 z-10 overflow-y-auto">
          {/* Panel Top Header */}
          <div className="p-4 border-b border-[var(--border)] bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-base font-semibold text-[var(--text)]">
                Operations map
              </h1>
              {/* View Mode Toggle (Map vs Accessible List) */}
              <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface-muted)] text-xs">
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    viewMode === "map"
                      ? "bg-white text-[var(--text)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  aria-pressed={viewMode === "map"}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Map
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    viewMode === "list"
                      ? "bg-white text-[var(--text)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  aria-pressed={viewMode === "list"}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Geospatial coordination & road routing via OSRM.
            </p>
          </div>

          <div className="p-4 space-y-5 text-sm flex-1">
            {/* Section 1: Layers & Filters */}
            <div className="space-y-3 pb-4 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Layers & Filters
              </span>

              {/* Relief Centres Toggle */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-[var(--text)] font-medium">
                  Relief centres ({centres.length})
                </span>
                <input
                  type="checkbox"
                  checked={showCentres}
                  onChange={(e) => setShowCentres(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-4 w-4"
                />
              </label>

              {/* Show Inactive Centres Checkbox */}
              {showCentres && (
                <label className="flex items-center justify-between text-xs text-[var(--text-muted)] pl-2 cursor-pointer select-none">
                  <span>Include inactive centres</span>
                  <input
                    type="checkbox"
                    checked={showInactiveCentres}
                    onChange={(e) => setShowInactiveCentres(e.target.checked)}
                    className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-3.5 w-3.5"
                  />
                </label>
              )}

              {/* Relief Requests Toggle */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-[var(--text)] font-medium">
                  Relief requests ({requests.length})
                </span>
                <input
                  type="checkbox"
                  checked={showRequests}
                  onChange={(e) => setShowRequests(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-4 w-4"
                />
              </label>

              {/* Request Priority Filter */}
              {showRequests && (
                <div className="pl-2">
                  <select
                    value={requestPriorityFilter}
                    onChange={(e) => setRequestPriorityFilter(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    aria-label="Filter requests by priority"
                  >
                    <option value="all">All priorities</option>
                    <option value="critical">Critical priority only</option>
                    <option value="high">High priority only</option>
                    <option value="medium">Medium priority only</option>
                    <option value="low">Low priority only</option>
                  </select>
                </div>
              )}

              {/* Excluded coordinates notice */}
              {excludedCount > 0 && (
                <p className="text-[11px] text-[var(--text-muted)] italic pt-1">
                  Note: {excludedCount} records have missing or invalid coordinates and are not plotted.
                </p>
              )}
            </div>

            {/* Section 2: Legend */}
            <div className="space-y-2 pb-4 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Legend
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-[#176B63] shrink-0" />
                  <span>Relief Centre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#B42318] shrink-0" />
                  <span>Critical request</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#B54708] shrink-0" />
                  <span>High request</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#026AA2] shrink-0" />
                  <span>Standard request</span>
                </div>
              </div>
            </div>

            {/* Section 3: Selected Location Card */}
            {selectedItem ? (
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {selectedItem.type === "centre" ? "Relief Centre" : "Relief Request"}
                    </span>
                    <h3 className="text-sm font-semibold text-[var(--text)] truncate">
                      {selectedItem.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 rounded text-[var(--text-muted)] hover:bg-neutral-200"
                    aria-label="Dismiss selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-[var(--text)]">
                  {selectedItem.details}
                </div>

                <div className="flex items-center gap-2">
                  {selectedItem.type === "centre" ? (
                    <StatusBadge status={selectedItem.status || "active"} />
                  ) : (
                    <>
                      {selectedItem.priority && (
                        <PriorityBadge
                          priority={selectedItem.priority as "critical" | "high" | "medium" | "low"}
                        />
                      )}
                      {selectedItem.status && (
                        <StatusBadge status={selectedItem.status} />
                      )}
                    </>
                  )}
                </div>

                <div className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                  Lat: {selectedItem.lat.toFixed(5)}, Lng: {selectedItem.lng.toFixed(5)}
                </div>

                {/* Routing Action Buttons */}
                <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => setOriginItem(selectedItem)}
                  >
                    Set Origin (A)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => setDestinationItem(selectedItem)}
                  >
                    Set Dest (B)
                  </Button>
                </div>

                {/* Link to record page */}
                <div className="pt-1 text-right">
                  <Link
                    href={selectedItem.type === "centre" ? "/centres" : "/requests"}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
                  >
                    Open detailed record
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
                Click any marker on the map to inspect location details and configure routing points.
              </div>
            )}

            {/* Section 4: Road Route Calculator (OSRM) */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-white space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" />
                Road Route Calculator
              </span>

              {/* Origin Display & Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)] font-medium">
                    Origin (A):
                  </span>
                  {originItem && (
                    <button
                      onClick={() => setOriginItem(null)}
                      className="text-[11px] text-[var(--danger)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <select
                  value={originItem?.id || ""}
                  onChange={(e) => {
                    const match = validItems.find((i) => i.id === e.target.value);
                    setOriginItem(match || null);
                  }}
                  className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Select Origin"
                >
                  <option value="">Choose origin point...</option>
                  {validItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.type === "centre" ? "Centre" : "Request"}] {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Display & Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)] font-medium">
                    Destination (B):
                  </span>
                  {destinationItem && (
                    <button
                      onClick={() => setDestinationItem(null)}
                      className="text-[11px] text-[var(--danger)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <select
                  value={destinationItem?.id || ""}
                  onChange={(e) => {
                    const match = validItems.find((i) => i.id === e.target.value);
                    setDestinationItem(match || null);
                  }}
                  className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Select Destination"
                >
                  <option value="">Choose destination point...</option>
                  {validItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.type === "centre" ? "Centre" : "Request"}] {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error block */}
              {routeError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg border border-[var(--danger)] bg-red-50 text-[var(--danger)] text-xs"
                >
                  {routeError}
                </div>
              )}

              {/* Route Results Metric Block */}
              {routeInfo && (
                <div className="p-3 rounded-lg border border-[var(--accent)]/30 bg-[#E8F3F1] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text)]">
                    <span className="font-semibold text-[var(--accent)]">
                      Road Route Calculated
                    </span>
                    <button
                      onClick={clearRoute}
                      className="text-[11px] text-[var(--text-muted)] hover:underline"
                    >
                      Clear path
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="p-2 rounded bg-white border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                        Distance
                      </span>
                      <p className="text-sm font-semibold tabular-nums text-[var(--text)]">
                        {routeInfo.distanceKm} km
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                        Est. Duration
                      </span>
                      <p className="text-sm font-semibold tabular-nums text-[var(--text)]">
                        {routeInfo.durationMin} min
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] text-center pt-0.5">
                    Real road network navigation provided by OSRM.
                  </p>
                </div>
              )}

              {/* Calculate Route Button */}
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => void calculateRoute()}
                disabled={!originItem || !destinationItem || routing}
                loading={routing}
              >
                <Navigation className="w-3.5 h-3.5 mr-1" />
                Calculate road route
              </Button>
            </div>
          </div>
        </aside>

        {/* Right Canvas / Work Area */}
        <section className="flex-1 h-[55vh] lg:h-full relative overflow-hidden bg-white">
          {viewMode === "map" ? (
            <div className="w-full h-full relative">
              <ReliefMap
                items={validItems}
                selectedItem={selectedItem}
                origin={originItem}
                destination={destinationItem}
                routeCoordinates={routeCoordinates}
                onSelectItem={(item) => setSelectedItem(item)}
                onSelectOrigin={(item) => setOriginItem(item)}
                onSelectDestination={(item) => setDestinationItem(item)}
              />
            </div>
          ) : (
            /* Accessible List View Table */
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text)]">
                      Plotted locations directory
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Accessible tabular representation of all active coordinates.
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    {validItems.length} locations
                  </span>
                </div>

                <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                        <th className="h-10 px-4">Type</th>
                        <th className="h-10 px-4">Location name</th>
                        <th className="h-10 px-4">Coordinates</th>
                        <th className="h-10 px-4">Status / Priority</th>
                        <th className="h-10 px-4 text-right">Routing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {validItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-[var(--surface-muted)] transition-colors h-12"
                        >
                          <td className="px-4">
                            <span className="capitalize text-xs font-medium text-[var(--text-muted)]">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 font-medium text-[var(--text)]">
                            {item.name}
                          </td>
                          <td className="px-4 font-mono text-xs tabular-nums text-[var(--text-muted)]">
                            {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                          </td>
                          <td className="px-4">
                            {item.type === "centre" ? (
                              <StatusBadge status={item.status || "active"} />
                            ) : (
                              item.priority && (
                                <PriorityBadge
                                  priority={item.priority as "critical" | "high" | "medium" | "low"}
                                />
                              )
                            )}
                          </td>
                          <td className="px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setOriginItem(item);
                                  setViewMode("map");
                                }}
                              >
                                Set A
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setDestinationItem(item);
                                  setViewMode("map");
                                }}
                              >
                                Set B
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </AppShell>
  );
}
