import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader, MatchStatusBadge } from "@/components/primitives";
import { DataState } from "@/components/states";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionData, useFiltered } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import type { Match, MatchStatus, Tournament } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { roundName } from "@/lib/bracket";

export const Route = createFileRoute("/_authenticated/matches/")({
  head: () => ({
    meta: [
      { title: "Matches — Drone Soccer League Control" },
      {
        name: "description",
        content: "Every drone soccer fixture: schedule, live scores and final results.",
      },
      { property: "og:title", content: "Matches — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Every drone soccer fixture: schedule, live scores and final results.",
      },
    ],
  }),
  component: MatchesPage,
});

function MatchesPage() {
  const matches = useCollectionData<Match>(COL.matches, () => []);
  const tournaments = useCollectionData<Tournament>(COL.tournaments, () => []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | MatchStatus>("all");
  const [tournamentId, setTournamentId] = useState("all");

  const extra = useMemo(
    () => (m: Match) =>
      (status === "all" || m.status === status) &&
      (tournamentId === "all" || m.tournamentId === tournamentId),
    [status, tournamentId],
  );

  const filtered = useFiltered<Match>(
    matches.data,
    search,
    ["teamAName", "teamBName", "tournamentName", "venue"],
    extra,
  ).sort((a, b) => a.round - b.round || a.slot - b.slot);

  return (
    <>
      <PageHeader
        eyebrow="Fixtures"
        title="Matches"
        description="Filter the full fixture list by tournament or state."
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by team, tournament or venue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={tournamentId} onValueChange={setTournamentId}>
          <SelectTrigger className="lg:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tournaments</SelectItem>
            {tournaments.data.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        <DataState
          loading={matches.loading}
          error={matches.error}
          empty={filtered.length === 0}
          emptyTitle="No matches found"
          emptyDescription="Generate a bracket from a tournament to create fixtures."
        >
          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const t = tournaments.data.find((x) => x.id === m.tournamentId);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/matches/$matchId"
                      params={{ matchId: m.id }}
                      className="font-display font-semibold hover:text-primary"
                    >
                      {m.teamAName ?? "TBD"} <span className="text-muted-foreground">vs</span>{" "}
                      {m.teamBName ?? "TBD"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.tournamentName} · {roundName(m.round, t?.rounds ?? m.round)} ·{" "}
                      {formatDateTime(m.scheduledAt)}
                    </p>
                  </div>
                  <span className="scoreline text-xl">
                    {m.scoreA} – {m.scoreB}
                  </span>
                  <MatchStatusBadge status={m.status} />
                </li>
              );
            })}
          </ul>
        </DataState>
      </div>
    </>
  );
}
