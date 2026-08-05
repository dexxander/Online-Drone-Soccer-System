import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel } from "@/components/ui-kit";
import { TeamRow, categories } from "@/components/admin/TeamRow";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { TeamCategory } from "@/lib/types";

export const Route = createFileRoute("/admin-teams")({
  head: () => ({
    meta: [
      { title: "Teams — Drone Soccer League Control" },
      { name: "description", content: "Manage all registered drone soccer teams: edit details, review status, and remove entries." },
    ],
  }),
  component: AdminTeamsPage,
});

function AdminTeamsPage() {
  const { state, emit } = useMockWebSocket();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TeamCategory | "all">("all");

  const filtered = state.teams.filter((t) => {
    const matchesSearch =
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.coachName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        League control
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Teams</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every team registered across the league, with full edit and review controls.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="auth-input pl-9"
            placeholder="Search by team or coach name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="auth-input sm:w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TeamCategory | "all")}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <Panel title={`${filtered.length} team${filtered.length === 1 ? "" : "s"}`}>
          {filtered.length === 0 ? (
            <EmptyState
              title={search || categoryFilter !== "all" ? "No matching teams" : "No teams registered"}
              description="Submissions from the registration portal appear here as pending."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Team</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Coach</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Players</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <TeamRow
                      key={t.id}
                      team={t}
                      playerCount={state.players.filter((p) => p.teamId === t.id).length}
                      emit={emit}
                    />
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