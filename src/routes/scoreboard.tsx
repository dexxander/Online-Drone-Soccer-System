import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Palette, Radio, Sparkles, Trophy } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import { AVAILABLE_TEAMS, initialState } from "@/lib/store";
import type { MatchSlot, Tournament } from "@/lib/types";
import { calculateEffectivePenalties } from "@/lib/penalties";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — Drone Soccer League Control" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard with real-time scores, timer and penalties." },
    ],
  }),
  component: Scoreboard,
});

function getTeamDetailsByName(name: string, dynamicTeams: any[]) {
  if (!name || name === "TBD") return { initials: "TB", logo: undefined };

  const dynamicTeam = dynamicTeams.find((t: any) => t.name === name);
  if (dynamicTeam) return { initials: dynamicTeam.name.substring(0, 2).toUpperCase(), logo: dynamicTeam.logoUrl || dynamicTeam.logo };

  const fallbackTeam = AVAILABLE_TEAMS.find((t) => t.name === name);
  return fallbackTeam
    ? { initials: fallbackTeam.initials, logo: (fallbackTeam as any).logoUrl || (fallbackTeam as any).logo }
    : { initials: name.substring(0, 2).toUpperCase(), logo: undefined };
}

function getMatchTitle(round: number, maxRound: number) {
  if (maxRound === 1) return "Exhibition Match";
  if (round === maxRound) return "Grand Final";
  if (round === maxRound - 1) return "Semi-Finals";
  if (round === maxRound - 2) return "Quarter-Finals";
  return `Round ${round}`;
}

