import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import { AVAILABLE_TEAMS } from "@/lib/store";

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

function Scoreboard() {
  const { state } = useMockWebSocket();
  const [isSwapped, setIsSwapped] = useState(false);
  
  // Reverting to stable single match reference
  const m = state.match;
  const events = Array.isArray(state.events) ? state.events : []; 
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];
  
  const elapsedMs = useMatchClock(m.elapsedMs, m.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  const teamAInfo = getTeamDetailsByName(m.teamAName, teams);
  const teamBInfo = getTeamDetailsByName(m.teamBName, teams);

  const rawPenaltiesA = Array.isArray(m.penalties) ? m.penalties.filter(p => p.side === "A") : [];
  const rawPenaltiesB = Array.isArray(m.penalties) ? m.penalties.filter(p => p.side === "B") : [];
  
  const penaltiesA = calculateEffectivePenalties(rawPenaltiesA);
  const penaltiesB = calculateEffectivePenalties(rawPenaltiesB);

  const activeTournament = tournaments.find(t => t.matches.some(tm => tm.id === m.id));
  const tMatch = activeTournament?.matches.find(tm => tm.id === m.id);
  const maxRound = activeTournament ? Math.max(...activeTournament.matches.map(tm => tm.round)) : 1;
  const currentRound = tMatch?.round || 1;
  const matchTitle = activeTournament ? getMatchTitle(currentRound, maxRound) : "Friendly Match";
  const tournamentName = activeTournament ? activeTournament.name : "Exhibition";

  const TeamAPanel = (
    <div className="relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
        {teamAInfo.logo ? (
          <img src={teamAInfo.logo} className="h-full w-full object-contain opacity-40 grayscale mix-blend-multiply" alt="" />
        ) : (
          <span className="text-[12rem] font-black leading-none text-slate-800 opacity-[0.09]">{teamAInfo.initials}</span>
        )}
      </div>
      <h3 className="relative z-10 text-xl font-bold text-teal-700">{m.teamAName}</h3>
      <p className="relative z-10 mt-4 font-mono text-[8rem] font-bold leading-none tabular-nums text-slate-800">
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
    <div className="relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
        {teamBInfo.logo ? (
          <img src={teamBInfo.logo} className="h-full w-full object-contain opacity-40 grayscale mix-blend-multiply" alt="" />
        ) : (
          <span className="text-[12rem] font-black leading-none text-slate-800 opacity-[0.09]">{teamBInfo.initials}</span>
        )}
      </div>
      <h3 className="relative z-10 text-xl font-bold text-orange-600">{m.teamBName}</h3>
      <p className="relative z-10 mt-4 font-mono text-[8rem] font-bold leading-none tabular-nums text-slate-800">
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
            events.slice(0, 4).map((evt) => {
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
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold uppercase tracking-tight text-teal-800">
            Drone Soccer Arena
          </h1>
          <div className="hidden items-center gap-2 md:flex">
             <span className="flex h-2 w-2 animate-pulse rounded-full bg-teal-500"></span>
             <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Live</span>
          </div>
        </div>
        <button
          onClick={() => setIsSwapped(!isSwapped)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Swap team sides visually"
        >
          <ArrowLeftRight className="size-4" strokeWidth={2.5} />
          <span>Swap Sides</span>
        </button>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="mt-4 text-center">
            <h2 className="text-3xl font-bold uppercase tracking-widest text-teal-800">{matchTitle}</h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-slate-500">{tournamentName}</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="font-mono text-7xl font-bold tabular-nums text-slate-800">
              {formatClock(remainingMs)}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-red-400">Time Remaining</p>
          </div>

          <div className="grid gap-6 mt-4 md:grid-cols-[1fr_2fr_1fr]">
            {isSwapped ? TeamBPanel : TeamAPanel}
            {EventLogPanel}
            {isSwapped ? TeamAPanel : TeamBPanel}
          </div>
        </div>
      </main>
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