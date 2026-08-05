import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trophy, Trash2, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { Team, Tournament, TournamentMatch } from "@/lib/types";

export const Route = createFileRoute("/admin-tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — Drone Soccer League Control" },
      { name: "description", content: "Create tournaments and generate fair, randomized brackets." },
    ],
  }),
  component: AdminTournamentsPage,
});

function AdminTournamentsPage() {
  const { state, emit } = useMockWebSocket();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = state.tournaments.find((t) => t.id === selectedId) ?? null;

  if (selected) {
    return (
      <DashboardLayout>
        <button
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to tournaments
        </button>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{selected.name}</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {selected.status} · {selected.teamIds.length} teams
        </p>
        <div className="mt-8">
          <Bracket tournament={selected} teams={state.teams} emit={emit} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            League control
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate randomized, fair brackets from your approved teams.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> New tournament
        </button>
      </div>

      {creating && (
        <CreateTournamentForm
          teams={state.teams.filter((t) => t.status === "approved")}
          onClose={() => setCreating(false)}
          emit={emit}
        />
      )}

      <div className="mt-6">
        <Panel title={`${state.tournaments.length} tournament${state.tournaments.length === 1 ? "" : "s"}`}>
          {state.tournaments.length === 0 ? (
            <EmptyState
              title="No tournaments yet"
              description="Create one from your approved teams to generate a bracket."
            />
          ) : (
            <ul className="divide-y divide-border">
              {state.tournaments.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-4">
                  <button onClick={() => setSelectedId(t.id)} className="text-left">
                    <p className="text-sm font-bold text-foreground hover:text-primary">{t.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {t.status} · {t.teamIds.length} teams
                    </p>
                  </button>
                  <button
                    aria-label={`Delete ${t.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete tournament "${t.name}"?`)) {
                        emit("removeTournament", (store) => store.removeTournament(t.id));
                      }
                    }}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}

function CreateTournamentForm({
  teams,
  onClose,
  emit,
}: {
  teams: Team[];
  onClose: () => void;
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const [name, setName] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setSelectedTeamIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));

  const submit = () => {
    if (!name.trim()) return setError("Tournament name is required.");
    if (selectedTeamIds.length < 2) return setError("Select at least 2 teams.");
    setError("");
    emit("createTournament", (store) => store.createTournament(name.trim(), selectedTeamIds));
    onClose();
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-background p-6 shadow-card">
      <h2 className="text-sm font-bold uppercase tracking-wide">New tournament</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">Tournament name</label>
          <input
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="National Drone Soccer Championship"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">
            Select teams ({selectedTeamIds.length} chosen)
          </p>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved teams available yet.</p>
          ) : (
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {teams.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeamIds.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                  {t.name}
                  <span className="text-xs text-muted-foreground">{t.category}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Generate bracket
          </button>
        </div>
      </div>
    </section>
  );
}

function Bracket({
  tournament,
  teams,
  emit,
}: {
  tournament: Tournament;
  teams: Team[];
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const teamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? "—" : null);
  const rounds = Math.max(...tournament.matches.map((m) => m.round));

  return (
    <div className="flex items-center gap-14 overflow-x-auto pb-4">
      {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
        const matches = tournament.matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
        const label = round === rounds ? "Final" : round === rounds - 1 ? "Semifinal" : `Round ${round}`;
        const isLast = round === rounds;
        const pairs: TournamentMatch[][] = [];
        for (let i = 0; i < matches.length; i += 2) {
          pairs.push([matches[i], matches[i + 1]].filter(Boolean) as TournamentMatch[]);
        }
        const pairGap = 28 * Math.pow(2, round);

        return (
          <div key={round} className="flex min-w-[220px] flex-col" style={{ gap: pairGap }}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            {pairs.map((pair, pi) => (
              <div key={pi} className="relative flex flex-col justify-center gap-4">
                {pair.map((m) => (
                  <div key={m.id} className="relative">
                    <MatchBox match={m} teamName={teamName} tournament={tournament} emit={emit} />
                    {!isLast && (
                      <span className="absolute top-1/2 -right-7 h-px w-7 -translate-y-1/2 bg-border" />
                    )}
                  </div>
                ))}
                {!isLast && pair.length === 2 && (
                  <span
                    className="absolute -right-7 w-px bg-border"
                    style={{ top: "25%", bottom: "25%" }}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MatchBox({
  match,
  teamName,
  tournament,
  emit,
}: {
  match: TournamentMatch;
  teamName: (id: string | null) => string | null;
  tournament: Tournament;
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const canDecide = !match.isBye && match.teamAId && match.teamBId && !match.winnerId;

  const pick = (winnerId: string) => {
    emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, match.id, winnerId));
  };

  const row = (id: string | null) => {
    const isWinner = id && id === match.winnerId;
    return (
      <div
        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
          isWinner ? "bg-success-soft font-semibold text-success" : "text-foreground"
        }`}
      >
        <span>{teamName(id) ?? "TBD"}</span>
        {canDecide && id && (
          <button
            onClick={() => pick(id)}
            className="rounded border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
          >
            Win
          </button>
        )}
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