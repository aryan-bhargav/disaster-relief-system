"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  RotateCcw,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog,
  Toast,
} from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthUser, UserRecord, UserRole, ApiResponse } from "@/types";

export default function UsersManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Dialog state for role change or status toggle
  const [pendingAction, setPendingAction] = useState<{
    type: "role" | "status";
    user: UserRecord;
    newRole?: UserRole;
    newStatus?: boolean;
  } | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Auth & Admin verification
  useEffect(() => {
    const savedToken = sessionStorage.getItem("authToken");
    const savedUser = sessionStorage.getItem("authUser");

    if (!savedToken || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as AuthUser;
      if (parsedUser.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
      setToken(savedToken);
      setCurrentUser(parsedUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const loadUsers = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await apiRequest<ApiResponse<UserRecord[]>>("/users", {
        token,
      });
      setUsers(res.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to retrieve user registry."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void loadUsers();
  }, [token, loadUsers]);

  function handleLogout() {
    sessionStorage.clear();
    router.replace("/login");
  }

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  async function handleConfirmAction() {
    if (!pendingAction || !token) return;
    setSubmittingAction(true);

    try {
      if (pendingAction.type === "role" && pendingAction.newRole) {
        await apiRequest(`/users/${pendingAction.user._id}/role`, {
          method: "PATCH",
          token,
          body: { role: pendingAction.newRole },
        });
        setToastMessage({
          text: `User role updated to '${pendingAction.newRole}'.`,
          type: "success",
        });
      } else if (pendingAction.type === "status" && pendingAction.newStatus !== undefined) {
        await apiRequest(`/users/${pendingAction.user._id}/status`, {
          method: "PATCH",
          token,
          body: { isActive: pendingAction.newStatus },
        });
        setToastMessage({
          text: `User account has been ${pendingAction.newStatus ? "activated" : "deactivated"}.`,
          type: "success",
        });
      }
      setPendingAction(null);
      void loadUsers(true);
    } catch (err) {
      setToastMessage({
        text: err instanceof Error ? err.message : "Failed to perform user action.",
        type: "error",
      });
    } finally {
      setSubmittingAction(false);
    }
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldAlert className="h-3 w-3" />
            Administrator
          </span>
        );
      case "coordinator":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <ShieldCheck className="h-3 w-3" />
            Coordinator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
            <Shield className="h-3 w-3" />
            Field User
          </span>
        );
    }
  }

  return (
    <AppShell user={currentUser} onLogout={handleLogout}>
      <PageHeader
        title="User Management"
        description="Master administration for system roles, permissions, and account authorization."
        secondaryAction={
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={() => void loadUsers(true)}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState
            title="Failed to load user directory"
            message={error}
            onRetry={() => void loadUsers(false)}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-xs text-[var(--text-muted)] font-medium">
            Role:
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="coordinator">Coordinator</option>
            <option value="field_user">Field User</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState type="table" rows={6} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No registered user records match your current filter query."
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_2px_rgba(23,35,45,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Users directory">
              <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="py-2.5 px-4">User</th>
                  <th scope="col" className="py-2.5 px-4">Assigned Role</th>
                  <th scope="col" className="py-2.5 px-4">Status</th>
                  <th scope="col" className="py-2.5 px-4">Registered Date</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredUsers.map((u) => {
                  const isSelf = u._id === currentUser?.id;
                  return (
                    <tr key={u._id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text)] flex items-center gap-2">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {u.email}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-[var(--text-muted)] font-mono tabular-nums">
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Role select quick action */}
                          <select
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => {
                              const targetRole = e.target.value as UserRole;
                              if (targetRole !== u.role) {
                                setPendingAction({
                                  type: "role",
                                  user: u,
                                  newRole: targetRole,
                                });
                              }
                            }}
                            className="h-8 px-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] disabled:opacity-50"
                            aria-label={`Change role for ${u.name}`}
                          >
                            <option value="field_user">Field User</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="admin">Administrator</option>
                          </select>

                          {/* Status toggle action */}
                          <Button
                            size="sm"
                            variant={u.isActive ? "secondary" : "primary"}
                            disabled={isSelf}
                            onClick={() => {
                              setPendingAction({
                                type: "status",
                                user: u,
                                newStatus: !u.isActive,
                              });
                            }}
                            className="text-xs"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {pendingAction && (
        <ConfirmDialog
          isOpen={true}
          title={
            pendingAction.type === "role"
              ? "Confirm User Role Reassignment"
              : pendingAction.newStatus
              ? "Reactivate User Account"
              : "Deactivate User Account"
          }
          description={
            pendingAction.type === "role"
              ? `Are you sure you want to change the role of '${pendingAction.user.name}' (${pendingAction.user.email}) to '${pendingAction.newRole}'? This will immediately modify their system permissions.`
              : `Are you sure you want to ${
                  pendingAction.newStatus ? "reactivate" : "deactivate"
                } '${pendingAction.user.name}'? ${
                  !pendingAction.newStatus
                    ? "They will no longer be able to log in or perform emergency operations."
                    : "They will regain access to log in and perform their assigned role operations."
                }`
          }
          confirmLabel={
            pendingAction.type === "role"
              ? "Confirm Role Change"
              : pendingAction.newStatus
              ? "Activate Account"
              : "Deactivate Account"
          }
          variant={
            pendingAction.type === "status" && !pendingAction.newStatus
              ? "destructive"
              : "primary"
          }
          onConfirm={() => void handleConfirmAction()}
          onClose={() => setPendingAction(null)}
          loading={submittingAction}
        />
      )}

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
