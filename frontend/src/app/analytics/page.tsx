"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Download,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Package,
  Building2,
  Users,
  Layers,
  Truck,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  Button,
  LoadingState,
  ErrorState,
  StatusBadge,
  Toast,
} from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthUser, AnalyticsData, ApiResponse } from "@/types";

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Auth verification
  useEffect(() => {
    const savedToken = sessionStorage.getItem("authToken");
    const savedUser = sessionStorage.getItem("authUser");

    if (!savedToken || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as AuthUser;
      if (parsedUser.role !== "admin" && parsedUser.role !== "coordinator") {
        router.replace("/dashboard");
        return;
      }
      setToken(savedToken);
      setUser(parsedUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await apiRequest<ApiResponse<AnalyticsData>>("/dashboard/analytics", {
        token,
      });
      setData(res.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate system analytics and operational reports."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void loadAnalytics();
  }, [token, loadAnalytics]);

  function handleLogout() {
    sessionStorage.clear();
    router.replace("/login");
  }

  // Export comprehensive operational audit report to CSV
  function exportAuditReportCSV() {
    if (!data) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    let csv = `ReliefOps - Comprehensive Operations & Distribution Audit Report\n`;
    csv += `Generated At,${new Date().toLocaleString()}\n\n`;

    // Section 1: Executive KPI Summary
    csv += `EXECUTIVE KPIS\n`;
    csv += `Metric,Value\n`;
    csv += `Total Relief Requests,${data.summary.totalRequests}\n`;
    csv += `Fulfilled Requests,${data.summary.fulfilledRequests}\n`;
    csv += `Fulfillment Rate,${data.summary.fulfillmentRatePct}%\n`;
    csv += `Total Units Available,${data.summary.totalStockAvailable}\n`;
    csv += `Total Units Allocated,${data.summary.totalUnitsAllocated}\n`;
    csv += `Total Units Delivered,${data.summary.totalUnitsDelivered}\n`;
    csv += `Active Facilities,${data.summary.activeReliefCentres}\n`;
    csv += `Active Personnel,${data.summary.totalRegisteredUsers}\n\n`;

    // Section 2: Category Breakdown
    csv += `COMMODITY DEMAND & INVENTORY BREAKDOWN\n`;
    csv += `Category,Current Stock (Units),Open Requests,Allocated Units\n`;
    data.categoryDistributions.forEach((c) => {
      csv += `"${c.category}",${c.totalUnits},${c.requestCount},${c.allocatedUnits}\n`;
    });
    csv += `\n`;

    // Section 3: Facility Depot Load
    csv += `RELIEF CENTRE WORKLOAD & DISPATCH LOGISTICS\n`;
    csv += `Centre Name,Stock Stored,Active Allocations,Dispatched,Delivered\n`;
    data.centreLoads.forEach((c) => {
      csv += `"${c.centreName}",${c.totalStockUnits},${c.activeAllocations},${c.dispatchedAllocations},${c.deliveredAllocations}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reliefops-audit-report-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage({
      text: "Comprehensive operational audit report downloaded as CSV.",
      type: "success",
    });
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive operational performance, distribution logs, and centre workload."
        primaryAction={
          <Button
            size="sm"
            onClick={exportAuditReportCSV}
            disabled={loading || !data}
            icon={<Download className="h-4 w-4" />}
          >
            Export Full Report (CSV)
          </Button>
        }
        secondaryAction={
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={() => void loadAnalytics(true)}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState
            title="Failed to load analytics"
            message={error}
            onRetry={() => void loadAnalytics(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <LoadingState type="metric" />
          <LoadingState type="table" rows={6} />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Section 1: Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Fulfillment Rate */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Fulfillment Rate
                </span>
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
                {data.summary.fulfillmentRatePct}%
              </p>
              <div className="mt-2 h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full"
                  style={{ width: `${Math.min(data.summary.fulfillmentRatePct, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {data.summary.fulfilledRequests} of {data.summary.totalRequests} requests fulfilled
              </p>
            </div>

            {/* KPI 2: Available Inventory */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Stock Available
                </span>
                <Package className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
                {data.summary.totalStockAvailable}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Units stored across {data.summary.activeReliefCentres} active centres
              </p>
            </div>

            {/* KPI 3: Units Delivered */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Units Delivered
                </span>
                <Truck className="h-4 w-4 text-[var(--success)]" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--success)]">
                {data.summary.totalUnitsDelivered}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {data.summary.totalUnitsAllocated} units allocated in total
              </p>
            </div>

            {/* KPI 4: Active Personnel */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Active Personnel
                </span>
                <Users className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
                {data.summary.totalRegisteredUsers}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Field users & operational coordinators
              </p>
            </div>
          </div>

          {/* Section 2: Split Views (Request Funnel & Priority Distribution) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Lifecycle Funnel */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                Relief Request Lifecycle Funnel
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Real-time tracking from field submission to verified delivery.
              </p>

              <div className="space-y-3">
                {Object.entries(data.statusFunnel).map(([status, count]) => {
                  const total = Math.max(data.summary.totalRequests, 1);
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <StatusBadge status={status} />
                        <span className="font-mono tabular-nums font-semibold text-[var(--text)]">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Urgency Distribution */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                Urgency & Priority Breakdown
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Distribution of emergency relief severity levels across regions.
              </p>

              <div className="space-y-3.5">
                {(["critical", "high", "medium", "low"] as const).map((priority) => {
                  const count = data.priorityBreakdown[priority] || 0;
                  const total = Math.max(data.summary.totalRequests, 1);
                  const pct = Math.round((count / total) * 100);

                  const barColor = {
                    critical: "bg-[var(--danger)]",
                    high: "bg-[var(--warning)]",
                    medium: "bg-[var(--info)]",
                    low: "bg-[var(--text-muted)]",
                  }[priority];

                  return (
                    <div key={priority}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="capitalize font-semibold text-[var(--text)] flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${barColor}`} />
                          {priority} Priority
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-[var(--text)]">
                          {count} requests
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Commodity Demand vs Supply Table */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Commodity Demand vs Current Stockpile Matrix
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Inventory balance across essential relief aid categories.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                  <tr>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Available Stock</th>
                    <th className="py-2.5 px-4 text-right">Open Requests</th>
                    <th className="py-2.5 px-4 text-right">Allocated Units</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.categoryDistributions.map((c) => {
                    const isDeficit = c.totalUnits < c.allocatedUnits;
                    return (
                      <tr key={c.category} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                        <td className="py-3 px-4 font-medium capitalize text-[var(--text)]">
                          {c.category}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text)]">
                          {c.totalUnits}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-muted)]">
                          {c.requestCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text)]">
                          {c.allocatedUnits}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isDeficit ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-800 border border-red-200">
                              Stock Alert
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Adequate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Relief Centre Depot Workload Table */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Relief Centre Depot Workload & Logistics
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Active facility allocation and dispatch pipeline.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                  <tr>
                    <th className="py-2.5 px-4">Centre Facility</th>
                    <th className="py-2.5 px-4 text-right">Inventory Units</th>
                    <th className="py-2.5 px-4 text-right">Active Allocations</th>
                    <th className="py-2.5 px-4 text-right">In Transit (Dispatched)</th>
                    <th className="py-2.5 px-4 text-right">Delivered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.centreLoads.map((centre) => (
                    <tr key={centre.centreId} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text)]">
                        {centre.centreName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text)]">
                        {centre.totalStockUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-muted)]">
                        {centre.activeAllocations}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--warning)] font-medium">
                        {centre.dispatchedAllocations}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--success)] font-medium">
                        {centre.deliveredAllocations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </AppShell>
  );
}
