import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Radio } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import { AVAILABLE_TEAMS, initialState, PRESENCE_TTL_MS } from "@/lib/store";
import type { MatchSlot, Tournament } from "@/lib/types";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — Drone Soccer League Control" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard with real-time scores, timer and penalties." },
    ],
  }),
  component: Scoreboard,
});

const MATCH_DURATION_MS = 3 * 60 * 1000;

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

// --- PENALTY ESCALATION ENGINE ---
function calculateEffectivePenalties(rawPenalties: any[]) {
  let minor = 0; // Warnings
  let major = 0; // Yellow Cards
  let tech = 0;  // Red Cards (Disqualified)

  rawPenalties.forEach(p => {
    if (p.type === 'Minor') minor++;
    if (p.type === 'Major') major++;
    if (p.type === 'Technical') tech++;
  });

  // Escalation: 2 Warnings = 1 Yellow Card
  major += Math.floor(minor / 2);
  minor = minor % 2;

  // Escalation: 2 Yellow Cards = 1 Red Card
  tech += Math.floor(major / 2);
  major = major % 2;

  const isDisqualified = tech > 0;

  // Build the visual badge array
  const badges: string[] = [];
  if (!isDisqualified) {
    for (let i = 0; i < major; i++) badges.push('Yellow');
    for (let i = 0; i < minor; i++) badges.push('Warning');
  }

  return { badges, isDisqualified };
}

/**
 * Forces a re-render every `intervalMs` regardless of whether the shared
 * store has committed anything new. Needed because a slot's "is a control
 * page currently open?" status is time-based (its heartbeat can simply stop
 * arriving), so the scoreboard has to notice that on its own rather than
 * waiting for the next store update.
 */
