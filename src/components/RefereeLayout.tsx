import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { auth } from "@/lib/store";
import type { Match } from "@/lib/types";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";

function getMatchTitle(round: number, maxRound: number) {
  if (maxRound === 1) return "Exhibition Match";
  if (round === maxRound) return "Grand Final";
  if (round === maxRound - 1) return "Semi-Finals";
  if (round === maxRound - 2) return "Quarter-Finals";
  return `Round ${round}`;
}

export function RefereeLayout({ children, match }: { children: ReactNode; match: Match }) {
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
  const tournamentName = activeTournament ? activeTournament.name : match.tournamentName;
  const matchDisplayNumber = tMatch ? tMatch.slot + 1 : match.id.split("-").pop()?.slice(-4);

  return (
    <div className="flex h-screen min-h-screen flex-col bg-surface">
      {/* ── Top App Bar ── */}
      <header className="z-40 flex h-20 w-full shrink-0 items-center justify-between border-b border-border bg-background px-6 lg:px-12">
        {/* Left: Logo + Title + Match Badge */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="mr-2 flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
          >
            DS
          </Link>
          <h1 className="hidden text-2xl font-bold tracking-tight text-foreground lg:block">
            {tournamentName}
          </h1>
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:hidden">
            NDSC
          </h1>
          <span className="hidden rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex">
            {matchTitle} &gt; Match {matchDisplayNumber}
          </span>
        </div>

        {/* Right: User + Role */}
        <div className="flex items-center gap-4">
          {user?.name && (
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 md:flex">
              <span className="size-2 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                {user.name}
              </span>
            </div>
          )}
          <div className="hidden items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-destructive sm:flex">
            <ShieldCheck className="size-4" strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Referee
            </span>
          </div>
        </div>
      </header>

      {/* ── Dashboard Canvas ── */}
      <main className="flex-1 overflow-y-auto bg-surface p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}