function getCurrentPhase(events: any[]) {
  const phaseEvent = events.find((e) => e.message.startsWith("PHASE_CHANGE:"));
  return phaseEvent ? phaseEvent.message.replace("PHASE_CHANGE:", "") : "Testing";
}

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function Scoreboard() {
  const { state, socket } = useMockWebSocket();
  useTick(1000);

  useEffect(() => {
    void socket.refreshMatchSlots();
    const id = setInterval(() => void socket.refreshMatchSlots(), 1000);
    
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void socket.refreshMatchSlots();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [socket]);

  const slots: MatchSlot[] = Array.isArray(state.matches) && state.matches.length === 2
    ? state.matches
    : [initialState.matches[0], initialState.matches[1]];

  const teams = Array.isArray(state.teams) ? state.teams : [];
  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];

  const visibleSlots = slots.filter((slot) => slot.visibleOnScoreboard);
  const anyLive = visibleSlots.some((slot) => slot.match.status === "live" || slot.match.status === "paused");

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">
            Drone Soccer Arena
          </h1>
          <div className="hidden items-center gap-2 md:flex">
            <span className={cn("flex h-2 w-2 rounded-full", anyLive ? "animate-pulse bg-primary" : "bg-muted-foreground")} />
            <span className={cn("text-xs font-bold uppercase tracking-widest", anyLive ? "text-primary" : "text-muted-foreground")}>
              {anyLive ? "Live" : "Standby"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Radio className="size-4" strokeWidth={2.5} />
          <span>{visibleSlots.length === 2 ? "2 Courts" : visibleSlots.length === 1 ? "1 Court" : "No Court Open"}</span>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className={cn("mx-auto flex w-full flex-col gap-8", visibleSlots.length === 2 ? "max-w-7xl" : "max-w-6xl")}>
          {visibleSlots.length === 0 && <EmptyBoardState />}

          {visibleSlots.length === 1 && (
            <MatchBoard slot={visibleSlots[0] as MatchSlot} teams={teams} tournaments={tournaments} size="full" />
          )}

          {visibleSlots.length === 2 && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              {visibleSlots.map((slot) => (
                <MatchBoard key={slot.slotId} slot={slot} teams={teams} tournaments={tournaments} size="split" />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyBoardState() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background p-16 text-center shadow-sm">
      <span className="flex h-3 w-3 rounded-full bg-muted-foreground/30" />
      <h2 className="text-xl font-bold uppercase tracking-widest text-muted-foreground">Waiting for a match</h2>
      <p className="max-w-sm text-sm text-muted-foreground/80">
        Open Match Control on the referee dashboard and switch on "Show on Scoreboard" for a court to see it appear here.
        Up to two courts can be shown at once.
      </p>
    </div>
  );
}

function MatchBoard({
  slot,
  teams,
  tournaments,
  size,
}: {
  slot: MatchSlot;
  teams: any[];
  tournaments: Tournament[];
  size: "full" | "split";
}) {
  const [isSwapped, setIsSwapped] = useState(false);
  const [colorScheme, setColorScheme] = useState<"default" | "swappedColors">("default");
  const [timeUpNotice, setTimeUpNotice] = useState<"Half Time" | "Times Up" | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  const isFull = size === "full";

  const m = slot.match;
  const events = Array.isArray(slot.events) ? slot.events : [];
  
  const displayEvents = events.filter((evt) => !evt.message.startsWith("PHASE_CHANGE:") && !evt.message.startsWith("PHASE_END:"));

  const activeTournament = tournaments.find((t) => t.matches.some((tm) => tm.id === m.id));
  
  const currentPhase = getCurrentPhase(events);
  let activeDurationMinutes = 3; 
  if (activeTournament) {
    if (currentPhase === "Testing") activeDurationMinutes = activeTournament.warmupDurationMinutes ?? 5;
    else if (currentPhase === "Half Time") activeDurationMinutes = activeTournament.halftimeDurationMinutes ?? 2;
    else if (currentPhase === "Overtime") activeDurationMinutes = activeTournament.overtimeDurationMinutes ?? 3;
    else activeDurationMinutes = activeTournament.halfDurationMinutes ?? 5;
  }

  const MATCH_DURATION_MS = activeDurationMinutes * 60 * 1000;

  const elapsedMs = useMatchClock(m.elapsedMs, m.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  const teamAInfo = getTeamDetailsByName(m.teamAName, teams);
  const teamBInfo = getTeamDetailsByName(m.teamBName, teams);

  const rawPenaltiesA = Array.isArray(m.penalties) ? m.penalties.filter((p) => p.side === "A") : [];
  const rawPenaltiesB = Array.isArray(m.penalties) ? m.penalties.filter((p) => p.side === "B") : [];

  const penaltiesA = calculateEffectivePenalties(rawPenaltiesA);
  const penaltiesB = calculateEffectivePenalties(rawPenaltiesB);

  const tMatch = activeTournament?.matches.find((tm) => tm.id === m.id);
  const maxRound = activeTournament ? Math.max(...activeTournament.matches.map((tm) => tm.round)) : 1;
  const currentRound = tMatch?.round || 1;
  const matchTitle = activeTournament ? getMatchTitle(currentRound, maxRound) : "Friendly Match";
  const tournamentName = activeTournament ? activeTournament.name : "Exhibition";

  const scoreTextClass = isFull ? "text-[8rem]" : "text-6xl";
  const watermarkTextClass = isFull ? "text-[12rem]" : "text-7xl";
  const clockTextClass = isFull ? "text-7xl" : "text-5xl";
  const panelPadding = isFull ? "p-8" : "p-5";

  const leftColorType = colorScheme === "default" ? "primary" : "destructive";
  const rightColorType = colorScheme === "default" ? "destructive" : "primary";

  const leftTeamName = isSwapped ? m.teamBName : m.teamAName;
  const leftScore = isSwapped ? m.scoreB : m.scoreA;
  const leftInfo = isSwapped ? teamBInfo : teamAInfo;
  const leftPenalties = isSwapped ? penaltiesB : penaltiesA;

  const rightTeamName = isSwapped ? m.teamAName : m.teamBName;
  const rightScore = isSwapped ? m.scoreA : m.scoreB;
  const rightInfo = isSwapped ? teamAInfo : teamBInfo;
  const rightPenalties = isSwapped ? penaltiesA : penaltiesB;

  const isFinished = m.status === "finished";
  const leftIsWinner = isFinished && ((leftScore > rightScore && !rightPenalties.isDisqualified) || (rightPenalties.isDisqualified && !leftPenalties.isDisqualified));
  const rightIsWinner = isFinished && ((rightScore > leftScore && !leftPenalties.isDisqualified) || (leftPenalties.isDisqualified && !rightPenalties.isDisqualified));
  const winnerName = leftIsWinner ? leftTeamName : rightIsWinner ? rightTeamName : null;

  const firstHalfEndEvent = events.find((evt) => evt.message === "PHASE_END:1st Half");
  const finalPhaseEnded = (currentPhase === "2nd Half" || currentPhase === "Overtime") && remainingMs === 0 && (m.status === "paused" || isFinished);
  const finalPauseEvent = events.find((evt) => evt.type === "match_paused" && evt.message === "Match paused");
  const timeUpEvent = currentPhase === "Half Time"
    ? firstHalfEndEvent
    : finalPhaseEnded
      ? finalPauseEvent
      : undefined;
  const timeUpEventKey = timeUpEvent?.id ?? null;

  useEffect(() => {
    if (!timeUpEventKey) return;

    const isHalfTime = currentPhase === "Half Time";
    setTimeUpNotice(isHalfTime ? "Half Time" : "Times Up");
    setShowWinner(false);

    const timeoutId = window.setTimeout(() => {
      setTimeUpNotice(null);
      if (!isHalfTime) setShowWinner(true);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [timeUpEventKey, currentPhase]);

  const renderTeamPanel = (teamName: string, score: number, info: any, penalties: any, colorType: "primary" | "destructive", isWinner: boolean) => {
    const textColorClass = colorType === "primary" ? "text-primary" : "text-destructive";

    return (
      <div className="flex flex-col gap-4">
        <div className={cn("relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm flex-1", panelPadding, isWinner ? "border-emerald-500 ring-2 ring-emerald-500/50" : "border-border")}>
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
            {info.logo ? (
              <img src={info.logo} className="h-full w-full object-contain opacity-[0.15] grayscale" alt="" />
            ) : (
              <span className={cn("font-black leading-none text-foreground opacity-[0.05]", watermarkTextClass)}>{info.initials}</span>
            )}
          </div>
          <h3 className={cn("relative z-10 font-bold text-center", textColorClass, isFull ? "text-2xl" : "text-xl")}>{teamName}</h3>
          <p className={cn("relative z-10 mt-4 font-mono font-bold leading-none tabular-nums text-foreground", scoreTextClass)}>
            {score.toString().padStart(2, '0')}
          </p>
          <div className="relative z-10 mt-6 flex min-h-[2rem] items-center justify-center gap-2">
            {penalties.isDisqualified ? (
              <span className="rounded bg-destructive/10 px-4 py-1 text-sm font-bold tracking-widest text-destructive border border-destructive/20">DISQUALIFIED</span>
            ) : (
              penalties.badges.map((b: string, i: number) => (
                <span key={i} className={cn("h-8 w-6 rounded-sm shadow-sm border border-black/10", b === "Yellow" ? "bg-warning" : "bg-muted-foreground")} />
              ))
            )}
          </div>
        </div>
        
        {isWinner && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-6 py-2 text-base font-bold tracking-widest text-emerald-600 border border-emerald-500/30 shadow-sm">
              <Trophy className="size-5" /> MATCH WINNER
            </div>
          </div>
        )}
      </div>
    );
  };

  const EventLogPanel = (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Log</h3>
      </div>
      <div className="flex flex-col gap-3 overflow-hidden p-4">
        {displayEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No match events yet.</p>
        ) : (
          displayEvents.slice(0, isFull ? 4 : 3).map((evt) => {
            const isTeamA = m.teamAName && evt.message.includes(m.teamAName);
            const isTeamB = m.teamBName && evt.message.includes(m.teamBName);

            let side: 'left' | 'right' | 'center' = 'center';
            if (isTeamA && !isTeamB) side = isSwapped ? 'right' : 'left';
            else if (isTeamB && !isTeamA) side = isSwapped ? 'left' : 'right';

            let uiType: 'goal' | 'penalty' | 'system' = 'system';
            let penaltyLevel: 'warning' | 'yellow' | 'red' | null = null;

            if (evt.type === 'score_changed') uiType = 'goal';
            else if (evt.type === 'penalty_issued') {
              uiType = 'penalty';
              if (evt.message.includes('Minor')) penaltyLevel = 'warning';
              else if (evt.message.includes('Major')) penaltyLevel = 'yellow';
              else if (evt.message.includes('Technical')) penaltyLevel = 'red';
            }

            const timeStr = new Date(evt.createdAt).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });

            return (
              <EventLogItem
                key={evt.id}
                type={uiType}
                penaltyLevel={penaltyLevel}
                message={evt.message}
                time={timeStr}
                side={side}
              />
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
          <span className={cn("h-1.5 w-1.5 rounded-full", (m.status === "live" || m.status === "paused") ? "animate-pulse bg-primary" : "bg-muted-foreground")} />
          Court {slot.slotId} — {currentPhase}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setColorScheme(colorScheme === "default" ? "swappedColors" : "default")}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Toggle panel color (Blue / Red)"
          >
            <Palette className="size-4" strokeWidth={2.5} />
            <span>Swap Color</span>
          </button>
          <button
            onClick={() => setIsSwapped(!isSwapped)}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Swap team sides visually"
          >
            <ArrowLeftRight className="size-4" strokeWidth={2.5} />
            <span>Swap Sides</span>
          </button>
        </div>
      </div>

      <div className="text-center">
        <h2 className={cn("font-bold uppercase tracking-widest text-foreground", isFull ? "text-3xl" : "text-xl")}>{matchTitle}</h2>
        <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">{tournamentName}</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-background p-6 shadow-sm">
        <p className={cn("font-mono font-bold tabular-nums text-destructive", clockTextClass)}>
          {formatClock(remainingMs)}
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{currentPhase} Time Remaining</p>
      </div>

      <div className={cn("grid gap-6 items-stretch", isFull ? "md:grid-cols-[1fr_2fr_1fr]" : "sm:grid-cols-2")}>
        {renderTeamPanel(leftTeamName, leftScore, leftInfo, leftPenalties, leftColorType, leftIsWinner)}
        {isFull && EventLogPanel}
        {renderTeamPanel(rightTeamName, rightScore, rightInfo, rightPenalties, rightColorType, rightIsWinner)}
      </div>

      {!isFull && EventLogPanel}

      {timeUpNotice && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950/70 p-6 text-center backdrop-blur-[2px]">
          <div className="relative rounded-3xl border border-sky-300/60 bg-slate-950/95 px-8 py-7 text-white shadow-2xl shadow-sky-500/30">
            <div className="absolute -inset-4 -z-10 animate-ping rounded-full bg-sky-400/20" />
            <p className="text-3xl font-black uppercase tracking-tight sm:text-5xl">{timeUpNotice}</p>
          </div>
        </div>
      )}

      {winnerName && showWinner && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-xl bg-emerald-950/70 p-6 text-center backdrop-blur-[2px]">
          <div className="relative rounded-3xl border border-emerald-300/60 bg-emerald-950/95 px-8 py-7 text-white shadow-2xl shadow-emerald-500/30">
            <div className="absolute -inset-4 -z-10 animate-ping rounded-full bg-emerald-400/20" />
            <Sparkles className="mx-auto mb-2 size-8 animate-bounce text-yellow-300" />
            <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-200">Congratulations</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">{winnerName}</h2>
            <p className="mt-2 text-lg font-bold uppercase tracking-[0.2em] text-yellow-300">Match Winner!</p>
            <div className="mt-3 text-2xl" aria-hidden="true">🎉 ✨ 🏆 ✨ 🎉</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- UTILITY UI COMPONENTS ---

function EventLogItem({ type, penaltyLevel, message, time, side }: { type: 'goal' | 'penalty' | 'system' | 'phase' | 'phase_end', penaltyLevel?: 'warning' | 'yellow' | 'red' | null, message: string, time: string, side: 'left' | 'right' | 'center' }) {
  let colorClass = 'border-border text-foreground bg-background';
  let indicatorColor = 'text-muted-foreground';

  if (type === 'phase_end') {
    colorClass = 'border-red-500/30 text-red-700 dark:text-red-400 bg-red-500/10 font-bold';
    indicatorColor = 'text-red-500';
  } else if (type === 'phase') {
    colorClass = 'border-indigo-500/30 text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 font-bold';
    indicatorColor = 'text-indigo-500';
  } else if (type === 'goal') {
    if (message.includes('OWN GOAL')) {
      colorClass = 'border-red-500/30 text-red-700 dark:text-red-500 bg-red-500/10 font-bold';
      indicatorColor = 'text-red-600 dark:text-red-500';
    } else {
      colorClass = 'border-emerald-500/30 text-emerald-700 dark:text-emerald-500 bg-emerald-500/10 font-bold';
      indicatorColor = 'text-emerald-600 dark:text-emerald-500';
    }
  } else if (type === 'penalty') {
    if (penaltyLevel === 'warning') {
      colorClass = 'border-slate-400/30 text-slate-700 dark:text-slate-300 bg-slate-500/10 font-bold';
      indicatorColor = 'text-slate-500';
    } else if (penaltyLevel === 'yellow') {
      colorClass = 'border-yellow-500/40 text-yellow-700 dark:text-yellow-500 bg-yellow-500/10 font-bold';
      indicatorColor = 'text-yellow-600 dark:text-yellow-500';
    } else if (penaltyLevel === 'red') {
      colorClass = 'border-red-500/30 text-red-700 dark:text-red-500 bg-red-500/10 font-bold';
      indicatorColor = 'text-red-600 dark:text-red-500';
    }
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${colorClass}`}>
      <div className="flex w-4 justify-start">
        {side === 'left' && <span className={indicatorColor}>◀</span>}
      </div>

      <div className="flex-1 text-center">
        <p className="text-sm uppercase tracking-wide">
          {message}
        </p>
        <p className="mt-1 text-xs opacity-75">{time}</p>
      </div>

      <div className="flex w-4 justify-end">
        {side === 'right' && <span className={indicatorColor}>▶</span>}
      </div>
    </div>
  );
}
