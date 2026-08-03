import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { orderBy, where, limit } from "firebase/firestore";
import { useCollectionData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import type { Match, Penalty } from "@/lib/types";

export const Route = createFileRoute("/scoreboard")({
  component: AudienceScoreboard,
});

function AudienceScoreboard() {
  // Query the first live match
  const liveMatches = useCollectionData<Match>(
    COL.matches,
    () => [where("status", "==", "live"), limit(1)]
  );

  const match = liveMatches.data?.[0];

  // Query active penalties for this match
  const penalties = useCollectionData<Penalty>(
    COL.penalties,
    () => match ? [where("matchId", "==", match.id), where("status", "==", "active")] : [],
    [match?.id]
  );

  // Local timer state to sync with backend smoothly
  const [timer, setTimer] = useState(105);

  useEffect(() => {
    if (match?.timeRemaining !== undefined) {
      setTimer(match.timeRemaining);
    }
  }, [match?.timeRemaining]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (match?.status === "live" && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => Math.max(0, t - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [match?.status, timer]);

  if (liveMatches.loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-on-surface">Loading Broadcast...</div>;
  }

  if (!match) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-on-surface">
        <span className="material-symbols-outlined text-6xl text-outline mb-4">videocam_off</span>
        <h1 className="text-3xl font-bold uppercase tracking-widest text-outline">Broadcast Offline</h1>
        <p className="text-on-surface-variant mt-2">Waiting for a live match to begin...</p>
      </div>
    );
  }

  const formatTimeMinutes = (seconds: number) => Math.floor(seconds / 60).toString().padStart(2, "0");
  const formatTimeSeconds = (seconds: number) => (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="bg-surface text-on-surface font-body-md h-screen w-full overflow-hidden flex flex-col bg-tactical-grid">
      
      {/* Broadcast Header */}
      <header className="w-full flex justify-between items-center px-12 py-4 border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-md z-10 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
          <h1 className="font-label-md text-sm text-on-surface-variant tracking-widest uppercase">AeroStrike Match Control</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-primary-container/20 rounded-full border border-primary-container">
            <span className="font-label-sm text-xs text-primary uppercase">Live Broadcast</span>
          </div>
          <span className="font-label-md text-sm text-outline">MATCH ID: {match.id.toUpperCase().substring(0, 8)}</span>
        </div>
      </header>

      {/* Main Scoreboard Canvas */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-12 py-6 flex flex-col gap-6 justify-center h-full relative">
        
        {/* Top Row: Scores and Timer Bento Grid */}
        <div className="grid grid-cols-12 gap-6 h-3/5 min-h-[400px]">
          
          {/* TEAM A (Home) */}
          <div className="col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="p-6 flex flex-col h-full justify-between items-center relative z-10">
              <div className="flex flex-col items-center gap-4 mt-4 w-full">
                <div className="w-32 h-32 rounded-full border-4 border-surface-variant overflow-hidden bg-surface flex items-center justify-center p-2 shadow-sm text-4xl font-bold text-primary">
                  {match.teamAName?.substring(0, 3).toUpperCase() || "TMA"}
                </div>
                <h2 className="font-headline-lg text-3xl font-bold text-on-surface text-center uppercase tracking-tight truncate w-full px-4">
                  {match.teamAName || "Home Team"}
                </h2>
                <span className="font-label-md text-sm text-outline tracking-widest uppercase">Home</span>
              </div>
              <div className="w-full flex justify-center items-center py-8">
                <span className="font-headline-xl font-bold text-primary tabular-nums" style={{ fontSize: "8rem", lineHeight: 1 }}>
                  {match.scoreA.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-10 w-64 h-64 border-[1px] border-outline-variant/30 rounded-full pointer-events-none"></div>
          </div>

          {/* CENTER CONSOLE (Massive Timer) */}
          <div className="col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col items-center justify-center relative shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="absolute top-4 left-4 w-2 h-2 border-t-2 border-l-2 border-outline-variant"></div>
            <div className="absolute top-4 right-4 w-2 h-2 border-t-2 border-r-2 border-outline-variant"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 border-b-2 border-l-2 border-outline-variant"></div>
            <div className="absolute bottom-4 right-4 w-2 h-2 border-b-2 border-r-2 border-outline-variant"></div>
            
            <div className="flex flex-col items-center gap-6 z-10">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-variant/50 rounded border border-outline-variant/50">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">schedule</span>
                <span className="font-label-md text-sm text-on-surface-variant tracking-widest uppercase">
                  Period {match.currentPeriod || 1} in Progress
                </span>
              </div>
              
              <div className="flex items-center gap-4 bg-surface-container py-6 px-10 rounded-lg border border-outline shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="font-headline-xl font-bold text-on-surface tabular-nums" style={{ fontSize: "6rem", lineHeight: 1, letterSpacing: "-0.05em" }}>
                    {formatTimeMinutes(timer)}
                  </span>
                </div>
                <span className="font-headline-xl font-bold text-outline pb-4" style={{ fontSize: "5rem", lineHeight: 1 }}>:</span>
                <div className="flex flex-col items-center">
                  <span className="font-headline-xl font-bold text-on-surface tabular-nums" style={{ fontSize: "6rem", lineHeight: 1, letterSpacing: "-0.05em" }}>
                    {formatTimeSeconds(timer)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TEAM B (Away) */}
          <div className="col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
            <div className="p-6 flex flex-col h-full justify-between items-center relative z-10">
              <div className="flex flex-col items-center gap-4 mt-4 w-full">
                <div className="w-32 h-32 rounded-full border-4 border-surface-variant overflow-hidden bg-surface flex items-center justify-center p-2 shadow-sm text-4xl font-bold text-secondary">
                   {match.teamBName?.substring(0, 3).toUpperCase() || "TMB"}
                </div>
                <h2 className="font-headline-lg text-3xl font-bold text-on-surface text-center uppercase tracking-tight truncate w-full px-4">
                  {match.teamBName || "Away Team"}
                </h2>
                <span className="font-label-md text-sm text-outline tracking-widest uppercase">Away</span>
              </div>
              <div className="w-full flex justify-center items-center py-8">
                <span className="font-headline-xl font-bold text-secondary tabular-nums" style={{ fontSize: "8rem", lineHeight: 1 }}>
                   {match.scoreB.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 border-[1px] border-outline-variant/30 rounded-full pointer-events-none"></div>
          </div>
        </div>

        {/* Bottom Row: Penalties & Metadata */}
        <div className="grid grid-cols-12 gap-6 h-2/5 min-h-[200px]">
          
          {/* ACTIVE PENALTY OVERLAY */}
          <div className="col-span-8 bg-error-container rounded-xl border border-error/30 p-6 flex flex-col relative overflow-hidden shadow-[0_4px_20px_rgba(186,26,26,0.05)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ba1a1a_10px,#ba1a1a_20px)] opacity-20"></div>
            <div className="flex justify-between items-center mb-6 border-b border-error/20 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-error flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-on-error" style={{ fontVariationSettings: "'FILL' 1", fontSize: "20px" }}>warning</span>
                </div>
                <h3 className="font-headline-md text-2xl font-bold text-on-error-container uppercase">Active Penalties</h3>
              </div>
              <span className="font-label-md text-sm text-error bg-surface-container-lowest/50 px-3 py-1 rounded-full border border-error/30">
                {penalties.data.length} Infractions
              </span>
            </div>
            
            <div className="flex flex-col gap-3 relative z-10 overflow-y-auto pr-2">
              {penalties.data.length === 0 ? (
                <div className="text-on-error-container/70 italic p-4 text-center">No active penalties.</div>
              ) : (
                penalties.data.map(p => {
                  const isRed = p.entity.startsWith('R');
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-surface-container-lowest/80 backdrop-blur px-4 py-3 rounded-lg border border-error/20">
                      <div className="flex items-center gap-4">
                        <span className={`font-headline-md text-xl font-bold w-12 text-center ${isRed ? 'text-primary' : 'text-secondary'}`}>
                          {p.entity}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-label-md text-sm text-on-surface">
                            {isRed ? (match.teamAName || 'HOME') : (match.teamBName || 'AWAY')}
                          </span>
                          <span className="font-label-sm text-xs text-on-surface-variant">{p.infraction}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-error" style={{ fontSize: "18px" }}>timer</span>
                        <span className="font-headline-md text-xl text-error font-bold tabular-nums">00:30</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MATCH METADATA */}
          <div className="col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center gap-2 mb-4 text-outline">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
              <h3 className="font-label-md text-sm uppercase tracking-widest">Match Data</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-outline-variant/50 pb-3">
                <span className="font-label-sm text-xs text-on-surface-variant uppercase">Current Round</span>
                <span className="font-headline-md text-xl font-semibold text-on-surface">Round {match.round}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/50 pb-3">
                <span className="font-label-sm text-xs text-on-surface-variant uppercase">Match Status</span>
                <span className="font-headline-md text-xl font-semibold text-primary uppercase animate-pulse">{match.status}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-label-sm text-xs text-on-surface-variant uppercase">Arena Location</span>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <span className="font-label-md text-sm font-semibold text-on-surface text-right">{match.venue || "TBD"}</span>
                </div>
              </div>
            </div>
            {/* Decorative scanline */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
