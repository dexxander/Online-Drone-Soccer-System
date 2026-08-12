import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Pencil, X, Check } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { LogoMark } from "@/components/LogoMark";
import { EmptyState, Panel, StatusBadge } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { auth } from "@/lib/store";
import type { Player, PlayerPosition, Team, TeamCategory } from "@/lib/types";
import { Field } from "./login";

export const Route = createFileRoute("/register-team")({
  head: () => ({
    meta: [
      { title: "Team registration — Drone Soccer League Control" },
      { name: "description", content: "Submit your drone soccer team and full player roster for league approval." },
      { property: "og:title", content: "Team registration — Drone Soccer" },
      { property: "og:description", content: "Register a team and roster for the drone soccer championship." },
    ],
  }),
  component: RegisterTeamPage,
});

const categories: TeamCategory[] = ["Junior", "Youth", "Collegiate", "Open"];
const positions: PlayerPosition[] = ["Striker", "Defender", "Goalkeeper", "Flex"];

type PlayerDraft = {
  name: string;
  number: string;
  position: PlayerPosition;
  studentId: string;
  dateOfBirth: string;
};

const emptyPlayer = (): PlayerDraft => ({
  name: "",
  number: "",
  position: "Striker",
  studentId: "",
  dateOfBirth: "",
});

