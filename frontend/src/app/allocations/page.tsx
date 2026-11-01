"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Share2,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  Download,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  Button,
  FormField,
  StatusBadge,
  PriorityBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  ConfirmDialog,
  Toast,
} from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types";

type Centre = {
  _id: string;
  name: string;
  address?: string;
  location?: { lat: number; lng: number };
  isActive?: boolean;
};

type Resource = {
  _id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  centre: Centre | string;
};

type ReliefRequest = {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  quantityFulfilled?: number;
  unit: string;
  priority: "critical" | "high" | "medium" | "low" | string;
  status: "pending" | "partially_allocated" | "allocated" | "delivered" | "cancelled" | string;
  location?: { lat: number; lng: number };
  assignedCentre?: Centre | string;
  createdAt?: string;
};

type Allocation = {
  _id: string;
  quantity: number;
  status: "allocated" | "dispatched" | "delivered" | "cancelled";
  request: ReliefRequest | string;
  resource: Resource | string;
  centre: Centre | string;
  allocatedBy?: { name?: string; email?: string } | string;
  createdAt: string;
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T[];
}

function getEntityName(
  val: string | { name?: string; title?: string; _id?: string } | undefined
): string {
  if (!val) return "—";
  if (typeof val === "string") return val;
  return val.name ?? val.title ?? "—";
}

function getEntityId(
  val: string | { _id: string } | undefined
): string | undefined {
  if (!val) return undefined;
  return typeof val === "string" ? val : val._id;
}

