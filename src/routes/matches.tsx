import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, Radio } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { EmptyState, Panel } from "@/components/ui-kit";
import { auth } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { MatchStatus, Team, Tournament, TournamentMatch } from "@/lib/types";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Matches — AW Drone Soccer Leagues System" },
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

  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(tournaments[0]?.id ?? null);
  const activeTournament = tournaments.find((t) => t.id === selectedTournamentId) ?? tournaments[0] ?? null;

  const rows = useMemo(
    () =>
      tournaments
        .filter((t) => !activeTournament || t.id === activeTournament.id)
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
    [tournaments, activeTournament],
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
    <PublicLayout>
      <div className="border-b border-border bg-[oklch(0.18_0.05_266)]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            AW Drone Soccer Leagues System
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Matches</h1>
          <p className="mt-2 max-w-lg text-sm text-white/70">
            Every scheduled match, the live scoreboard, and the tournament brackets, all synced from
            the same shared state.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl bg-muted/20 px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          {/* ── List of matches ── */}
          <aside className="overflow-hidden rounded-xl border border-border bg-background shadow-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">List of matches</h2>
            </div>
            <ul className="styled-scrollbar max-h-[600px] divide-y divide-border overflow-y-auto">
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
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Radio className="size-3.5" />
                  </span>
                  Live score board
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
                  <p className={cn("mt-2 font-mono text-5xl font-bold tabular-nums", isLive ? "text-gold" : "text-foreground")}>
                    {board.scoreA}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">vs</span>
                  {board.clock && (
                    <span className="font-mono text-lg font-bold tabular-nums text-gold">{board.clock}</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="truncate text-sm font-bold text-foreground">{board.teamBName}</p>
                  <p className={cn("mt-2 font-mono text-5xl font-bold tabular-nums", isLive ? "text-gold" : "text-foreground")}>
                    {board.scoreB}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Brackets ── */}
            <section className="overflow-hidden rounded-lg border border-border bg-background shadow-card">
              <div className="border-b border-border px-6 py-4">
                <h2 className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
                  <span className="flex size-7 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <Trophy className="size-3.5" />
                  </span>
                  Brackets
                </h2>
              </div>

              {tournaments.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No tournaments yet"
                    description="Brackets will appear here once an admin creates a tournament."
                  />
                </div>
              ) : (
                <>
                  <div className="flex gap-1 overflow-x-auto border-b border-border bg-muted/20 px-3 py-2">
                    {tournaments.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTournamentId(t.id); setSelectedId(null); }}
                        className={cn(
                          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          t.id === activeTournament?.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <div className="p-6">
                    {activeTournament && (
                      <>
                        <p className="mb-4 text-sm font-bold text-foreground">
                          {activeTournament.name}{" "}
                          <span className="font-normal capitalize text-muted-foreground">· {activeTournament.status}</span>
                        </p>
                        <ReadOnlyBracket
                          tournament={activeTournament}
                          teams={teams}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}

/* ── Read-only bracket — same layout as the admin bracket view, minus the
   "Win" action buttons, since visitors on this page can't decide matches. ── */
function ReadOnlyBracket({
  tournament,
  teams,
  selectedId,
  onSelect,
}: {
  tournament: Tournament;
  teams: Team[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const knockoutMatches = tournament.matches.filter((m) => (m.phase ?? "knockout") === "knockout");

  if (knockoutMatches.length === 0) {
    return <p className="text-sm text-muted-foreground">No knockout matches yet for this tournament.</p>;
  }

  const rounds = Math.max(...knockoutMatches.map((m) => m.round));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-stretch gap-10 min-w-max">
        {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
          const matches = knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
          const isLast = round === rounds;
          const label = roundLabel(round, rounds);

          return (
            <div key={round} className="flex w-[220px] shrink-0 flex-col">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {matches.map((m) => (
                  <div key={m.id} className="relative">
                    <ReadOnlyMatchBox
                      match={m}
                      teams={teams}
                      active={m.id === selectedId}
                      onClick={() => onSelect(m.id)}
                    />
                    {!isLast && <span className="absolute top-1/2 -right-6 h-px w-6 -translate-y-1/2 bg-border" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyMatchBox({
  match,
  teams,
  active,
  onClick,
}: {
  match: TournamentMatch;
  teams: Team[];
  active?: boolean;
  onClick?: () => void;
}) {
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
    <button
      onClick={onClick}
      className={cn(
        "w-full divide-y divide-border rounded-lg border bg-background text-left shadow-card transition-colors",
        active ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40",
      )}
    >
      {row(match.teamAId)}
      {!match.isBye && row(match.teamBId)}
      {match.isBye && <div className="px-3 py-2 text-xs text-muted-foreground">Bye</div>}
    </button>
  );
}
