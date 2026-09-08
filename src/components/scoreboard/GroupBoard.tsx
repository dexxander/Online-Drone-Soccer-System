import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tournament, TournamentMatch, MatchSlot } from "@/lib/types";
import type { ThemeDef } from "@/lib/scoreboard-themes";

export function GroupBoard({ tournament, teams, slots, theme }: { tournament: Tournament; teams: any[]; slots: MatchSlot[]; theme: ThemeDef }) {
  const getTeamName = (id: string | null) => (id ? teams.find((t: any) => t.id === id)?.name ?? "—" : "TBD");
  
  const groupMatches = tournament.matches?.filter((m: TournamentMatch) => m.phase === "group") ?? [];
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
      const liveSlot = slots.find(s => s.match.id === m.id);
      const isLive = Boolean(liveSlot);
      const isCompleted = m.winnerId !== null || m.result === "draw";
      
      if (!isCompleted && !isLive) return;
      
      const scoreA = liveSlot ? liveSlot.match.scoreA : (m.scoreA ?? 0);
      const scoreB = liveSlot ? liveSlot.match.scoreB : (m.scoreB ?? 0);
      
      const a = m.teamAId ? stats.get(m.teamAId) : undefined;
      const b = m.teamBId ? stats.get(m.teamBId) : undefined;
      
      if (a) { a.played++; a.gf += scoreA; a.ga += scoreB; }
      if (b) { b.played++; b.gf += scoreB; b.ga += scoreA; }
      
      if (isCompleted) {
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
      }
    });
    
    return [...stats.entries()]
      .sort(([, a], [, b]) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
      .map(([id, s], rank) => ({ id, rank: rank + 1, ...s }));
  };

  if (!tournament.groupStageEnabled) {
    return (
      <div className={cn("flex flex-col gap-6 p-12 rounded-xl border backdrop-blur-xl transition-all duration-700 text-center", theme.cardBg, theme.border)}>
        <Trophy className={cn("size-16 mx-auto mb-4", theme.teamA.text)} />
        <h2 className={cn("text-4xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-8 text-lg", theme.textMuted)}>This tournament does not have a group stage.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8 p-8 rounded-xl border backdrop-blur-xl transition-all duration-700", theme.cardBg, theme.border)}>
      <div className="text-center mb-4">
        <h2 className={cn("text-3xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-1 text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>Group Stage Overview</p>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {groups.map((matches: TournamentMatch[], index: number) => {
          const standings = buildStandings(matches);
          return (
            <div key={index} className={cn("w-full sm:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] rounded-xl border overflow-hidden shadow-sm", theme.border, theme.cardBg)}>
              <div className={cn("px-4 py-3 border-b", theme.border, theme.headerBg)}>
                <h3 className={cn("text-sm font-bold uppercase tracking-widest", theme.textMain)}>
                  Group {String.fromCharCode(65 + index)}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("border-b text-[10px] font-bold uppercase tracking-wider bg-black/10 dark:bg-white/5", theme.border, theme.textMuted)}>
                      <th className="w-8 py-2.5 text-center">#</th>
                      <th className="py-2.5 pl-2 text-left">Team</th>
                      <th className="w-8 py-2.5 text-center">P</th>
                      <th className="w-8 py-2.5 text-center">W</th>
                      <th className="w-8 py-2.5 text-center">D</th>
                      <th className="w-8 py-2.5 text-center">L</th>
                      <th className="w-10 py-2.5 text-center">GD</th>
                      <th className="w-10 py-2.5 pr-4 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => {
                      const isQualifying = row.rank <= qualifiers;
                      const gd = row.gf - row.ga;
                      return (
                        <tr key={row.id} className={cn("border-b last:border-0", theme.border, isQualifying ? theme.teamA.bg : "bg-transparent")}>
                          <td className="py-2.5 pl-2 text-center">
                            <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-bold", isQualifying ? theme.teamA.text + " bg-black/20" : theme.textMuted)}>
                              {row.rank}
                            </span>
                          </td>
                          <td className={cn("py-2.5 pl-2 font-bold text-left", isQualifying ? theme.textMain : theme.textMuted)}>
                            {getTeamName(row.id)}
                          </td>
                          <td className={cn("py-2.5 text-center tabular-nums font-medium", theme.textMuted)}>{row.played}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-bold", theme.textMain)}>{row.wins}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-medium", theme.textMuted)}>{row.draws}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-medium", theme.textMuted)}>{row.losses}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-bold", gd > 0 ? "text-emerald-500" : gd < 0 ? "text-red-500" : theme.textMuted)}>
                            {gd > 0 ? `+${gd}` : gd}
                          </td>
                          <td className={cn("py-2.5 pr-4 text-center tabular-nums font-black text-lg", theme.textMain)}>{row.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── FIXTURES LIST UNDER THE STANDINGS ── */}
              <div className={cn("border-t px-4 py-3 bg-black/10 dark:bg-white/5", theme.border)}>
                <p className={cn("mb-3 text-[10px] font-bold uppercase tracking-widest", theme.textMuted)}>Fixtures</p>
                <div className="flex flex-col gap-2">
                  {matches.length === 0 ? (
                    <p className={cn("text-xs", theme.textMuted)}>No fixtures</p>
                  ) : matches.map((match: TournamentMatch) => {
                    const decided = !!match.winnerId || match.result === "draw";
                    const liveSlot = slots.find(s => s.match.id === match.id);
                    const scoreA = liveSlot ? liveSlot.match.scoreA : (match.scoreA ?? 0);
                    const scoreB = liveSlot ? liveSlot.match.scoreB : (match.scoreB ?? 0);
                    
                    return (
                      <div key={match.id} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs border", decided ? cn("bg-black/10 dark:bg-white/5", theme.border) : cn("bg-transparent", theme.border))}>
                        <span className={cn("flex-1 truncate text-right font-semibold", match.winnerId === match.teamAId ? theme.textMain : theme.textMuted)}>
                          {getTeamName(match.teamAId)}
                        </span>
                        
                        {decided ? (
                          <span className={cn("shrink-0 rounded px-2 py-1 text-[10px] font-bold tabular-nums border", theme.cardBg, theme.border, theme.textMain)}>
                            {scoreA} – {scoreB}
                          </span>
                        ) : (
                          <span className={cn("shrink-0 text-[10px] font-bold", theme.textMuted)}>vs</span>
                        )}

                        <span className={cn("flex-1 truncate font-semibold", match.winnerId === match.teamBId ? theme.textMain : theme.textMuted)}>
                          {getTeamName(match.teamBId)}
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
    </div>
  );
}