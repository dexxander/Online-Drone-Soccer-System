import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Play,
  Pause,
  Square,
  Minus,
  Plus,
  Swords,
  Settings,
  Monitor,
  LogOut,
  History,
} from "lucide-react";
import type { ReactNode } from "react";
import { RefereeLayout } from "@/components/RefereeLayout";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { auth, initialState } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Match, MatchEventType, PenaltyType } from "@/lib/types";

export const Route = createFileRoute("/referee")({
  head: () => ({
    meta: [
      { title: "Referee control — Drone Soccer League Control" },
      {
        name: "description",
        content:
          "Officiate live drone soccer matches: clock control, scoring and penalties in real time.",
      },
      { property: "og:title", content: "Referee control — Drone Soccer" },
      {
        property: "og:description",
        content: "Real-time match control for drone soccer referees.",
      },
    ],
  }),
  component: RefereePage,
});

/* ── Phase labels for the clock segment bar ── */
const phases = ["Testing", "1st Half", "Half Time", "2nd Half"] as const;

/* ── Penalty buttons config ── */
const penaltyButtons: { label: string; type: PenaltyType; style: string }[] = [
  {
    label: "Warning",
    type: "Minor",
    style:
      "bg-muted text-foreground border border-border hover:bg-accent",
  },
  {
    label: "YEL CARD",
    type: "Major",
    style:
      "bg-warning-soft text-warning border border-warning/40 hover:bg-warning/20 font-bold",
  },
  {
    label: "RED CARD",
    type: "Technical",
    style:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold shadow-sm",
  },
];

/* ── Roster data matching mockup ── */
const rosterA = [
  { name: "S. Taylor", position: "Striker", highlight: true },
  { name: "M. Lee", position: "Defender" },
  { name: "R. Quinn", position: "Defender" },
];
const coachA = "C. Davis";

const rosterB = [
  { name: "J. Chen", position: "Striker", highlight: true },
  { name: "A. Patel", position: "Defender" },
  { name: "K. Nova", position: "Defender" },
];
const coachB = "M. Rossi";

/* ═══════════════════════════════════════════════════════════════════════════ */

