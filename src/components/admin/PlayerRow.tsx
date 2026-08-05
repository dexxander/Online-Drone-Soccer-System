import { useState } from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { RowActions, StatusBadge } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { Player, PlayerPosition, Team } from "@/lib/types";

export const positions: PlayerPosition[] = ["Striker", "Defender", "Goalkeeper", "Flex"];

export function PlayerRow({
  player,
  teams,
  emit,
}: {
  player: Player;
  teams: Team[];
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: player.name,
    number: String(player.number),
    position: player.position,
    teamId: player.teamId,
    studentId: player.studentId ?? "",
    dateOfBirth: player.dateOfBirth ?? "",
  });

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";

  const save = () => {
    if (!draft.name.trim() || !draft.number.trim()) return;
    emit("updatePlayer", (store) =>
      store.updatePlayer(player.id, {
        name: draft.name.trim(),
        number: Number(draft.number),
        position: draft.position,
        teamId: draft.teamId,
        ...(draft.studentId.trim() ? { studentId: draft.studentId.trim() } : {}),
        ...(draft.dateOfBirth ? { dateOfBirth: draft.dateOfBirth } : {}),
      }),
    );
    setEditing(false);
  };

  const remove = () => {
    if (!window.confirm(`Remove ${player.name} from the league?`)) return;
    emit("removePlayer", (store) => store.removePlayer(player.id));
  };

  if (editing) {
    return (
      <tr className="border-b border-border bg-muted/30 last:border-0">
        <td className="px-5 py-3" colSpan={6}>
          <div className="grid gap-3 sm:grid-cols-6">
            <input
              className="auth-input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Name"
            />
            <input
              className="auth-input"
              type="number"
              min={0}
              value={draft.number}
              onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))}
              placeholder="No."
            />
            <select
              className="auth-input"
              value={draft.position}
              onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value as PlayerPosition }))}
            >
              {positions.map((pos) => (
                <option key={pos}>{pos}</option>
              ))}
            </select>
            <select
              className="auth-input"
              value={draft.teamId}
              onChange={(e) => setDraft((d) => ({ ...d, teamId: e.target.value }))}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              className="auth-input"
              value={draft.studentId}
              onChange={(e) => setDraft((d) => ({ ...d, studentId: e.target.value }))}
              placeholder="Student ID"
            />
            <input
              className="auth-input"
              type="date"
              value={draft.dateOfBirth}
              onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" /> Cancel
            </button>
            <button
              onClick={save}
              className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success hover:opacity-80"
            >
              <Check className="size-3.5" /> Save
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3 font-semibold text-foreground">{player.name}</td>
      <td className="px-5 py-3 tabular-nums text-muted-foreground">{player.number}</td>
      <td className="px-5 py-3 text-muted-foreground">{player.position}</td>
      <td className="px-5 py-3 text-muted-foreground">{teamName(player.teamId)}</td>
      <td className="px-5 py-3">
        <StatusBadge status={player.status} />
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {player.status === "pending" && (
            <RowActions
              onApprove={() => emit("updatePlayerStatus", (s) => s.setPlayerStatus(player.id, "approved"))}
              onReject={() => emit("updatePlayerStatus", (s) => s.setPlayerStatus(player.id, "rejected"))}
            />
          )}
          <button
            aria-label={`Edit ${player.name}`}
            onClick={() => setEditing(true)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            aria-label={`Remove ${player.name}`}
            onClick={remove}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}