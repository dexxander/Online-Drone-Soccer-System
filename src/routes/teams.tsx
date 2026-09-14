import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Shield, Users as UsersIcon } from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { TeamCategory } from "@/lib/types";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams — AW Drone Soccer Leagues System" },
      {
        name: "description",
        content: "Browse every approved drone soccer team, their category, and season record.",
      },
    ],
  }),
  component: TeamsPage,
});

const CATEGORIES: Array<TeamCategory | "All"> = ["All", "Junior", "Youth", "Collegiate", "Open"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamsPage() {
  const { state } = useMockWebSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TeamCategory | "All">("All");

  // Season record per team, derived from finished tournament matches.
  const recordByTeamId = useMemo(() => {
    const records = new Map<string, { wins: number; losses: number; draws: number }>();
    const bump = (id: string, key: "wins" | "losses" | "draws") => {
      const r = records.get(id) || { wins: 0, losses: 0, draws: 0 };
      r[key] += 1;
      records.set(id, r);
    };
    (state.tournaments || []).forEach((t) => {
      t.matches.forEach((m) => {
        if (m.isBye || !m.teamAId || !m.teamBId || !m.winnerId) return;
        if (m.result === "draw") {
          bump(m.teamAId, "draws");
          bump(m.teamBId, "draws");
          return;
        }
        const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
        bump(m.winnerId, "wins");
        bump(loserId, "losses");
      });
    });
    return records;
  }, [state.tournaments]);

  const teams = useMemo(() => {
    return (state.teams || [])
      .filter((team) => team.status === "approved")
      .filter((team) => selectedCategory === "All" || team.category === selectedCategory)
      .filter((team) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return team.name.toLowerCase().includes(q) || team.coachName.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.teams, selectedCategory, searchQuery]);

  const rosterCount = (teamId: string) => (state.players || []).filter((p) => p.teamId === teamId).length;

  return (
    <PublicLayout>
      {/* ── Header banner ── */}
      <div className="border-b border-border bg-[oklch(0.18_0.05_266)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Team Directory</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">Teams</h1>
            <p className="mt-2 text-sm text-white/70">
              Every approved team competing this season, with roster size and match record.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams, coaches..."
              className="w-full rounded-lg border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm font-medium text-white placeholder:text-white/50 backdrop-blur-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ── Category filter ── */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Team grid ── */}
        {teams.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center text-muted-foreground">
            <Shield className="size-8" />
            <p className="text-sm font-semibold">No teams match your search.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const record = recordByTeamId.get(team.id) || { wins: 0, losses: 0, draws: 0 };
              return (
                <Link
                  key={team.id}
                  to="/teams/$teamId"
                  params={{ teamId: team.id }}
                  className="flex flex-col rounded-xl border border-border bg-background p-6 shadow-card transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-4">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="size-14 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                        {initials(team.name)}
                      </span>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{team.name}</h3>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                        {team.category}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5" /> {rosterCount(team.id)} players · Coach {team.coachName}
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs font-semibold">
                    <span className="text-[oklch(0.6_0.17_150)]">{record.wins}W</span>
                    <span className="text-destructive">{record.losses}L</span>
                    <span className="text-muted-foreground">{record.draws}D</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </PublicLayout>
  );
}