import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, Medal } from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { EmptyState } from "@/components/ui-kit";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { TeamCategory } from "@/lib/types";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — AW Drone Soccer Leagues System" },
      {
        name: "description",
        content: "Global leaderboard of every approved team ranked by tournament points.",
      },
    ],
  }),
  component: RankingsPage,
});

const CATEGORIES: Array<TeamCategory | "All"> = ["All", "Junior", "Youth", "Collegiate", "Open"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function RankingsPage() {
  const { state } = useMockWebSocket();
  const [category, setCategory] = useState<TeamCategory | "All">("All");

  // Points table derived from finished tournament matches: win=3, draw=1, loss=0.
  const rows = useMemo(() => {
    const records = new Map(
      (state.teams || [])
        .filter((t) => t.status === "approved")
        .map((t) => [t.id, { team: t, wins: 0, losses: 0, draws: 0, played: 0, points: 0 }]),
    );
    (state.tournaments || []).forEach((t) => {
      t.matches.forEach((m) => {
        if (m.isBye || !m.teamAId || !m.teamBId || !m.winnerId) return;
        const a = records.get(m.teamAId);
        const b = records.get(m.teamBId);
        if (!a || !b) return;
        a.played += 1;
        b.played += 1;
        if (m.result === "draw") {
          a.draws += 1;
          b.draws += 1;
          a.points += 1;
          b.points += 1;
          return;
        }
        const winner = m.winnerId === m.teamAId ? a : b;
        const loser = m.winnerId === m.teamAId ? b : a;
        winner.wins += 1;
        winner.points += 3;
        loser.losses += 1;
      });
    });
    return Array.from(records.values())
      .filter((r) => category === "All" || r.team.category === category)
      .sort((x, y) => y.points - x.points || y.wins - x.wins || x.team.name.localeCompare(y.team.name));
  }, [state.teams, state.tournaments, category]);

  return (
    <PublicLayout>
      <div className="border-b border-border bg-[oklch(0.18_0.05_266)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Trophy className="size-6" /> Global Rankings
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Teams ranked by season points across all tournaments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === c
                    ? "bg-white text-[oklch(0.18_0.05_266)]"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {rows.length === 0 ? (
          <EmptyState title="No ranked teams yet" description="Rankings appear once matches are played." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.team.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i < 3 ? <Medal className="size-4 text-primary" /> : i + 1}
                    </TableCell>
                    <TableCell>
                      <Link to="/teams/$teamId" params={{ teamId: r.team.id }} className="flex items-center gap-3 font-semibold hover:text-primary">
                        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                          {initials(r.team.name)}
                        </span>
                        {r.team.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.team.category}</TableCell>
                    <TableCell className="text-center">{r.played}</TableCell>
                    <TableCell className="text-center">{r.wins}</TableCell>
                    <TableCell className="text-center">{r.draws}</TableCell>
                    <TableCell className="text-center">{r.losses}</TableCell>
                    <TableCell className="text-right font-bold">{r.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}