export default function AllocationsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Form selections
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // History filtering
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");

  // Status transition dialog
  const [transitionTarget, setTransitionTarget] = useState<{
    allocation: Allocation;
    nextStatus: "dispatched" | "delivered" | "cancelled";
  } | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Auth check & field-user role redirect
  useEffect(() => {
    const savedToken = sessionStorage.getItem("authToken");
    const savedUser = sessionStorage.getItem("authUser");

    if (!savedToken || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser) as AuthUser;
      setUser(parsedUser);

      if (parsedUser.role === "field_user") {
        router.replace("/requests");
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // Load requests, resources, allocations
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");

    try {
      const [requestsRes, resourcesRes, allocationsRes] = await Promise.all([
        apiRequest<ApiResponse<ReliefRequest>>("/requests", { token }),
        apiRequest<ApiResponse<Resource>>("/resources", { token }),
        apiRequest<ApiResponse<Allocation>>("/allocations", { token }),
      ]);

      setRequests(requestsRes.data || []);
      setResources(resourcesRes.data || []);
      setAllocations(allocationsRes.data || []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load allocation data."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Read URL query params on mount for pre-selected request
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const preReq = params.get("requestId");
      if (preReq) {
        setSelectedRequestId(preReq);
      }
    }
  }, []);

  // Filter eligible requests for allocation (pending or partially_allocated with remaining need > 0)
  const eligibleRequests = useMemo(() => {
    return requests
      .filter((req) => {
        const isEligibleStatus =
          req.status === "pending" || req.status === "partially_allocated";
        const needed = req.quantityNeeded - (req.quantityFulfilled ?? 0);
        return isEligibleStatus && needed > 0;
      })
      .sort((a, b) => {
        // Priority order: critical > high > medium > low
        const prioScore: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        const scoreDiff = (prioScore[b.priority] || 0) - (prioScore[a.priority] || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Then oldest first
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      });
  }, [requests]);

  const selectedRequest = useMemo(() => {
    return requests.find((r) => r._id === selectedRequestId);
  }, [requests, selectedRequestId]);

  const remainingNeeded = useMemo(() => {
    if (!selectedRequest) return 0;
    return Math.max(
      0,
      selectedRequest.quantityNeeded - (selectedRequest.quantityFulfilled ?? 0)
    );
  }, [selectedRequest]);

  // Filter compatible resources
  // Must: stock > 0, match category, match unit, active centre, match assignedCentre if set
  // Sorted by proximity to request location (nearest facility first)
  const compatibleResources = useMemo(() => {
    if (!selectedRequest) return [];

    const filtered = resources.filter((res) => {
      // Must have positive available quantity
      if (res.quantity <= 0) return false;

      // Category match
      if (res.category !== selectedRequest.category) return false;

      // Unit match (case-insensitive)
      if (res.unit.trim().toLowerCase() !== selectedRequest.unit.trim().toLowerCase()) {
        return false;
      }

      // Centre active check
      const centreObj = typeof res.centre === "object" ? res.centre : null;
      if (centreObj && centreObj.isActive === false) return false;

      // Assigned centre constraint if request is locked to a specific centre
      const assignedCentreId = getEntityId(selectedRequest.assignedCentre);
      if (assignedCentreId) {
        const resCentreId = getEntityId(res.centre);
        if (resCentreId !== assignedCentreId) return false;
      }

      return true;
    });

    // Proximity sorting: nearest facility first
    if (selectedRequest.location && typeof selectedRequest.location.lat === "number") {
      return [...filtered].sort((a, b) => {
        const centreA = typeof a.centre === "object" ? a.centre : null;
        const centreB = typeof b.centre === "object" ? b.centre : null;
        const distA = centreA?.location
          ? calculateDistanceKm(
              selectedRequest.location!.lat,
              selectedRequest.location!.lng,
              centreA.location.lat,
              centreA.location.lng
            )
          : 99999;
        const distB = centreB?.location
          ? calculateDistanceKm(
              selectedRequest.location!.lat,
              selectedRequest.location!.lng,
              centreB.location.lat,
              centreB.location.lng
            )
          : 99999;
        return distA - distB;
      });
    }

    return filtered;
  }, [selectedRequest, resources]);

  const selectedResource = useMemo(() => {
    return compatibleResources.find((r) => r._id === selectedResourceId);
  }, [compatibleResources, selectedResourceId]);

  // When request changes, reset resource and clamp quantity
  const handleRequestChange = (reqId: string) => {
    setSelectedRequestId(reqId);
    setSelectedResourceId("");
    setQuantityInput("1");
    setSubmitError("");
  };

  // When resource changes, default quantity to lesser of needed or stock
  const handleResourceChange = (resId: string) => {
    setSelectedResourceId(resId);
    setSubmitError("");
    const res = compatibleResources.find((r) => r._id === resId);
    if (res && remainingNeeded > 0) {
      const optimal = Math.min(remainingNeeded, res.quantity);
      setQuantityInput(String(Math.max(1, optimal)));
    }
  };

  const parsedQuantity = Number(quantityInput);
  const maxAvailableStock = selectedResource ? selectedResource.quantity : 0;
  const maxAllocatable = Math.min(remainingNeeded, maxAvailableStock);

  const isQuantityValid =
    Number.isSafeInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= maxAllocatable;

  const isFormValid =
    Boolean(selectedRequest) &&
    Boolean(selectedResource) &&
    isQuantityValid &&
    remainingNeeded > 0;

  // Total compatible stock across all facilities
  const totalCompatibleStock = useMemo(() => {
    return compatibleResources.reduce((sum, r) => sum + r.quantity, 0);
  }, [compatibleResources]);

  // Handle Create Allocation submit
  async function handleCreateAllocation(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!selectedRequest || !selectedResource) {
      setSubmitError("Please choose both an eligible request and a compatible resource.");
      return;
    }

    if (!isQuantityValid) {
      setSubmitError(
        `Quantity must be between 1 and ${maxAllocatable} ${selectedRequest.unit}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("/allocations", {
        method: "POST",
        token,
        body: {
          requestId: selectedRequest._id,
          resourceId: selectedResource._id,
          quantity: parsedQuantity,
        },
      });

      const remainingAfter = remainingNeeded - parsedQuantity;
      const outcomeText =
        remainingAfter <= 0
          ? `Allocation complete: ${selectedRequest.title} fully supplied with ${parsedQuantity} ${selectedRequest.unit}.`
          : `Partially allocated: ${parsedQuantity} ${selectedRequest.unit} assigned. ${remainingAfter} ${selectedRequest.unit} still needed.`;

      setToastMessage({
        text: outcomeText,
        type: "success",
      });

      // Reset form selection
      setSelectedResourceId("");
      setQuantityInput("1");
      if (remainingAfter <= 0) {
        setSelectedRequestId("");
      }

      await loadData();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create resource allocation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Lifecycle Status Transition (Dispatch / Mark Delivered / Cancel)
  async function confirmTransition() {
    if (!transitionTarget) return;
    setTransitioning(true);

    try {
      await apiRequest(`/allocations/${transitionTarget.allocation._id}/status`, {
        method: "PATCH",
        token,
        body: {
          status: transitionTarget.nextStatus,
        },
      });

      setToastMessage({
        text: `Allocation status updated to '${transitionTarget.nextStatus}'.`,
        type: "success",
      });

      setTransitionTarget(null);
      await loadData();
    } catch (err) {
      setToastMessage({
        text:
          err instanceof Error
            ? err.message
            : "Failed to update allocation lifecycle status.",
        type: "error",
      });
    } finally {
      setTransitioning(false);
    }
  }

  // Filtered allocation history
  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      if (historyStatusFilter !== "all" && item.status !== historyStatusFilter) {
        return false;
      }
      return true;
    });
  }, [allocations, historyStatusFilter]);

  function exportAllocationsCSV() {
    if (filteredAllocations.length === 0) return;
    const headers = ["Relief Request", "Resource Item", "Storage Facility", "Quantity", "Status", "Date"];
    const rows = filteredAllocations.map((a) => [
      `"${getEntityName(a.request).replace(/"/g, '""')}"`,
      `"${getEntityName(a.resource).replace(/"/g, '""')}"`,
      `"${getEntityName(a.centre).replace(/"/g, '""')}"`,
      a.quantity,
      a.status,
      a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reliefops_allocations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage({ text: "Allocation history exported as CSV file.", type: "success" });
  }

  return (
    <AppShell user={user}>
      <div className="max-w-[1440px] mx-auto pb-12">
        {/* Page Header */}
        <PageHeader
          title="Allocations"
          description="Assign available stock to open requests."
          breadcrumb={
            <span>
              Dashboard / <span className="text-[var(--text)]">Allocations</span>
            </span>
          }
        />

        {/* Work Area: 7/5 Grid Split on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column (7 cols): Create Allocation Form */}
          <div className="lg:col-span-7 bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Create allocation
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Follow the numbered steps to assign available inventory.
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
                {eligibleRequests.length} open requests
              </span>
            </div>

            {submitError && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-lg border border-[var(--danger)] bg-red-50 text-[var(--danger)] text-xs flex items-center gap-2"
              >
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAllocation} className="space-y-5">
              {/* Step 1: Select Request */}
              <FormField
                id="alloc-request"
                label="1. Select open relief request"
                required
                helperText="Only pending or partially allocated requests with unsatisfied needs are shown"
              >
                <select
                  id="alloc-request"
                  value={selectedRequestId}
                  onChange={(e) => handleRequestChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="">Choose an open request...</option>
                  {eligibleRequests.map((req) => {
                    const remaining =
                      req.quantityNeeded - (req.quantityFulfilled ?? 0);
                    return (
                      <option key={req._id} value={req._id}>
                        [{req.priority.toUpperCase()}] {req.title} — Need: {remaining} {req.unit} ({req.category})
                      </option>
                    );
                  })}
                </select>
              </FormField>

              {/* Step 2: Select Compatible Resource */}
              <FormField
                id="alloc-resource"
                label="2. Select compatible inventory stock"
                required
                helperText={
                  selectedRequest
                    ? `Matching category: ${selectedRequest.category} · unit: ${selectedRequest.unit}`
                    : "Select a request above to filter compatible stock"
                }
              >
                <select
                  id="alloc-resource"
                  disabled={!selectedRequest || compatibleResources.length === 0}
                  value={selectedResourceId}
                  onChange={(e) => handleResourceChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] disabled:bg-neutral-100 disabled:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="">
                    {!selectedRequest
                      ? "Select a request first"
                      : compatibleResources.length === 0
                      ? "No compatible stock available"
                      : "Choose available resource..."}
                  </option>
                  {compatibleResources.map((res) => {
                    const centreObj = typeof res.centre === "object" ? res.centre : null;
                    const centreName = getEntityName(res.centre);
                    let distanceLabel = "";
                    if (selectedRequest?.location && centreObj?.location) {
                      const d = calculateDistanceKm(
                        selectedRequest.location.lat,
                        selectedRequest.location.lng,
                        centreObj.location.lat,
                        centreObj.location.lng
                      );
                      distanceLabel = ` [~${d} km away]`;
                    }
                    return (
                      <option key={res._id} value={res._id}>
                        {res.name} — {res.quantity.toLocaleString()} {res.unit} at {centreName}{distanceLabel}
                      </option>
                    );
                  })}
                </select>
              </FormField>

              {/* Empty notice if request selected but zero compatible stock */}
              {selectedRequest && compatibleResources.length === 0 && (
                <div
                  role="status"
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-2"
                >
                  <span>
                    No compatible stock available for this request ({selectedRequest.category}, {selectedRequest.unit}). Please restock inventory at an active facility.
                  </span>
                </div>
              )}

              {/* Step 3: Quantity to Allocate */}
              <FormField
                id="alloc-qty"
                label="3. Quantity to allocate"
                required
                helperText={
                  selectedRequest && selectedResource
                    ? `Remaining need: ${remainingNeeded} ${selectedRequest.unit} · Available at centre: ${selectedResource.quantity} ${selectedResource.unit}`
                    : "Specify the unit count to dispatch"
                }
              >
                <input
                  id="alloc-qty"
                  type="number"
                  required
                  min="1"
                  max={maxAllocatable > 0 ? maxAllocatable : undefined}
                  step="1"
                  disabled={!selectedResource}
                  value={quantityInput}
                  onChange={(e) => {
                    setQuantityInput(e.target.value);
                    setSubmitError("");
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] tabular-nums disabled:bg-neutral-100 disabled:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </FormField>

              {/* Step 4: Confirmation Summary Box */}
              {isFormValid && selectedRequest && selectedResource && (
                <div className="p-4 rounded-xl border border-[var(--accent)]/30 bg-[#E8F3F1] text-xs text-[var(--text)] space-y-1.5">
                  <div className="font-semibold text-[var(--accent)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Allocation plan confirmed
                  </div>
                  <p>
                    Allocate{" "}
                    <strong className="tabular-nums font-semibold">
                      {parsedQuantity} {selectedResource.unit}
                    </strong>{" "}
                    of <em>{selectedResource.name}</em> from{" "}
                    <strong>{getEntityName(selectedResource.centre)}</strong> to{" "}
                    <strong>&ldquo;{selectedRequest.title}&rdquo;</strong>.
                  </p>
                  <p className="text-[var(--text-muted)] text-[11px]">
                    Remaining need after allocation:{" "}
                    <span className="font-semibold tabular-nums">
                      {Math.max(0, remainingNeeded - parsedQuantity)}{" "}
                      {selectedRequest.unit}
                    </span>
                    {remainingNeeded - parsedQuantity <= 0
                      ? " (Request will be fully fulfilled)"
                      : " (Request will remain partially open)"}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={!isFormValid || submitting}
                  loading={submitting}
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Allocate resources
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column (5 cols): Context Panel */}
          <div className="lg:col-span-5 bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
              <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--text-muted)]" />
                Allocation context
              </h3>
              {selectedRequest && (
                <PriorityBadge
                  priority={selectedRequest.priority as "critical" | "high" | "medium" | "low"}
                />
              )}
            </div>

            {selectedRequest ? (
              <div className="space-y-5 text-sm flex-1">
                {/* Request Header */}
                <div>
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Target request
                  </span>
                  <p className="font-semibold text-[var(--text)] mt-0.5 text-base">
                    {selectedRequest.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                    {selectedRequest.description}
                  </p>
                </div>

                {/* Progress / Fulfillment Bar */}
                <div className="p-3.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Fulfillment progress</span>
                    <span className="font-semibold tabular-nums text-[var(--text)]">
                      {(selectedRequest.quantityFulfilled ?? 0).toLocaleString()} /{" "}
                      {selectedRequest.quantityNeeded.toLocaleString()} {selectedRequest.unit}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((selectedRequest.quantityFulfilled ?? 0) /
                              selectedRequest.quantityNeeded) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Remaining need</span>
                    <span className="font-semibold tabular-nums text-[var(--accent)]">
                      {remainingNeeded.toLocaleString()} {selectedRequest.unit}
                    </span>
                  </div>
                </div>

                {/* Compatible Stock Summary */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                      Compatible stock across facilities
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-[var(--text)]">
                      {totalCompatibleStock.toLocaleString()} {selectedRequest.unit} total
                    </span>
                  </div>

                  {compatibleResources.length === 0 ? (
                    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-center text-xs text-[var(--text-muted)]">
                      No matching supplies in stock.
                    </div>
                  ) : (
                    <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] max-h-48 overflow-y-auto text-xs">
                      {compatibleResources.map((res) => (
                        <div
                          key={res._id}
                          className={`p-2.5 flex items-center justify-between ${
                            res._id === selectedResourceId
                              ? "bg-[#E8F3F1] font-medium"
                              : "hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          <div>
                            <p className="text-[var(--text)]">{res.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {getEntityName(res.centre)}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums text-[var(--text)]">
                            {res.quantity.toLocaleString()} {res.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Package className="w-10 h-10 text-[var(--text-muted)]/40 mb-3" />
                <h4 className="text-sm font-semibold text-[var(--text)]">
                  No request selected
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                  Select an open relief request on the left to inspect its need requirements, compatibility constraints, and available stock.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Allocation History Table (Full Width) */}
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-muted)]">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">
                Allocation history
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Audit trail of assigned supplies and transport dispatches.
              </p>
            </div>

            {/* Status Filter & CSV Export */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-white text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Filter history by status"
                >
                  <option value="all">All statuses ({allocations.length})</option>
                  <option value="allocated">Allocated</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={exportAllocationsCSV}
                disabled={filteredAllocations.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table Contents */}
          {loading ? (
            <div className="p-8">
              <LoadingState rows={4} />
            </div>
          ) : loadError ? (
            <div className="p-8">
              <ErrorState
                title="Unable to load history"
                message={loadError}
                onRetry={() => void loadData()}
              />
            </div>
          ) : allocations.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={<Clock className="w-10 h-10 text-[var(--text-muted)]" />}
                title="No allocations made yet"
                description="When resources are allocated to relief requests, historical dispatch records will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                    <th scope="col" className="h-10 px-4">
                      Relief request
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Resource item
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Storage facility
                    </th>
                    <th scope="col" className="h-10 px-4 text-right">
                      Quantity
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Status
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Date
                    </th>
                    <th scope="col" className="h-10 px-4 text-right">
                      Lifecycle actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredAllocations.map((alloc) => {
                    const reqTitle = getEntityName(alloc.request);
                    const resName = getEntityName(alloc.resource);
                    const centreName = getEntityName(alloc.centre);
                    const dateFormatted = alloc.createdAt
                      ? new Date(alloc.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <tr
                        key={alloc._id}
                        className="hover:bg-[var(--surface-muted)] transition-colors h-12"
                      >
                        <td className="px-4 font-medium text-[var(--text)]">
                          {reqTitle}
                        </td>
                        <td className="px-4 text-[var(--text-muted)]">
                          {resName}
                        </td>
                        <td className="px-4 text-[var(--text-muted)]">
                          {centreName}
                        </td>
                        <td className="px-4 text-right font-medium tabular-nums text-[var(--text)]">
                          {alloc.quantity.toLocaleString()}
                        </td>
                        <td className="px-4">
                          <StatusBadge status={alloc.status} />
                        </td>
                        <td className="px-4 text-xs text-[var(--text-muted)] tabular-nums">
                          {dateFormatted}
                        </td>
                        <td className="px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* If allocated: can Dispatch or Cancel */}
                            {alloc.status === "allocated" && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setTransitionTarget({
                                      allocation: alloc,
                                      nextStatus: "dispatched",
                                    })
                                  }
                                >
                                  <Truck className="w-3.5 h-3.5 mr-1" />
                                  Dispatch
                                </Button>
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  className="text-[var(--danger)] hover:bg-red-50"
                                  onClick={() =>
                                    setTransitionTarget({
                                      allocation: alloc,
                                      nextStatus: "cancelled",
                                    })
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            )}

                            {/* If dispatched: can Mark Delivered or Cancel */}
                            {alloc.status === "dispatched" && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    setTransitionTarget({
                                      allocation: alloc,
                                      nextStatus: "delivered",
                                    })
                                  }
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Mark delivered
                                </Button>
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  className="text-[var(--danger)] hover:bg-red-50"
                                  onClick={() =>
                                    setTransitionTarget({
                                      allocation: alloc,
                                      nextStatus: "cancelled",
                                    })
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            )}

                            {/* If delivered or cancelled: terminal states */}
                            {alloc.status === "delivered" && (
                              <span className="text-xs text-[var(--success)] font-medium inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Completed
                              </span>
                            )}
                            {alloc.status === "cancelled" && (
                              <span className="text-xs text-[var(--text-muted)]">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transition ConfirmDialog */}
        <ConfirmDialog
          isOpen={Boolean(transitionTarget)}
          title={
            transitionTarget?.nextStatus === "cancelled"
              ? "Cancel resource allocation"
              : transitionTarget?.nextStatus === "dispatched"
              ? "Confirm transport dispatch"
              : "Confirm delivery completion"
          }
          description={
            transitionTarget?.nextStatus === "cancelled"
              ? `Are you sure you want to cancel this allocation? The allocated quantity (${transitionTarget?.allocation.quantity}) will be returned directly to inventory stock, and the request fulfillment will be updated.`
              : transitionTarget?.nextStatus === "dispatched"
              ? `Mark allocation of ${transitionTarget?.allocation.quantity} units as dispatched for transit?`
              : `Mark allocation of ${transitionTarget?.allocation.quantity} units as delivered to the requester? This completes the allocation cycle.`
          }
          confirmLabel={
            transitionTarget?.nextStatus === "cancelled"
              ? "Cancel allocation"
              : transitionTarget?.nextStatus === "dispatched"
              ? "Confirm dispatch"
              : "Mark delivered"
          }
          variant={
            transitionTarget?.nextStatus === "cancelled" ? "destructive" : "primary"
          }
          loading={transitioning}
          onConfirm={() => void confirmTransition()}
          onClose={() => setTransitionTarget(null)}
        />

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
