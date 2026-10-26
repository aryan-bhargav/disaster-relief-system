"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  Filter,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Building2,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  Button,
  FormField,
  EmptyState,
  LoadingState,
  ErrorState,
  ConfirmDialog,
  Toast,
} from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

type Category = "food" | "water" | "medicine" | "clothing" | "shelter" | "other";

interface Centre {
  _id: string;
  name: string;
  address?: string;
  isActive: boolean;
}

interface Resource {
  _id: string;
  name: string;
  category: Category;
  unit: string;
  quantity: number;
  centre: Centre | string;
  createdAt?: string;
  updatedAt?: string;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  count?: number;
}

const CATEGORIES: { label: string; value: Category }[] = [
  { label: "Food", value: "food" },
  { label: "Water", value: "water" },
  { label: "Medicine", value: "medicine" },
  { label: "Clothing", value: "clothing" },
  { label: "Shelter", value: "shelter" },
  { label: "Other", value: "other" },
];

export default function ResourcesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  const [resources, setResources] = useState<Resource[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCentre, setSelectedCentre] = useState<string>("all");

  // Modal (Add / Edit) state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<Category>("water");
  const [formUnit, setFormUnit] = useState("litres");
  const [formQuantity, setFormQuantity] = useState("100");
  const [formCentreId, setFormCentreId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete dialog state
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Authentication check
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

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load resources and centres
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");

    try {
      const [resResult, centreResult] = await Promise.all([
        apiRequest<ListResponse<Resource>>("/resources", { token }),
        apiRequest<ListResponse<Centre>>("/centres", { token }),
      ]);

      setResources(resResult.data || []);
      setCentres(centreResult.data || []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load resource inventory."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canManage = user?.role === "admin" || user?.role === "coordinator";

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // Name match
      if (
        debouncedSearch &&
        !res.name.toLowerCase().includes(debouncedSearch)
      ) {
        return false;
      }

      // Category match
      if (selectedCategory !== "all" && res.category !== selectedCategory) {
        return false;
      }

      // Centre match
      if (selectedCentre !== "all") {
        const centreId =
          typeof res.centre === "string" ? res.centre : res.centre?._id;
        if (centreId !== selectedCentre) return false;
      }

      return true;
    });
  }, [resources, debouncedSearch, selectedCategory, selectedCentre]);

  // Active centres for selection
  const activeCentres = useMemo(() => {
    return centres.filter((c) => c.isActive);
  }, [centres]);

  // Centres holding stock
  const centresHoldingStockCount = useMemo(() => {
    const ids = new Set<string>();
    resources.forEach((r) => {
      const id = typeof r.centre === "string" ? r.centre : r.centre?._id;
      if (id) ids.add(id);
    });
    return ids.size;
  }, [resources]);

  const hasActiveFilters =
    searchQuery !== "" || selectedCategory !== "all" || selectedCentre !== "all";

  function clearFilters() {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSelectedCentre("all");
  }

  // Open Add modal
  function openAddModal() {
    setEditingResource(null);
    setFormName("");
    setFormCategory("water");
    setFormUnit("litres");
    setFormQuantity("100");
    setFormCentreId(activeCentres[0]?._id ?? "");
    setFormError("");
    setIsModalOpen(true);
  }

  // Open Edit modal
  function openEditModal(res: Resource) {
    setEditingResource(res);
    setFormName(res.name);
    setFormCategory(res.category);
    setFormUnit(res.unit);
    setFormQuantity(String(res.quantity));
    const centreId =
      typeof res.centre === "string" ? res.centre : res.centre?._id;
    setFormCentreId(centreId || activeCentres[0]?._id || "");
    setFormError("");
    setIsModalOpen(true);
  }

  // Handle Form Submit (Add or Edit)
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Resource name is required.");
      return;
    }

    const qty = Number(formQuantity);
    if (!Number.isSafeInteger(qty) || qty < 0) {
      setFormError("Quantity must be a non-negative whole number.");
      return;
    }

    if (!formCentreId) {
      setFormError("Select an active storage relief centre.");
      return;
    }

    setFormSubmitting(true);

    try {
      if (editingResource) {
        // Edit existing resource
        await apiRequest(`/resources/${editingResource._id}`, {
          method: "PUT",
          token,
          body: {
            name: formName.trim(),
            category: formCategory,
            unit: formUnit.trim(),
            quantity: qty,
            centre: formCentreId,
          },
        });
        setToastMessage({
          text: `Resource '${formName.trim()}' updated successfully.`,
          type: "success",
        });
      } else {
        // Create new resource
        await apiRequest("/resources", {
          method: "POST",
          token,
          body: {
            name: formName.trim(),
            category: formCategory,
            unit: formUnit.trim(),
            quantity: qty,
            centre: formCentreId,
          },
        });
        setToastMessage({
          text: `Resource '${formName.trim()}' added to inventory.`,
          type: "success",
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save resource."
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  // Handle Delete
  async function confirmDeleteResource() {
    if (!resourceToDelete) return;
    setIsDeleting(true);
    setDeleteDialogError("");

    try {
      await apiRequest(`/resources/${resourceToDelete._id}`, {
        method: "DELETE",
        token,
      });

      setToastMessage({
        text: `Resource '${resourceToDelete.name}' deleted from inventory.`,
        type: "success",
      });
      setResourceToDelete(null);
      await loadData();
    } catch (err) {
      // Display verbatim backend error (e.g. 409 allocation reference integrity violation)
      setDeleteDialogError(
        err instanceof Error
          ? err.message
          : "Failed to delete resource from inventory."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell user={user}>
      <div className="max-w-[1440px] mx-auto pb-12">
        {/* Page Header */}
        <PageHeader
          title="Resource inventory"
          description="Track and manage emergency supplies across registered relief facilities."
          breadcrumb={
            <span>
              Dashboard / <span className="text-[var(--text)]">Resources</span>
            </span>
          }
          primaryAction={
            canManage ? (
              <Button
                variant="primary"
                onClick={openAddModal}
                disabled={activeCentres.length === 0}
              >
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add resource
              </Button>
            ) : undefined
          }
        />

        {/* Summary Strip (Compact 1-Bordered Panel) */}
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                Total inventory items
              </span>
              <span className="text-2xl font-semibold tabular-nums mt-1 text-[var(--text)]">
                {resources.length}
              </span>
            </div>

            <div className="flex flex-col pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                Active storage facilities
              </span>
              <span className="text-2xl font-semibold tabular-nums mt-1 text-[var(--text)]">
                {activeCentres.length}
              </span>
            </div>

            <div className="flex flex-col pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Facilities holding stock
              </span>
              <span className="text-2xl font-semibold tabular-nums mt-1 text-[var(--text)]">
                {centresHoldingStockCount}
              </span>
            </div>

            <div className="flex flex-col justify-center pt-3 md:pt-0 md:pl-4">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                Inventory rule note
              </span>
              <span className="text-xs text-[var(--text-muted)] mt-1">
                Threshold levels not defined by backend; displaying exact quantities.
              </span>
            </div>
          </div>
        </div>

        {/* Warning if no active centres exist */}
        {activeCentres.length === 0 && !loading && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No active relief centres available</p>
              <p className="mt-0.5 text-xs text-amber-800">
                You must have at least one active relief facility registered before adding inventory supplies.
              </p>
            </div>
          </div>
        )}

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
              placeholder="Search by resource name..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Category Filter */}
          <div className="w-44">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Filter by Category"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Centre Filter */}
          <div className="w-56">
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Filter by Relief Centre"
            >
              <option value="all">All facilities</option>
              {centres.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {!c.isActive ? "(Inactive)" : ""}
                </option>
              ))}
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
            Showing {filteredResources.length} of {resources.length} items
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
              title="Unable to load inventory"
              message={loadError}
              onRetry={() => void loadData()}
            />
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-12 text-center">
            <EmptyState
              icon={<Package className="w-10 h-10 text-[var(--text-muted)]" />}
              title="No resources recorded yet"
              description="Inventory supplies registered across relief centres will appear here."
              action={
                canManage && activeCentres.length > 0 ? (
                  <Button variant="primary" onClick={openAddModal}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add first resource
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-12 text-center">
            <EmptyState
              icon={<Filter className="w-10 h-10 text-[var(--text-muted)]" />}
              title="No resources match filters"
              description="Try adjusting your search criteria, category, or centre selection."
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
                      Resource item
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Category
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Storage facility
                    </th>
                    <th scope="col" className="h-10 px-4 text-right">
                      Available quantity
                    </th>
                    <th scope="col" className="h-10 px-4">
                      Unit
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
                  {filteredResources.map((res) => {
                    const centreObj =
                      typeof res.centre === "object" ? res.centre : null;
                    const centreName = centreObj
                      ? centreObj.name
                      : typeof res.centre === "string"
                      ? res.centre
                      : "Unassigned facility";
                    const isCentreInactive = centreObj
                      ? !centreObj.isActive
                      : false;

                    return (
                      <tr
                        key={res._id}
                        className="hover:bg-[var(--surface-muted)] transition-colors h-12"
                      >
                        <td className="px-4 font-medium text-[var(--text)]">
                          {res.name}
                        </td>
                        <td className="px-4 text-[var(--text-muted)] capitalize">
                          {res.category}
                        </td>
                        <td className="px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--text)]">{centreName}</span>
                            {isCentreInactive && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 text-right font-medium tabular-nums text-[var(--text)]">
                          {res.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 text-[var(--text-muted)]">
                          {res.unit}
                        </td>
                        <td className="px-4">
                          {res.quantity === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              Depleted
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">
                              In stock
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(res)}
                                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                aria-label={`Edit ${res.name}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setResourceToDelete(res);
                                  setDeleteDialogError("");
                                }}
                                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[var(--danger)]"
                                aria-label={`Delete ${res.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* Add / Edit Resource Modal Dialog */}
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
                  {editingResource ? "Edit resource" : "Add new resource"}
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
                  id="res-name"
                  label="Resource item name"
                  required
                  error={formError && !formName.trim() ? "Name is required" : undefined}
                >
                  <input
                    id="res-name"
                    type="text"
                    required
                    maxLength={100}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Bottled Drinking Water"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField id="res-cat" label="Category" required>
                    <select
                      id="res-cat"
                      value={formCategory}
                      onChange={(e) => {
                        const next = e.target.value as Category;
                        setFormCategory(next);
                        if (!editingResource) {
                          setFormUnit(
                            next === "water"
                              ? "litres"
                              : next === "food"
                              ? "packets"
                              : next === "clothing"
                              ? "items"
                              : next === "shelter"
                              ? "kits"
                              : "units"
                          );
                        }
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField id="res-unit" label="Unit of measure" required>
                    <input
                      id="res-unit"
                      type="text"
                      required
                      maxLength={40}
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      placeholder="e.g. litres, packets"
                      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField id="res-qty" label="Quantity on hand" required>
                    <input
                      id="res-qty"
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </FormField>

                  <FormField id="res-centre" label="Storage facility" required>
                    <select
                      id="res-centre"
                      required
                      value={formCentreId}
                      onChange={(e) => setFormCentreId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="">Select active facility</option>
                      {activeCentres.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
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
                    {editingResource ? "Save changes" : "Add to inventory"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={Boolean(resourceToDelete)}
          title="Delete inventory resource"
          description={
            deleteDialogError
              ? deleteDialogError
              : `Are you sure you want to delete '${resourceToDelete?.name}'? This action cannot be undone.`
          }
          error={
            deleteDialogError
              ? "If this item is linked to past allocations, its quantity can be adjusted instead of deleting the record."
              : undefined
          }
          confirmLabel={deleteDialogError ? "Close" : "Delete resource"}
          variant="destructive"
          loading={isDeleting}
          onConfirm={() => {
            if (deleteDialogError) {
              setResourceToDelete(null);
              setDeleteDialogError("");
            } else {
              void confirmDeleteResource();
            }
          }}
          onClose={() => {
            setResourceToDelete(null);
            setDeleteDialogError("");
          }}
        />

        {/* Toast Notification */}
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
