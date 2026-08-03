import { createFileRoute, Link } from "@tanstack/react-router";
import { orderBy, where } from "firebase/firestore";
import { Shield, Swords, Trophy, UserRound, Megaphone, Radio } from "lucide-react";
import { PageHeader, StatCard, MatchStatusBadge } from "@/components/primitives";
import { DataState } from "@/components/states";
import { useCollectionData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import type { Announcement, Match, Player, Team, Tournament } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Drone Soccer League Control" },
      {
        name: "description",
        content: "Live drone soccer league overview: fixtures, results, teams and announcements.",
      },
      { property: "og:title", content: "Dashboard — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Live drone soccer league overview: fixtures, results, teams and announcements.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile } = useAuth();
  const teams = useCollectionData<Team>(COL.teams, () => [orderBy("name")]);
  const players = useCollectionData<Player>(COL.players, () => []);
  const tournaments = useCollectionData<Tournament>(COL.tournaments, () => []);
  const matches = useCollectionData<Match>(COL.matches, () => []);
  const announcements = useCollectionData<Announcement>(COL.announcements, () => [
    orderBy("createdAt", "desc"),
  ]);

  const live = matches.data.filter((m) => m.status === "live");
  const upcoming = matches.data
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity))
    .slice(0, 6);
  const recent = matches.data
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 5);
  const activeTournaments = tournaments.data.filter((t) => t.status === "in_progress");
  const totalMarks = matches.data.reduce((sum, m) => sum + m.scoreA + m.scoreB, 0);

  return (
    <>
      <PageHeader
        eyebrow="League control"
        title={`Welcome back, ${profile?.displayName?.split(" ")[0] ?? "friend"}`}
        description="Everything below is read live from Firestore."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Teams"
          value={teams.loading ? "—" : teams.data.length}
          hint={`${teams.data.filter((t) => t.active).length} active`}
          icon={<Shield className="size-4" />}
        />
        <StatCard
          label="Registered players"
          value={players.loading ? "—" : players.data.length}
          hint={`${players.data.filter((p) => p.active).length} on active rosters`}
          icon={<UserRound className="size-4" />}
        />
        <StatCard
          label="Tournaments"
          value={tournaments.loading ? "—" : tournaments.data.length}
          hint={`${activeTournaments.length} in progress`}
          icon={<Trophy className="size-4" />}
        />
        <StatCard
          label="Marks scored"
          value={matches.loading ? "—" : totalMarks}
          hint={`${matches.data.filter((m) => m.status === "completed").length} matches played`}
          icon={<Swords className="size-4" />}
        />
      </div>

      {live.length > 0 ? (
        <section className="panel overflow-hidden">
          <header className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Radio className="size-4 text-live" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">Live now</h2>
          </header>
          <ul className="divide-y divide-border">
            {live.map((m) => (
              <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.tournamentName}</p>
                </div>
                <p className="scoreline text-2xl">
                  {m.scoreA} – {m.scoreB}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/matches/$matchId" params={{ matchId: m.id }}>
                    Open
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel overflow-hidden">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">
              Upcoming fixtures
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/matches">All matches</Link>
            </Button>
          </header>
          <DataState
            loading={matches.loading}
            error={matches.error}
            empty={upcoming.length === 0}
            emptyTitle="No scheduled matches"
            emptyDescription="Generate a bracket from a tournament to create fixtures."
          >
            <ul className="divide-y divide-border">
              {upcoming.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/matches/$matchId"
                      params={{ matchId: m.id }}
                      className="truncate font-medium hover:text-primary"
                    >
                      {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.tournamentName} · {formatDateTime(m.scheduledAt)}
                    </p>
                  </div>
                  <MatchStatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          </DataState>
        </section>

        <section className="panel overflow-hidden">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">
              Latest results
            </h2>
          </header>
          <DataState
            loading={matches.loading}
            error={matches.error}
            empty={recent.length === 0}
            emptyTitle="No results yet"
            emptyDescription="Completed matches appear here with their final marks."
          >
            <ul className="divide-y divide-border">
              {recent.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/matches/$matchId"
                      params={{ matchId: m.id }}
                      className="truncate font-medium hover:text-primary"
                    >
                      {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{m.tournamentName}</p>
                  </div>
                  <p className="scoreline text-lg">
                    {m.scoreA} – {m.scoreB}
                  </p>
                </li>
              ))}
            </ul>
          </DataState>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">
              Announcements
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/announcements">View all</Link>
          </Button>
        </header>
        <DataState
          loading={announcements.loading}
          error={announcements.error}
          empty={announcements.data.length === 0}
          emptyTitle="Nothing announced yet"
          emptyDescription="League administrators can post updates for every role."
        >
          <ul className="divide-y divide-border">
            {announcements.data.slice(0, 4).map((a) => (
              <li key={a.id} className="px-5 py-4">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
              </li>
            ))}
          </ul>
        </DataState>
      </section>
    </>
  );
}
