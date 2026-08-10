import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trophy, Trash2, ArrowLeft, Dices, Settings2, Shuffle, Check, X, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { MatchmakingType, Team, TeamCategory, Tournament, TournamentMatch } from "@/lib/types";

export const Route = createFileRoute("/admin-tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — Drone Soccer League Control" },
      { name: "description", content: "Create tournaments with Auto or Manual matchmaking brackets." },
    ],
  }),
  component: AdminTournamentsPage,
});

function AdminTournamentsPage() {
  const { state, emit } = useMockWebSocket();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reMatchmakingItem, setReMatchmakingItem] = useState<Tournament | null>(null);

  const selected = state.tournaments.find((t) => t.id === selectedId) ?? null;

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
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {selected.status} · {selected.teamIds.length} Teams Registered
              {selected.teamQuota ? ` (Quota: ${selected.teamQuota})` : ""}
            </p>
          </div>

          <button
            onClick={() => setReMatchmakingItem(selected)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Shuffle className="size-4 text-primary" /> Re-Matchmake / Edit Pairings
          </button>
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
                      Status: <strong className="text-foreground">{t.status}</strong> · {t.teamIds.length} Teams
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

function getAssignedTeamIdsExcept(
  pairs: Array<{ teamAId: string | null; teamBId: string | null }>,
  currentSlotIndex: number,
  currentSide: "teamAId" | "teamBId"
): Set<string> {
  const set = new Set<string>();
  pairs.forEach((p, idx) => {
    if (p.teamAId && !(idx === currentSlotIndex && currentSide === "teamAId")) {
      set.add(p.teamAId);
    }
    if (p.teamBId && !(idx === currentSlotIndex && currentSide === "teamBId")) {
      set.add(p.teamBId);
    }
  });
  return set;
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
  const [category, setCategory] = useState<TeamCategory>("Open");
  const [teamQuota, setTeamQuota] = useState<number>(4);
  const [matchmakingType, setMatchmakingType] = useState<MatchmakingType>("auto");
  const [groupStageEnabled, setGroupStageEnabled] = useState(false);
  const [groupCount, setGroupCount] = useState(4);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Manual Pairs state: array of { teamAId: string | null, teamBId: string | null }
  const [manualPairs, setManualPairs] = useState<Array<{ teamAId: string | null; teamBId: string | null }>>([]);

  // Auto initialize manual pairs based on selected teams or quota
  const initManualPairs = (chosenIds: string[]) => {
    const pairCount = Math.max(1, Math.ceil(chosenIds.length / 2));
    const pairs: Array<{ teamAId: string | null; teamBId: string | null }> = [];
    for (let i = 0; i < pairCount; i++) {
      pairs.push({
        teamAId: chosenIds[i * 2] || null,
        teamBId: chosenIds[i * 2 + 1] || null,
      });
    }
    setManualPairs(pairs);
  };

  const toggleTeamSelect = (id: string) => {
    const next = selectedTeamIds.includes(id)
      ? selectedTeamIds.filter((i) => i !== id)
      : [...selectedTeamIds, id];
    setSelectedTeamIds(next);
    if (matchmakingType === "manual") {
      initManualPairs(next);
    }
  };

  const handleMatchmakingTypeChange = (type: MatchmakingType) => {
    setMatchmakingType(type);
    if (type === "manual") {
      initManualPairs(selectedTeamIds);
    }
  };

  const updateManualPair = (index: number, side: "teamAId" | "teamBId", value: string | null) => {
    const updated = [...manualPairs];
    const item = updated[index];
    if (item) {
      updated[index] = {
        teamAId: side === "teamAId" ? (value === "none" ? null : value) : item.teamAId,
        teamBId: side === "teamBId" ? (value === "none" ? null : value) : item.teamBId,
      };
      setManualPairs(updated);
    }
  };

  const addManualSlot = () => {
    setManualPairs([...manualPairs, { teamAId: null, teamBId: null }]);
  };

  const submit = () => {
    if (!name.trim()) {
      setError("Tournament name is required.");
      return;
    }
    if (selectedTeamIds.length < 2) {
      setError("Select at least 2 teams.");
      return;
    }
    if (selectedTeamIds.length > 128) {
      setError("A tournament can include a maximum of 128 teams.");
      return;
    }
    if (groupStageEnabled && selectedTeamIds.length < groupCount * 2) {
      setError("Select at least two teams per group.");
      return;
    }

    if (matchmakingType === "manual") {
      if (manualPairs.length === 0) {
        setError("Please configure at least 1 match slot for manual pairing.");
        return;
      }

      // Check 1: Same team in same slot
      for (let idx = 0; idx < manualPairs.length; idx++) {
        const pair = manualPairs[idx];
        if (pair && pair.teamAId && pair.teamBId && pair.teamAId === pair.teamBId) {
          const team = teams.find((t) => t.id === pair.teamAId);
          setError(`Slot #${idx + 1}: ${team?.name || "A team"} cannot play against itself.`);
          return;
        }
      }

      // Check 2: Same team assigned to multiple slots in Round 1
      const assignedIds = new Set<string>();
      for (let idx = 0; idx < manualPairs.length; idx++) {
        const pair = manualPairs[idx];
        if (pair && pair.teamAId) {
          if (assignedIds.has(pair.teamAId)) {
            const team = teams.find((t) => t.id === pair.teamAId);
            setError(`Team "${team?.name || pair.teamAId}" is assigned to multiple match slots in Round 1.`);
            return;
          }
          assignedIds.add(pair.teamAId);
        }
        if (pair && pair.teamBId) {
          if (assignedIds.has(pair.teamBId)) {
            const team = teams.find((t) => t.id === pair.teamBId);
            setError(`Team "${team?.name || pair.teamBId}" is assigned to multiple match slots in Round 1.`);
            return;
          }
          assignedIds.add(pair.teamBId);
        }
      }
    }

    setError("");
    emit("createTournament", (store) =>
      store.createTournament(
        name.trim(),
        selectedTeamIds,
        category,
        matchmakingType,
        teamQuota,
        matchmakingType === "manual" ? manualPairs : undefined
        ,groupStageEnabled
        ,groupCount
        ,2
      )
    );
    onClose();
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-background p-6 shadow-card animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Create New Tournament</h2>
          <p className="text-xs text-muted-foreground">Choose up to 128 teams, then decide whether they start in groups or the knockout bracket.</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
          <X className="size-5" />
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider">
              Tournament Name
            </label>
            <input
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2026 National Drone Soccer Championship"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider">
              Division / Category
            </label>
            <select
              className="auth-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as TeamCategory)}
            >
              <option value="Open">Open</option>
              <option value="Collegiate">Collegiate</option>
              <option value="Youth">Youth</option>
              <option value="Junior">Junior</option>
            </select>
          </div>
        </div>

        {/* Team Quota & Matchmaking Type Selector */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider">
              Team Quota
            </label>
            <select
              className="auth-input"
              value={teamQuota}
              onChange={(e) => setTeamQuota(Number(e.target.value))}
            >
              <option value={4}>4 Teams (Semifinals)</option>
              <option value={8}>8 Teams (Quarterfinals)</option>
              <option value={16}>16 Teams (Round of 16)</option>
              <option value={32}>32 Teams (Round of 32)</option>
              <option value={64}>64 Teams (Round of 64)</option>
              <option value={128}>128 Teams (Round of 128)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wider">
              Matchmaking Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMatchmakingTypeChange("auto")}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  matchmakingType === "auto"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Dices className="size-4" /> Auto Matchmaking
              </button>
              <button
                type="button"
                onClick={() => handleMatchmakingTypeChange("manual")}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  matchmakingType === "manual"
                    ? "border-purple-500 bg-purple-500/10 text-purple-600 shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings2 className="size-4" /> Manual Matchmaking
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border text-primary"
              checked={groupStageEnabled}
              onChange={(e) => setGroupStageEnabled(e.target.checked)}
            />
            Include group stage before knockout bracket
          </label>
          <p className="mt-1 pl-7 text-xs text-muted-foreground">Teams play each other within their group. The top two teams from each group advance automatically.</p>
          {groupStageEnabled && (
            <div className="mt-3 max-w-xs pl-7">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">Number of groups</label>
              <select className="auth-input" value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))}>
                {[2, 4, 8, 16].map((count) => <option key={count} value={count}>{count} Groups</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Select Teams Section */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground flex items-center justify-between">
            <span>Select Teams for Tournament ({selectedTeamIds.length} / {Math.min(teamQuota, 128)} Selected)</span>
            {selectedTeamIds.length > teamQuota && (
              <span className="text-destructive font-normal text-xs">Exceeds team quota!</span>
            )}
          </p>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved teams available. Please approve team registrations first.</p>
          ) : (
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2 rounded-lg border border-border p-3 bg-muted/20">
              {teams.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    selectedTeamIds.includes(t.id)
                      ? "border-primary/50 bg-primary/5 text-foreground font-semibold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border text-primary"
                      checked={selectedTeamIds.includes(t.id)}
                      onChange={() => {
                        if (!selectedTeamIds.includes(t.id) && selectedTeamIds.length >= 128) {
                          setError("A tournament can include a maximum of 128 teams.");
                          return;
                        }
                        toggleTeamSelect(t.id);
                      }}
                    />
                    <span>{t.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t.category}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Manual Pairing Builder */}
        {matchmakingType === "manual" && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                  <Settings2 className="size-4" /> Manual Round 1 Pairings
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pick which team faces which team in Round 1. Unassigned slots act as BYEs.
                </p>
              </div>
              <button
                type="button"
                onClick={addManualSlot}
                className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-background px-2.5 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-500/10"
              >
                <Plus className="size-3" /> Add Slot
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {manualPairs.map((pair, idx) => {
                const assignedForA = getAssignedTeamIdsExcept(manualPairs, idx, "teamAId");
                const assignedForB = getAssignedTeamIdsExcept(manualPairs, idx, "teamBId");

                return (
                  <div key={idx} className="rounded-lg border border-border bg-background p-3 shadow-xs space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Match Slot #{idx + 1}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] font-semibold text-muted-foreground mb-1">Team A</span>
                        <select
                          className="auth-input text-xs py-1.5"
                          value={pair.teamAId || "none"}
                          onChange={(e) => updateManualPair(idx, "teamAId", e.target.value)}
                        >
                          <option value="none">-- BYE / Empty --</option>
                          {teams
                            .filter((t) => selectedTeamIds.includes(t.id) && !assignedForA.has(t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-[10px] font-semibold text-muted-foreground mb-1">Team B</span>
                        <select
                          className="auth-input text-xs py-1.5"
                          value={pair.teamBId || "none"}
                          onChange={(e) => updateManualPair(idx, "teamBId", e.target.value)}
                        >
                          <option value="none">-- BYE / Empty --</option>
                          {teams
                            .filter((t) => selectedTeamIds.includes(t.id) && !assignedForB.has(t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Check className="size-4" />
            {matchmakingType === "manual" ? "Generate Manual Bracket" : "Auto Generate Bracket"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ReMatchmakingModal({
  tournament,
  teams,
  onClose,
  emit,
}: {
  tournament: Tournament;
  teams: Team[];
  onClose: () => void;
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const [matchmakingType, setMatchmakingType] = useState<MatchmakingType>(
    tournament.matchmakingType || "auto"
  );
  const [manualPairs, setManualPairs] = useState<Array<{ teamAId: string | null; teamBId: string | null }>>(() => {
    const round1 = tournament.matches.filter((m) => m.round === 1);
    if (round1.length > 0) {
      return round1.map((m) => ({ teamAId: m.teamAId, teamBId: m.teamBId }));
    }
    return [{ teamAId: null, teamBId: null }];
  });

  const availableTeams = teams.filter((t) => tournament.teamIds.includes(t.id));

  const [error, setError] = useState("");

  const updateManualPair = (index: number, side: "teamAId" | "teamBId", value: string | null) => {
    setError("");
    const updated = [...manualPairs];
    const item = updated[index];
    if (item) {
      updated[index] = {
        teamAId: side === "teamAId" ? (value === "none" ? null : value) : item.teamAId,
        teamBId: side === "teamBId" ? (value === "none" ? null : value) : item.teamBId,
      };
      setManualPairs(updated);
    }
  };

  const handleApply = () => {
    if (matchmakingType === "manual") {
      for (let idx = 0; idx < manualPairs.length; idx++) {
        const pair = manualPairs[idx];
        if (pair && pair.teamAId && pair.teamBId && pair.teamAId === pair.teamBId) {
          const team = availableTeams.find((t) => t.id === pair.teamAId);
          setError(`Slot #${idx + 1}: ${team?.name || "A team"} cannot play against itself.`);
          return;
        }
      }
    }

    emit("regenerateTournamentMatchmaking", (s) =>
      s.regenerateTournamentMatchmaking(
        tournament.id,
        matchmakingType,
        matchmakingType === "manual" ? manualPairs : undefined
      )
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Re-Matchmake Tournament</h2>
            <p className="text-xs text-muted-foreground">{tournament.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Select Matchmaking Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMatchmakingType("auto");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${
                  matchmakingType === "auto"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Dices className="size-4" /> Auto Matchmake
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMatchmakingType("manual");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${
                  matchmakingType === "manual"
                    ? "border-purple-500 bg-purple-500/10 text-purple-600"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Settings2 className="size-4" /> Manual Matchmake
              </button>
            </div>
          </div>

          {matchmakingType === "manual" ? (
            <div className="space-y-3 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Configure Round 1 Slots
              </p>
              <div className="grid gap-3 max-h-60 overflow-y-auto sm:grid-cols-2">
                {manualPairs.map((pair, idx) => {
                  const assignedForA = getAssignedTeamIdsExcept(manualPairs, idx, "teamAId");
                  const assignedForB = getAssignedTeamIdsExcept(manualPairs, idx, "teamBId");

                  return (
                    <div key={idx} className="rounded-lg border border-border bg-background p-2.5 shadow-xs space-y-1.5">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Slot #{idx + 1}</p>
                      <select
                        className="auth-input text-xs py-1"
                        value={pair.teamAId || "none"}
                        onChange={(e) => updateManualPair(idx, "teamAId", e.target.value)}
                      >
                        <option value="none">-- BYE --</option>
                        {availableTeams
                          .filter((t) => !assignedForA.has(t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                      <select
                        className="auth-input text-xs py-1"
                        value={pair.teamBId || "none"}
                        onChange={(e) => updateManualPair(idx, "teamBId", e.target.value)}
                      >
                        <option value="none">-- BYE --</option>
                        {availableTeams
                          .filter((t) => !assignedForB.has(t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <p className="text-sm font-semibold text-foreground">Auto Matchmaking Enabled</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clicking apply will randomly shuffle the {availableTeams.length} registered teams and regenerate Round 1 match slots automatically.
              </p>
            </div>
          )}

          {error && <p className="text-xs font-bold text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check className="size-4" /> Apply & Re-Generate Bracket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupStage({
  tournament,
  teams,
  emit,
}: {
  tournament: Tournament;
  teams: Team[];
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const teamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? "—" : "TBD");
  const groupMatches = tournament.matches.filter((m) => m.phase === "group");
  const groupCount = tournament.groupCount ?? Math.max(1, ...groupMatches.map((m) => m.groupNumber ?? 1));
  const groups = Array.from({ length: groupCount }, (_, index) => groupMatches.filter((m) => m.groupNumber === index + 1));

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Group Stage</h2>
          <p className="mt-1 text-sm text-muted-foreground">Top {tournament.qualifiersPerGroup ?? 2} teams from each group qualify for the knockout bracket.</p>
        </div>
        <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700">
          {groupMatches.filter((m) => m.winnerId).length} / {groupMatches.length} decided
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((matches, index) => (
          <div key={index} className="rounded-xl border border-border bg-background p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">Group {String.fromCharCode(65 + index)}</h3>
            <div className="space-y-2">
              {matches.length === 0 ? <p className="text-xs text-muted-foreground">No matches</p> : matches.map((match) => (
                <div key={match.id} className="rounded-lg border border-border/70 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2"><span className={match.winnerId === match.teamAId ? "font-bold text-emerald-600" : ""}>{teamName(match.teamAId)}</span>{match.winnerId === match.teamAId && "✓"}</div>
                  <div className="my-1 border-t border-border" />
                  <div className="flex items-center justify-between gap-2"><span className={match.winnerId === match.teamBId ? "font-bold text-emerald-600" : ""}>{teamName(match.teamBId)}</span>{match.winnerId === match.teamBId && "✓"}</div>
                  {!match.winnerId && match.teamAId && match.teamBId && (
                    <div className="mt-2 flex gap-1"><button onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, match.id, match.teamAId!))} className="flex-1 rounded bg-primary/10 px-1 py-1 text-[10px] font-bold text-primary">{teamName(match.teamAId)} wins</button><button onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, match.id, match.teamBId!))} className="flex-1 rounded bg-primary/10 px-1 py-1 text-[10px] font-bold text-primary">{teamName(match.teamBId)} wins</button></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
  const knockoutMatches = tournament.matches.filter((m) => (m.phase ?? "knockout") === "knockout");
  if (knockoutMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center">
        <p className="font-semibold text-foreground">Knockout bracket is waiting for group results</p>
        <p className="mt-1 text-sm text-muted-foreground">The qualifying teams will be placed here after all group matches are decided.</p>
      </div>
    );
  }
  const rounds = Math.max(...knockoutMatches.map((m) => m.round));

  const getRoundTitle = (r: number) => {
    if (r === rounds) return "FINAL";
    if (r === rounds - 1) return "SEMIFINAL";
    if (r === rounds - 2) return "QUARTERFINAL";
    return `ROUND ${r}`;
  };

  return (
    <div className="rounded-2xl border border-border bg-background/50 p-6 shadow-sm">
      <div className="flex flex-col gap-6 overflow-x-auto pb-4">
        {/* Round Headers */}
        <div className="flex items-center gap-16 min-w-max border-b border-border pb-3">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
            const matchesCount = knockoutMatches.filter((m) => m.round === round).length;
            return (
              <div key={round} className="w-[260px] flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                    {round}
                  </span>
                  {getRoundTitle(round)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {matchesCount} Match{matchesCount === 1 ? "" : "es"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bracket Columns */}
        <div className="flex items-stretch gap-16 min-w-max min-h-[480px] py-2">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
            const matches = knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
            const isLast = round === rounds;

            // Group matches into pairs for Round 1, 2, etc.
            const pairs: TournamentMatch[][] = [];
            for (let i = 0; i < matches.length; i += 2) {
              const pair = [matches[i], matches[i + 1]].filter((m): m is TournamentMatch => Boolean(m));
              pairs.push(pair);
            }

            return (
              <div key={round} className="w-[260px] flex flex-col justify-around">
                {pairs.map((pair, pi) => (
                  <div key={pi} className="relative flex flex-col justify-around h-full my-4">
                    {pair.map((m, idx) => {
                      const hasWinner = !!m.winnerId;
                      return (
                        <div key={m.id} className="relative py-2 z-10">
                          <MatchBox match={m} teamName={teamName} tournament={tournament} emit={emit} />
                          {/* Horizontal line extending right from MatchBox */}
                          {!isLast && (
                            <div
                              className={`absolute -right-8 top-1/2 h-[2.5px] w-8 -translate-y-1/2 transition-colors ${
                                hasWinner ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}

                    {/* Bracket Spine Connector connecting Top & Bottom Match in the Pair */}
                    {!isLast && (
                      <>
                        <div
                          className={`absolute -right-8 top-[25%] bottom-[25%] w-[2.5px] z-0 transition-colors ${
                            pair.some((m) => !!m.winnerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        {/* Forward Stem to Next Round */}
                        <div
                          className={`absolute -right-16 top-1/2 h-[2.5px] w-8 -translate-y-1/2 z-0 transition-colors ${
                            pair.some((m) => !!m.winnerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
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
        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
          isWinner ? "bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400" : "text-foreground"
        }`}
      >
        <span className="truncate pr-2 font-medium">{teamName(id) ?? "TBD"}</span>
        {canDecide && id && (
          <button
            onClick={() => pick(id)}
            className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground shrink-0"
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
      <div className="flex-1 divide-y divide-border rounded-xl border border-border bg-background shadow-sm transition-all hover:border-primary/50">
        {row(match.teamAId)}
        {!match.isBye && row(match.teamBId)}
        {match.isBye && <div className="px-3 py-2 text-xs font-semibold italic text-muted-foreground">Bye (Auto-Advance)</div>}
      </div>
    </div>
  );
}
