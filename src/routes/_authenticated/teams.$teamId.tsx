import { createFileRoute, Link } from "@tanstack/react-router";
import { where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { PageHeader, MatchStatusBadge } from "@/components/primitives";
import { DataState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCollectionData, useDocumentData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import type { Match, Player, Team } from "@/lib/types";
import { formatDateTime, initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/teams/$teamId")({
  head: () => ({
    meta: [
      { title: "Team profile — Drone Soccer League Control" },
      {
        name: "description",
        content: "Roster, fixtures and results for a drone soccer club.",
      },
      { property: "og:title", content: "Team profile — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Roster, fixtures and results for a drone soccer club.",
      },
    ],
  }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const team = useDocumentData<Team>(COL.teams, teamId);
  const players = useCollectionData<Player>(COL.players, () => [where("teamId", "==", teamId)], [
    teamId,
  ]);
  const matches = useCollectionData<Match>(COL.matches, () => [], [teamId]);

  const teamMatches = matches.data
    .filter((m) => m.teamAId === teamId || m.teamBId === teamId)
    .sort((a, b) => (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0));

  if (team.loading) return <LoadingState label="Loading team…" />;
  if (team.error) return <ErrorState message={team.error} />;
  if (!team.data)
    return (
      <ErrorState
        message="This team no longer exists."
        action={
          <Button asChild variant="outline">
            <Link to="/teams">Back to teams</Link>
          </Button>
        }
      />
    );

  const t = team.data;
  const won = teamMatches.filter((m) => m.status === "completed" && m.winnerId === teamId).length;
  const lost = teamMatches.filter(
    (m) => m.status === "completed" && m.winnerId && m.winnerId !== teamId,
  ).length;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/teams">
          <ArrowLeft className="mr-2 size-4" />
          All teams
        </Link>
      </Button>

      <PageHeader
        eyebrow={t.shortName}
        title={t.name}
        description={[t.city, t.coachName ? `Coach: ${t.coachName}` : null]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-lg bg-muted font-display font-bold">
            {t.logoUrl ? (
              <img src={t.logoUrl} alt={`${t.name} logo`} className="size-full object-cover" />
            ) : (
              initials(t.name)
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="eyebrow">Matches played</p>
          <p className="scoreline mt-2 text-3xl">
            {teamMatches.filter((m) => m.status === "completed").length}
          </p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Won</p>
          <p className="scoreline mt-2 text-3xl text-success">{won}</p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Lost</p>
          <p className="scoreline mt-2 text-3xl text-destructive">{lost}</p>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider">Roster</h2>
        </header>
        <DataState
          loading={players.loading}
          error={players.error}
          empty={players.data.length === 0}
          emptyTitle="No players on this roster"
          emptyDescription="Coaches and administrators can add players from the Players page."
          emptyAction={
            <Button asChild variant="outline">
              <Link to="/players">Manage players</Link>
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Drone ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...players.data]
                .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                .map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.jerseyNumber}</TableCell>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{p.position}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.droneId || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "outline" : "secondary"}>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </DataState>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider">Fixtures</h2>
        </header>
        <DataState
          loading={matches.loading}
          error={matches.error}
          empty={teamMatches.length === 0}
          emptyTitle="No fixtures yet"
          emptyDescription="This team has not been drawn into a bracket."
        >
          <ul className="divide-y divide-border">
            {teamMatches.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/matches/$matchId"
                    params={{ matchId: m.id }}
                    className="font-medium hover:text-primary"
                  >
                    {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {m.tournamentName} · {formatDateTime(m.scheduledAt)}
                  </p>
                </div>
                {m.status === "completed" ? (
                  <span className="scoreline text-lg">
                    {m.scoreA} – {m.scoreB}
                  </span>
                ) : null}
                <MatchStatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        </DataState>
      </section>
    </>
  );
}
