
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Centre = {
    _id: string;
    name: string;
    address: string;
    isActive: boolean;
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
    unit: string;
    priority: string;
    status: string;
    assignedCentre?: Centre | string;
};

type Allocation = {
    _id: string;
    quantity: number;
    status: string;
    request: ReliefRequest | string;
    resource: Resource | string;
    centre: Centre | string;
    createdAt: string;
};

function getName( value: | string | { name?: string; title?: string; _id?: string } | undefined): string {
    if (!value) return "—";
    if (typeof value === "string") return value;
    return value.name ?? value.title ?? "—";
}

export default function AllocationsPage() {
    const [requests, setRequests] = useState<ReliefRequest[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [requestId, setRequestId] = useState("");
    const [resourceId, setResourceId] = useState("");
    const [quantity, setQuantity] = useState("1");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const token = sessionStorage.getItem("token");

            if (!token) {
                window.location.href = "/login";
                return;
            }

            const [requestData, resourceData, allocationData] =
                await Promise.all([
                    apiRequest<{ requests: ReliefRequest[] }>(
                        "/requests",
                        { token }
                    ),
                    apiRequest<{ resources: Resource[] }>(
                        "/resources",
                        { token }
                    ),
                    apiRequest<{ allocations: Allocation[] }>(
                        "/allocations",
                        { token }
                    ),
                ]);

            setRequests(requestData.requests || []);
            setResources(resourceData.resources || []);
            setAllocations(allocationData.allocations || []);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load allocation data."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const selectedRequest = requests.find(
        (request) => request._id === requestId
    );

    const compatibleResources = resources.filter((resource) => {
        if (resource.quantity <= 0) return false;
        if (
            selectedRequest &&
            resource.category !== selectedRequest.category
        ) {
            return false;
        }

        if (
            selectedRequest &&
            resource.unit.toLowerCase() !== selectedRequest.unit.toLowerCase()
        ) {
            return false;
        }

        if (
            selectedRequest?.assignedCentre &&
            getName(selectedRequest.assignedCentre) !== "—"
        ) {
            const assignedId =
                typeof selectedRequest.assignedCentre === "string"
                    ? selectedRequest.assignedCentre
                    : selectedRequest.assignedCentre._id;

            const resourceCentreId =
                typeof resource.centre === "string"
                    ? resource.centre
                    : resource.centre._id;

            if (assignedId !== resourceCentreId) return false;
        }

        return true;
    });

    async function handleAllocate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");

        const amount = Number(quantity);

        if (!requestId || !resourceId) {
            setError("Select a request and a resource.");
            return;
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            setError("Quantity must be a positive whole number.");
            return;
        }

        if (!selectedRequest) {
            setError("Selected request could not be found.");
            return;
        }

        if (amount > selectedRequest.quantityNeeded) {
            setError("Quantity cannot exceed the request's required quantity.");
            return;
        }

        setSubmitting(true);

        try {
            const token = sessionStorage.getItem("token");

            await apiRequest("/allocations", {
                method: "POST",
                token: token || undefined,
                body: {
                    requestId,
                    resourceId,
                    quantity: amount,
                },
            });

            setMessage("Resource allocated successfully.");
            setRequestId("");
            setResourceId("");
            setQuantity("1");
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Allocation failed."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-950 p-8 text-white">
                Loading allocation data...
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <header>
                    <p className="text-sm font-medium text-cyan-400">
                        DISASTER RELIEF MANAGEMENT
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">Resource Allocations</h1>
                    <p className="mt-2 text-slate-400">
                        Match pending relief requests with available inventory.
                    </p>
                </header>

                {error && (
                    <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-300">
                        {message}
                    </div>
                )}

                <section className="grid gap-6 lg:grid-cols-2">
                    <form
                        onSubmit={handleAllocate}
                        className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6"
                    >
                        <h2 className="text-xl font-semibold">Create Allocation</h2>

                        <div>
                            <label className="mb-2 block text-sm text-slate-300">
                                Relief request
                            </label>
                            <select
                                value={requestId}
                                onChange={(event) => {
                                    setRequestId(event.target.value);
                                    setResourceId("");
                                }}
                                required
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                            >
                                <option value="">Select a pending request</option>
                                {requests
                                    .filter((request) => request.status === "pending")
                                    .map((request) => (
                                        <option key={request._id} value={request._id}>
                                            {request.title} — {request.priority} —{" "}
                                            {request.quantityNeeded} {request.unit}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {selectedRequest && (
                            <div className="rounded-lg bg-slate-950 p-4 text-sm text-slate-300">
                                <p>
                                    <span className="text-slate-500">Category:</span>{" "}
                                    {selectedRequest.category}
                                </p>
                                <p className="mt-1">
                                    <span className="text-slate-500">Required:</span>{" "}
                                    {selectedRequest.quantityNeeded} {selectedRequest.unit}
                                </p>
                                <p className="mt-1">
                                    <span className="text-slate-500">Priority:</span>{" "}
                                    {selectedRequest.priority}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm text-slate-300">
                                Available resource
                            </label>
                            <select
                                value={resourceId}
                                onChange={(event) => setResourceId(event.target.value)}
                                required
                                disabled={!requestId}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 disabled:opacity-50"
                            >
                                <option value="">Select compatible inventory</option>
                                {compatibleResources.map((resource) => (
                                    <option key={resource._id} value={resource._id}>
                                        {resource.name} — {resource.quantity} {resource.unit}{" "}
                                        available ({getName(resource.centre)})
                                    </option>
                                ))}
                            </select>

                            {requestId && compatibleResources.length === 0 && (
                                <p className="mt-2 text-sm text-amber-400">
                                    No compatible resources are currently available.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm text-slate-300">
                                Quantity to allocate
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={selectedRequest?.quantityNeeded}
                                step="1"
                                value={quantity}
                                onChange={(event) => setQuantity(event.target.value)}
                                required
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || compatibleResources.length === 0}
                            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? "Allocating..." : "Allocate Resources"}
                        </button>
                    </form>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <h2 className="text-xl font-semibold">Allocation Overview</h2>

                        <div className="mt-5 grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-slate-950 p-5">
                                <p className="text-sm text-slate-400">Total allocations</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {allocations.length}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-5">
                                <p className="text-sm text-slate-400">Pending requests</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {requests.filter((r) => r.status === "pending").length}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-5">
                                <p className="text-sm text-slate-400">Available items</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {resources.filter((r) => r.quantity > 0).length}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-5">
                                <p className="text-sm text-slate-400">Active centres</p>
                                <p className="mt-2 text-3xl font-bold">
                                    {new Set(
                                        resources.map((r) =>
                                            typeof r.centre === "string"
                                                ? r.centre
                                                : r.centre._id
                                        )
                                    ).size}
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-6 text-slate-400">
                            Inventory is deducted when an allocation succeeds. Always verify
                            the request, resource category, unit and quantity before
                            allocating.
                        </p>
                    </section>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    <div className="border-b border-slate-800 p-6">
                        <h2 className="text-xl font-semibold">Allocation History</h2>
                    </div>

                    {allocations.length === 0 ? (
                        <p className="p-6 text-slate-400">No allocations found yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400">
                                    <tr>
                                        <th className="p-4">Request</th>
                                        <th className="p-4">Resource</th>
                                        <th className="p-4">Centre</th>
                                        <th className="p-4">Quantity</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allocations.map((allocation) => (
                                        <tr
                                            key={allocation._id}
                                            className="border-t border-slate-800"
                                        >
                                            <td className="p-4">
                                                {getName(allocation.request)}
                                            </td>
                                            <td className="p-4">
                                                {getName(allocation.resource)}
                                            </td>
                                            <td className="p-4">
                                                {getName(allocation.centre)}
                                            </td>
                                            <td className="p-4">{allocation.quantity}</td>
                                            <td className="p-4">
                                                <span className="rounded-full bg-cyan-950 px-3 py-1 text-cyan-300">
                                                    {allocation.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap p-4 text-slate-400">
                                                {new Date(allocation.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <button
                    onClick={loadData}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                >
                    Refresh data
                </button>
            </div>
        </main>
    );
}
