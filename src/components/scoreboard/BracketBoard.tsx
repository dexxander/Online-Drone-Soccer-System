import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tournament, TournamentMatch, MatchSlot } from "@/lib/types";
import type { ThemeDef } from "@/routes/scoreboard";
import { getMatchTitle } from "@/lib/match-helpers";

export function BracketBoard({ tournament, teams, slots, theme }: { tournament: Tournament; teams: any[]; slots: MatchSlot[]; theme: ThemeDef }) {
  const getTeamName = (id: string | null) => (id ? teams.find((t: any) => t.id === id)?.name ?? "—" : "TBD");
  
  const groupMatches = tournament.matches?.filter((m: TournamentMatch) => m.phase === "group") ?? [];
  const knockoutMatches = tournament.matches?.filter((m: TournamentMatch) => m.phase !== "group") ?? [];
  const isGroupStageInProgress = tournament.groupStageEnabled && groupMatches.some((m: TournamentMatch) => !m.winnerId && m.result !== "draw");
  
  if (isGroupStageInProgress) {
    return (
      <div className={cn("flex flex-col gap-6 p-12 rounded-xl border backdrop-blur-xl transition-all duration-700 text-center", theme.cardBg, theme.border)}>
        <Trophy className={cn("size-16 mx-auto mb-4", theme.teamA.text)} />
        <h2 className={cn("text-4xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-2 text-xl font-semibold uppercase tracking-widest", theme.textMuted)}>Knockout Bracket</p>
        <p className={cn("mt-8 text-lg", theme.textMuted)}>The group stage is currently in progress. The bracket will be generated once all group matches have concluded.</p>
      </div>
    );
  }

  const rounds: number[] = Array.from(new Set(knockoutMatches.map((m: TournamentMatch) => m.round))).sort((a, b) => a - b);
  const maxRound = Math.max(...rounds, 0);

  return (
    <div className={cn("flex flex-col gap-4 w-full p-4 sm:p-8 rounded-xl border backdrop-blur-xl transition-all duration-700", theme.cardBg, theme.border)}>
      <div className={cn("text-center mb-2")}>
        <h2 className={cn("text-2xl sm:text-3xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-1 text-xs sm:text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>Knockout Bracket</p>
      </div>

      {/* Header Row */}
      <div className={cn("flex w-full items-center border-b pb-3", theme.border)}>
        {rounds.map((round: number) => (
          <div key={round} className="flex-1 flex items-center justify-center text-center px-1">
            <span className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 truncate", theme.textMuted)}>
              <span className={cn("hidden lg:flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0", theme.teamA.bg, theme.textMain)}>
                {round}
              </span>
              <span className="truncate">{getMatchTitle(round, maxRound)}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Bracket Tree Canvas */}
      <div className="flex w-full items-stretch py-2 min-h-[400px]">
        {rounds.map((round: number) => {
          const matches = knockoutMatches.filter((m: TournamentMatch) => m.round === round).sort((a: TournamentMatch, b: TournamentMatch) => a.slot - b.slot);
          const isLastRound = round === maxRound;

          return (
            <div key={round} className="flex-1 flex flex-col relative z-10">
              {matches.map((m: TournamentMatch, i: number) => {
                const isEven = i % 2 === 0;

                const displayTeamA = m.isBye && !m.teamAId ? "BYE" : getTeamName(m.teamAId);
                const displayTeamB = m.isBye && !m.teamBId ? "BYE" : getTeamName(m.teamBId);
                const isTeamAWinner = m.winnerId !== null && m.winnerId === m.teamAId;
                const isTeamBWinner = m.winnerId !== null && m.winnerId === m.teamBId;
                
                const liveSlot = slots.find((s: MatchSlot) => s.match.id === m.id);
                const scoreA = m.isBye ? "-" : (liveSlot ? liveSlot.match.scoreA : (m.scoreA !== undefined ? m.scoreA : "-"));
                const scoreB = m.isBye ? "-" : (liveSlot ? liveSlot.match.scoreB : (m.scoreB !== undefined ? m.scoreB : "-"));
                
                return (
                  <div key={m.id} className={cn("flex-1 flex flex-col justify-center relative py-1", isLastRound ? "px-1 sm:px-2" : "pr-5 pl-1 sm:pr-8 sm:pl-2")}>
                    
                    {/* --- VISIBLE CONNECTOR LINES ENGINE --- */}
                    {/* Top Branch */}
                    {!isLastRound && isEven && (
                      <div
                        className={cn("absolute border-r-2 border-t-2 border-current rounded-tr-xl z-0 opacity-50", theme.textMuted)}
                        style={{ right: '0.75rem', width: '1rem', top: '50%', bottom: '0%' }}
                      />
                    )}
                    {/* Bottom Branch */}
                    {!isLastRound && !isEven && (
                      <div
                        className={cn("absolute border-r-2 border-b-2 border-current rounded-br-xl z-0 opacity-50", theme.textMuted)}
                        style={{ right: '0.75rem', width: '1rem', top: '0%', bottom: '50%' }}
                      />
                    )}
                    {/* Stem connecting to next round */}
                    {!isLastRound && isEven && (
                      <div
                        className={cn("absolute border-t-2 border-current z-0 opacity-50", theme.textMuted)}
                        style={{ right: '-0.25rem', width: '1rem', top: '100%' }}
                      />
                    )}
                    {/* -------------------------------------- */}

                    {/* The Match Card */}
                    <div className={cn("relative z-10 flex flex-col rounded-lg border p-1.5 sm:p-2 shadow-sm transition-all w-full", theme.appBg, theme.border)}>
                      <div className="flex flex-col gap-1 sm:gap-1.5">
                        <div className={cn("flex items-center justify-between rounded px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-[9px] sm:text-xs lg:text-sm font-bold border", isTeamAWinner ? cn("border-transparent ring-1", theme.teamA.ring, theme.teamA.bg) : cn("bg-black/20", theme.border))}>
                          <span className={cn("truncate max-w-[50px] sm:max-w-[70px] lg:max-w-[120px] xl:max-w-[150px]", displayTeamA === "BYE" ? "italic opacity-50" : "", isTeamAWinner ? theme.textMain : theme.textMuted)} title={displayTeamA}>{displayTeamA}</span>
                          <span className={cn("font-mono shrink-0", liveSlot ? "text-emerald-500 animate-pulse" : "")}>{scoreA}</span>
                        </div>
                        <div className={cn("flex items-center justify-between rounded px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-[9px] sm:text-xs lg:text-sm font-bold border", isTeamBWinner ? cn("border-transparent ring-1", theme.teamB.ring, theme.teamB.bg) : cn("bg-black/20", theme.border))}>
                          <span className={cn("truncate max-w-[50px] sm:max-w-[70px] lg:max-w-[120px] xl:max-w-[150px]", displayTeamB === "BYE" ? "italic opacity-50" : "", isTeamBWinner ? theme.textMain : theme.textMuted)} title={displayTeamB}>{displayTeamB}</span>
                          <span className={cn("font-mono shrink-0", liveSlot ? "text-emerald-500 animate-pulse" : "")}>{scoreB}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}