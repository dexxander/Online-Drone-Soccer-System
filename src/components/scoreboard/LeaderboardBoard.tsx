import { cn } from "@/lib/utils";
import type { Tournament, TournamentMatch } from "@/lib/types";
import type { ThemeDef } from "@/lib/scoreboard-themes";
import { buildLeaderboardRows, sortLeaderboardRows, usePenaltiesByMatch, type LeaderboardRow } from "@/lib/leaderboard";

export function LeaderboardBoard({ tournament, teams, theme, activeStage }: { tournament: Tournament; teams: any[]; theme: ThemeDef; activeStage: "group" | "knockout" }) {
  const stage = activeStage; 

  const matchIds = tournament
    ? (stage === "group"
      ? tournament.matches.filter((m: TournamentMatch) => m.phase === "group")
      : tournament.matches.filter((m: TournamentMatch) => (m.phase ?? "knockout") === "knockout" && !m.isBye)
    ).map((m: TournamentMatch) => m.id)
    : [];

  const penaltiesByMatch = usePenaltiesByMatch(matchIds);
  const rows = tournament ? buildLeaderboardRows(tournament, teams, stage, penaltiesByMatch) : [];
  const ranked = sortLeaderboardRows(rows, "totalScore", "desc", stage);

  return (
    <div className={cn("flex flex-col gap-8 p-8 rounded-xl border backdrop-blur-xl transition-all duration-700", theme.cardBg, theme.border)}>
      <div className="text-center mb-4">
        <h2 className={cn("text-4xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-2 text-lg font-semibold uppercase tracking-widest", theme.textMuted)}>
          {stage === "group" ? "Group Stage Leaderboard" : "Knockout Leaderboard"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className={cn("border-b text-xs font-bold uppercase tracking-wider bg-black/10 dark:bg-white/5", theme.border, theme.textMuted)}>
              <th className="w-16 py-4 text-center">#</th>
              <th className="py-4 pl-4 text-left">Team</th>
              <th className="w-32 py-4 text-center">Avg Score</th>
              <th className="w-32 py-4 text-center">Highest</th>
              <th className="w-28 py-4 text-center">GD</th>
              <th className="w-32 py-4 pr-4 text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row: LeaderboardRow, index: number) => {
              const isDQ = row.isDisqualified;
              const isQual = row.isQualifier;

              let rowClass = "border-b last:border-0 bg-transparent";
              let rankClass = "bg-black/20 text-muted-foreground";
              let textClass = theme.textMuted;

              if (stage === "group") {
                if (isDQ) {
                  rowClass = "border-b last:border-0 opacity-50 bg-red-500/10";
                  rankClass = "bg-red-500/20 text-red-500";
                } else if (isQual) {
                  rowClass = cn("border-b last:border-0", theme.teamA.bg);
                  rankClass = cn(theme.teamA.text, "bg-black/20 shadow-sm");
                  textClass = theme.textMain;
                }
              } else {
                if (isDQ) {
                  rowClass = "border-b last:border-0 opacity-50 bg-red-500/10";
                  rankClass = "bg-red-500/20 text-red-500";
                } else if (index < 3) {
                  rowClass = cn("border-b last:border-0", theme.teamA.bg);
                  rankClass = cn(theme.teamA.text, "bg-black/20 shadow-sm");
                  textClass = theme.textMain;
                } else {
                  textClass = theme.textMain;
                  rankClass = cn(theme.textMain, "bg-black/10");
                }
              }

              return (
                <tr key={row.teamId} className={cn(theme.border, rowClass, "transition-colors duration-500")}>
                  <td className="py-4 text-center">
                    <span className={cn("inline-flex size-8 items-center justify-center rounded-full text-xs font-black", rankClass)}>
                      {isDQ ? "DQ" : index + 1}
                    </span>
                  </td>
                  <td className={cn("py-4 pl-4 font-bold text-left text-lg", textClass)}>
                     {row.teamName}
                     {stage === "group" && !isDQ && isQual && <span className="ml-4 align-middle text-[10px] uppercase tracking-widest font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded shadow-sm">Qualified</span>}
                     {stage === "group" && !isDQ && !isQual && <span className="ml-4 align-middle text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2.5 py-1 rounded shadow-sm">Eliminated</span>}
                  </td>
                  <td className={cn("py-4 text-center tabular-nums font-medium", theme.textMuted)}>{row.avgScore.toFixed(1)}</td>
                  <td className={cn("py-4 text-center tabular-nums font-bold", textClass)}>{row.highestScore}</td>
                  <td className={cn("py-4 text-center tabular-nums font-bold text-lg", row.goalDiff > 0 ? "text-emerald-500" : row.goalDiff < 0 ? "text-red-500" : theme.textMuted)}>
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                  <td className={cn("py-4 pr-4 text-center tabular-nums font-black text-2xl", textClass)}>{row.totalScore}</td>
                </tr>
              );
            })}
            {ranked.length === 0 && (
              <tr><td colSpan={6} className={cn("py-12 text-center text-lg font-semibold", theme.textMuted)}>No completed matches yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}