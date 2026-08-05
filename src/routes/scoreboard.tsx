import { createFileRoute } from "@tanstack/react-router";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — Drone Soccer League Control" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard with real-time scores, timer and penalties." },
    ],
  }),
  component: Scoreboard,
});

function Scoreboard() {
  const { state } = useMockWebSocket();
  
  // 1. Pull the single match and the live events array from your store
  const m = state.match;
  const events = state.events || []; 
  
  const clock = useMatchClock(m.elapsedMs, m.runningSince);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight text-teal-800 uppercase">
            Drone Soccer Arena
          </h1>
          <div className="hidden md:flex items-center gap-2">
             <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
             <span className="text-xs font-bold text-teal-700 tracking-widest uppercase">实时转播 Live</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="text-center mt-4">
            <h2 className="text-3xl font-bold tracking-widest text-teal-800">FINAL MATCH</h2>
            <p className="text-sm font-semibold text-slate-500 tracking-widest mt-1">ROUND 3 (局 3)</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center">
            <p className="font-mono text-7xl font-bold tabular-nums text-slate-800">
              {formatClock(clock)}
            </p>
            <p className="text-xs font-bold text-red-400 mt-2 tracking-widest uppercase">Time Remaining</p>
          </div>

          <div className="grid grid-cols-[1fr_2fr_1fr] gap-6 mt-4">
            {/* Team A */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold text-teal-700">{m.teamAName}</h3>
              <p className="font-mono text-[8rem] font-bold leading-none tabular-nums text-slate-800 mt-4">
                {m.scoreA.toString().padStart(2, '0')}
              </p>
            </div>

            {/* Live Event Log */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Event Log / 事件日志</h3>
              </div>
              <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[400px]">
                 {events.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">No match events yet.</p>
                 ) : (
                    events.map((evt) => {
                      // 2. Logic to decide if the event points left (Team A) or right (Team B)
                      const isTeamA = evt.message.includes(m.teamAName);
                      const isTeamB = evt.message.includes(m.teamBName);
                      
                      let side: 'left' | 'right' | 'center' = 'center';
                      if (isTeamA) side = 'left';
                      if (isTeamB) side = 'right';

                      // 3. Logic to color code goals vs penalties
                      let uiType: 'goal' | 'penalty' | 'system' = 'system';
                      if (evt.type === 'score_changed') uiType = 'goal';
                      if (evt.type === 'penalty_issued') uiType = 'penalty';

                      const timeStr = new Date(evt.createdAt).toLocaleTimeString([], {
                        minute: '2-digit',
                        second: '2-digit'
                      });

                      return (
                        <EventLogItem 
                          key={evt.id} 
                          type={uiType} 
                          message={evt.message} 
                          time={timeStr} 
                          side={side} 
                        />
                      );
                    })
                 )}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold text-orange-600">{m.teamBName}</h3>
              <p className="font-mono text-[8rem] font-bold leading-none tabular-nums text-slate-800 mt-4">
                {m.scoreB.toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- UTILITY UI COMPONENTS ---

function EventLogItem({ type, message, time, side }: { type: 'goal' | 'penalty' | 'system', message: string, time: string, side: 'left' | 'right' | 'center' }) {
  let colorClass = 'border-slate-200 text-slate-600 bg-slate-50'; 
  let indicatorColor = 'text-slate-400';

  if (type === 'goal') {
    colorClass = 'border-green-400 text-slate-800 bg-white';
    indicatorColor = 'text-green-500';
  } else if (type === 'penalty') {
    colorClass = 'border-red-400 text-red-600 bg-white';
    indicatorColor = 'text-red-500';
  }
  
  return (
    <div className={`border rounded-lg p-3 flex items-center justify-between ${colorClass}`}>
      <div className="w-4 flex justify-start">
        {side === 'left' && <span className={indicatorColor}>◀</span>}
      </div>
      
      <div className="flex-1 text-center">
        <p className="font-bold text-sm uppercase tracking-wide">
          {message}
        </p>
        <p className="text-xs mt-1 text-slate-400">{time}</p>
      </div>

      <div className="w-4 flex justify-end">
        {side === 'right' && <span className={indicatorColor}>▶</span>}
      </div>
    </div>
  );
}