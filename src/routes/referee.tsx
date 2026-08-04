import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, Square, Minus, Plus } from "lucide-react";
import { RefereeLayout } from "@/components/RefereeLayout";
import { Panel } from "@/components/ui-kit";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { PenaltyType } from "@/lib/types";

export const Route = createFileRoute("/referee")({
  head: () => ({
    meta: [
      { title: "Referee control — Drone Soccer League Control" },
      { name: "description", content: "Officiate live drone soccer matches: clock control, scoring and penalties in real time." },
      { property: "og:title", content: "Referee control — Drone Soccer" },
      { property: "og:description", content: "Real-time match control for drone soccer referees." },
    ],
  }),
  component: RefereePage,
});

const penalties: PenaltyType[] = ["Minor", "Major", "Technical"];

function RefereePage() {
  const { state, emit } = useMockWebSocket();
  const match = state.match;
  const clock = useMatchClock(match.elapsedMs, match.runningSince);
  const live = match.status === "live";

  return (
    <RefereeLayout>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Match control
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{match.tournamentName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every action broadcasts instantly to all connected scoreboards.
        </p>
      </div>

      <hr className="my-6 border-border" />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Match clock
                </p>
                <p className="mt-1 font-mono text-5xl font-bold tabular-nums">{formatClock(clock)}</p>
              </div>
              <span
                className={`rounded-md border px-3 py-1 text-xs font-semibold capitalize ${
                  live
                    ? "border-success/30 bg-success-soft text-success"
                    : match.status === "paused"
                      ? "border-warning/30 bg-warning-soft text-warning"
                      : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {match.status}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ControlButton
                icon={Play}
                label="Start"
                disabled={live}
                onClick={() => emit("updateMatch", (s) => s.startMatch())}
              />
              <ControlButton
                icon={Pause}
                label="Pause"
                disabled={!live}
                onClick={() => emit("updateMatch", (s) => s.pauseMatch())}
              />
              <ControlButton
                icon={RotateCcw}
                label="Resume"
                disabled={match.status !== "paused"}
                onClick={() => emit("updateMatch", (s) => s.resumeMatch())}
              />
              <ControlButton
                icon={Square}
                label="End"
                tone="danger"
                disabled={match.status === "scheduled" || match.status === "finished"}
                onClick={() => emit("updateMatch", (s) => s.endMatch())}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(["A", "B"] as const).map((side) => (
              <div key={side} className="rounded-xl border border-border bg-background p-6 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Team {side}
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  {side === "A" ? match.teamAName : match.teamBName}
                </h3>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <ScoreButton
                    icon={Minus}
                    onClick={() => emit("updateMatch", (s) => s.adjustScore(side, -1))}
                    label={`Decrease team ${side} score`}
                  />
                  <span className="font-mono text-6xl font-bold tabular-nums">
                    {side === "A" ? match.scoreA : match.scoreB}
                  </span>
                  <ScoreButton
                    icon={Plus}
                    primary
                    onClick={() => emit("updateMatch", (s) => s.adjustScore(side, 1))}
                    label={`Increase team ${side} score`}
                  />
                </div>
                <div className="mt-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Issue penalty
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {penalties.map((p) => (
                      <button
                        key={p}
                        onClick={() => emit("updateMatch", (s) => s.issuePenalty(side, p))}
                        className="rounded-lg border border-border px-2 py-2 text-xs font-semibold text-foreground transition-colors hover:border-warning hover:bg-warning-soft hover:text-warning"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Panel
            title="Event feed"
            action={
              <button
                onClick={() => emit("resetMatch", (s) => s.resetMatch())}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                Reset match
              </button>
            }
          >
            <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
              {state.events.length === 0 && (
                <li className="px-5 py-6 text-sm text-muted-foreground">No events yet.</li>
              )}
              {state.events.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-foreground">{e.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </RefereeLayout>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}

function ScoreButton({
  icon: Icon,
  onClick,
  primary,
  label,
}: {
  icon: typeof Plus;
  onClick: () => void;
  primary?: boolean;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`flex size-16 items-center justify-center rounded-2xl border text-current transition-transform active:scale-95 ${
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      <Icon className="size-7" />
    </button>
  );
}
