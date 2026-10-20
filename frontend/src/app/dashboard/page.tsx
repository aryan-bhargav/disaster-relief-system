
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

interface DashboardData {
  overview: {
    totalRequests: number;
    pendingRequests: number;
    activeCentres: number;
    resourceTypes: number;
    totalStock: number;
    lowStockItems: number;
  };
  requestsByPriority: Record<string, number>;
  allocationsByStatus: Record<string, number>;
  recentRequests: {
    _id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    requestedBy?: { name?: string };
    assignedCentre?: { name?: string };
  }[];
}

interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Relief Requests", href: "/requests", icon: "▤" },
  { label: "Resources", href: "/resources", icon: "▣" },
  { label: "Relief Centres", href: "/centres", icon: "⌖" },
  { label: "Allocations", href: "/allocations", icon: "⇄" },
  { label: "Map", href: "/map", icon: "◎" },
];

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
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

    try {
      const response = await apiRequest<DashboardResponse>(
        "/dashboard/stats",
        { token }
      );
      setData(response.data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function logout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    router.replace("/login");
  }

  const stats = data
    ? [
        {
          label: "Total Requests",
          value: data.overview.totalRequests,
          color: "text-sky-300",
        },
        {
          label: "Pending Requests",
          value: data.overview.pendingRequests,
          color: "text-amber-300",
        },
        {
          label: "Active Centres",
          value: data.overview.activeCentres,
          color: "text-emerald-300",
        },
        {
          label: "Low Stock Items",
          value: data.overview.lowStockItems,
          color: "text-rose-300",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:flex">
      <aside className="border-b border-slate-800 bg-slate-900 p-5 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <Link href="/dashboard" className="text-lg font-bold">
          <span className="text-sky-400">Relief</span>Coord
        </Link>

        <p className="mt-2 text-xs text-slate-500">
          Disaster Relief Management
        </p>

        <nav className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-3 text-sm transition ${
                item.href === "/dashboard"
                  ? "bg-sky-600 font-semibold text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="mr-3" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-5">
          <p className="truncate text-sm font-medium">
            {user?.name ?? "Loading user..."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {user ? formatLabel(user.role.replace("_", " ")) : ""}
          </p>
          <button
            onClick={logout}
            className="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Overview</p>
            <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              Monitor requests, resources and relief operations.
            </p>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              void loadDashboard();
            }}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Refresh data
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-200"
          >
            {error}
            <p className="mt-1 text-rose-300/80">
              Ensure the backend is running and your account has dashboard access.
            </p>
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-xl border border-slate-800 p-8 text-slate-400">
            Loading dashboard data...
          </div>
        ) : data ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className={`mt-4 text-3xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </article>
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-semibold">Requests by priority</h2>
                <div className="mt-5 space-y-4">
                  {Object.entries(data.requestsByPriority).map(
                    ([priority, count]) => {
                      const total = Math.max(
                        data.overview.totalRequests,
                        1
                      );
                      const width = Math.min((count / total) * 100, 100);

                      return (
                        <div key={priority}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="text-slate-300">
                              {formatLabel(priority)}
                            </span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-sky-500"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-semibold">Allocation status</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {Object.entries(data.allocationsByStatus).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className="rounded-xl bg-slate-800/70 p-4"
                      >
                        <p className="text-sm text-slate-400">
                          {formatLabel(status)}
                        </p>
                        <p className="mt-2 text-2xl font-semibold">{count}</p>
                      </div>
                    )
                  )}
                </div>
              </article>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Recent requests</h2>
                <Link
                  href="/requests"
                  className="text-sm text-sky-400 hover:underline"
                >
                  View requests →
                </Link>
              </div>

              {data.recentRequests.length === 0 ? (
                <p className="py-8 text-sm text-slate-400">
                  No relief requests have been submitted yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="py-3 pr-4 font-medium">Request</th>
                        <th className="py-3 pr-4 font-medium">Priority</th>
                        <th className="py-3 pr-4 font-medium">Status</th>
                        <th className="py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRequests.map((request) => (
                        <tr
                          key={request._id}
                          className="border-b border-slate-800/70 last:border-0"
                        >
                          <td className="py-4 pr-4">
                            <p className="font-medium">{request.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatLabel(request.category)}
                            </p>
                          </td>
                          <td className="py-4 pr-4">
                            {formatLabel(request.priority)}
                          </td>
                          <td className="py-4 pr-4">
                            {formatLabel(request.status)}
                          </td>
                          <td className="py-4 text-slate-400">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          !error && (
            <p className="mt-8 text-slate-400">
              Dashboard data is unavailable.
            </p>
          )
        )}
      </main>
    </div>
  );
}
