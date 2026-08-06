import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, Radio } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { EmptyState, Panel } from "@/components/ui-kit";
import { AccountMenu } from "@/components/AccountMenu";
import { auth } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { MatchStatus, Team, Tournament, TournamentMatch } from "@/lib/types";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Matches — Drone Soccer League Control" },
      {
        name: "description",
        content: "Browse every match, follow the live scoreboard and track tournament brackets in one place.",
      },
    ],
  }),
  component: MatchesPage,
});

/** Tournament matches gain scoreA/scoreB/status once a live match for them
 * has run at least once — store.ts syncs those fields in from its archive,
 * but the base TournamentMatch type doesn't declare them since brand-new
 * matches never have them. */
type SyncedTournamentMatch = TournamentMatch & {
  scoreA?: number;
  scoreB?: number;
  status?: MatchStatus;
};

function teamName(id: string | null, teams: Team[]): string {
  if (!id) return "TBD";
  return teams.find((t) => t.id === id)?.name ?? "Unknown team";
}

function statusLabel(status: MatchStatus | undefined) {
  switch (status) {
    case "live":
      return "Live";
    case "paused":
      return "Paused";
    case "finished":
      return "Final";
    default:
      return "Scheduled";
  }
}

function roundLabel(round: number, maxRound: number) {
  if (maxRound === 1) return "Exhibition";
  if (round === maxRound) return "Final";
  if (round === maxRound - 1) return "Semifinal";
  return `Round ${round}`;
}

