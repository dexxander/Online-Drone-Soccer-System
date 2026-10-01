import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { auth } from "@/lib/store";
import type { Match, MatchSlotId } from "@/lib/types";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { LogoMark } from "@/components/LogoMark";

function getMatchTitle(round: number, maxRound: number) {
  if (maxRound === 1) return "Exhibition Match";
  if (round === maxRound) return "Grand Final";
  if (round === maxRound - 1) return "Semi-Finals";
  if (round === maxRound - 2) return "Quarter-Finals";
  return `Round ${round}`;
}

export function RefereeLayout({ children, match, slotId, customTitle, hideMatchDetails }: { children: ReactNode; match: Match; slotId?: MatchSlotId; customTitle?: string; hideMatchDetails?: boolean }) {
  const navigate = useNavigate();
  const user = auth.current();
  const { state } = useMockWebSocket();

  // Extract tournament data to dynamically name the header
  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];
  const activeTournament = tournaments.find(t => t.matches.some(tm => tm.id === match.id));
  const tMatch = activeTournament?.matches.find(tm => tm.id === match.id);
  const maxRound = activeTournament ? Math.max(...activeTournament.matches.map(tm => tm.round)) : 1;
  const currentRound = tMatch?.round || 1;
  
  const matchTitle = activeTournament ? getMatchTitle(currentRound, maxRound) : "Friendly";
  const tournamentName = customTitle || (activeTournament ? activeTournament.name : match.tournamentName) || "Referee Dashboard";
  const matchDisplayNumber = tMatch ? tMatch.slot + 1 : match.id.split("-").pop()?.slice(-4);

  return (
    <div className="flex h-screen min-h-screen flex-col bg-surface">
      <header className="z-40 w-full shrink-0 border-b border-white/10 bg-[oklch(0.15_0.05_266)] text-white">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="size-9 shadow-lift" />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold">AW DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Referee Console</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user?.name && (
              <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 md:flex">
                <span className="size-2 rounded-full bg-success" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{user.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-gold-foreground">
              <ShieldCheck className="size-4" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Referee</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Dashboard Canvas ── */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="shrink-0 border-b border-border bg-[oklch(0.18_0.05_266)]">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Match Operations</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{tournamentName}</h1>
            </div>
            {!hideMatchDetails && (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
                  {matchTitle} &gt; Match {matchDisplayNumber}
                </span>
                {slotId && (
                  <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-foreground">
                    Court {slotId}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mx-auto w-full max-w-[1440px] p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
