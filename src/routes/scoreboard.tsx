import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/scoreboard")({
  component: ScoreboardScreen,
});

function ScoreboardScreen() {
  // State for the scoreboard
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [timer, setTimer] = useState(180); // 3 minutes
  const [isLive, setIsLive] = useState(false);
  
  // Simulation Mode (Since WebSockets aren't implemented yet)
  const [simMode, setSimMode] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (simMode && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
        
        // Randomly simulate scores
        if (Math.random() > 0.95) setScoreA((s) => s + 1);
        if (Math.random() > 0.95) setScoreB((s) => s + 1);
      }, 1000);
      setIsLive(true);
    } else {
      setIsLive(false);
    }
    return () => clearInterval(interval);
  }, [simMode, timer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Top Bar - Tournament Name */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 text-center">
        <h1 className="text-3xl font-bold tracking-widest text-slate-300 uppercase">National Drone Soccer Championship 2026</h1>
        <h2 className="text-xl font-medium text-slate-500 mt-1">Finals - Match 12</h2>
      </div>

      {/* Main Scoreboard Area */}
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          
          {/* Team A */}
          <div className="flex flex-col items-center bg-slate-900/50 p-12 rounded-3xl border-2 border-blue-900/50 shadow-[0_0_50px_-12px_rgba(37,99,235,0.2)]">
            <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-xl mb-8">
              <span className="text-4xl font-bold text-white">Aero</span>
            </div>
            <h2 className="text-5xl font-extrabold text-white mb-8 truncate w-full text-center">Aero Strikers</h2>
            <div className="text-[12rem] leading-none font-black text-blue-500 tabular-nums tracking-tighter shadow-blue-500/20 drop-shadow-2xl">
              {scoreA}
            </div>
            {/* Mock Penalty indicators */}
            <div className="mt-8 flex gap-2">
               <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
            </div>
          </div>

          {/* Center Column: Timer & Status */}
          <div className="flex flex-col items-center justify-center">
            
            <div className={`px-8 py-3 rounded-full border-2 mb-8 flex items-center gap-3 transition-colors ${isLive ? 'border-red-500 bg-red-500/10' : 'border-slate-700 bg-slate-800'}`}>
              {isLive && <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>}
              <span className={`text-2xl font-bold uppercase tracking-widest ${isLive ? 'text-red-500' : 'text-slate-500'}`}>
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl border-4 border-slate-800 shadow-2xl relative overflow-hidden">
               {/* Digital clock glow effect */}
               <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full"></div>
               <div className="relative text-8xl md:text-9xl font-black text-white tabular-nums tracking-tighter">
                {formatTime(timer)}
               </div>
            </div>
            
            <div className="mt-12 text-slate-500 font-mono text-xl tracking-widest">
              HALF 1
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center bg-slate-900/50 p-12 rounded-3xl border-2 border-red-900/50 shadow-[0_0_50px_-12px_rgba(239,68,68,0.2)]">
            <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-xl mb-8">
              <span className="text-4xl font-bold text-white">Vel</span>
            </div>
            <h2 className="text-5xl font-extrabold text-white mb-8 truncate w-full text-center">Velocity FC</h2>
            <div className="text-[12rem] leading-none font-black text-red-500 tabular-nums tracking-tighter shadow-red-500/20 drop-shadow-2xl">
              {scoreB}
            </div>
             {/* Mock Penalty indicators */}
             <div className="mt-8 flex gap-2">
               {/* No penalties for Team B */}
            </div>
          </div>

        </div>
      </div>

      {/* Dev Only: Sim Controls */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-4 flex gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl z-50">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-mono text-xs uppercase tracking-widest">Dev Sim</span>
            <button 
              onClick={() => setSimMode(!simMode)}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${simMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {simMode ? 'Stop Sim' : 'Run Sim'}
            </button>
            <button 
              onClick={() => { setScoreA(0); setScoreB(0); setTimer(180); setSimMode(false); }}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-md font-bold text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
