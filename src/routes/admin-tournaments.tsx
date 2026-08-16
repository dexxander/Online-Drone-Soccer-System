import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Trophy, Trash2, ArrowLeft, Dices, Settings2, Shuffle, Check, X, ShieldAlert, ImagePlus, Play } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { GroupScoringSystem, MatchmakingType, Team, TeamCategory, Tournament, TournamentMatch } from "@/lib/types";
import { exportBracketPdf, exportGroupStagePdf, exportTournamentPdf } from "@/lib/tournament-pdf";

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
  const [groupScoringSystem, setGroupScoringSystem] = useState<GroupScoringSystem>("three-one-zero");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [halfDurationMinutes, setHalfDurationMinutes] = useState(5);
  const [halftimeDurationMinutes, setHalftimeDurationMinutes] = useState(2);
  const [warmupDurationMinutes, setWarmupDurationMinutes] = useState(5);
  const [overtimeDurationMinutes, setOvertimeDurationMinutes] = useState(3);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Manual Pairs state: array of { teamAId: string | null, teamBId: string | null }
  const [manualPairs, setManualPairs] = useState<Array<{ teamAId: string | null; teamBId: string | null }>>([]);

  const updateTeamQuota = (quota: number) => {
    setTeamQuota(quota);
    if (quota === 21) setGroupCount(5);
  };

  const readImage = (file: File, setter: (value: string) => void) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Images must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  };

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
    if (teamQuota === 21 && groupStageEnabled && selectedTeamIds.length !== 21) {
      setError("The 21-team group-stage format requires exactly 21 selected teams.");
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
        ,logoUrl
        ,bannerUrl
        ,halfDurationMinutes
        ,halftimeDurationMinutes
        ,warmupDurationMinutes
        ,overtimeDurationMinutes
        ,groupScoringSystem
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
              onChange={(e) => updateTeamQuota(Number(e.target.value))}
            >
              <option value={4}>4 Teams (Semifinals)</option>
              <option value={12}>12 Teams</option>
              <option value={21}>21 Teams (Group Stage)</option>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground"><ImagePlus className="size-4 text-primary" /> Tournament branding</div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">Logo (optional)<input type="file" accept="image/*" className="auth-input mt-1.5 text-xs" onChange={(e) => e.target.files?.[0] && readImage(e.target.files[0], setLogoUrl)} /></label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">Banner (optional)<input type="file" accept="image/*" className="auth-input mt-1.5 text-xs" onChange={(e) => e.target.files?.[0] && readImage(e.target.files[0], setBannerUrl)} /></label>
              {(logoUrl || bannerUrl) && <div className="overflow-hidden rounded-lg border border-border bg-background">{bannerUrl && <img src={bannerUrl} alt="Banner preview" className="h-20 w-full object-cover" />}{logoUrl && <img src={logoUrl} alt="Logo preview" className="m-2 size-12 rounded-md object-contain" />}</div>}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-bold text-foreground">Match timing</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-foreground">Each half (min)<input type="number" min={1} max={60} className="auth-input mt-1" value={halfDurationMinutes} onChange={(e) => setHalfDurationMinutes(Number(e.target.value))} /></label>
              <label className="text-xs font-semibold text-foreground">Half-time break<input type="number" min={0} max={30} className="auth-input mt-1" value={halftimeDurationMinutes} onChange={(e) => setHalftimeDurationMinutes(Number(e.target.value))} /></label>
              <label className="text-xs font-semibold text-foreground">Warm-up / testing<input type="number" min={0} max={30} className="auth-input mt-1" value={warmupDurationMinutes} onChange={(e) => setWarmupDurationMinutes(Number(e.target.value))} /></label>
              <label className="text-xs font-semibold text-foreground">Overtime (min)<input type="number" min={0} max={30} className="auth-input mt-1" value={overtimeDurationMinutes} onChange={(e) => setOvertimeDurationMinutes(Number(e.target.value))} /></label>
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
                {[2, 4, 5, 8, 16].map((count) => <option key={count} value={count}>{count} Groups</option>)}
              </select>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-foreground">Group scoring system</label>
              <select className="auth-input mt-1.5" value={groupScoringSystem} onChange={(e) => setGroupScoringSystem(e.target.value as GroupScoringSystem)}>
                <option value="three-one-zero">Points: win 3 / draw 1 / loss 0</option>
                <option value="winner-only">Winner-only scoring</option>
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
                        if (!selectedTeamIds.includes(t.id) && selectedTeamIds.length >= teamQuota) {
                          setError(`This tournament is limited to ${teamQuota} teams.`);
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
  const qualifiers = tournament.qualifiersPerGroup ?? 2;
  const scoringSystem = tournament.groupScoringSystem ?? "three-one-zero";

  // Build standings for a group
  const buildStandings = (matches: TournamentMatch[]) => {
    const teamIds = new Set<string>();
    matches.forEach((m) => { if (m.teamAId) teamIds.add(m.teamAId); if (m.teamBId) teamIds.add(m.teamBId); });
    const stats = new Map<string, { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; pts: number }>();
    teamIds.forEach((id) => stats.set(id, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0 }));
    matches.forEach((m) => {
      if (!m.winnerId && m.result !== "draw") return;
      const a = m.teamAId ? stats.get(m.teamAId) : undefined;
      const b = m.teamBId ? stats.get(m.teamBId) : undefined;
      const scoreA = (m as any).scoreA ?? 0;
      const scoreB = (m as any).scoreB ?? 0;
      if (a) { a.played++; a.gf += scoreA; a.ga += scoreB; }
      if (b) { b.played++; b.gf += scoreB; b.ga += scoreA; }
      if (m.result === "draw" && scoringSystem !== "winner-only") {
        if (a) { a.draws++; a.pts += 1; }
        if (b) { b.draws++; b.pts += 1; }
      } else if (m.winnerId) {
        const w = stats.get(m.winnerId);
        const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
        const l = loserId ? stats.get(loserId) : undefined;
        if (w) { w.wins++; w.pts += 3; }
        if (l) { l.losses++; }
      }
    });
    return [...stats.entries()]
      .sort(([, a], [, b]) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
      .map(([id, s], rank) => ({ id, rank: rank + 1, ...s }));
  };

  const decidedCount = groupMatches.filter((m) => m.winnerId || m.result === "draw").length;

  return (
    <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <ShieldAlert className="size-4" />
            </span>
            Group Stage
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Top {qualifiers} from each group qualify.{" "}
            {scoringSystem === "three-one-zero" ? "Win 3 · Draw 1 · Loss 0" : "Winner-only scoring"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-foreground">{decidedCount}<span className="text-muted-foreground">/{groupMatches.length}</span></p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Matches Decided</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        {groups.map((matches, index) => {
          const standings = buildStandings(matches);
          return (
            <div key={index} className="w-full sm:w-[calc(50%-0.625rem)] xl:w-[calc(33.333%-0.875rem)] rounded-xl border border-border bg-background overflow-hidden">
              {/* Group Header */}
              <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Group {String.fromCharCode(65 + index)}
                </h3>
              </div>

              {/* Standings Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/15 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="w-6 py-2 pl-3 text-center">#</th>
                      <th className="py-2 pl-2 text-left">Team</th>
                      <th className="w-7 py-2 text-center">P</th>
                      <th className="w-7 py-2 text-center">W</th>
                      <th className="w-7 py-2 text-center">D</th>
                      <th className="w-7 py-2 text-center">L</th>
                      <th className="w-8 py-2 text-center">GD</th>
                      <th className="w-8 py-2 pr-3 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => {
                      const isQualifying = row.rank <= qualifiers;
                      const gd = row.gf - row.ga;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-border/50 last:border-0 transition-colors ${
                            isQualifying ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-2 pl-3 text-center">
                            <span className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              isQualifying
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-muted text-muted-foreground"
                            }`}>{row.rank}</span>
                          </td>
                          <td className={`py-2 pl-2 font-semibold ${isQualifying ? "text-foreground" : "text-muted-foreground"}`}>
                            {teamName(row.id)}
                          </td>
                          <td className="py-2 text-center text-muted-foreground tabular-nums">{row.played}</td>
                          <td className="py-2 text-center tabular-nums font-medium text-foreground">{row.wins}</td>
                          <td className="py-2 text-center tabular-nums text-muted-foreground">{row.draws}</td>
                          <td className="py-2 text-center tabular-nums text-muted-foreground">{row.losses}</td>
                          <td className={`py-2 text-center tabular-nums font-medium ${gd > 0 ? "text-emerald-600" : gd < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {gd > 0 ? `+${gd}` : gd}
                          </td>
                          <td className="py-2 pr-3 text-center tabular-nums font-bold text-foreground">{row.pts}</td>
                        </tr>
                      );
                    })}
                    {standings.length === 0 && (
                      <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">No teams assigned</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Fixtures */}
              <div className="border-t border-border bg-muted/10 px-3 py-2.5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fixtures</p>
                <div className="space-y-1.5">
                  {matches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No fixtures</p>
                  ) : matches.map((match) => {
                    const decided = !!match.winnerId || match.result === "draw";
                    return (
                      <div key={match.id} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${decided ? "bg-background" : "bg-background border border-border/50"}`}>
                        <span className={`flex-1 truncate text-right ${match.winnerId === match.teamAId ? "font-bold text-emerald-600" : match.winnerId === match.teamBId ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {teamName(match.teamAId)}
                        </span>
                        {decided ? (
                          <span className="shrink-0 rounded bg-muted/60 px-2 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
                            {match.result === "draw" ? "Draw" : "✓"}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-bold text-muted-foreground">vs</span>
                        )}
                        <span className={`flex-1 truncate ${match.winnerId === match.teamBId ? "font-bold text-emerald-600" : match.winnerId === match.teamAId ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {teamName(match.teamBId)}
                        </span>
                        {!decided && match.teamAId && match.teamBId && (
                          <div className="flex shrink-0 gap-0.5 ml-1">
                            <button onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, match.id, match.teamAId!))} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20" title={`${teamName(match.teamAId)} wins`}>A</button>
                            {scoringSystem === "three-one-zero" && (
                              <button onClick={() => emit("setMatchResult", (store) => store.setMatchResult(tournament.id, match.id, null, "draw"))} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 hover:bg-amber-500/20">D</button>
                            )}
                            <button onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, match.id, match.teamBId!))} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20" title={`${teamName(match.teamBId)} wins`}>B</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
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
        <Trophy className="mx-auto size-8 text-muted-foreground/40 mb-3" />
        <p className="font-semibold text-foreground">Knockout bracket is waiting for group results</p>
        <p className="mt-1 text-sm text-muted-foreground">The qualifying teams will be placed here after all group matches are decided.</p>
      </div>
    );
  }
  const rounds = Math.max(...knockoutMatches.map((m) => m.round));

  const getRoundTitle = (r: number) => {
    if (r === rounds) return "Final";
    if (r === rounds - 1) return "Semifinals";
    if (r === rounds - 2) return "Quarterfinals";
    const matchCount = knockoutMatches.filter(m => m.round === r).length;
    return `Round of ${matchCount * 2}`;
  };

  // Find the champion
  const finalMatch = knockoutMatches.find((m) => m.round === rounds);
  const champion = finalMatch?.winnerId ? teamName(finalMatch.winnerId) : null;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Trophy className="size-4 text-primary" />
          Knockout Bracket
        </h2>
        {champion && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
            <Trophy className="size-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Champion: {champion}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto p-6">
        <div className="flex items-stretch gap-0 min-w-max">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
            const matches = knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
            const isLast = round === rounds;
            const columnWidth = 240;
            const connectorWidth = 40;

            return (
              <div key={round} className="flex flex-col" style={{ width: columnWidth + (isLast ? 0 : connectorWidth) }}>
                {/* Round Header */}
                <div className="mb-4 px-1" style={{ width: columnWidth }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {getRoundTitle(round)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {matches.length} match{matches.length !== 1 ? "es" : ""}
                  </p>
                </div>

                {/* Match cards with connectors */}
                <div className="flex-1 flex flex-col justify-around">
                  {matches.map((m) => {
                    const hasWinner = !!m.winnerId;
                    const canDecide = !m.isBye && m.teamAId && m.teamBId && !m.winnerId;

                    return (
                      <div key={m.id} className="flex items-center">
                        {/* Match Card */}
                        <div
                          className={`rounded-lg border overflow-hidden transition-all ${
                            hasWinner
                              ? "border-emerald-500/30 shadow-sm"
                              : canDecide
                                ? "border-primary/30 shadow-sm"
                                : "border-border"
                          }`}
                          style={{ width: columnWidth }}
                        >
                          {/* Team A Row */}
                          <div className={`flex items-center justify-between px-3 py-2 text-sm border-b border-border/40 ${
                            m.winnerId === m.teamAId
                              ? "bg-emerald-500/8 font-bold text-emerald-700 dark:text-emerald-400"
                              : m.winnerId && m.winnerId !== m.teamAId
                                ? "bg-muted/20 text-muted-foreground"
                                : "bg-background text-foreground"
                          }`}>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {m.winnerId === m.teamAId && <span className="text-emerald-500 text-[10px]">▶</span>}
                              <span className="truncate font-medium text-[13px]">{teamName(m.teamAId) ?? "TBD"}</span>
                            </div>
                            {canDecide && m.teamAId && (
                              <button
                                onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, m.id, m.teamAId!))}
                                className="shrink-0 ml-2 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                Win
                              </button>
                            )}
                          </div>

                          {/* Team B Row or BYE */}
                          {!m.isBye ? (
                            <div className={`flex items-center justify-between px-3 py-2 text-sm ${
                              m.winnerId === m.teamBId
                                ? "bg-emerald-500/8 font-bold text-emerald-700 dark:text-emerald-400"
                                : m.winnerId && m.winnerId !== m.teamBId
                                  ? "bg-muted/20 text-muted-foreground"
                                  : "bg-background text-foreground"
                            }`}>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {m.winnerId === m.teamBId && <span className="text-emerald-500 text-[10px]">▶</span>}
                                <span className="truncate font-medium text-[13px]">{teamName(m.teamBId) ?? "TBD"}</span>
                              </div>
                              {canDecide && m.teamBId && (
                                <button
                                  onClick={() => emit("setMatchWinner", (store) => store.setMatchWinner(tournament.id, m.id, m.teamBId!))}
                                  className="shrink-0 ml-2 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  Win
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-[11px] font-semibold italic text-muted-foreground bg-muted/10">
                              Bye — Auto-Advance
                            </div>
                          )}
                        </div>

                        {/* Connector line to next round */}
                        {!isLast && (
                          <div
                            className={`h-[2px] transition-colors ${
                              hasWinner ? "bg-emerald-500/50" : "bg-border"
                            }`}
                            style={{ width: connectorWidth }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

