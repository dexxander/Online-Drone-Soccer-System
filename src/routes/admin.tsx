import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, User, Trophy, Swords, Check, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard, StatusBadge } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { auth } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Drone Soccer League Control" },
      { name: "description", content: "Review registrations, approve teams and players, and monitor league activity." },
      { property: "og:title", content: "Admin dashboard — Drone Soccer" },
      { property: "og:description", content: "Registration oversight for the drone soccer league." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { state, emit } = useMockWebSocket();
  const user = auth.current();
  const teams = state.teams;
  const players = state.players;
  const pending = teams.filter((t) => t.status === "pending").length + players.filter((p) => p.status === "pending").length;
  const marks = state.match.scoreA + state.match.scoreB;

  return (
    <DashboardLayout>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        League control
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Welcome back, {user?.name ?? "dev-admin"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything below is read live from the shared league store.
      </p>

      <hr className="my-6 border-border" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Teams"
          value={teams.length}
          hint={`${teams.filter((t) => t.status === "approved").length} active`}
          icon={<Shield className="size-4" strokeWidth={1.8} />}
        />
        <StatCard
          label="Registered players"
          value={players.length}
          hint={`${players.filter((p) => p.status === "approved").length} on active rosters`}
          icon={<User className="size-4" strokeWidth={1.8} />}
        />
        <StatCard
          label="Pending approvals"
          value={pending}
          hint="awaiting review"
          icon={<Trophy className="size-4" strokeWidth={1.8} />}
        />
        <StatCard
          label="Marks scored"
          value={marks}
          hint={`${state.match.status === "scheduled" ? 0 : 1} matches played`}
          icon={<Swords className="size-4" strokeWidth={1.8} />}
        />
      </div>

      <div className="mt-6 space-y-6">
        <Panel
          title="Registered teams"
          action={
            <Link to="/register-team" className="text-xs font-semibold text-primary hover:underline">
              New registration
            </Link>
          }
        >
          {teams.length === 0 ? (
            <EmptyState
              title="No teams registered"
              description="Submissions from the registration portal appear here as pending."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Team</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Coach</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Players</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-semibold text-foreground">{t.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.category}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.coachName}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.contactEmail}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">
                        {players.filter((p) => p.teamId === t.id).length}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3">
                        <RowActions
                          onApprove={() => emit("updateTeam", (s) => s.setTeamStatus(t.id, "approved"))}
                          onReject={() => emit("updateTeam", (s) => s.setTeamStatus(t.id, "rejected"))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Registered players">
          {players.length === 0 ? (
            <EmptyState
              title="No players registered"
              description="Rosters submitted with a team registration are listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Player</th>
                    <th className="px-5 py-3 font-semibold">No.</th>
                    <th className="px-5 py-3 font-semibold">Position</th>
                    <th className="px-5 py-3 font-semibold">Team</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-semibold text-foreground">{p.name}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{p.number}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.position}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {teams.find((t) => t.id === p.teamId)?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3">
                        <RowActions
                          onApprove={() => emit("updatePlayer", (s) => s.setPlayerStatus(p.id, "approved"))}
                          onReject={() => emit("updatePlayer", (s) => s.setPlayerStatus(p.id, "rejected"))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}

function RowActions({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onApprove}
        className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success hover:opacity-80"
      >
        <Check className="size-3.5" /> Approve
      </button>
      <button
        onClick={onReject}
        className="inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:opacity-80"
      >
        <X className="size-3.5" /> Reject
      </button>
    </div>
  );
}
