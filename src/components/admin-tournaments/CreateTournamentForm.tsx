import { useState } from "react";
import { Check, Dices, ImagePlus, Plus, Settings2, X } from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { GroupScoringSystem, MatchmakingType, Team, TeamCategory, Tournament } from "@/lib/types";
import { getAssignedTeamIdsExcept } from "@/lib/tournament-helpers";

export function CreateTournamentForm({
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
    if (quota === 21) {
      setGroupStageEnabled(true);
      setGroupCount(7);
    }
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
              {teamQuota === 21 && (
                <p className="mb-3 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <strong>21-Team Format:</strong> 7 groups × 3 teams. Top 2 per group (14 teams) advance automatically. The 2 best 3rd-placed teams by goal difference also qualify → 16 teams in knockout.
                </p>
              )}
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">Number of groups</label>
              <select className="auth-input" value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} disabled={teamQuota === 21}>
                {[2, 4, 5, 7, 8, 16].map((count) => <option key={count} value={count}>{count} Groups</option>)}
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