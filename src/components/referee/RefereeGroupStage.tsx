import { AlertCircle } from "lucide-react";
import type { TournamentMatch } from "@/lib/types";

export function RefereeGroupStage({
  tournament,
  teams,
  onSelectMatch,
}: {
  tournament: any;
  teams: any[];
  onSelectMatch: (matchId: string, teamAId: string | null, teamBId: string | null) => void;
}) {
  const teamName = (id: string | null) => (id ? teams.find((t: any) => t.id === id)?.name ?? "—" : "TBD");
  const groupMatches = tournament.matches.filter((m: TournamentMatch) => m.phase === "group");
  const groupCount = tournament.groupCount ?? Math.max(1, ...groupMatches.map((m: TournamentMatch) => m.groupNumber ?? 1));
  const groups = Array.from({ length: groupCount }, (_, index) => groupMatches.filter((m: TournamentMatch) => m.groupNumber === index + 1));
  const qualifiers = tournament.qualifiersPerGroup ?? 2;
  const scoringSystem = tournament.groupScoringSystem ?? "three-one-zero";

  const buildStandings = (matches: TournamentMatch[]) => {
    const teamIds = new Set<string>();
    matches.forEach((m: TournamentMatch) => { if (m.teamAId) teamIds.add(m.teamAId); if (m.teamBId) teamIds.add(m.teamBId); });
    const stats = new Map<string, { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; pts: number }>();
    teamIds.forEach((id: string) => stats.set(id, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0 }));
    matches.forEach((m: TournamentMatch) => {
      if (!m.winnerId && m.result !== "draw") return;
      const a = m.teamAId ? stats.get(m.teamAId) : undefined;
      const b = m.teamBId ? stats.get(m.teamBId) : undefined;
      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      if (a) { a.played++; a.gf += scoreA; a.ga += scoreB; }
      if (b) { b.played++; b.gf += scoreB; b.ga += scoreA; }
      if (m.result === "draw" && scoringSystem !== "winner-only") {
        if (a) { a.draws++; a.pts += 1; }
        if (b) { b.draws++; b.pts += 1; }
      } else if (m.winnerId) {
        const w = stats.get(m.winnerId);
        const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
        const l = loserId ? stats.get(loserId) : undefined;
        if (w) { w.wins++; w.pts += 3; }
        if (l) { l.losses++; }
      }
    });
    return [...stats.entries()]
      .sort(([, a], [, b]) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
      .map(([id, s], rank) => ({ id, rank: rank + 1, ...s }));
  };

  const decidedCount = groupMatches.filter((m: TournamentMatch) => m.winnerId || m.result === "draw").length;

  return (
    <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <AlertCircle className="size-4" />
            </span>
            Group Stage
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Top {qualifiers} from each group qualify.{" "}
            {scoringSystem === "three-one-zero" ? "Win 3 · Draw 1 · Loss 0" : "Winner-only scoring"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-foreground">{decidedCount}<span className="text-muted-foreground">/{groupMatches.length}</span></p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Matches Decided</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        {groups.map((matches: TournamentMatch[], index: number) => {
          const standings = buildStandings(matches);
          return (
            <div key={index} className="w-full sm:w-[calc(50%-0.625rem)] xl:w-[calc(33.333%-0.875rem)] rounded-xl border border-border bg-background overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Group {String.fromCharCode(65 + index)}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/15 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="w-6 py-2 pl-3 text-center">#</th>
                      <th className="py-2 pl-2 text-left">Team</th>
                      <th className="w-7 py-2 text-center">P</th>
                      <th className="w-7 py-2 text-center">W</th>
                      <th className="w-7 py-2 text-center">D</th>
                      <th className="w-7 py-2 text-center">L</th>
                      <th className="w-8 py-2 text-center">GD</th>
                      <th className="w-8 py-2 pr-3 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => {
                      const isQualifying = row.rank <= qualifiers;
                      const gd = row.gf - row.ga;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-border/50 last:border-0 transition-colors ${
                            isQualifying ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-2 pl-3 text-center">
                            <span className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              isQualifying
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-muted text-muted-foreground"
                            }`}>{row.rank}</span>
                          </td>
                          <td className={`py-2 pl-2 font-semibold ${isQualifying ? "text-foreground" : "text-muted-foreground"}`}>
                            {teamName(row.id)}
                          </td>
                          <td className="py-2 text-center text-muted-foreground tabular-nums">{row.played}</td>
                          <td className="py-2 text-center tabular-nums font-medium text-foreground">{row.wins}</td>
                          <td className="py-2 text-center tabular-nums text-muted-foreground">{row.draws}</td>
                          <td className="py-2 text-center tabular-nums text-muted-foreground">{row.losses}</td>
                          <td className={`py-2 text-center tabular-nums font-medium ${gd > 0 ? "text-emerald-600" : gd < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {gd > 0 ? `+${gd}` : gd}
                          </td>
                          <td className="py-2 pr-3 text-center tabular-nums font-bold text-foreground">{row.pts}</td>
                        </tr>
                      );
                    })}
                    {standings.length === 0 && (
                      <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">No teams assigned</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border bg-muted/10 px-3 py-2.5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fixtures</p>
                <div className="space-y-1.5">
                  {matches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No fixtures</p>
                  ) : matches.map((match: TournamentMatch) => {
                    const decided = !!match.winnerId || match.result === "draw";
                    const isPlayable = Boolean(match.teamAId) && Boolean(match.teamBId);
                    
                    return (
                      <div 
                        key={match.id} 
                        onClick={() => isPlayable && onSelectMatch(match.id, match.teamAId, match.teamBId)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                          decided ? "bg-background border border-border" : "bg-muted/30 border border-primary/30 hover:bg-primary/5 hover:border-primary cursor-pointer"
                        }`}
                      >
                        <span className={`flex-1 truncate text-right ${match.winnerId === match.teamAId ? "font-bold text-emerald-600" : match.winnerId === match.teamBId ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {teamName(match.teamAId)}
                        </span>
                        {decided ? (
                          <span className="shrink-0 rounded bg-muted/60 px-2 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
                            {match.scoreA ?? 0} – {match.scoreB ?? 0}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                            {isPlayable ? "Officiate" : "TBD"}
                          </span>
                        )}
                        <span className={`flex-1 truncate ${match.winnerId === match.teamBId ? "font-bold text-emerald-600" : match.winnerId === match.teamAId ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {teamName(match.teamBId)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}