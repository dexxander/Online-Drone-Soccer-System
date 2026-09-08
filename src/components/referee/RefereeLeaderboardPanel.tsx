import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import type { TournamentMatch } from "@/lib/types";
import {
  buildLeaderboardRows,
  sortLeaderboardRows,
  usePenaltiesByMatch,
  useLeaderboardStageSync,
  type LeaderboardStage,
  type LeaderboardRow,
  type SortKey,
  type SortDir,
} from "@/lib/leaderboard";

export function RefereeLeaderboardPanel({ tournaments, teams }: { tournaments: any[]; teams: any[] }) {
  const [tournamentId, setTournamentId] = useState<string | null>(tournaments[0]?.id ?? null);
  const [stage, setStage] = useLeaderboardStageSync();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "totalScore", dir: "desc" });

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const matchIds = tournament
    ? (stage === "group"
      ? tournament.matches.filter((m: TournamentMatch) => m.phase === "group")
      : tournament.matches.filter((m: TournamentMatch) => (m.phase ?? "knockout") === "knockout" && !m.isBye)
    ).map((m: TournamentMatch) => m.id)
    : [];

  const penaltiesByMatch = usePenaltiesByMatch(matchIds);
  const rows = tournament ? buildLeaderboardRows(tournament, teams, stage, penaltiesByMatch) : [];
  const ranked = sortLeaderboardRows(rows, sort.key, sort.dir, stage);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "teamName" ? "asc" : "desc" }));
  };

  const headerButton = (label: string, key: SortKey, align: "left" | "center" = "center") => (
    <button
      onClick={() => toggleSort(key)}
      className={cn("flex w-full items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors", align === "center" ? "justify-center" : "justify-start")}
    >
      {label}
      {sort.key === key ? (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  );

  if (!tournaments.length) {
    return (
      <Panel title="Leaderboard">
        <EmptyState title="No tournaments yet" description="Create a tournament in the Admin dashboard to see leaderboards." />
      </Panel>
    );
  }

  return (
    <Panel title="Leaderboard">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <select className="auth-input py-1.5 text-xs h-auto w-auto max-w-[240px]" value={tournamentId ?? ""} onChange={(e) => setTournamentId(e.target.value)}>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["group", "knockout"] as LeaderboardStage[]).map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={cn("rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors", stage === s ? "bg-background text-primary shadow-sm border border-border" : "text-muted-foreground hover:bg-accent")}
              >
                {s === "group" ? "Group Stage" : "Knockout"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-12 py-3 text-center">#</th>
                <th className="py-3 pl-3 text-left">{headerButton("Team", "teamName", "left")}</th>
                <th className="w-28 py-3">{headerButton("Avg Score", "avgScore")}</th>
                <th className="w-28 py-3">{headerButton("Highest", "highestScore")}</th>
                <th className="w-24 py-3">{headerButton("GD", "goalDiff")}</th>
                <th className="w-28 py-3 pr-3">{headerButton("Total", "totalScore")}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row: LeaderboardRow, index: number) => {
                const isDQ = row.isDisqualified;
                const isQual = row.isQualifier;

                return (
                  <tr key={row.teamId} className={cn("border-b border-border/50 last:border-0", isDQ ? "opacity-50 bg-destructive/5" : isQual ? "bg-emerald-500/5" : "")}>
                    <td className="py-3 text-center">
                      <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold", isDQ ? "bg-destructive/10 text-destructive" : isQual ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                        {isDQ ? "DQ" : index + 1}
                      </span>
                    </td>
                    <td className="py-3 pl-3 font-semibold text-foreground">
                       {row.teamName}
                       {stage === "group" && !isDQ && isQual && <span className="ml-2 text-[9px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Qualified</span>}
                       {stage === "group" && !isDQ && !isQual && <span className="ml-2 text-[9px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Eliminated</span>}
                    </td>
                    <td className="py-3 text-center tabular-nums text-muted-foreground">{row.avgScore.toFixed(1)}</td>
                    <td className="py-3 text-center tabular-nums font-medium text-foreground">{row.highestScore}</td>
                    <td className={cn("py-3 text-center tabular-nums font-medium", row.goalDiff > 0 ? "text-emerald-600" : row.goalDiff < 0 ? "text-red-500" : "text-muted-foreground")}>
                      {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                    </td>
                    <td className="py-3 pr-3 text-center tabular-nums font-bold text-foreground">{row.totalScore}</td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No completed matches yet for this stage.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}