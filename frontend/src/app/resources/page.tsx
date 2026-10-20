"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

type Category = "food" | "water" | "medicine" | "clothing" | "shelter" | "other";

interface Centre {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Resource {
  _id: string;
  name: string;
  category: Category;
  unit: string;
  quantity: number;
  centre: Centre | string;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
}

const categories: Category[] = ["food", "water", "medicine", "clothing", "shelter", "other"];

export default function ResourcesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("water");
  const [unit, setUnit] = useState("litres");
  const [quantity, setQuantity] = useState("100");
  const [centre, setCentre] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const [resourceResult, centreResult] = await Promise.all([
        apiRequest<ListResponse<Resource>>("/resources", { token }),
        apiRequest<ListResponse<Centre>>("/centres", { token }),
      ]);

      setResources(resourceResult.data);
      const activeCentres = centreResult.data.filter((item) => item.isActive);
      setCentres(activeCentres);
      setCentre((current) =>
        activeCentres.some((item) => item._id === current)
          ? current
          : activeCentres[0]?._id ?? ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const parsedQuantity = Number(quantity);
    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 0) {
      setError("Quantity must be a non-negative whole number.");
      return;
    }
    if (!centre) {
      setError("Create an active relief centre first.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/resources", {
        method: "POST",
        token,
        body: { name, category, unit, quantity: parsedQuantity, centre },
      });

      setName("");
      setMessage("Resource added to inventory.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add resource");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(id: string) {
    if (!window.confirm("Delete this resource item?")) return;
    setError("");
    setMessage("");

    try {
      await apiRequest(`/resources/${id}`, { method: "DELETE", token });
      setMessage("Resource deleted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete resource");
    }
  }

  const canManage = user?.role === "admin" || user?.role === "coordinator";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold">Resource Inventory</h1>
        <p className="mt-2 text-sm text-slate-400">
          Track food, water, medicine and other relief supplies.
        </p>

        {error && <p role="alert" className="mt-5 rounded-lg bg-rose-950 p-3 text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-lg bg-emerald-950 p-3 text-emerald-200">{message}</p>}

        {canManage && (
          <form onSubmit={createResource} className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
            <h2 className="text-xl font-semibold md:col-span-2">Add resource</h2>

            <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Resource name" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />

            <select value={category} onChange={(e) => {
              const next = e.target.value as Category;
              setCategory(next);
              setUnit(next === "water" ? "litres" : next === "food" ? "packets" : next === "clothing" ? "items" : next === "shelter" ? "kits" : "units");
            }} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              {categories.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
            </select>

            <input required maxLength={40} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit, e.g. litres" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />

            <input required type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Available quantity" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />

            <select required value={centre} onChange={(e) => setCentre(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-3 md:col-span-2">
              <option value="">Select relief centre</option>
              {centres.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>

            {centres.length === 0 && (
              <p className="text-sm text-amber-300 md:col-span-2">
                No active centres found. Add a centre before adding resources.
              </p>
            )}

            <button disabled={saving || centres.length === 0} className="rounded-lg bg-sky-600 p-3 font-semibold hover:bg-sky-500 disabled:opacity-60 md:col-span-2">
              {saving ? "Saving..." : "Add to inventory"}
            </button>
          </form>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Available inventory</h2>

          {loading ? (
            <p className="py-8 text-slate-400">Loading inventory...</p>
          ) : resources.length === 0 ? (
            <p className="py-8 text-slate-400">No inventory items found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-4 font-medium">Resource</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Available stock</th>
                    <th className="p-4 font-medium">Centre</th>
                    {canManage && <th className="p-4 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody className="bg-slate-950">
                  {resources.map((item) => {
                    const centreName = typeof item.centre === "string"
                      ? item.centre
                      : item.centre?.name ?? "Unknown";

                    return (
                      <tr key={item._id} className="border-t border-slate-800">
                        <td className="p-4 font-medium">{item.name}</td>
                        <td className="p-4 capitalize">{item.category}</td>
                        <td className="p-4">{item.quantity} {item.unit}</td>
                        <td className="p-4">{centreName}</td>
                        {canManage && (
                          <td className="p-4">
                            <button onClick={() => void deleteResource(item._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-rose-300 hover:bg-rose-950">
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}