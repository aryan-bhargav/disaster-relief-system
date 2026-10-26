"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";
import {
  AppShell,
  PageHeader,
  Button,
  PriorityBadge,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components";

interface DashboardData {
  overview: {
    totalRequests: number;
    pendingRequests: number;
    activeCentres: number;
    resourceTypes: number;
    totalStock: number;
    lowStockItems: number;
  };
  stockByCategory?: Record<string, number>;
  requestsByPriority: Record<string, number>;
  allocationsByStatus: Record<string, number>;
  recentRequests: {
    _id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    quantityNeeded?: number;
    quantityFulfilled?: number;
    unit?: string;
    requestedBy?: { name?: string } | string;
    assignedCentre?: { name?: string } | string;
  }[];
}

interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    const token = sessionStorage.getItem("authToken");
    const storedUser = sessionStorage.getItem("authUser");

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    try {
      setUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      sessionStorage.clear();
      router.replace("/login");
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await apiRequest<DashboardResponse>(
        "/dashboard/stats",
        { token }
      );
      setData(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load operational dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function handleLogout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    router.replace("/login");
  }

  const isFieldUser = user?.role === "field_user";
  const criticalCount = data?.requestsByPriority?.critical ?? 0;

  // Queue requests: prioritize critical/high, then creation date
  const queueRequests = data?.recentRequests
    ? [...data.recentRequests].sort((a, b) => {
        const pA = PRIORITY_ORDER[a.priority?.toLowerCase()] ?? 4;
        const pB = PRIORITY_ORDER[b.priority?.toLowerCase()] ?? 4;
        if (pA !== pB) return pA - pB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    : [];

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <PageHeader
        title="Operations overview"
        description="Current requests, centres, and allocations."
        primaryAction={
          isFieldUser ? (
            <Link href="/requests">
              <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                New request
              </Button>
            </Link>
          ) : (
            <Link href="/requests">
              <Button size="sm">
                View request queue
              </Button>
            </Link>
          )
        }
        secondaryAction={
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={() => void loadDashboard(true)}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState
            title="Failed to load dashboard overview"
            message={error}
            onRetry={() => void loadDashboard(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <LoadingState type="metric" />
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <LoadingState type="table" rows={5} />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <LoadingState type="card" rows={2} />
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Conditional Attention Strip: rendered only when critical requests exist */}
          {criticalCount > 0 && (
            <div
              role="alert"
              className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-[#FCD2CF] bg-[var(--danger-bg)] text-[var(--danger)] shadow-[0_1px_2px_rgba(23,35,45,0.04)]"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--danger)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[#8E1C13]">
                  {criticalCount === 1
                    ? "1 critical request requires immediate allocation"
                    : `${criticalCount} critical requests require immediate allocation`}
                </span>
              </div>
              <Link
                href="/requests?priority=critical"
                className="text-xs font-semibold text-[var(--danger)] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                Review critical requests →
              </Link>
            </div>
          )}

          {/* Unified Metric Panel divided by vertical rules */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)] mb-6 shadow-[0_1px_2px_rgba(23,35,45,0.06)]">
            {/* Metric 1: Pending requests */}
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                {isFieldUser ? "My pending requests" : "Pending requests"}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums text-[var(--text)]">
                {data.overview.pendingRequests}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {isFieldUser
                  ? "Awaiting response"
                  : `Of ${data.overview.totalRequests} total requests`}
              </p>
            </div>

            {/* Metric 2: Critical requests */}
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Critical requests
              </p>
              <p
                className={`mt-2 text-2xl sm:text-3xl font-semibold tabular-nums ${
                  criticalCount > 0 ? "text-[var(--danger)]" : "text-[var(--text)]"
                }`}
              >
                {criticalCount}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {criticalCount > 0 ? "High urgency" : "No critical backlog"}
              </p>
            </div>

            {/* Metric 3: Active relief centres */}
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Active relief centres
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums text-[var(--text)]">
                {data.overview.activeCentres}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Operational facilities
              </p>
            </div>

            {/* Metric 4: Pending allocations (Truthful UI: Not available) */}
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Pending allocations
              </p>
              <p className="mt-2 text-lg sm:text-xl font-medium text-[var(--text-muted)]">
                Not available
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Status not tracked in API
              </p>
            </div>
          </div>

          {/* Main Workspace (8/4 split at >= 1024px) */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left Column (8 cols): Request Queue */}
            <div className="lg:col-span-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_2px_rgba(23,35,45,0.06)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 bg-[var(--surface-muted)]">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    {isFieldUser ? "Your request queue" : "Request queue"}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {isFieldUser
                      ? "Recent relief requests submitted under your account."
                      : "Priority-ordered operational queue."}
                  </p>
                </div>
                <Link
                  href="/requests"
                  className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  View all requests →
                </Link>
              </div>

              {queueRequests.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title={isFieldUser ? "No requests submitted yet" : "No requests in queue"}
                    description={
                      isFieldUser
                        ? "You have not submitted any relief requests yet."
                        : "There are currently no relief requests in the database."
                    }
                    action={
                      isFieldUser ? (
                        <Link href="/requests">
                          <Button size="sm">Submit new request</Button>
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" aria-label="Request queue">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-muted)]">
                      <tr>
                        <th scope="col" className="py-2.5 px-4 w-28">Priority</th>
                        <th scope="col" className="py-2.5 px-4">Request</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Quantity</th>
                        <th scope="col" className="py-2.5 px-4 w-36">Status</th>
                        <th scope="col" className="py-2.5 px-4 text-right w-28">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {queueRequests.map((req) => (
                        <tr
                          key={req._id}
                          className="hover:bg-[var(--surface-muted)]/70 transition-colors"
                        >
                          <td className="py-3 px-4 align-top">
                            <PriorityBadge priority={req.priority} />
                          </td>
                          <td className="py-3 px-4 align-top">
                            <Link
                              href="/requests"
                              className="font-medium text-[var(--text)] hover:text-[var(--accent)] line-clamp-1"
                            >
                              {req.title}
                            </Link>
                            <span className="text-xs text-[var(--text-muted)] capitalize block mt-0.5">
                              {req.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium text-[var(--text)] align-top">
                            {req.quantityNeeded !== undefined ? (
                              <span>
                                {req.quantityNeeded}{" "}
                                <span className="text-xs text-[var(--text-muted)] font-normal">
                                  {req.unit || ""}
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-[var(--text-muted)] tabular-nums align-top">
                            {formatDate(req.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column (4 cols): Priority & Allocation Summaries */}
            <div className="lg:col-span-4 space-y-6">
              {/* Priority Summary */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(23,35,45,0.06)]">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Requests by priority
                </h2>
                <div className="mt-4 space-y-3.5">
                  {(["critical", "high", "medium", "low"] as const).map((priority) => {
                    const count = data.requestsByPriority[priority] ?? 0;
                    const total = Math.max(data.overview.totalRequests, 1);
                    const pct = Math.min((count / total) * 100, 100);

                    const barColor = {
                      critical: "bg-[var(--danger)]",
                      high: "bg-[var(--warning)]",
                      medium: "bg-[var(--info)]",
                      low: "bg-[var(--text-muted)]",
                    }[priority];

                    return (
                      <div key={priority}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="capitalize font-medium text-[var(--text)] flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${barColor}`} aria-hidden="true" />
                            {priority}
                          </span>
                          <span className="tabular-nums font-semibold text-[var(--text)]">
                            {count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${pct}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Allocation Summary (for coordinator/admin) */}
              {!isFieldUser && data.allocationsByStatus && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(23,35,45,0.06)]">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[var(--text)]">
                      Allocation status
                    </h2>
                    <Link
                      href="/allocations"
                      className="text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      View all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(data.allocationsByStatus).map(([status, count]) => (
                      <div
                        key={status}
                        className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-left"
                      >
                        <p className="text-[11px] text-[var(--text-muted)] capitalize">
                          {status}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">
                          {count}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock by Category (for coordinator/admin) */}
              {!isFieldUser && data.stockByCategory && Object.keys(data.stockByCategory).length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(23,35,45,0.06)]">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[var(--text)]">
                      Stock by category
                    </h2>
                    <Link
                      href="/resources"
                      className="text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      Inventory →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(data.stockByCategory).map(([cat, qty]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0 text-xs"
                      >
                        <span className="font-medium text-[var(--text)] capitalize">
                          {cat}
                        </span>
                        <span className="tabular-nums font-semibold text-[var(--text)]">
                          {qty}{" "}
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">
                            units
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Field User Guide Panel */}
              {isFieldUser && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(23,35,45,0.06)]">
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    Field Volunteer Operations
                  </h2>
                  <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                    Submit emergency relief requests with GPS coordinates. Operations coordinators track, validate, and dispatch resources from central relief depots.
                  </p>
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <Link href="/requests">
                      <Button size="sm" className="w-full">
                        Create new request
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
