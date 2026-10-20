"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

interface Centre {
  _id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  contactNumber?: string;
  isActive: boolean;
}

interface CentresResponse {
  success: boolean;
  data: Centre[];
}

export default function CentresPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("28.4089");
  const [lng, setLng] = useState("77.3178");
  const [contactNumber, setContactNumber] = useState("");
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

  const loadCentres = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<CentresResponse>("/centres", { token });
      setCentres(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load centres");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCentres();
  }, [loadCentres]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      setError("Enter valid latitude and longitude.");
      setSaving(false);
      return;
    }

    try {
      await apiRequest("/centres", {
        method: "POST",
        token,
        body: {
          name,
          address,
          location: { lat: latitude, lng: longitude },
          contactNumber,
        },
      });

      setName("");
      setAddress("");
      setContactNumber("");
      setMessage("Relief centre created.");
      await loadCentres();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create centre");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateCentre(id: string) {
    if (!window.confirm("Deactivate this centre?")) return;
    setError("");
    setMessage("");

    try {
      await apiRequest(`/centres/${id}`, {
        method: "DELETE",
        token,
      });
      setMessage("Centre deactivated.");
      await loadCentres();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate centre");
    }
  }

  const canManage = user?.role === "admin" || user?.role === "coordinator";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold">Relief Centres</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage relief locations and their coordinates.
        </p>

        {error && <p role="alert" className="mt-5 rounded-lg bg-rose-950 p-3 text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-lg bg-emerald-950 p-3 text-emerald-200">{message}</p>}

        {canManage && (
          <form onSubmit={handleCreate} className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
            <h2 className="text-xl font-semibold md:col-span-2">Add a centre</h2>

            <input required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} placeholder="Centre name" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />
            <input required maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />
            <input required type="number" step="any" min="-90" max="90" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />
            <input required type="number" step="any" min="-180" max="180" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />
            <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact number (optional)" className="rounded-lg border border-slate-700 bg-slate-950 p-3" />

            <p className="text-xs text-slate-500 md:col-span-2">
              Coordinates must represent the actual centre. The prefilled coordinates are examples only.
            </p>

            <button disabled={saving} className="rounded-lg bg-sky-600 p-3 font-semibold hover:bg-sky-500 disabled:opacity-60 md:col-span-2">
              {saving ? "Saving..." : "Add centre"}
            </button>
          </form>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">All centres</h2>

          {loading ? (
            <p className="py-8 text-slate-400">Loading centres...</p>
          ) : centres.length === 0 ? (
            <p className="py-8 text-slate-400">No centres found.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {centres.map((centre) => (
                <article key={centre._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{centre.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs ${centre.isActive ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                      {centre.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{centre.address}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    Lat: {centre.location.lat}, Lng: {centre.location.lng}
                  </p>
                  {centre.contactNumber && <p className="mt-2 text-sm text-slate-400">Contact: {centre.contactNumber}</p>}

                  {canManage && user?.role === "admin" && centre.isActive && (
                    <button onClick={() => void deactivateCentre(centre._id)} className="mt-4 rounded-lg border border-rose-900 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950">
                      Deactivate centre
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