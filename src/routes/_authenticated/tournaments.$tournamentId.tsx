import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { orderBy, where } from "firebase/firestore";
import { ArrowLeft, Shuffle } from "lucide-react";
import { PageHeader, TournamentStatusBadge, MatchStatusBadge } from "@/components/primitives";
import { DataState, ErrorState, LoadingState } from "@/components/states";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollectionData, useDocumentData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { updateDocument, writeAudit } from "@/lib/db";
import { generateTournamentBracket, refreshStandings } from "@/lib/tournament-service";
import { roundName } from "@/lib/bracket";
import type { Match, Standing, Team, Tournament } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tournaments/$tournamentId")({
  head: () => ({
    meta: [
      { title: "Tournament — Drone Soccer League Control" },
      {
        name: "description",
        content: "Team registration, bracket progression and live standings for a tournament.",
      },
      { property: "og:title", content: "Tournament — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Team registration, bracket progression and live standings for a tournament.",
      },
    ],
  }),
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { tournamentId } = Route.useParams();
  const { profile } = useAuth();
  const canManage = profile?.role === "admin";

  const tournament = useDocumentData<Tournament>(COL.tournaments, tournamentId);
  const teams = useCollectionData<Team>(COL.teams, () => [orderBy("name")]);
  const matches = useCollectionData<Match>(
    COL.matches,
    () => [where("tournamentId", "==", tournamentId)],
    [tournamentId],
  );
  const standings = useCollectionData<Standing>(
    COL.standings,
    () => [where("tournamentId", "==", tournamentId)],
    [tournamentId],
  );
  const [busy, setBusy] = useState(false);
  const [confirmBracket, setConfirmBracket] = useState(false);

  if (tournament.loading) return <LoadingState label="Loading tournament…" />;
  if (tournament.error) return <ErrorState message={tournament.error} />;
  if (!tournament.data)
    return (
      <ErrorState
        message="This tournament no longer exists."
        action={
          <Button asChild variant="outline">
            <Link to="/tournaments">Back to tournaments</Link>
          </Button>
        }
      />
    );

  const t = tournament.data;
  const registered = new Set(t.teamIds ?? []);
  const rounds = [...new Set(matches.data.map((m) => m.round))].sort((a, b) => a - b);
  const sortedStandings = [...standings.data].sort(
    (a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst),
  );

  async function toggleTeam(teamId: string, checked: boolean) {
    setBusy(true);
    try {
      const next = checked
        ? [...(t.teamIds ?? []), teamId]
        : (t.teamIds ?? []).filter((id) => id !== teamId);
      await updateDocument(COL.tournaments, tournamentId, { teamIds: next });
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/tournaments">
          <ArrowLeft className="mr-2 size-4" />
          All tournaments
        </Link>
      </Button>

      <PageHeader
        eyebrow={[t.season, t.location].filter(Boolean).join(" · ") || "Tournament"}
        title={t.name}
        description={t.description}
        actions={
          <div className="flex items-center gap-2">
            <TournamentStatusBadge status={t.status} />
            {canManage ? (
              <Button disabled={busy} onClick={() => setConfirmBracket(true)}>
                <Shuffle className="mr-2 size-4" />
                {matches.data.length ? "Regenerate bracket" : "Generate bracket"}
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs defaultValue="bracket">
        <TabsList>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="teams">Teams ({registered.size})</TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="mt-4">
          <DataState
            loading={matches.loading}
            error={matches.error}
            empty={matches.data.length === 0}
            emptyTitle="No bracket generated"
            emptyDescription="Register at least two teams, then generate the bracket."
          >
            <div className="flex gap-6 overflow-x-auto pb-4">
              {rounds.map((round) => (
                <div key={round} className="min-w-64 flex-1 space-y-3">
                  <p className="eyebrow">{roundName(round, t.rounds || rounds.length)}</p>
                  {matches.data
                    .filter((m) => m.round === round)
                    .sort((a, b) => a.slot - b.slot)
                    .map((m) => (
                      <Link
                        key={m.id}
                        to="/matches/$matchId"
                        params={{ matchId: m.id }}
                        className="panel block p-3 transition-shadow hover:shadow-lift"
                      >
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span
                            className={
                              m.winnerId === m.teamAId ? "font-semibold" : "text-muted-foreground"
                            }
                          >
                            {m.teamAName ?? "TBD"}
                          </span>
                          <span className="scoreline">{m.scoreA}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                          <span
                            className={
                              m.winnerId === m.teamBId ? "font-semibold" : "text-muted-foreground"
                            }
                          >
                            {m.teamBName ?? "TBD"}
                          </span>
                          <span className="scoreline">{m.scoreB}</span>
                        </div>
                        <div className="mt-2">
                          <MatchStatusBadge status={m.status} />
                        </div>
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </DataState>
        </TabsContent>

        <TabsContent value="standings" className="mt-4">
          <div className="panel overflow-hidden">
            <DataState
              loading={standings.loading}
              error={standings.error}
              empty={sortedStandings.length === 0}
              emptyTitle="No standings yet"
              emptyDescription="Standings are recalculated whenever a result is finalised."
              emptyAction={
                canManage ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await refreshStandings(tournamentId, teams.data);
                        toast.success("Standings recalculated");
                      } catch (error) {
                        toast.error(firebaseErrorMessage(error));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Recalculate now
                  </Button>
                ) : null
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">P</TableHead>
                    <TableHead className="text-right">W</TableHead>
                    <TableHead className="text-right">L</TableHead>
                    <TableHead className="text-right">MF</TableHead>
                    <TableHead className="text-right">MA</TableHead>
                    <TableHead className="text-right">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStandings.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.teamName}</TableCell>
                      <TableCell className="text-right font-mono">{s.played}</TableCell>
                      <TableCell className="text-right font-mono">{s.won}</TableCell>
                      <TableCell className="text-right font-mono">{s.lost}</TableCell>
                      <TableCell className="text-right font-mono">{s.goalsFor}</TableCell>
                      <TableCell className="text-right font-mono">{s.goalsAgainst}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{s.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataState>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <div className="panel overflow-hidden">
            <DataState
              loading={teams.loading}
              error={teams.error}
              empty={teams.data.length === 0}
              emptyTitle="No teams in the league"
              emptyDescription="Create teams first, then register them here."
              emptyAction={
                <Button asChild variant="outline">
                  <Link to="/teams">Go to teams</Link>
                </Button>
              }
            >
              <ul className="divide-y divide-border">
                {teams.data.map((team) => (
                  <li key={team.id} className="flex items-center gap-3 px-5 py-3">
                    {canManage ? (
                      <Checkbox
                        checked={registered.has(team.id)}
                        disabled={busy}
                        onCheckedChange={(checked) => toggleTeam(team.id, checked === true)}
                        aria-label={`Register ${team.name}`}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {registered.has(team.id) ? "✓" : "—"}
                      </span>
                    )}
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: team.id }}
                      className="flex-1 font-medium hover:text-primary"
                    >
                      {team.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{team.shortName}</span>
                  </li>
                ))}
              </ul>
            </DataState>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmBracket}
        onOpenChange={setConfirmBracket}
        destructive={matches.data.length > 0}
        title={matches.data.length ? "Regenerate the bracket?" : "Generate the bracket?"}
        description={
          matches.data.length
            ? "Existing fixtures, scores and progression for this tournament will be replaced."
            : "Teams are seeded in registration order. Byes are awarded automatically."
        }
        confirmLabel="Generate"
        onConfirm={async () => {
          try {
            await generateTournamentBracket(t, teams.data);
            await refreshStandings(tournamentId, teams.data);
            await writeAudit({
              actorId: profile!.id,
              actorEmail: profile!.email,
              action: "generate_bracket",
              entity: "tournaments",
              entityId: tournamentId,
              details: t.name,
            });
            toast.success("Bracket generated");
          } catch (error) {
            toast.error(firebaseErrorMessage(error));
          }
        }}
      />
    </>
  );
}