function RegisterTeamPage() {
  const { state, emit } = useMockWebSocket();
  const user = auth.current();

  const [team, setTeam] = useState({
    name: "",
    category: "Open" as TeamCategory,
    coachName: user?.name ?? "",
    contactEmail: user?.email ?? "",
    contactPhone: "",
    logoUrl: null as string | null,
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTeam((t) => ({ ...t, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };
  const [players, setPlayers] = useState<PlayerDraft[]>([emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [error, setError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  const myTeams: Team[] = user ? state.teams.filter((t) => t.ownerId === user.id) : [];

  const updatePlayer = (i: number, patch: Partial<PlayerDraft>) =>
    setPlayers(players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team.name.trim()) return setError("Team name is required.");
    if (!team.coachName.trim()) return setError("Coach name is required.");
    if (!team.contactEmail.includes("@")) return setError("A valid contact email is required.");
    const filled = players.filter((p) => p.name.trim() && p.number.trim());
    if (filled.length < 1) return setError("Add at least one player with a name and number.");
    setError("");

    emit("registerTeam", (store) => {
      const created = store.addTeam(user ? { ...team, ownerId: user.id } : team);
      store.addPlayers(
        created.id,
        filled.map((p) => ({
          name: p.name.trim(),
          number: Number(p.number),
          position: p.position,
          ...(p.studentId.trim() ? { studentId: p.studentId.trim() } : {}),
          ...(p.dateOfBirth ? { dateOfBirth: p.dateOfBirth } : {}),
        })),
      );
    });
    setJustSubmitted(true);
    setTeam({
      name: "",
      category: "Open",
      coachName: user?.name ?? "",
      contactEmail: user?.email ?? "",
      contactPhone: "",
      logoUrl: null,
    });
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Public Top Navigation Header (Matching standard layout) ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="size-9 shadow-lift" />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                League Control
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/tournaments"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Matches
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              About
            </Link>
            <NotificationMenu />
            <AccountMenu />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Coach portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Team registration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit your club details and roster. Entries appear as pending until an administrator reviews them.
        </p>

      {justSubmitted && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-success/25 bg-success-soft px-5 py-4 text-sm font-medium text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          Registration submitted — it now appears below as pending.
        </div>
      )}

      {user && (
        <div className="mt-8">
          <Panel title="My teams">
            {myTeams.length === 0 ? (
              <EmptyState
                title="No teams yet"
                description="Register your first team and roster using the form below."
              />
            ) : (
              <ul className="divide-y divide-border">
                {myTeams.map((t) => (
                  <li key={t.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {t.logoUrl && (
                          <img
                            src={t.logoUrl}
                            alt=""
                            className="size-9 shrink-0 rounded-md border border-border object-cover"
                          />
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.category} division</p>
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <ul className="mt-3 space-y-2">
                      {state.players
                        .filter((p) => p.teamId === t.id)
                        .map((p) => (
                          <RosterRow key={p.id} player={p} emit={emit} />
                        ))}
                    </ul>
                    <AddPlayerForm teamId={t.id} emit={emit} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="rounded-xl border border-border bg-background p-6 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide">Team details</h2>
          <div className="mt-5 flex items-center gap-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt="Team logo preview"
                className="size-16 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                No logo
              </div>
            )}
            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                Upload logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown on the live scoreboard once matches are connected.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Team name">
              <input
                className="auth-input"
                value={team.name}
                onChange={(e) => setTeam({ ...team, name: e.target.value })}
                placeholder="Sky Raptors"
              />
            </Field>
            <Field label="Team category">
              <select
                className="auth-input"
                value={team.category}
                onChange={(e) => setTeam({ ...team, category: e.target.value as TeamCategory })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Coach name">
              <input
                className="auth-input"
                value={team.coachName}
                onChange={(e) => setTeam({ ...team, coachName: e.target.value })}
                placeholder="Alex Rivera"
              />
            </Field>
            <Field label="Contact email">
              <input
                className="auth-input"
                type="email"
                value={team.contactEmail}
                onChange={(e) => setTeam({ ...team, contactEmail: e.target.value })}
                placeholder="coach@club.io"
              />
            </Field>
            <Field label="Contact phone">
              <input
                className="auth-input"
                value={team.contactPhone}
                onChange={(e) => setTeam({ ...team, contactPhone: e.target.value })}
                placeholder="+1 555 0134"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide">Player roster</h2>
            <button
              type="button"
              onClick={() => setPlayers([...players, emptyPlayer()])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="size-3.5" /> Add player
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {players.map((p, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_90px_130px_120px_140px_auto]">
                <input
                  className="auth-input"
                  value={p.name}
                  onChange={(e) => updatePlayer(i, { name: e.target.value })}
                  placeholder={`Player ${i + 1} name`}
                />
                <input
                  className="auth-input"
                  type="number"
                  min={0}
                  value={p.number}
                  onChange={(e) => updatePlayer(i, { number: e.target.value })}
                  placeholder="No."
                />
                <select
                  className="auth-input"
                  value={p.position}
                  onChange={(e) => updatePlayer(i, { position: e.target.value as PlayerPosition })}
                >
                  {positions.map((pos) => (
                    <option key={pos}>{pos}</option>
                  ))}
                </select>
                <input
                  className="auth-input"
                  value={p.studentId}
                  onChange={(e) => updatePlayer(i, { studentId: e.target.value })}
                  placeholder="Student ID"
                />
                <input
                  className="auth-input"
                  type="date"
                  value={p.dateOfBirth}
                  onChange={(e) => updatePlayer(i, { dateOfBirth: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove player"
                  onClick={() => setPlayers(players.filter((_, idx) => idx !== i))}
                  className="flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:bg-primary/90"
        >
          Submit registration
        </button>
      </form>
      </main>
    </div>
  );
}

function AddPlayerForm({
  teamId,
  emit,
}: {
  teamId: string;
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlayerDraft>(emptyPlayer());
  const [error, setError] = useState("");

  const submit = () => {
    if (!draft.name.trim() || !draft.number.trim()) {
      setError("Name and jersey number are required.");
      return;
    }
    setError("");
    emit("addPlayer", (store) =>
      store.addPlayers(teamId, [
        {
          name: draft.name.trim(),
          number: Number(draft.number),
          position: draft.position,
          ...(draft.studentId.trim() ? { studentId: draft.studentId.trim() } : {}),
          ...(draft.dateOfBirth ? { dateOfBirth: draft.dateOfBirth } : {}),
        },
      ]),
    );
    setDraft(emptyPlayer());
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="size-3.5" /> Add player to this team
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="grid gap-2 sm:grid-cols-5">
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
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-md border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success hover:opacity-80"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function RosterRow({
  player,
  emit,
}: {
  player: Player;
  emit: ReturnType<typeof useMockWebSocket>["emit"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: player.name,
    number: String(player.number),
    position: player.position,
    studentId: player.studentId ?? "",
    dateOfBirth: player.dateOfBirth ?? "",
  });

  const save = () => {
    if (!draft.name.trim() || !draft.number.trim()) return;
    emit("updatePlayer", (store) =>
      store.updatePlayer(player.id, {
        name: draft.name.trim(),
        number: Number(draft.number),
        position: draft.position,
        ...(draft.studentId.trim() ? { studentId: draft.studentId.trim() } : {}),
        ...(draft.dateOfBirth ? { dateOfBirth: draft.dateOfBirth } : {}),
      }),
    );
    setEditing(false);
  };

  const remove = () => {
    if (!window.confirm(`Remove ${player.name} from the roster?`)) return;
    emit("removePlayer", (store) => store.removePlayer(player.id));
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_80px_120px_110px_130px]">
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
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={save}
            className="flex size-8 items-center justify-center rounded-md border border-success/30 bg-success-soft text-success hover:opacity-80"
          >
            <Check className="size-3.5" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
      <span className="font-mono font-semibold text-foreground">#{player.number}</span>
      <span className="text-foreground">{player.name}</span>
      <span className="text-muted-foreground">{player.position}</span>
      {player.studentId && <span className="text-muted-foreground">ID: {player.studentId}</span>}
      <StatusBadge status={player.status} />
      <button
        type="button"
        aria-label={`Edit ${player.name}`}
        onClick={() => setEditing(true)}
        className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Remove ${player.name}`}
        onClick={remove}
        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