function RefereePage() {
  const { state, emit } = useMockWebSocket();
  const match = safeMatch(state.match);
  const events = Array.isArray(state.events) ? state.events : [];
  const clock = useMatchClock(match.elapsedMs, match.runningSince);
  const live = match.status === "live";

  const signOut = () => {
    auth.logout();
    window.location.href = "/login";
  };

  /* Determine active phase for visual indicator */
  const activePhase =
    match.status === "finished"
      ? 3
      : match.status === "live" || match.status === "paused"
        ? 1
        : 0;

  return (
    <RefereeLayout match={match}>
      <div className="flex h-full flex-col gap-6 xl:flex-row">
        {/* ── Left / Main Column ── */}
        <div className="flex-1 space-y-6">
          {/* Navigation Action Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <NavCard
              href="/referee"
              icon={<Swords className="size-8" strokeWidth={1.6} />}
              label="Match Control"
              active
            />
            <NavCard
              href="/admin"
              icon={<Settings className="size-8" strokeWidth={1.6} />}
              label="Tournament Setup"
            />
            <NavCard
              href="/scoreboard"
              icon={<Monitor className="size-8" strokeWidth={1.6} />}
              label="Open Scoreboard"
              external
            />
            <NavCard
              onClick={signOut}
              icon={<LogOut className="size-8" strokeWidth={1.6} />}
              label="Sign Out"
              danger
            />
          </div>

          {/* ── Match Clock Tile ── */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-background p-6 shadow-card lg:p-8">
            {/* Phase Segments */}
            <div className="mb-6 flex w-full max-w-lg rounded-lg bg-muted p-1">
              {phases.map((phase, i) => (
                <button
                  key={phase}
                  className={cn(
                    "flex-1 rounded-md px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    i === activePhase
                      ? "border border-border bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {phase}
                </button>
              ))}
            </div>

            {/* Clock Display */}
            <div className="mb-8 font-mono text-7xl font-bold tabular-nums leading-none tracking-tight text-destructive lg:text-8xl">
              {formatClock(clock)}
            </div>

            {/* Clock Controls */}
            <div className="flex w-full flex-wrap justify-center gap-4">
              <button
                onClick={() => {
                  if (match.status === "paused") {
                    emit("updateMatch", (s) => s.resumeMatch());
                  } else {
                    emit("updateMatch", (s) => s.startMatch());
                  }
                }}
                disabled={live}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-lg font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="size-5" fill="currentColor" />
                Start
              </button>
              <button
                onClick={() => emit("updateMatch", (s) => s.pauseMatch())}
                disabled={!live}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 text-lg font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pause className="size-5" />
                Pause
              </button>
              <button
                onClick={() => emit("updateMatch", (s) => s.endMatch())}
                disabled={
                  match.status === "scheduled" || match.status === "finished"
                }
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-destructive px-6 py-3 text-lg font-bold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/85 disabled:cursor-not-allowed disabled:opacity-40 lg:ml-8"
              >
                <Square className="size-5" />
                End Half
              </button>
            </div>
          </div>

          {/* ── Team Panels (side-by-side) ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TeamPanel
              teamName={match.teamAName}
              sideLabel="BLUE TEAM"
              initials="SR"
              accentColor="primary"
              score={match.scoreA}
              onDecrement={() =>
                emit("updateMatch", (s) => s.adjustScore("A", -1))
              }
              onIncrement={() =>
                emit("updateMatch", (s) => s.adjustScore("A", 1))
              }
              onPenalty={(type) =>
                emit("updateMatch", (s) => s.issuePenalty("A", type))
              }
              roster={rosterA}
              coach={coachA}
            />
            <TeamPanel
              teamName={match.teamBName}
              sideLabel="RED TEAM"
              initials="VU"
              accentColor="destructive"
              score={match.scoreB}
              onDecrement={() =>
                emit("updateMatch", (s) => s.adjustScore("B", -1))
              }
              onIncrement={() =>
                emit("updateMatch", (s) => s.adjustScore("B", 1))
              }
              onPenalty={(type) =>
                emit("updateMatch", (s) => s.issuePenalty("B", type))
              }
              roster={rosterB}
              coach={coachB}
            />
          </div>
        </div>

        {/* ── Right Column: Event Feed ── */}
        <div className="flex w-full flex-col gap-6 xl:w-80">
          <div className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-card">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/50 p-4">
              <h3 className="text-lg font-bold text-foreground">Event Feed</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => emit("resetMatch", (s) => s.resetMatch())}
                  className="text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive"
                >
                  Reset
                </button>
                <History className="size-5 text-muted-foreground" />
              </div>
            </div>
            {/* Feed List */}
            <div className="hide-scrollbar flex-1 overflow-y-auto p-2">
              {events.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No events yet. Start the match to begin recording.
                </p>
              )}
              <ul className="space-y-1">
                {events.map((evt, idx) => (
                  <li
                    key={evt.id}
                    className={cn(
                      "rounded-lg p-3 transition-colors",
                      idx === 0
                        ? "border border-primary/20 bg-primary/5"
                        : "border-b border-border/20 hover:bg-muted/50",
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <span
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          eventLabelColor(evt.type),
                        )}
                      >
                        {eventLabel(evt.type)}
                      </span>
                      <span className="font-mono text-[12px] text-muted-foreground">
                        {new Date(evt.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{evt.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RefereeLayout>
  );
}

function safeMatch(value: unknown): Match {
  const fallback = initialState.match;
  if (value == null || typeof value !== "object") return fallback;
  const match = value as Partial<Match>;
  return {
    ...fallback,
    id: typeof match.id === "string" && match.id ? match.id : fallback.id,
    tournamentName: typeof match.tournamentName === "string" ? match.tournamentName : fallback.tournamentName,
    teamAName: typeof match.teamAName === "string" ? match.teamAName : fallback.teamAName,
    teamBName: typeof match.teamBName === "string" ? match.teamBName : fallback.teamBName,
    scoreA: typeof match.scoreA === "number" && Number.isFinite(match.scoreA) ? match.scoreA : fallback.scoreA,
    scoreB: typeof match.scoreB === "number" && Number.isFinite(match.scoreB) ? match.scoreB : fallback.scoreB,
    status:
      match.status === "scheduled" || match.status === "live" || match.status === "paused" || match.status === "finished"
        ? match.status
        : fallback.status,
    elapsedMs: typeof match.elapsedMs === "number" && Number.isFinite(match.elapsedMs) ? match.elapsedMs : 0,
    runningSince:
      typeof match.runningSince === "number" && Number.isFinite(match.runningSince) ? match.runningSince : null,
    penalties: Array.isArray(match.penalties) ? match.penalties : [],
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sub-components                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Nav Action Card ── */
function NavCard({
  href,
  onClick,
  icon,
  label,
  active,
  danger,
  external,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  external?: boolean;
}) {
  const classes = cn(
    "flex flex-col items-center justify-center gap-2 rounded-xl p-4 shadow-sm transition-colors",
    active
      ? "bg-primary text-primary-foreground hover:bg-primary/85"
      : danger
        ? "border border-border bg-background text-destructive hover:bg-destructive/10"
        : "border border-border bg-background text-foreground hover:bg-muted",
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={classes}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </button>
    );
  }

  if (external) {
    return (
      <Link to={href as "/"} target="_blank" className={classes}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link to={href as "/"} className={classes}>
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-wider">
        {label}
      </span>
    </Link>
  );
}

/* ── Team Panel ── */
function TeamPanel({
  teamName,
  sideLabel,
  initials,
  accentColor,
  score,
  onDecrement,
  onIncrement,
  onPenalty,
  roster,
  coach,
}: {
  teamName: string;
  sideLabel: string;
  initials: string;
  accentColor: "primary" | "destructive";
  score: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onPenalty: (type: PenaltyType) => void;
  roster: { name: string; position: string; highlight?: boolean }[];
  coach: string;
}) {
  const isPrimary = accentColor === "primary";

  return (
    <div className="flex flex-col rounded-xl border border-border bg-background p-6 shadow-card">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-border/30 pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground lg:text-2xl">
            {teamName}
          </h2>
          <span className="mt-1 inline-block rounded bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {sideLabel}
          </span>
        </div>
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full border-2 font-bold",
            isPrimary
              ? "border-primary bg-primary/10 text-primary"
              : "border-destructive bg-destructive/10 text-destructive",
          )}
        >
          {initials}
        </div>
      </div>

      {/* Score */}
      <div className="mb-8 flex items-center justify-center gap-6">
        <button
          onClick={onDecrement}
          className="flex size-16 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent"
        >
          <Minus className="size-7" />
        </button>
        <span className="w-32 text-center font-mono text-8xl font-bold tabular-nums leading-none text-foreground lg:text-[96px]">
          {score}
        </span>
        <button
          onClick={onIncrement}
          className="flex size-20 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform hover:bg-primary/85 active:scale-95"
        >
          <Plus className="size-10" />
        </button>
      </div>

      {/* Penalties */}
      <div className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Penalty Entry
        </h3>
        <div className="flex gap-2">
          {penaltyButtons.map((p) => (
            <button
              key={p.label}
              onClick={() => onPenalty(p.type)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                p.style,
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster */}
      <div className="mt-auto border-t border-border/30 pt-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Roster
        </h3>
        <ul className="space-y-2 font-mono text-sm text-foreground">
          {roster.map((p) => (
            <li
              key={p.name}
              className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
            >
              <span
                className={cn(
                  "font-semibold",
                  p.highlight
                    ? isPrimary
                      ? "text-primary"
                      : "text-destructive"
                    : "",
                )}
              >
                {p.name}
              </span>
              <span className="text-muted-foreground">{p.position}</span>
            </li>
          ))}
          <li className="mt-2 flex items-center justify-between px-2 py-1 text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Coach
            </span>
            <span>{coach}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ── Event type display helpers ── */
function eventLabel(type: MatchEventType): string {
  switch (type) {
    case "match_started":
      return "STARTED";
    case "match_paused":
      return "PAUSED";
    case "match_resumed":
      return "RESUMED";
    case "match_ended":
      return "MATCH ENDED";
    case "score_changed":
      return "GOAL";
    case "penalty_issued":
      return "PENALTY";
    default:
      return type;
  }
}

function eventLabelColor(type: MatchEventType): string {
  switch (type) {
    case "score_changed":
      return "text-primary";
    case "match_ended":
      return "text-destructive";
    case "penalty_issued":
      return "text-warning";
    case "match_started":
    case "match_resumed":
      return "text-success";
    default:
      return "text-muted-foreground";
  }
}
