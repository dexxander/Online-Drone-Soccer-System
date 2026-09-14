import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Mail, Phone, Shield, Trophy, Users as UsersIcon } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { EmptyState } from "@/components/ui-kit";
import type { MatchStatus, TournamentMatch } from "@/lib/types";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/teams/$teamId")({
  head: () => ({
    meta: [{ title: "Team Profile — AW Drone Soccer Leagues System" }],
  }),
  component: TeamProfilePage,
});

/** See matches.tsx: tournament matches gain these once a live match for
 * them has run at least once. */
type SyncedTournamentMatch = TournamentMatch & {
  scoreA?: number;
  scoreB?: number;
  status?: MatchStatus;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamProfilePage() {
  const { teamId } = Route.useParams();
  const { state } = useMockWebSocket();

  const team = (state.teams || []).find((t) => t.id === teamId);
  const roster = (state.players || []).filter((p) => p.teamId === teamId);

  // Every finished match this team played, across all tournaments, oldest first.
  const playedMatches = useMemo(() => {
    if (!team) return [];
    const list: Array<{
      match: SyncedTournamentMatch;
      tournamentName: string;
      isTeamA: boolean;
      opponentName: string;
    }> = [];

    (state.tournaments || []).forEach((t) => {
      t.matches.forEach((m) => {
        const match = m as SyncedTournamentMatch;
        if (match.isBye || !match.teamAId || !match.teamBId) return;
        if (match.teamAId !== team.id && match.teamBId !== team.id) return;
        if (!match.winnerId && match.result !== "draw") return; // not played yet

        const isTeamA = match.teamAId === team.id;
        const opponentId = isTeamA ? match.teamBId : match.teamAId;
        const opponentName = (state.teams || []).find((o) => o.id === opponentId)?.name ?? "Unknown team";
        list.push({ match, tournamentName: t.name, isTeamA, opponentName });
      });
    });

    return list.sort((a, b) => (a.match.scheduledDate ?? "").localeCompare(b.match.scheduledDate ?? ""));
  }, [state.tournaments, state.teams, team]);

  const record = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    playedMatches.forEach(({ match }) => {
      if (match.result === "draw") draws += 1;
      else if (match.winnerId === team?.id) wins += 1;
      else losses += 1;
    });
    return { wins, losses, draws, played: wins + losses + draws };
  }, [playedMatches, team]);

  // Running win differential, one point per match, for the performance graph.
  const performanceHistory = useMemo(() => {
    let net = 0;
    return playedMatches.map((entry, i) => {
      if (entry.match.result === "draw") net += 0;
      else if (entry.match.winnerId === team?.id) net += 1;
      else net -= 1;
      return { match: `M${i + 1}`, net };
    });
  }, [playedMatches, team]);

  if (!team) {
    return (
      <PublicLayout>
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <Shield className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Team not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This team may have been removed, or the link is incorrect.
          </p>
          <Link
            to="/teams"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to Teams
          </Link>
        </main>
      </PublicLayout>
    );
  }

  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0;

  return (
    <PublicLayout>
      {/* ── Header banner ── */}
      <div className="border-b border-border bg-[oklch(0.18_0.05_266)]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            to="/teams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft className="size-3.5" /> All Teams
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="size-16 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-gold">
                {initials(team.name)}
              </span>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                {team.category} Division
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">{team.name}</h1>
              <p className="mt-1 text-sm text-white/70">Coached by {team.coachName}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-background p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Record</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {record.wins}-{record.losses}
              {record.draws > 0 ? `-${record.draws}` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Win rate</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{winRate}%</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Matches played</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{record.played}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Roster size</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{roster.length}</p>
          </div>
        </div>

        {/* ── Performance history ── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Performance history</h2>
          <p className="mt-1 text-xs text-muted-foreground">Running win differential across the season.</p>
          <div className="mt-4 h-56 rounded-xl border border-border bg-background p-4 shadow-card">
            {performanceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceHistory} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <XAxis dataKey="match" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    labelFormatter={(label) => `After ${label}`}
                    formatter={(value: number) => [value, "Net wins"]}
                  />
                  <Line type="monotone" dataKey="net" stroke="oklch(0.55 0.18 266)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No completed matches yet.
              </div>
            )}
          </div>
        </section>

        {/* ── Match history ── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Match history</h2>
          {playedMatches.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No matches yet" description="This team hasn't played a completed match." />
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-background shadow-card">
              {playedMatches
                .slice()
                .reverse()
                .map(({ match, tournamentName, isTeamA, opponentName }) => {
                  const teamScore = isTeamA ? match.scoreA : match.scoreB;
                  const opponentScore = isTeamA ? match.scoreB : match.scoreA;
                  const result = match.result === "draw" ? "D" : match.winnerId === team.id ? "W" : "L";
                  return (
                    <div key={match.id} className="flex items-center gap-4 px-5 py-3.5">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          result === "W"
                            ? "bg-[oklch(0.6_0.17_150)]/15 text-[oklch(0.6_0.17_150)]"
                            : result === "L"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {result}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">vs {opponentName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tournamentName}
                          {match.scheduledDate ? ` · ${match.scheduledDate}` : ""}
                        </p>
                      </div>
                      {teamScore !== undefined && opponentScore !== undefined && (
                        <span className="shrink-0 font-mono text-sm font-bold text-foreground">
                          {teamScore}–{opponentScore}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </main>
    </PublicLayout>
  );
}