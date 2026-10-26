"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  X,
  MapPin,
  User as UserIcon,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";
import {
  AppShell,
  PageHeader,
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  PriorityBadge,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  ConfirmDialog,
  Toast,
} from "@/components";

type Priority = "low" | "medium" | "high" | "critical";
type RequestStatus =
  | "pending"
  | "partially_allocated"
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled";

interface ReliefRequest {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  quantityFulfilled?: number;
  unit: string;
  priority: Priority;
  status: RequestStatus;
  location: { lat: number; lng: number };
  requestedBy?: { _id?: string; name?: string; email?: string } | string;
  assignedCentre?: { _id?: string; name?: string } | string;
  createdAt: string;
  updatedAt?: string;
}

interface RequestsResponse {
  success: boolean;
  count: number;
  data: ReliefRequest[];
}

const CATEGORIES = ["water", "food", "medicine", "clothing", "shelter", "other"];
const UNITS_SUGGESTED = ["litres", "packets", "kits", "kg", "boxes", "units"];

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getEntityName(entity: unknown): string {
  if (!entity) return "—";
  if (typeof entity === "string") return entity;
  if (typeof entity === "object" && entity !== null && "name" in entity) {
    return String((entity as { name: string }).name) || "—";
  }
  return "—";
}

export default function RequestsPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Drawer / Selection
  const [selectedRequest, setSelectedRequest] = useState<ReliefRequest | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Create Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("water");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("litres");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");

  // Cancel Confirmation Dialog
  const [cancelTarget, setCancelTarget] = useState<ReliefRequest | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Auth initialisation
  useEffect(() => {
    const storedToken = sessionStorage.getItem("authToken");
    const storedUser = sessionStorage.getItem("authUser");
    if (!storedToken || !storedUser) {
      router.replace("/login");
      return;
    }
    try {
      setToken(storedToken);
      setUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // Load requests
  const loadRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<RequestsResponse>("/requests", { token });
      setRequests(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const isCoordinatorOrAdmin = user?.role === "coordinator" || user?.role === "admin";
  const isFieldUser = user?.role === "field_user";

  // Client-side filtering & sorting per design spec
  const filteredRequests = useMemo(() => {
    return requests
      .filter((req) => {
        if (statusFilter && req.status !== statusFilter) return false;
        if (priorityFilter && req.priority !== priorityFilter) return false;
        if (categoryFilter && req.category !== categoryFilter) return false;
        if (debouncedSearch) {
          const titleMatch = req.title.toLowerCase().includes(debouncedSearch);
          const descMatch = (req.description || "").toLowerCase().includes(debouncedSearch);
          const catMatch = (req.category || "").toLowerCase().includes(debouncedSearch);
          if (!titleMatch && !descMatch && !catMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pA = PRIORITY_ORDER[a.priority?.toLowerCase()] ?? 4;
        const pB = PRIORITY_ORDER[b.priority?.toLowerCase()] ?? 4;
        if (pA !== pB) return pA - pB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [requests, statusFilter, priorityFilter, categoryFilter, debouncedSearch]);

  const hasActiveFilters = Boolean(
    searchQuery || statusFilter || priorityFilter || categoryFilter
  );

  function clearFilters() {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
  }

  // Create Request Submission
  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateError("");

    const qty = Number(newQuantity);
    const latitude = Number(newLat);
    const longitude = Number(newLng);

    if (!newTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }
    if (!Number.isSafeInteger(qty) || qty < 1) {
      setCreateError("Quantity needed must be a positive whole number.");
      return;
    }
    if (!newUnit.trim()) {
      setCreateError("Measurement unit is required.");
      return;
    }
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setCreateError("Latitude must be between -90 and 90; Longitude between -180 and 180.");
      return;
    }

    setCreateSubmitting(true);
    try {
      await apiRequest("/requests", {
        method: "POST",
        token,
        body: {
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          quantityNeeded: qty,
          unit: newUnit.trim().toLowerCase(),
          priority: newPriority,
          location: { lat: latitude, lng: longitude },
        },
      });

      setToastMessage("Emergency relief request submitted successfully.");
      setToastType("success");
      setIsCreateOpen(false);

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewQuantity("");
      setNewLat("");
      setNewLng("");

      await loadRequests();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create request.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Cancel Request Action
  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelError("");

    try {
      await apiRequest(`/requests/${cancelTarget._id}/cancel`, {
        method: "PATCH",
        token,
      });

      setToastMessage(`Request "${cancelTarget.title}" was cancelled.`);
      setToastType("success");
      setCancelTarget(null);
      if (selectedRequest?._id === cancelTarget._id) {
        setSelectedRequest(null);
      }
      await loadRequests();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <AppShell user={user}>
      {toastMessage && (
        <Toast
          type={toastType}
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      <PageHeader
        title="Relief Requests"
        description={
          isFieldUser
            ? "Track and manage emergency requests submitted under your field account."
            : "Central work queue of all incoming field relief requests."
        }
        primaryAction={
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            New request
          </Button>
        }
        secondaryAction={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadRequests()}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState
            title="Failed to load relief requests"
            message={error}
            onRetry={() => void loadRequests()}
          />
        </div>
      )}

      {/* Filter Bar */}
      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description or category..."
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          </div>

          {/* Status Filter */}
          <div className="w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="partially_allocated">Partially allocated</option>
              <option value="allocated">Allocated</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-32">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-32">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={clearFilters}
              icon={<X className="h-3.5 w-3.5" />}
              className="h-9 px-2 text-xs"
            >
              Clear filters
            </Button>
          )}

          {/* Result Count */}
          <div className="ml-auto text-xs text-[var(--text-muted)] font-medium tabular-nums shrink-0">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>
        </div>
      </section>

      {/* Main Table / Queue */}
      {loading ? (
        <LoadingState type="table" rows={6} />
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <EmptyState
            title={hasActiveFilters ? "No matching requests found" : "No relief requests"}
            description={
              hasActiveFilters
                ? "Try adjusting your search criteria or clearing active filters."
                : isFieldUser
                ? "You haven't submitted any emergency requests yet."
                : "There are currently no relief requests in the database."
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIsCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
                  Create request
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,35,45,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Relief requests queue">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="py-2.5 px-4 w-28">Priority</th>
                  <th scope="col" className="py-2.5 px-4">Request</th>
                  <th scope="col" className="py-2.5 px-4 w-28">Category</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Quantity needed</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Fulfillment</th>
                  <th scope="col" className="py-2.5 px-4 w-36">Status</th>
                  <th scope="col" className="py-2.5 px-4 text-right w-28">Created</th>
                  <th scope="col" className="py-2.5 px-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRequests.map((req) => {
                  const fulfilled = req.quantityFulfilled ?? 0;
                  const needed = req.quantityNeeded;
                  const isSelected = selectedRequest?._id === req._id;

                  return (
                    <tr
                      key={req._id}
                      onClick={() => setSelectedRequest(req)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[var(--surface-muted)]"
                          : "hover:bg-[var(--surface-muted)]/60"
                      }`}
                    >
                      <td className="py-3 px-4 align-top">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-3 px-4 align-top">
                        <p className="font-semibold text-[var(--text)] line-clamp-1">
                          {req.title}
                        </p>
                        {req.description && (
                          <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-1">
                            {req.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-xs capitalize text-[var(--text)]">
                        {req.category}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-[var(--text)] align-top">
                        {req.quantityNeeded}{" "}
                        <span className="text-xs text-[var(--text-muted)] font-normal">
                          {req.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-xs align-top">
                        <span className={fulfilled >= needed ? "font-semibold text-[var(--success)]" : "text-[var(--text)]"}>
                          {fulfilled} / {needed}
                        </span>
                        <span className="text-[var(--text-muted)] ml-1">{req.unit}</span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--text-muted)] tabular-nums align-top">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedRequest(req)}
                          className="h-7 px-2 text-xs"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 420px Right Slide-out Detail Drawer */}
      {selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="fixed inset-0 z-40 flex justify-end"
        >
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-[#17232D]/40 transition-opacity"
            onClick={() => setSelectedRequest(null)}
            aria-hidden="true"
          />

          {/* Drawer content (420px) */}
          <div className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Request Details
                </span>
                <h3 id="drawer-title" className="mt-1 text-base font-semibold text-[var(--text)]">
                  {selectedRequest.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Badges strip */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={selectedRequest.priority} />
              <StatusBadge status={selectedRequest.status} />
              <span className="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] capitalize">
                {selectedRequest.category}
              </span>
            </div>

            {/* Description */}
            <div className="mt-5">
              <h4 className="text-xs font-medium text-[var(--text-muted)]">Description</h4>
              <p className="mt-1 text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
                {selectedRequest.description || "No detailed description provided."}
              </p>
            </div>

            {/* Metrics cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
                <span className="text-xs text-[var(--text-muted)]">Quantity needed</span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">
                  {selectedRequest.quantityNeeded}{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    {selectedRequest.unit}
                  </span>
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
                <span className="text-xs text-[var(--text-muted)]">Fulfilled so far</span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">
                  {selectedRequest.quantityFulfilled ?? 0}{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    {selectedRequest.unit}
                  </span>
                </p>
              </div>
            </div>

            {/* Location & Meta */}
            <div className="mt-5 space-y-3 pt-4 border-t border-[var(--border)] text-xs text-[var(--text)]">
              {/* Location Coordinates */}
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <span className="text-[var(--text-muted)] block">Geospatial location</span>
                  <span className="font-mono tabular-nums text-xs">
                    {selectedRequest.location?.lat?.toFixed(5) ?? "—"}, {selectedRequest.location?.lng?.toFixed(5) ?? "—"}
                  </span>
                  {selectedRequest.location && (
                    <Link
                      href="/map"
                      className="text-[var(--accent)] hover:underline block mt-0.5 text-xs"
                    >
                      View on operations map →
                    </Link>
                  )}
                </div>
              </div>

              {/* Requester */}
              {selectedRequest.requestedBy && (
                <div className="flex items-start gap-2.5">
                  <UserIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5" />
                  <div>
                    <span className="text-[var(--text-muted)] block">Requested by</span>
                    <span>{getEntityName(selectedRequest.requestedBy)}</span>
                  </div>
                </div>
              )}

              {/* Assigned Centre */}
              {selectedRequest.assignedCentre && (
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5" />
                  <div>
                    <span className="text-[var(--text-muted)] block">Assigned supply hub</span>
                    <span>{getEntityName(selectedRequest.assignedCentre)}</span>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <span className="text-[var(--text-muted)] block">Submission timestamp</span>
                  <span className="tabular-nums">{formatDate(selectedRequest.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="mt-auto pt-6 border-t border-[var(--border)] flex flex-col gap-2.5">
              {/* Allocate Action (coordinators/admins for allocatable requests) */}
              {isCoordinatorOrAdmin &&
                selectedRequest.status !== "delivered" &&
                selectedRequest.status !== "cancelled" && (
                  <Link
                    href={`/allocations?requestId=${selectedRequest._id}`}
                    className="w-full"
                  >
                    <Button variant="primary" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                      Allocate stock to request
                    </Button>
                  </Link>
                )}

              {/* Cancel Request (eligible status) */}
              {(selectedRequest.status === "pending" ||
                selectedRequest.status === "partially_allocated") && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelTarget(selectedRequest)}
                  className="w-full"
                >
                  Cancel request
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal Dialog */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-[#17232D]/50 transition-opacity"
            onClick={() => !createSubmitting && setIsCreateOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 id="create-modal-title" className="text-base font-semibold text-[var(--text)]">
                  Submit Emergency Relief Request
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Specify needed resources and incident GPS coordinates.
                </p>
              </div>
              <button
                onClick={() => !createSubmitting && setIsCreateOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-md"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div role="alert" className="mt-4 p-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] text-xs text-[var(--danger)]">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <FormField id="req-title" label="Request Title" required>
                <Input
                  id="req-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Urgent Drinking Water for Flood Camp Alpha"
                  required
                />
              </FormField>

              <FormField id="req-desc" label="Detailed Description">
                <Textarea
                  id="req-desc"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Specify affected family counts, access conditions, or medical urgency..."
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="req-category" label="Category" required>
                  <Select
                    id="req-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField id="req-priority" label="Urgency Priority" required>
                  <Select
                    id="req-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Priority)}
                  >
                    <option value="critical">Critical (Immediate life hazard)</option>
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="req-qty" label="Quantity Needed" required>
                  <Input
                    id="req-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    placeholder="e.g. 500"
                    required
                  />
                </FormField>

                <FormField id="req-unit" label="Measurement Unit" required>
                  <Input
                    id="req-unit"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="e.g. litres, packets, kits"
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
                <FormField
                  id="req-lat"
                  label="Latitude"
                  helperText="Decimal degrees: −90.0 to 90.0"
                  required
                >
                  <Input
                    id="req-lat"
                    type="number"
                    step="any"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="e.g. 28.6139"
                    required
                  />
                </FormField>

                <FormField
                  id="req-lng"
                  label="Longitude"
                  helperText="Decimal degrees: −180.0 to 180.0"
                  required
                >
                  <Input
                    id="req-lng"
                    type="number"
                    step="any"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    placeholder="e.g. 77.2090"
                    required
                  />
                </FormField>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={createSubmitting}
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={createSubmitting}>
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Relief Request"
        description={`Are you sure you want to cancel "${cancelTarget?.title}"? This request will be closed and inventory allocations will be stopped.`}
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        variant="destructive"
        loading={cancelLoading}
        error={cancelError}
        onConfirm={() => void handleConfirmCancel()}
        onClose={() => setCancelTarget(null)}
      />
    </AppShell>
  );
}
