import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — Drone Soccer Arena" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard." },
    ],
  }),
  component: Scoreboard,
});

function Scoreboard() {
  // Assuming useMockWebSocket now returns an array of matches for the dual view
  // If it still returns a single match, you can duplicate it for testing purposes
  const { state } = useMockWebSocket();
  const matches = state.matches || [state.match, state.match]; // Fallback for testing
  
  const [viewMode, setViewMode] = useState<"single" | "dual">("dual");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation / Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight text-teal-800 uppercase">
            Drone Soccer Arena
          </h1>
          <nav className="hidden md:flex gap-4 text-sm font-medium text-slate-500">
            <span className="text-teal-700 border-b-2 border-teal-700 pb-1">Scoring</span>
            <span>Dashboard</span>
            <span>Telemetry</span>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle Button for 1 vs 2 Matches */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("single")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
                viewMode === "single" ? "bg-white shadow-sm text-teal-700" : "text-slate-500"
              }`}
            >
              Single View
            </button>
            <button
              onClick={() => setViewMode("dual")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
                viewMode === "dual" ? "bg-white shadow-sm text-teal-700" : "text-slate-500"
              }`}
            >
              Dual View
            </button>
          </div>
          <button className="bg-red-700 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-800 transition-colors">
            END MATCH
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6">
        {viewMode === "single" ? (
          <SingleMatchView match={matches[0]} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <DualMatchCard match={matches[0]} title="决赛 FINAL" arena="ALPHA" />
            <DualMatchCard match={matches[1]} title="季军赛 THIRD PLACE FINAL" arena="BETA" isOrangeHeader />
          </div>
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function SingleMatchView({ match }: { match: any }) {
  const clock = useMatchClock(match.elapsedMs, match.runningSince);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="text-center mt-4">
        <h2 className="text-3xl font-bold tracking-widest text-teal-800">FINAL MATCH</h2>
        <p className="text-sm font-semibold text-slate-500 tracking-widest mt-1">ROUND 3</p>
      </div>

      {/* Top Timer Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center">
        <p className="font-mono text-7xl font-bold tabular-nums text-slate-800">
          {formatClock(clock)}
        </p>
        <p className="text-xs font-bold text-red-400 mt-2 tracking-widest uppercase">Time Remaining</p>
      </div>

      {/* Main Grid: Team A - Event Log - Team B */}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-6 mt-4">
        {/* Team A */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold text-teal-700">{match.teamAName}</h3>
          <p className="font-mono text-[8rem] font-bold leading-none tabular-nums text-slate-800 mt-4">
            {match.scoreA.toString().padStart(2, '0')}
          </p>
        </div>

        {/* Event Log (Center) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Event Log</h3>
          </div>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[400px]">
             {/* Mock Event Log Items based on screenshot */}
             <EventLogItem type="goal" team={match.teamAName} time="01:12" side="left" />
             <EventLogItem type="penalty" team={match.teamBName} time="01:45" side="right" />
             <EventLogItem type="goal" team={match.teamBName} time="02:05" side="right" />
          </div>
        </div>

        {/* Team B */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold text-orange-600">{match.teamBName}</h3>
          <p className="font-mono text-[8rem] font-bold leading-none tabular-nums text-slate-800 mt-4">
            {match.scoreB.toString().padStart(2, '0')}
          </p>
        </div>
      </div>
    </div>
  );
}

function DualMatchCard({ match, title, arena, isOrangeHeader = false }: { match: any, title: string, arena: string, isOrangeHeader?: boolean }) {
  const clock = useMatchClock(match.elapsedMs, match.runningSince);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* Card Header */}
      <div className={`${isOrangeHeader ? 'bg-orange-700' : 'bg-teal-800'} text-white text-center py-3`}>
        <h2 className="font-bold tracking-widest">{title}</h2>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        {/* Arena & Round Info */}
        <div className="flex justify-between items-center text-teal-800 font-bold mb-8">
          <div className="flex items-center gap-2 text-lg">
            <span>{arena}</span>
          </div>
          <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm border border-slate-200">
            Round 03
          </div>
        </div>

        {/* Timer */}
        <div className="bg-slate-200/50 rounded-xl p-8 text-center mb-10 border border-slate-200">
          <p className="font-mono text-7xl font-bold tabular-nums text-slate-800">
            {formatClock(clock)}
          </p>
        </div>

        {/* Teams & Controls Array */}
        <div className="flex justify-between items-center gap-4">
           {/* Team A */}
           <div className="flex flex-col items-center">
             <div className="w-24 h-24 bg-slate-100 rounded-xl mb-2 flex items-center justify-center">
               <span className="text-2xl font-bold text-teal-700">VS</span>
             </div>
             <p className="text-xs font-bold text-slate-500 uppercase">{match.teamAName}</p>
             <p className="font-mono text-6xl font-bold text-teal-700 mt-2">
               {match.scoreA.toString().padStart(2, '0')}
             </p>
           </div>

           {/* Quick Actions (Middle) */}
           <div className="flex flex-col gap-2 flex-1 max-w-[200px]">
             <QuickActionButton label="进球 GOAL" align="right" />
             <QuickActionButton label="机体坠落 CRASHING" isRed align="left" />
             <QuickActionButton label="进球 GOAL" align="right" />
             <QuickActionButton label="乌龙球 OWN GOAL" isRed align="left" />
           </div>

           {/* Team B */}
           <div className="flex flex-col items-center">
             <div className="w-24 h-24 bg-slate-100 rounded-xl mb-2 flex items-center justify-center">
               <span className="text-2xl font-bold text-orange-600">NP</span>
             </div>
             <p className="text-xs font-bold text-slate-500 uppercase">{match.teamBName}</p>
             <p className="font-mono text-6xl font-bold text-orange-600 mt-2">
               {match.scoreB.toString().padStart(2, '0')}
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- UTILITY UI COMPONENTS ---

function QuickActionButton({ label, isRed = false, align = "right" }: { label: string, isRed?: boolean, align?: "left"|"right" }) {
  return (
    <button className={`w-full flex items-center justify-between px-4 py-2 border rounded text-xs font-bold transition-colors
      ${isRed ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}
    `}>
      {align === "left" && <span>◁</span>}
      <span className="flex-1 text-center">{label}</span>
      {align === "right" && <span>▷</span>}
    </button>
  );
}

function EventLogItem({ type, team, time, side }: { type: 'goal' | 'penalty', team: string, time: string, side: 'left' | 'right' }) {
  const isGoal = type === 'goal';
  const colorClass = isGoal ? 'border-green-400 text-slate-800' : 'border-red-400 text-red-600';
  
  return (
    <div className={`border rounded-lg p-3 flex items-center justify-between bg-white ${colorClass}`}>
      {side === 'left' && <span className={isGoal ? 'text-green-500' : 'text-red-500'}>◀</span>}
      <div className="flex-1 text-center">
        <p className="font-bold text-sm">
          {isGoal ? 'GOAL (进球)' : 'ILLEGAL CONTACT'} - {team}
        </p>
        <p className="text-xs mt-1 text-slate-400">{time}</p>
      </div>
      {side === 'right' && <span className={isGoal ? 'text-green-500' : 'text-red-500'}>▶</span>}
    </div>
  );
}