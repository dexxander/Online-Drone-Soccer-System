import { Trophy } from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { Team, Tournament } from "@/lib/types";

export function Bracket({
  tournament,
  teams,
  emit,
}: {
  tournament: Tournament;
  teams: Team[];
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const teamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? "—" : null);
  const knockoutMatches = tournament.matches.filter((m) => (m.phase ?? "knockout") === "knockout");
  if (knockoutMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center">
        <Trophy className="mx-auto size-8 text-muted-foreground/40 mb-3" />
        <p className="font-semibold text-foreground">Knockout bracket is waiting for group results</p>
        <p className="mt-1 text-sm text-muted-foreground">The qualifying teams will be placed here after all group matches are decided.</p>
      </div>
    );
  }
  const rounds = Math.max(...knockoutMatches.map((m) => m.round));

  const getRoundTitle = (r: number) => {
    if (r === rounds) return "Final";
    if (r === rounds - 1) return "Semifinals";
    if (r === rounds - 2) return "Quarterfinals";
    const matchCount = knockoutMatches.filter(m => m.round === r).length;
    return `Round of ${matchCount * 2}`;
  };

  // Find the champion
  const finalMatch = knockoutMatches.find((m) => m.round === rounds);
  const champion = finalMatch?.winnerId ? teamName(finalMatch.winnerId) : null;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Trophy className="size-4 text-primary" />
          Knockout Bracket
        </h2>
        {champion && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
            <Trophy className="size-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Champion: {champion}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto p-6">
        <div className="flex items-stretch gap-0 min-w-max">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
            const matches = knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
            const isLast = round === rounds;
            const columnWidth = 240;
            const connectorWidth = 40;

            return (
              <div key={round} className="flex flex-col" style={{ width: columnWidth + (isLast ? 0 : connectorWidth) }}>
                {/* Round Header */}
                <div className="mb-4 px-1" style={{ width: columnWidth }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {getRoundTitle(round)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {matches.length} match{matches.length !== 1 ? "es" : ""}
                  </p>
                </div>

                {/* Match cards with connectors */}
                <div className="flex-1 flex flex-col justify-around">
                  {matches.map((m) => {
                    const hasWinner = !!m.winnerId;
                    const canDecide = !m.isBye && m.teamAId && m.teamBId && !m.winnerId;

                    return (
                      <div key={m.id} className="flex items-center">
                        {/* Match Card */}
                        <div
                          className={`rounded-lg border overflow-hidden transition-all ${
                            hasWinner
                              ? "border-emerald-500/30 shadow-sm"
                              : canDecide
                                ? "border-primary/30 shadow-sm"
                                : "border-border"
                          }`}
                          style={{ width: columnWidth }}
                        >
                          {/* Team A Row */}
                          <div className={`flex items-center justify-between px-3 py-2 text-sm border-b border-border/40 ${
                            m.winnerId === m.teamAId
                              ? "bg-emerald-500/8 font-bold text-emerald-700 dark:text-emerald-400"
                              : m.winnerId && m.winnerId !== m.teamAId
                                ? "bg-muted/20 text-muted-foreground"
                                : "bg-background text-foreground"
                          }`}>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {m.winnerId === m.teamAId && <span className="text-emerald-500 text-[10px]">▶</span>}
                              <span className="truncate font-medium text-[13px]">{teamName(m.teamAId) ?? "TBD"}</span>
                            </div>
                            {canDecide && m.teamAId && (
                              <button
                                onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, m.id, m.teamAId!))}
                                className="shrink-0 ml-2 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                Win
                              </button>
                            )}
                          </div>

                          {/* Team B Row or BYE */}
                          {!m.isBye ? (
                            <div className={`flex items-center justify-between px-3 py-2 text-sm ${
                              m.winnerId === m.teamBId
                                ? "bg-emerald-500/8 font-bold text-emerald-700 dark:text-emerald-400"
                                : m.winnerId && m.winnerId !== m.teamBId
                                  ? "bg-muted/20 text-muted-foreground"
                                  : "bg-background text-foreground"
                            }`}>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {m.winnerId === m.teamBId && <span className="text-emerald-500 text-[10px]">▶</span>}
                                <span className="truncate font-medium text-[13px]">{teamName(m.teamBId) ?? "TBD"}</span>
                              </div>
                              {canDecide && m.teamBId && (
                                <button
                                  onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, m.id, m.teamBId!))}
                                  className="shrink-0 ml-2 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  Win
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-[11px] font-semibold italic text-muted-foreground bg-muted/10">
                              Bye — Auto-Advance
                            </div>
                          )}
                        </div>

                        {/* Connector line to next round */}
                        {!isLast && (
                          <div
                            className={`h-[2px] transition-colors ${
                              hasWinner ? "bg-emerald-500/50" : "bg-border"
                            }`}
                            style={{ width: connectorWidth }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}