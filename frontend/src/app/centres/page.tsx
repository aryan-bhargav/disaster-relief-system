"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  X,
  Edit2,
  PowerOff,
  Power,
  MapPin,
  Phone,
  Layers,
  ArrowRight,
  Package,
  Navigation,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  Button,
  FormField,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  ConfirmDialog,
  Toast,
} from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

interface Centre {
  _id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  contactNumber?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ResourceItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  centre: string | { _id: string; name: string };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export default function CentresPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  const [centres, setCentres] = useState<Centre[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Detail Drawer state
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState<Centre | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("28.6139");
  const [formLng, setFormLng] = useState("77.2090");
  const [formContact, setFormContact] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);

  function handleGetCurrentLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setFormError("Geolocation is not supported by your browser.");
      return;
    }
    setFetchingLocation(true);
    setFormError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormLat(position.coords.latitude.toFixed(5));
        setFormLng(position.coords.longitude.toFixed(5));
        setFetchingLocation(false);
        setToastMessage({ text: "Current GPS coordinates captured", type: "success" });
      },
      (err) => {
        setFetchingLocation(false);
        setFormError(`Could not capture GPS location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // Deactivate / Reactivate Dialog state
  const [centreToToggle, setCentreToToggle] = useState<Centre | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

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

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load centres & resources
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");

    try {
      const [centresRes, resourcesRes] = await Promise.all([
        apiRequest<ApiResponse<Centre[]>>("/centres", { token }),
        apiRequest<ApiResponse<ResourceItem[]>>("/resources", { token }).catch(() => ({
          success: true,
          data: [] as ResourceItem[],
        })),
      ]);

      setCentres(centresRes.data || []);
      setResources(resourcesRes.data || []);

      // Refresh drawer selection if open
      if (selectedCentre) {
        const updated = (centresRes.data || []).find(
          (c) => c._id === selectedCentre._id
        );
        if (updated) setSelectedCentre(updated);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load relief centres."
      );
    } finally {
      setLoading(false);
    }
  }, [token, selectedCentre]);

  useEffect(() => {
    void loadData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const canManage = user?.role === "admin" || user?.role === "coordinator";

  // Filtered centres
  const filteredCentres = useMemo(() => {
    return centres.filter((centre) => {
      // Search by name or address
      if (debouncedSearch) {
        const matchesName = centre.name.toLowerCase().includes(debouncedSearch);
        const matchesAddress = centre.address.toLowerCase().includes(debouncedSearch);
        if (!matchesName && !matchesAddress) return false;
      }

      // Status filter
      if (statusFilter === "active" && !centre.isActive) return false;
      if (statusFilter === "inactive" && centre.isActive) return false;

      return true;
    });
  }, [centres, debouncedSearch, statusFilter]);

  const activeCentresCount = useMemo(
    () => centres.filter((c) => c.isActive).length,
    [centres]
  );
  const inactiveCentresCount = centres.length - activeCentresCount;

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("all");
  }

  // Inventory held at selected centre
  const selectedCentreInventory = useMemo(() => {
    if (!selectedCentre) return [];
    return resources.filter((res) => {
      const centreId = typeof res.centre === "string" ? res.centre : res.centre?._id;
      return centreId === selectedCentre._id;
    });
  }, [selectedCentre, resources]);

  // Open Add modal
  function openAddModal() {
    setEditingCentre(null);
    setFormName("");
    setFormAddress("");
    setFormLat("28.6139");
    setFormLng("77.2090");
    setFormContact("");
    setFormError("");
    setIsModalOpen(true);
  }

  // Open Edit modal
  function openEditModal(centre: Centre) {
    setEditingCentre(centre);
    setFormName(centre.name);
    setFormAddress(centre.address);
    setFormLat(String(centre.location.lat));
    setFormLng(String(centre.location.lng));
    setFormContact(centre.contactNumber || "");
    setFormError("");
    setIsModalOpen(true);
  }

  // Submit Add or Edit
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Centre name is required.");
      return;
    }
    if (!formAddress.trim()) {
      setFormError("Physical address is required.");
      return;
    }

    const latitude = Number(formLat);
    const longitude = Number(formLng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setFormError("Latitude must be −90 to 90 and longitude −180 to 180.");
      return;
    }

    setFormSubmitting(true);

    try {
      if (editingCentre) {
        // Edit
        await apiRequest(`/centres/${editingCentre._id}`, {
          method: "PUT",
          token,
          body: {
            name: formName.trim(),
            address: formAddress.trim(),
            location: { lat: latitude, lng: longitude },
            contactNumber: formContact.trim() || undefined,
          },
        });

        setToastMessage({
          text: `Relief centre '${formName.trim()}' updated successfully.`,
          type: "success",
        });
      } else {
        // Add
        await apiRequest("/centres", {
          method: "POST",
          token,
          body: {
            name: formName.trim(),
            address: formAddress.trim(),
            location: { lat: latitude, lng: longitude },
            contactNumber: formContact.trim() || undefined,
          },
        });

        setToastMessage({
          text: `Relief centre '${formName.trim()}' registered successfully.`,
          type: "success",
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save relief centre."
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  // Handle Deactivate / Reactivate Toggle
  async function confirmToggleStatus() {
    if (!centreToToggle) return;
    setIsTogglingStatus(true);

    try {
      if (centreToToggle.isActive) {
        // Soft-deactivate using DELETE
        await apiRequest(`/centres/${centreToToggle._id}`, {
          method: "DELETE",
          token,
        });
        setToastMessage({
          text: `Relief centre '${centreToToggle.name}' deactivated.`,
          type: "info",
        });
      } else {
        // Reactivate using PUT
        await apiRequest(`/centres/${centreToToggle._id}`, {
          method: "PUT",
          token,
          body: { isActive: true },
        });
        setToastMessage({
          text: `Relief centre '${centreToToggle.name}' reactivated.`,
          type: "success",
        });
      }

      setCentreToToggle(null);
      await loadData();
    } catch (err) {
      setToastMessage({
        text:
          err instanceof Error
            ? err.message
            : "Failed to update relief centre status.",
        type: "error",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  }

  return (
    <AppShell user={user}>
      <div className="max-w-[1440px] mx-auto pb-12">
        {/* Page Header */}
        <PageHeader
          title="Relief centres"
          description="Manage physical distribution hubs, storage facilities, and operational coordinates."
          breadcrumb={
            <span>
              Dashboard / <span className="text-[var(--text)]">Centres</span>
            </span>
          }
          primaryAction={
            canManage ? (
              <Button variant="primary" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add centre
              </Button>
            ) : undefined
          }
        />

        {/* Summary Strip (Compact 1-Bordered Panel) */}
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                Total facilities
              </span>
              <span className="text-2xl font-semibold tabular-nums mt-1 text-[var(--text)]">
                {centres.length}
              </span>
            </div>

            <div className="flex flex-col pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-[var(--success)]" aria-hidden="true" />
                Active facilities
              </span>
              <span className="text-2xl font-semibold tabular-nums mt-1 text-[var(--text)]">
                {activeCentresCount}
              </span>
            </div>

            <div className="flex flex-col pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <PowerOff className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                Inactive facilities
              </span>
              <span className="text-2xl font-semibold tabular-nums mt-1 text-[var(--text)]">
                {inactiveCentresCount}
              </span>
            </div>

            <div className="flex flex-col justify-center pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                Spatial standard
              </span>
              <span className="text-xs text-[var(--text-muted)] mt-1">
                WGS84 decimal degrees (5 decimal precision).
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-3 mb-6 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name or address..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Status Filter */}
          <div className="w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Filter by Status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Clear filters
            </Button>
          )}

          {/* Results Count */}
          <div className="text-xs text-[var(--text-muted)] ml-auto font-medium">
            Showing {filteredCentres.length} of {centres.length} facilities
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-12">
            <LoadingState rows={4} />
          </div>
        ) : loadError ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-8">
            <ErrorState
              title="Unable to load relief centres"
              message={loadError}
              onRetry={() => void loadData()}
            />
          </div>
        ) : centres.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-12 text-center">
            <EmptyState
              icon={<Building2 className="w-10 h-10 text-[var(--text-muted)]" />}
              title="No relief centres registered yet"
              description="Register distribution depots and operational hubs to coordinate relief supply storage."
              action={
                canManage ? (
                  <Button variant="primary" onClick={openAddModal}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Register first centre
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredCentres.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-12 text-center">
            <EmptyState
              icon={<Filter className="w-10 h-10 text-[var(--text-muted)]" />}
              title="No relief centres match filters"
              description="Try adjusting your search query or status filter."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear all filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                    <th scope="col" className="h-10 px-4">
                      Facility name
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Address
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Contact number
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Status
                    </th>
                    {canManage && (
                      <th scope="col" className="h-10 px-4 text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredCentres.map((centre) => {
                    return (
                      <tr
                        key={centre._id}
                        onClick={() => setSelectedCentre(centre)}
                        className={`cursor-pointer transition-colors h-12 ${
                          !centre.isActive
                            ? "bg-neutral-50/70 text-[var(--text-muted)]"
                            : "hover:bg-[var(--surface-muted)] text-[var(--text)]"
                        }`}
                      >
                        <td className="px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className={!centre.isActive ? "line-through text-[var(--text-muted)]" : ""}>
                              {centre.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 text-[var(--text-muted)] max-w-xs truncate" title={centre.address}>
                          {centre.address}
                        </td>
                        <td className="px-4 text-[var(--text-muted)] tabular-nums">
                          {centre.contactNumber || "—"}
                        </td>
                        <td className="px-4">
                          <StatusBadge status={centre.isActive ? "active" : "inactive"} />
                        </td>
                        {canManage && (
                          <td className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(centre)}
                                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                aria-label={`Edit ${centre.name}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setCentreToToggle(centre)}
                                className={`p-1.5 rounded ${
                                  centre.isActive
                                    ? "text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 focus:ring-[var(--danger)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-emerald-50 focus:ring-[var(--success)]"
                                } focus:outline-none focus:ring-2`}
                                aria-label={centre.isActive ? `Deactivate ${centre.name}` : `Reactivate ${centre.name}`}
                              >
                                {centre.isActive ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 420px Slide-out Detail Drawer */}
        {selectedCentre && (
          <div
            className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in"
            onClick={() => setSelectedCentre(null)}
          >
            <div
              className="w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col border-l border-[var(--border)] overflow-y-auto animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-[var(--border)] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={selectedCentre.isActive ? "active" : "inactive"} />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text)]">
                    {selectedCentre.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCentre(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                {/* Physical Location */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Physical Location
                  </h4>
                  <p className="text-sm text-[var(--text)] leading-relaxed">
                    {selectedCentre.address}
                  </p>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Contact Number
                  </h4>
                  <p className="text-sm font-medium text-[var(--text)] tabular-nums">
                    {selectedCentre.contactNumber || "No direct phone contact registered"}
                  </p>
                </div>

                {/* Spatial Coordinates */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Coordinates (WGS84)
                  </h4>
                  <div className="p-3 bg-[var(--surface-muted)] rounded-lg border border-[var(--border)] space-y-1.5 text-xs font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Latitude:</span>
                      <span className="font-semibold text-[var(--text)]">
                        {selectedCentre.location?.lat !== undefined
                          ? selectedCentre.location.lat.toFixed(5)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Longitude:</span>
                      <span className="font-semibold text-[var(--text)]">
                        {selectedCentre.location?.lng !== undefined
                          ? selectedCentre.location.lng.toFixed(5)
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <Link
                      href={`/map?centreId=${selectedCentre._id}`}
                      className="inline-flex items-center text-xs font-medium text-[var(--accent)] hover:underline gap-1"
                    >
                      View on operations map
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Inventory Supplies Held Here */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Stored Supplies ({selectedCentreInventory.length})
                  </h4>

                  {selectedCentreInventory.length === 0 ? (
                    <div className="p-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
                      No supplies registered at this facility.
                    </div>
                  ) : (
                    <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] overflow-hidden text-xs">
                      {selectedCentreInventory.map((item) => (
                        <div
                          key={item._id}
                          className="p-3 flex items-center justify-between hover:bg-[var(--surface-muted)]"
                        >
                          <div>
                            <p className="font-medium text-[var(--text)]">{item.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] capitalize">
                              {item.category}
                            </p>
                          </div>
                          <div className="text-right font-medium tabular-nums text-[var(--text)]">
                            {item.quantity.toLocaleString()} {item.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              {canManage && (
                <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-muted)] flex items-center gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      const target = selectedCentre;
                      setSelectedCentre(null);
                      openEditModal(target);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Edit facility
                  </Button>
                  <Button
                    variant={selectedCentre.isActive ? "destructive" : "primary"}
                    className="flex-1"
                    onClick={() => {
                      const target = selectedCentre;
                      setSelectedCentre(null);
                      setCentreToToggle(target);
                    }}
                  >
                    {selectedCentre.isActive ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5 mr-1.5" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5 mr-1.5" />
                        Reactivate
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add / Edit Relief Centre Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="bg-white rounded-xl border border-[var(--border)] max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-[var(--text)]"
                >
                  {editingCentre ? "Edit relief centre" : "Register new relief centre"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mt-4 p-3 rounded-lg border border-[var(--danger)] bg-red-50 text-[var(--danger)] text-sm"
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                <FormField
                  id="centre-name"
                  label="Relief centre name"
                  required
                  error={formError && !formName.trim() ? "Name is required" : undefined}
                >
                  <input
                    id="centre-name"
                    type="text"
                    required
                    maxLength={100}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Central Logistics Depot"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </FormField>

                <FormField
                  id="centre-address"
                  label="Physical address"
                  required
                  error={formError && !formAddress.trim() ? "Address is required" : undefined}
                >
                  <input
                    id="centre-address"
                    type="text"
                    required
                    maxLength={200}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. Sector 12, Community Centre, New Delhi"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </FormField>

                <FormField
                  id="centre-contact"
                  label="Contact phone number"
                  optional
                  helperText="Emergency coordinator contact line"
                >
                  <input
                    id="centre-contact"
                    type="tel"
                    maxLength={20}
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </FormField>

                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Coordinates (WGS84)
                    </span>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={fetchingLocation}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline disabled:opacity-50"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      {fetchingLocation ? "Capturing GPS..." : "Use Current Location"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      id="centre-lat"
                      label="Latitude"
                      required
                      helperText="Decimal degrees (−90 to 90)"
                    >
                      <input
                        id="centre-lat"
                        type="number"
                        required
                        step="any"
                        min="-90"
                        max="90"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        placeholder="28.6139"
                        className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </FormField>

                    <FormField
                      id="centre-lng"
                      label="Longitude"
                      required
                      helperText="Decimal degrees (−180 to 180)"
                    >
                      <input
                        id="centre-lng"
                        type="number"
                        required
                        step="any"
                        min="-180"
                        max="180"
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        placeholder="77.2090"
                        className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={formSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={formSubmitting}
                  >
                    {editingCentre ? "Save changes" : "Register centre"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate / Reactivate ConfirmDialog */}
        <ConfirmDialog
          isOpen={Boolean(centreToToggle)}
          title={
            centreToToggle?.isActive
              ? "Deactivate relief centre"
              : "Reactivate relief centre"
          }
          description={
            centreToToggle?.isActive
              ? `Are you sure you want to deactivate '${centreToToggle.name}'? Deactivated centres cannot accept new supplies or be selected for new allocations, but historical records will be preserved.`
              : `Reactivate '${centreToToggle?.name}' to allow inventory assignments and allocation dispatches?`
          }
          confirmLabel={centreToToggle?.isActive ? "Deactivate" : "Reactivate"}
          variant={centreToToggle?.isActive ? "destructive" : "primary"}
          loading={isTogglingStatus}
          onConfirm={() => void confirmToggleStatus()}
          onClose={() => setCentreToToggle(null)}
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
