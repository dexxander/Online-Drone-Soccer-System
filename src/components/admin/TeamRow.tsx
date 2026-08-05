import { useState } from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { RowActions, StatusBadge } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { Team, TeamCategory } from "@/lib/types";

export const categories: TeamCategory[] = ["Junior", "Youth", "Collegiate", "Open"];

export function TeamRow({
  team,
  playerCount,
  emit,
}: {
  team: Team;
  playerCount: number;
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: team.name,
    category: team.category,
    coachName: team.coachName,
    contactEmail: team.contactEmail,
    contactPhone: team.contactPhone,
  });

  const save = () => {
    if (!draft.name.trim() || !draft.coachName.trim()) return;
    emit("updateTeam", (store) =>
      store.updateTeam(team.id, {
        name: draft.name.trim(),
        category: draft.category,
        coachName: draft.coachName.trim(),
        contactEmail: draft.contactEmail.trim(),
        contactPhone: draft.contactPhone.trim(),
      }),
    );
    setEditing(false);
  };

  const remove = () => {
    if (!window.confirm(`Delete ${team.name} and its entire roster? This cannot be undone.`)) return;
    emit("removeTeam", (store) => store.removeTeam(team.id));
  };

  if (editing) {
    return (
      <tr className="border-b border-border bg-muted/30 last:border-0">
        <td className="px-5 py-3" colSpan={7}>
          <div className="grid gap-3 sm:grid-cols-5">
            <input
              className="auth-input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Team name"
            />
            <select
              className="auth-input"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as TeamCategory }))}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              className="auth-input"
              value={draft.coachName}
              onChange={(e) => setDraft((d) => ({ ...d, coachName: e.target.value }))}
              placeholder="Coach name"
            />
            <input
              className="auth-input"
              type="email"
              value={draft.contactEmail}
              onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
              placeholder="Contact email"
            />
            <input
              className="auth-input"
              value={draft.contactPhone}
              onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
              placeholder="Contact phone"
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
      <td className="px-5 py-3 font-semibold text-foreground">{team.name}</td>
      <td className="px-5 py-3 text-muted-foreground">{team.category}</td>
      <td className="px-5 py-3 text-muted-foreground">{team.coachName}</td>
      <td className="px-5 py-3 text-muted-foreground">{team.contactEmail}</td>
      <td className="px-5 py-3 tabular-nums text-muted-foreground">{playerCount}</td>
      <td className="px-5 py-3">
        <StatusBadge status={team.status} />
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {team.status === "pending" && (
            <RowActions
              onApprove={() => emit("updateTeamStatus", (s) => s.setTeamStatus(team.id, "approved"))}
              onReject={() => emit("updateTeamStatus", (s) => s.setTeamStatus(team.id, "rejected"))}
            />
          )}
          <button
            aria-label={`Edit ${team.name}`}
            onClick={() => setEditing(true)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            aria-label={`Delete ${team.name}`}
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