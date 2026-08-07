import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ScrollText, ShieldAlert, History, UserCheck, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { AuditLogEntry } from "@/lib/types";

export const Route = createFileRoute("/admin-audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — Drone Soccer League Control" },
      { name: "description", content: "Dedicated administrative log for system activities and security events." },
    ],
  }),
  component: AdminAuditLogPage,
});

const categoryOptions: AuditLogEntry["category"][] = [
  "User Management",
  "Announcement",
  "Tournament",
  "Team",
  "System",
];

const categoryBadgeMap: Record<AuditLogEntry["category"], string> = {
  "User Management": "bg-purple-500/10 text-purple-600 border-purple-500/30",
  Announcement: "bg-primary/10 text-primary border-primary/30",
  Tournament: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Team: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  System: "bg-muted text-muted-foreground border-border",
};

function AdminAuditLogPage() {
  const { state, socket } = useMockWebSocket();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditLogEntry["category"] | "all">("all");

  const logs = state.auditLogs || [];

  useEffect(() => {
    void socket.refreshAuditLogs();
    const id = setInterval(() => void socket.refreshAuditLogs(), 3000);
    return () => clearInterval(id);
  }, [socket]);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search.trim() ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            League control
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dedicated system log tracking administrative actions, user changes, and security events.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Logged Events"
          value={logs.length}
          hint="Recorded actions & events"
          icon={<ScrollText className="size-5" />}
        />
        <StatCard
          label="Recent Activities"
          value={filtered.length}
          hint="Matching active filters"
          icon={<History className="size-5" />}
        />
        <StatCard
          label="Monitored Categories"
          value={categoryOptions.length}
          hint="Users, Teams, System & Announcements"
          icon={<Activity className="size-5" />}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="auth-input pl-9"
            placeholder="Search by action, user, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="auth-input sm:w-52"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as AuditLogEntry["category"] | "all")}
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <Panel title={`Audit Log Records (${filtered.length})`}>
          {filtered.length === 0 ? (
            <EmptyState
              title={search || categoryFilter !== "all" ? "No matching log entries" : "Audit log is empty"}
              description="System activities and administrative actions will be automatically recorded here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                    <th className="px-5 py-3 font-semibold">Performed By</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Target / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {new Date(log.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{log.action}</td>
                      <td className="px-5 py-3.5 text-muted-foreground font-medium">{log.performedBy}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${categoryBadgeMap[log.category] || "bg-muted text-muted-foreground"}`}
                        >
                          {log.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground">{log.target}</div>
                        {log.details && <div className="text-xs text-muted-foreground mt-0.5">{log.details}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}
