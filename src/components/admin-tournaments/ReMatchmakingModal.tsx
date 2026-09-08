import { useState } from "react";
import { Check, Dices, Settings2, X } from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { MatchmakingType, Team, Tournament } from "@/lib/types";
import { getAssignedTeamIdsExcept } from "@/lib/tournament-helpers";

export function ReMatchmakingModal({
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