function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function Scoreboard() {
  const { state } = useMockWebSocket();
  useTick(1000);

  const slots: MatchSlot[] = Array.isArray(state.matches) && state.matches.length === 2
    ? state.matches
    : [initialState.matches[0], initialState.matches[1]];

  const teams = Array.isArray(state.teams) ? state.teams : [];
  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];

  const now = Date.now();

  // A slot counts as "showable" when a referee control page is currently
  // open on it (a recent presence heartbeat) AND the referee has left the
  // "Show on Scoreboard" toggle on for it.
  const openSlots = slots.filter((slot) => slot.lastActiveAt !== null && now - slot.lastActiveAt < PRESENCE_TTL_MS);
  const visibleSlots = openSlots.filter((slot) => slot.visibleOnScoreboard);

  const anyLive = visibleSlots.some((slot) => slot.match.status === "live");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold uppercase tracking-tight text-teal-800">
            Drone Soccer Arena
          </h1>
          <div className="hidden items-center gap-2 md:flex">
            <span className={cn("flex h-2 w-2 rounded-full", anyLive ? "animate-pulse bg-teal-500" : "bg-slate-300")}></span>
            <span className={cn("text-xs font-bold uppercase tracking-widest", anyLive ? "text-teal-700" : "text-slate-400")}>
              {anyLive ? "Live" : "Standby"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Radio className="size-4" strokeWidth={2.5} />
          <span>{visibleSlots.length === 2 ? "2 Courts" : visibleSlots.length === 1 ? "1 Court" : "No Court Open"}</span>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className={cn("mx-auto flex w-full flex-col gap-8", visibleSlots.length === 2 ? "max-w-7xl" : "max-w-6xl")}>
          {visibleSlots.length === 0 && <EmptyBoardState />}

          {visibleSlots.length === 1 && (
            <MatchBoard slot={visibleSlots[0]} teams={teams} tournaments={tournaments} size="full" />
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

// --- EMPTY STATE ---

function EmptyBoardState() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
      <span className="flex h-3 w-3 rounded-full bg-slate-300" />
      <h2 className="text-xl font-bold uppercase tracking-widest text-slate-500">Waiting for a match</h2>
      <p className="max-w-sm text-sm text-slate-400">
        Open Match Control on the referee dashboard and switch on "Show on Scoreboard" for a court to see it appear here.
        Up to two courts can be shown at once.
      </p>
    </div>
  );
}

// --- MATCH BOARD (one court's full scoreboard) ---

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
  const isFull = size === "full";

  const m = slot.match;
  const events = Array.isArray(slot.events) ? slot.events : [];

  const elapsedMs = useMatchClock(m.elapsedMs, m.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  const teamAInfo = getTeamDetailsByName(m.teamAName, teams);
  const teamBInfo = getTeamDetailsByName(m.teamBName, teams);

  const rawPenaltiesA = Array.isArray(m.penalties) ? m.penalties.filter((p) => p.side === "A") : [];
  const rawPenaltiesB = Array.isArray(m.penalties) ? m.penalties.filter((p) => p.side === "B") : [];

  const penaltiesA = calculateEffectivePenalties(rawPenaltiesA);
  const penaltiesB = calculateEffectivePenalties(rawPenaltiesB);

  const activeTournament = tournaments.find((t) => t.matches.some((tm) => tm.id === m.id));
  const tMatch = activeTournament?.matches.find((tm) => tm.id === m.id);
  const maxRound = activeTournament ? Math.max(...activeTournament.matches.map((tm) => tm.round)) : 1;
  const currentRound = tMatch?.round || 1;
  const matchTitle = activeTournament ? getMatchTitle(currentRound, maxRound) : "Friendly Match";
  const tournamentName = activeTournament ? activeTournament.name : "Exhibition";

  const scoreTextClass = isFull ? "text-[8rem]" : "text-6xl";
  const watermarkTextClass = isFull ? "text-[12rem]" : "text-7xl";
  const clockTextClass = isFull ? "text-7xl" : "text-5xl";
  const panelPadding = isFull ? "p-8" : "p-5";

  const TeamAPanel = (
    <div className={cn("relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm", panelPadding)}>
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
        {teamAInfo.logo ? (
          <img src={teamAInfo.logo} className="h-full w-full object-contain opacity-40 grayscale mix-blend-multiply" alt="" />
        ) : (
          <span className={cn("font-black leading-none text-slate-800 opacity-[0.09]", watermarkTextClass)}>{teamAInfo.initials}</span>
        )}
      </div>
      <h3 className={cn("relative z-10 font-bold text-teal-700", isFull ? "text-xl" : "text-base")}>{m.teamAName}</h3>
      <p className={cn("relative z-10 mt-4 font-mono font-bold leading-none tabular-nums text-slate-800", scoreTextClass)}>
        {m.scoreA.toString().padStart(2, '0')}
      </p>
      <div className="relative z-10 mt-6 flex min-h-[2rem] items-center justify-center gap-2">
        {penaltiesA.isDisqualified ? (
          <span className="rounded bg-red-100 px-4 py-1 text-sm font-bold tracking-widest text-red-700 border border-red-200">DISQUALIFIED</span>
        ) : (
          penaltiesA.badges.map((b, i) => (
            <span key={i} className={cn("h-8 w-6 rounded-sm shadow-sm border border-black/10", b === "Yellow" ? "bg-yellow-400" : "bg-slate-300")} />
          ))
        )}
      </div>
    </div>
  );

  const TeamBPanel = (
    <div className={cn("relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm", panelPadding)}>
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
        {teamBInfo.logo ? (
          <img src={teamBInfo.logo} className="h-full w-full object-contain opacity-40 grayscale mix-blend-multiply" alt="" />
        ) : (
          <span className={cn("font-black leading-none text-slate-800 opacity-[0.09]", watermarkTextClass)}>{teamBInfo.initials}</span>
        )}
      </div>
      <h3 className={cn("relative z-10 font-bold text-orange-600", isFull ? "text-xl" : "text-base")}>{m.teamBName}</h3>
      <p className={cn("relative z-10 mt-4 font-mono font-bold leading-none tabular-nums text-slate-800", scoreTextClass)}>
        {m.scoreB.toString().padStart(2, '0')}
      </p>
      <div className="relative z-10 mt-6 flex min-h-[2rem] items-center justify-center gap-2">
        {penaltiesB.isDisqualified ? (
          <span className="rounded bg-red-100 px-4 py-1 text-sm font-bold tracking-widest text-red-700 border border-red-200">DISQUALIFIED</span>
        ) : (
          penaltiesB.badges.map((b, i) => (
            <span key={i} className={cn("h-8 w-6 rounded-sm shadow-sm border border-black/10", b === "Yellow" ? "bg-yellow-400" : "bg-slate-300")} />
          ))
        )}
      </div>
    </div>
  );

  const EventLogPanel = (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">Event Log</h3>
      </div>
      <div className="flex flex-col gap-3 overflow-hidden p-4">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No match events yet.</p>
        ) : (
          events.slice(0, isFull ? 4 : 3).map((evt) => {
            const isTeamA = m.teamAName && evt.message.includes(m.teamAName);
            const isTeamB = m.teamBName && evt.message.includes(m.teamBName);

            let side: 'left' | 'right' | 'center' = 'center';
            if (isTeamA && !isTeamB) side = isSwapped ? 'right' : 'left';
            else if (isTeamB && !isTeamA) side = isSwapped ? 'left' : 'right';

            let uiType: 'goal' | 'penalty' | 'system' = 'system';
            let penaltyLevel: 'warning' | 'yellow' | 'red' | null = null;

            if (evt.type === 'score_changed') uiType = 'goal';
            if (evt.type === 'penalty_issued') {
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">
          <span className={cn("h-1.5 w-1.5 rounded-full", (m.status === "live") ? "animate-pulse bg-teal-500" : "bg-slate-300")} />
          Court {slot.slotId}
        </span>
        <button
          onClick={() => setIsSwapped(!isSwapped)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Swap team sides visually"
        >
          <ArrowLeftRight className="size-4" strokeWidth={2.5} />
          <span>Swap Sides</span>
        </button>
      </div>

      <div className="text-center">
        <h2 className={cn("font-bold uppercase tracking-widest text-teal-800", isFull ? "text-3xl" : "text-xl")}>{matchTitle}</h2>
        <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-slate-500">{tournamentName}</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className={cn("font-mono font-bold tabular-nums text-slate-800", clockTextClass)}>
          {formatClock(remainingMs)}
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-red-400">Time Remaining</p>
      </div>

      <div className={cn("grid gap-6", isFull ? "md:grid-cols-[1fr_2fr_1fr]" : "sm:grid-cols-2")}>
        {isSwapped ? TeamBPanel : TeamAPanel}
        {isFull && EventLogPanel}
        {isSwapped ? TeamAPanel : TeamBPanel}
      </div>

      {!isFull && EventLogPanel}
    </div>
  );
}

// --- UTILITY UI COMPONENTS ---

function EventLogItem({ type, penaltyLevel, message, time, side }: { type: 'goal' | 'penalty' | 'system', penaltyLevel?: 'warning' | 'yellow' | 'red' | null, message: string, time: string, side: 'left' | 'right' | 'center' }) {
  let colorClass = 'border-slate-200 text-slate-500 bg-slate-50';
  let indicatorColor = 'text-slate-400';

  if (type === 'goal') {
    colorClass = 'border-green-400 text-green-800 bg-green-50/50';
    indicatorColor = 'text-green-500';
  } else if (type === 'penalty') {
    if (penaltyLevel === 'warning') {
      colorClass = 'border-slate-300 text-slate-700 bg-white';
      indicatorColor = 'text-slate-500';
    } else if (penaltyLevel === 'yellow') {
      colorClass = 'border-yellow-400 text-yellow-800 bg-yellow-50';
      indicatorColor = 'text-yellow-500';
    } else if (penaltyLevel === 'red') {
      colorClass = 'border-red-400 text-red-800 bg-red-50';
      indicatorColor = 'text-red-600';
    }
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${colorClass}`}>
      <div className="flex w-4 justify-start">
        {side === 'left' && <span className={indicatorColor}>◀</span>}
      </div>

      <div className="flex-1 text-center">
        <p className="text-sm font-bold uppercase tracking-wide">
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