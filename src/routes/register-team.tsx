import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { PlayerPosition, TeamCategory } from "@/lib/types";
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

type PlayerDraft = { name: string; number: string; position: PlayerPosition };

const emptyPlayer = (): PlayerDraft => ({ name: "", number: "", position: "Striker" });

function RegisterTeamPage() {
  const { emit } = useMockWebSocket();
  const [team, setTeam] = useState({
    name: "",
    category: "Open" as TeamCategory,
    coachName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [players, setPlayers] = useState<PlayerDraft[]>([emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
      const created = store.addTeam(team);
      store.addPlayers(
        created.id,
        filled.map((p) => ({ name: p.name.trim(), number: Number(p.number), position: p.position })),
      );
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h1 className="mt-4 text-xl font-bold">Registration submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {team.name} is now pending review. An administrator will approve or reject the entry.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link
              to="/admin"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              View admin dashboard
            </Link>
            <button
              onClick={() => {
                setDone(false);
                setTeam({ name: "", category: "Open", coachName: "", contactEmail: "", contactPhone: "" });
                setPlayers([emptyPlayer()]);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Register another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Team registration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit your club details and roster. Entries appear as pending in the admin queue.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <section className="rounded-xl border border-border bg-background p-6 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-wide">Team details</h2>
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
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_100px_150px_auto]">
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
      </div>
    </div>
  );
}
