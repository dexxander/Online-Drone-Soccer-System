import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Users, UserPlus, Shield, Award, UserCheck, Trash2, Edit2, X, Check, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { AppUser, UserTag } from "@/lib/types";

export const Route = createFileRoute("/admin-users")({
  head: () => ({
    meta: [
      { title: "Users — Drone Soccer League Control" },
      { name: "description", content: "Manage system users across referee, coach, player, and spectator roles." },
    ],
  }),
  component: AdminUsersPage,
});

const roleOptions: { value: UserTag | "all"; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "referee", label: "Referees" },
  { value: "coach", label: "Coaches" },
  { value: "player", label: "Players" },
  { value: "user", label: "Normal Users" },
  { value: "admin", label: "Administrators" },
];

const roleBadgeMap: Record<UserTag, { label: string; class: string }> = {
  admin: { label: "Admin", class: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  referee: { label: "Referee", class: "bg-primary/10 text-primary border-primary/30" },
  coach: { label: "Coach", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  player: { label: "Player", class: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  user: { label: "Normal User", class: "bg-muted text-muted-foreground border-border" },
};

const statusBadgeMap: Record<AppUser["status"], { label: string; class: string }> = {
  active: { label: "Active", class: "bg-success-soft text-success border-success/30" },
  pending: { label: "Pending", class: "bg-warning-soft text-warning border-warning/30" },
  suspended: { label: "Suspended", class: "bg-destructive/10 text-destructive border-destructive/30" },
};

function AdminUsersPage() {
  const { state, emit } = useMockWebSocket();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserTag | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AppUser["status"] | "all">("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as UserTag,
    status: "active" as AppUser["status"],
    teamName: "",
    phone: "",
  });

  const users = state.users || [];

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.teamName && u.teamName.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const countByRole = (role: UserTag) => users.filter((u) => u.role === role).length;

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      role: "user",
      status: "active",
      teamName: "",
      phone: "",
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      teamName: user.teamName || "",
      phone: user.phone || "",
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (editingUser) {
      emit("updateUserRole", (s) => {
        s.updateUserRole(editingUser.id, formData.role);
        s.updateUserStatus(editingUser.id, formData.status);
      });
    } else {
      emit("addUser", (s) =>
        s.addUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          status: formData.status,
          teamName: formData.teamName.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        })
      );
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove user "${name}" from the system?`)) {
      emit("removeUser", (s) => s.removeUser(id));
    }
  };

  const handleToggleStatus = (user: AppUser) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    emit("updateUserStatus", (s) => s.updateUserStatus(user.id, nextStatus));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            League control
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">System Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all registered referees, coaches, players, spectators, and administrators.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 shadow-sm"
        >
          <UserPlus className="size-4" /> Add New User
        </button>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total System Users"
          value={users.length}
          hint="All registered accounts"
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Referees"
          value={countByRole("referee")}
          hint="Certified match officials"
          icon={<Award className="size-5" />}
        />
        <StatCard
          label="Coaches"
          value={countByRole("coach")}
          hint="Team managers & leaders"
          icon={<Shield className="size-5" />}
        />
        <StatCard
          label="Players"
          value={countByRole("player")}
          hint="Roster pilots"
          icon={<UserCheck className="size-5" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="auth-input pl-9"
            placeholder="Search by name, email, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="auth-input sm:w-44"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserTag | "all")}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="auth-input sm:w-36"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppUser["status"] | "all")}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* User List Panel */}
      <div className="mt-6">
        <Panel title={`${filtered.length} User${filtered.length === 1 ? "" : "s"}`}>
          {filtered.length === 0 ? (
            <EmptyState
              title={search || roleFilter !== "all" || statusFilter !== "all" ? "No matching users found" : "No users registered"}
              description="Try adjusting your role or tag filter, or add a new user."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-5 py-3 font-semibold">Tag / Role</th>
                    <th className="px-5 py-3 font-semibold">Team / Org</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((user) => {
                    const roleBadge = roleBadgeMap[user.role] || roleBadgeMap.user;
                    const statusBadge = statusBadgeMap[user.status] || statusBadgeMap.active;

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-0.5 text-xs font-semibold ${roleBadge.class}`}
                          >
                            {roleBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {user.teamName ? (
                            <span className="font-medium text-foreground">{user.teamName}</span>
                          ) : (
                            <span className="italic text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadge.class}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                user.status === "active"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                                  : "border-success/30 bg-success-soft text-success hover:opacity-80"
                              }`}
                            >
                              {user.status === "active" ? "Suspend" : "Activate"}
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit user role"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
                              className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                              title="Delete user"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Add / Edit User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingUser ? "Edit User Account" : "Add New User Account"}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alex Rivera"
                  className="auth-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., alex.rivera@dronesoccer.org"
                  className="auth-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    System Tag / Role
                  </label>
                  <select
                    className="auth-input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserTag })}
                  >
                    <option value="referee">Referee</option>
                    <option value="coach">Coach</option>
                    <option value="player">Player</option>
                    <option value="user">Normal User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Account Status
                  </label>
                  <select
                    className="auth-input"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as AppUser["status"] })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Team Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sky Raptors"
                  className="auth-input"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Check className="size-4" />
                  {editingUser ? "Save User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
