import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel } from "@/components/ui-kit";
import { PlayerRow, positions } from "@/components/admin/PlayerRow";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { PlayerPosition } from "@/lib/types";

export const Route = createFileRoute("/admin-players")({
  head: () => ({
    meta: [
      { title: "Players — AW Drone Soccer Leagues System" },
      { name: "description", content: "Manage all registered players across every team: edit details, review status, and remove entries." },
    ],
  }),
  component: AdminPlayersPage,
});

function AdminPlayersPage() {
  const { state, emit } = useMockWebSocket();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | "all">("all");

  const filtered = state.players.filter((p) => {
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = teamFilter === "all" || p.teamId === teamFilter;
    const matchesPosition = positionFilter === "all" || p.position === positionFilter;
    return matchesSearch && matchesTeam && matchesPosition;
  });

  return (
    <DashboardLayout>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        League control
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Players</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every player registered across the league, with full edit and review controls.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="auth-input pl-9"
            placeholder="Search by player name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="auth-input sm:w-48"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        >
          <option value="all">All teams</option>
          {state.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="auth-input sm:w-44"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value as PlayerPosition | "all")}
        >
          <option value="all">All positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <Panel title={`${filtered.length} player${filtered.length === 1 ? "" : "s"}`}>
          {filtered.length === 0 ? (
            <EmptyState
              title={search || teamFilter !== "all" || positionFilter !== "all" ? "No matching players" : "No players registered"}
              description="Rosters submitted with a team registration are listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Player</th>
                    <th className="px-5 py-3 font-semibold">No.</th>
                    <th className="px-5 py-3 font-semibold">Position</th>
                    <th className="px-5 py-3 font-semibold">Team</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <PlayerRow key={p.id} player={p} teams={state.teams} emit={emit} />
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