import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Trophy, Trash2, ArrowLeft, Dices, Settings2, Shuffle, Check, X, ShieldAlert, ImagePlus, Play } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { GroupScoringSystem, MatchmakingType, Team, TeamCategory, Tournament, TournamentMatch } from "@/lib/types";
import { exportBracketPdf, exportGroupStagePdf, exportTournamentPdf } from "@/lib/tournament-pdf";
import { getAssignedTeamIdsExcept, getTournamentTeamIds } from "@/lib/tournament-helpers";
import { CreateTournamentForm } from "@/components/admin-tournaments/CreateTournamentForm";
import { ReMatchmakingModal } from "@/components/admin-tournaments/ReMatchmakingModal";
import { GroupStage } from "@/components/admin-tournaments/GroupStage";
import { Bracket } from "@/components/admin-tournaments/Bracket";

export const Route = createFileRoute("/admin-tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — AW Drone Soccer Leagues System" },
      { name: "description", content: "Create tournaments with Auto or Manual matchmaking brackets." },
    ],
  }),
  component: AdminTournamentsPage,
});

function AdminTournamentsPage() {
  const { state, emit, socket } = useMockWebSocket();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reMatchmakingItem, setReMatchmakingItem] = useState<Tournament | null>(null);

  const selected = state.tournaments.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    void socket.refreshTournaments();
    const refreshId = window.setInterval(() => void socket.refreshTournaments(), 3000);
    return () => window.clearInterval(refreshId);
  }, [socket]);
  const autoExportedTournament = useRef<string | null>(null);

  useEffect(() => {
    if (selected?.status === "completed" && autoExportedTournament.current !== selected.id) {
      autoExportedTournament.current = selected.id;
      exportTournamentPdf(selected, state.teams);
    }
  }, [selected, state.teams]);

  if (selected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="size-3.5" /> Back to tournaments
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{selected.name}</h1>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                  selected.matchmakingType === "manual"
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-600"
                    : "border-primary/30 bg-primary/10 text-primary"
                }`}
              >
                {selected.matchmakingType === "manual" ? (
                  <>
                    <Settings2 className="size-3" /> Manual Matchmaking
                  </>
                ) : (
                  <>
                    <Dices className="size-3" /> Auto Matchmaking
                  </>
                )}
              </span>
              {selected.groupStageEnabled && (
                <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  Group Stage
                </span>
              )}
            </div>
            
            {/* MANUAL STATUS TOGGLE */}
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => emit("setTournamentStatus", (s: any) => s.setTournamentStatus(selected.id, selected.status === "completed" ? "active" : "completed"))}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold transition-colors shadow-sm ${
                  selected.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 border border-blue-500/30 hover:bg-blue-500/20"
                }`}
                title="Click to toggle status manually"
              >
                {selected.status === "completed" ? <><Check className="size-3" /> Completed</> : <><Play className="size-3" /> Active</>}
              </button>
              <span>· {selected.teamIds.length} Teams Registered {selected.teamQuota ? `(Quota: ${selected.teamQuota})` : ""}</span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {selected.halfDurationMinutes ?? 5} min halves · {selected.halftimeDurationMinutes ?? 2} min half-time · {selected.warmupDurationMinutes ?? 5} min warm-up/testing · {selected.overtimeDurationMinutes ?? 3} min overtime
            </p>
            {(selected.bannerUrl || selected.logoUrl) && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/20">
                {selected.bannerUrl && <img src={selected.bannerUrl} alt={`${selected.name} banner`} className="h-28 w-full object-cover" />}
                {selected.logoUrl && <img src={selected.logoUrl} alt={`${selected.name} logo`} className="-mt-8 ml-5 size-16 rounded-xl border-4 border-background bg-background object-contain p-1" />}
              </div>
            )}
          </div>

          <button
            onClick={() => setReMatchmakingItem(selected)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Shuffle className="size-4 text-primary" /> Re-Matchmake / Edit Pairings
          </button>
          <div className="flex flex-wrap gap-2">
            {selected.groupStageEnabled && <button onClick={() => exportGroupStagePdf(selected, state.teams)} className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-muted">Export Group PDF</button>}
            <button onClick={() => exportBracketPdf(selected, state.teams)} className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-muted">Export Bracket PDF</button>
            {selected.status === "completed" && <button onClick={() => exportTournamentPdf(selected, state.teams)} className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Export Tournament PDF</button>}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {selected.groupStageEnabled && <GroupStage tournament={selected} teams={state.teams} emit={emit} />}
          <Bracket tournament={selected} teams={state.teams} emit={emit} />
        </div>

        {reMatchmakingItem && (
          <ReMatchmakingModal
            tournament={reMatchmakingItem}
            teams={state.teams}
            onClose={() => setReMatchmakingItem(null)}
            emit={emit}
          />
        )}
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
            Create tournaments with flexible <strong>Auto Matchmaking</strong> or <strong>Manual Pairing</strong>.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Tournament
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
        <Panel title={`${state.tournaments.length} Tournament${state.tournaments.length === 1 ? "" : "s"}`}>
          {state.tournaments.length === 0 ? (
            <EmptyState
              title="No tournaments yet"
              description="Create a new tournament with Auto or Manual Matchmaking from your approved teams."
            />
          ) : (
            <ul className="divide-y divide-border">
              {state.tournaments.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30">
                  <button onClick={() => setSelectedId(t.id)} className="text-left flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-foreground hover:text-primary">{t.name}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          t.matchmakingType === "manual"
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-600"
                            : "border-primary/30 bg-primary/10 text-primary"
                        }`}
                      >
                        {t.matchmakingType === "manual" ? "Manual" : "Auto"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      Status: <strong className={t.status === 'completed' ? "text-emerald-500" : "text-blue-500"}>{t.status}</strong> · {t.teamIds.length} Teams
                      {t.teamQuota ? ` / Quota: ${t.teamQuota}` : ""}
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
