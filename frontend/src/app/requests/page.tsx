
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

type RequestStatus =
  | "pending"
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled";

type Priority = "low" | "medium" | "high" | "critical";

interface ReliefRequest {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  unit: string;
  priority: Priority;
  status: RequestStatus;
  location: { lat: number; lng: number };
  createdAt: string;
}

interface RequestsResponse {
  success: boolean;
  data: ReliefRequest[];
  count: number;
}

const categories = [
  "food",
  "water",
  "medicine",
  "clothing",
  "shelter",
  "other",
];

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function RequestsPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("water");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("litres");
  const [lat, setLat] = useState("28.4089");
  const [lng, setLng] = useState("77.3178");

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
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("authUser");
      router.replace("/login");
    }
  }, [router]);

  const loadRequests = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      const query = params.toString();
      const response = await apiRequest<RequestsResponse>(
        `/requests${query ? `?${query}` : ""}`,
        { token }
      );

      setRequests(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load requests"
      );
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, priorityFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const quantityNumber = Number(quantity);
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      !Number.isSafeInteger(quantityNumber) ||
      quantityNumber < 1 ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Enter a valid positive whole quantity and valid coordinates.");
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("/requests", {
        method: "POST",
        token,
        body: {
          title,
          description,
          category,
          quantityNeeded: quantityNumber,
          unit,
          location: { lat: latitude, lng: longitude },
        },
      });

      setTitle("");
      setDescription("");
      setMessage("Relief request submitted successfully.");
      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit request"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id: string) {
    if (!window.confirm("Cancel this pending relief request?")) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`/requests/${id}/cancel`, {
        method: "PATCH",
        token,
        body: {},
      });

      setMessage("Request cancelled.");
      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not cancel request"
      );
    }
  }

  const isFieldUser = user?.role === "field_user";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="text-sm text-sky-400 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Relief operations</p>
            <h1 className="mt-1 text-3xl font-bold">Relief Requests</h1>
            <p className="mt-2 text-sm text-slate-400">
              Submit needs and track their progress.
            </p>
          </div>

          <button
            onClick={() => void loadRequests()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Refresh
          </button>
        </header>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-rose-950 p-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="mt-5 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">
            {message}
          </p>
        )}

        {isFieldUser && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
            <h2 className="text-xl font-semibold">Submit a relief request</h2>

            <form onSubmit={handleCreate} className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm">
                  Request title
                </label>
                <input
                  id="title"
                  required
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Drinking water required"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-2 block text-sm">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value === "water") setUnit("litres");
                    else if (e.target.value === "food") setUnit("packets");
                    else if (e.target.value === "medicine") setUnit("units");
                    else if (e.target.value === "clothing") setUnit("items");
                    else if (e.target.value === "shelter") setUnit("kits");
                    else setUnit("units");
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {label(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="mb-2 block text-sm">
                  Quantity needed
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
                />
              </div>

              <div>
                <label htmlFor="unit" className="mb-2 block text-sm">
                  Unit
                </label>
                <input
                  id="unit"
                  required
                  maxLength={40}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="litres, packets, units..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="mb-2 block text-sm">
                  Description
                </label>
                <textarea
                  id="description"
                  required
                  maxLength={2000}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the situation and urgency..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
                />
              </div>

              <div>
                <label htmlFor="lat" className="mb-2 block text-sm">
                  Latitude
                </label>
                <input
                  id="lat"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
                />
              </div>

              <div>
                <label htmlFor="lng" className="mb-2 block text-sm">
                  Longitude
                </label>
                <input
                  id="lng"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
                />
              </div>

              <p className="text-xs text-slate-500 md:col-span-2">
                Coordinates are currently entered manually. The shown defaults
                are examples, not verified locations. Use coordinates for the
                actual affected area.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-sky-600 px-5 py-3 font-semibold hover:bg-sky-500 disabled:opacity-60 md:col-span-2"
              >
                {submitting ? "Submitting..." : "Submit request"}
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Request list</h2>

            <div className="flex flex-wrap gap-3">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {(["pending", "allocated", "dispatched", "delivered", "cancelled"] as RequestStatus[]).map((s) => (
                  <option key={s} value={s}>{label(s)}</option>
                ))}
              </select>

              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">All priorities</option>
                {(["low", "medium", "high", "critical"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{label(p)}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-sm text-slate-400">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="py-10 text-sm text-slate-400">
              No requests found for the selected filters.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {requests.map((request) => (
                <article
                  key={request._id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{request.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {label(request.category)} · {request.quantityNeeded} {request.unit}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                      {label(request.priority)} priority
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">
                    {request.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="mt-1 text-sm">{label(request.status)}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {isFieldUser && request.status === "pending" && (
                    <button
                      onClick={() => void cancelRequest(request._id)}
                      className="mt-4 rounded-lg border border-rose-900 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950"
                    >
                      Cancel request
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