function MatchesPage() {
  const { state } = useMockWebSocket();
  const teams = state.teams;
  const tournaments = state.tournaments;
  const liveMatch = state.match;

  const rows = useMemo(
    () =>
      tournaments
        .flatMap((t) =>
          t.matches
            .filter((m) => !m.isBye && (m.teamAId || m.teamBId))
            .map((m) => ({ match: m as SyncedTournamentMatch, tournament: t })),
        )
        .sort(
          (a, b) =>
            a.tournament.createdAt - b.tournament.createdAt ||
            a.match.round - b.match.round ||
            a.match.slot - b.match.slot,
        ),
    [tournaments],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRow = rows.find((r) => r.match.id === selectedId) ?? null;
  const isSelectedLive = selectedRow?.match.id === liveMatch.id;
  const showingLive = !selectedRow || isSelectedLive;

  const clockMs = useMatchClock(liveMatch.elapsedMs, liveMatch.runningSince);

  const board = showingLive
    ? {
        teamAName: liveMatch.teamAName,
        teamBName: liveMatch.teamBName,
        scoreA: liveMatch.scoreA,
        scoreB: liveMatch.scoreB,
        status: liveMatch.status,
        clock: formatClock(clockMs),
        tournamentName: liveMatch.tournamentName || "Friendly match",
      }
    : {
        teamAName: teamName(selectedRow!.match.teamAId, teams),
        teamBName: teamName(selectedRow!.match.teamBId, teams),
        scoreA: selectedRow!.match.scoreA ?? 0,
        scoreB: selectedRow!.match.scoreB ?? 0,
        status: selectedRow!.match.status ?? "scheduled",
        clock: null as string | null,
        tournamentName: selectedRow!.tournament.name,
      };

  const isLive = board.status === "live" || board.status === "paused";

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lift">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                League Control
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/tournaments"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-bold text-foreground sm:block"
            >
              Matches
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              About
            </Link>
            {auth.current()?.role === "coach" && (
              <Link
                to="/register-team"
                className="hidden rounded-lg bg-primary/10 px-3 py-2 text-[13px] font-bold text-primary hover:bg-primary/20 sm:block"
              >
                Register Team
              </Link>
            )}
            <AccountMenu />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          League control
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Matches</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Every scheduled match, the live scoreboard and the tournament brackets — all synced from
          the same shared state.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          {/* ── List of matches ── */}
          <aside className="overflow-hidden rounded-xl border border-border bg-background shadow-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">List of matches</h2>
            </div>
            <ul className="max-h-[600px] divide-y divide-border overflow-y-auto">
              <li>
                <button
                  onClick={() => setSelectedId(null)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted",
                    showingLive && "bg-primary/5",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {liveMatch.status === "live" || liveMatch.status === "paused" ? "Live now" : "Current match"}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {liveMatch.teamAName} <span className="text-muted-foreground">vs</span> {liveMatch.teamBName}
                  </span>
                </button>
              </li>
              {rows.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No tournament matches yet.
                </li>
              ) : (
                rows.map(({ match, tournament }) => {
                  const maxRound = Math.max(...tournament.matches.map((m) => m.round));
                  const active = selectedId === match.id;
                  return (
                    <li key={match.id}>
                      <button
                        onClick={() => setSelectedId(match.id)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted",
                          active && "bg-primary/5",
                        )}
                      >
                        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {roundLabel(match.round, maxRound)}
                          <span>{statusLabel(match.status)}</span>
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {teamName(match.teamAId, teams)} <span className="text-muted-foreground">vs</span>{" "}
                          {teamName(match.teamBId, teams)}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{tournament.name}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <div className="flex flex-col gap-6">
            {/* ── Live score board ── */}
            <section className="rounded-xl border border-border bg-background p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
                  <Radio className="size-3.5 text-primary" /> Live score board
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider",
                    isLive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isLive ? "bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" : "bg-muted-foreground",
                    )}
                  />
                  {statusLabel(board.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{board.tournamentName}</p>

              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="text-center">
                  <p className="truncate text-sm font-bold text-foreground">{board.teamAName}</p>
                  <p className="mt-2 font-mono text-5xl font-bold tabular-nums text-foreground">
                    {board.scoreA}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">vs</span>
                  {board.clock && (
                    <span className="font-mono text-lg font-bold tabular-nums text-warning">{board.clock}</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="truncate text-sm font-bold text-foreground">{board.teamBName}</p>
                  <p className="mt-2 font-mono text-5xl font-bold tabular-nums text-foreground">
                    {board.scoreB}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Brackets ── */}
            <section className="overflow-hidden rounded-xl border border-border bg-background shadow-card">
              <div className="border-b border-border px-6 py-4">
                <h2 className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
                  <Trophy className="size-3.5 text-primary" /> Brackets
                </h2>
              </div>
              <div className="p-6">
                {tournaments.length === 0 ? (
                  <EmptyState
                    title="No tournaments yet"
                    description="Brackets will appear here once an admin creates a tournament."
                  />
                ) : (
                  <div className="flex flex-col gap-10">
                    {tournaments.map((t) => (
                      <div key={t.id}>
                        <p className="mb-3 text-sm font-bold text-foreground">
                          {t.name} <span className="font-normal capitalize text-muted-foreground">· {t.status}</span>
                        </p>
                        <ReadOnlyBracket tournament={t} teams={teams} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Read-only bracket — same layout as the admin bracket view, minus the
   "Win" action buttons, since visitors on this page can't decide matches. ── */
function ReadOnlyBracket({ tournament, teams }: { tournament: Tournament; teams: Team[] }) {
  const rounds = Math.max(...tournament.matches.map((m) => m.round));

  return (
    <div className="flex items-center gap-14 overflow-x-auto pb-4">
      {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
        const matches = tournament.matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
        const label = roundLabel(round, rounds);
        const isLast = round === rounds;
        const pairs: TournamentMatch[][] = [];
        for (let i = 0; i < matches.length; i += 2) {
          pairs.push([matches[i], matches[i + 1]].filter(Boolean) as TournamentMatch[]);
        }
        const pairGap = 28 * Math.pow(2, round);

        return (
          <div key={round} className="flex min-w-[200px] flex-col" style={{ gap: pairGap }}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            {pairs.map((pair, pi) => (
              <div key={pi} className="relative flex flex-col justify-center gap-4">
                {pair.map((m) => (
                  <div key={m.id} className="relative">
                    <ReadOnlyMatchBox match={m} teams={teams} />
                    {!isLast && <span className="absolute top-1/2 -right-7 h-px w-7 -translate-y-1/2 bg-border" />}
                  </div>
                ))}
                {!isLast && pair.length === 2 && (
                  <span className="absolute -right-7 w-px bg-border" style={{ top: "25%", bottom: "25%" }} />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ReadOnlyMatchBox({ match, teams }: { match: TournamentMatch; teams: Team[] }) {
  const row = (id: string | null) => {
    const isWinner = id && id === match.winnerId;
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm",
          isWinner ? "bg-success-soft font-semibold text-success" : "text-foreground",
        )}
      >
        <span>{teamName(id, teams)}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Trophy className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 divide-y divide-border rounded-lg border border-border bg-background shadow-card">
        {row(match.teamAId)}
        {!match.isBye && row(match.teamBId)}
        {match.isBye && <div className="px-3 py-2 text-xs text-muted-foreground">Bye</div>}
      </div>
    </div>
  );
}
