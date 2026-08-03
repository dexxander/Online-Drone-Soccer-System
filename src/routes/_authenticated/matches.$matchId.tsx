import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { orderBy, where } from "firebase/firestore";
import { useCollectionData, useDocumentData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { createDocument, deleteDocument, updateDocument } from "@/lib/db";
import type { Mark, Match, Penalty, Team } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ConfirmDialog, useConfirm } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/matches/$matchId")({
  component: MatchControlDashboard,
});

function MatchControlDashboard() {
  const { matchId } = Route.useParams();
  const { profile } = useAuth();
  
  const match = useDocumentData<Match>(COL.matches, matchId);
  const teams = useCollectionData<Team>(COL.teams, () => [orderBy("name")]);
  const marks = useCollectionData<Mark>(COL.marks, () => [where("matchId", "==", matchId)], [matchId]);
  const penalties = useCollectionData<Penalty>(COL.penalties, () => [where("matchId", "==", matchId), where("status", "==", "active")], [matchId]);

  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(105); // Default 1:45
  
  // Penalty Log State
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedInfraction, setSelectedInfraction] = useState<string | null>(null);

  const emergencyStop = useConfirm<Match>();

  const m = match.data;

  // Sync Timer from Backend on load or resume
  useEffect(() => {
    if (m?.timeRemaining !== undefined) {
      setTimer(m.timeRemaining);
    }
  }, [m?.timeRemaining]);

  // Local Timer Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (m?.status === "live" && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [m?.status, timer]);

  if (match.loading) return <div className="p-8 text-center">Loading match data...</div>;
  if (!m) return <div className="p-8 text-center text-red-500">Match not found.</div>;

  const teamA = teams.data.find(t => t.id === m.teamAId);
  const teamB = teams.data.find(t => t.id === m.teamBId);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const setStatus = async (status: Match["status"]) => {
    setBusy(true);
    try {
      await updateDocument(COL.matches, matchId, { 
        status, 
        timeRemaining: timer // Save time when changing status
      });
      toast.success(`Match ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const nextPeriod = async () => {
    setBusy(true);
    try {
      await updateDocument(COL.matches, matchId, { 
        currentPeriod: (m.currentPeriod || 1) + 1,
        timeRemaining: 105 // Reset timer for new period
      });
      toast.success("Advanced to next period");
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const addPoint = async (teamId: string, isTeamA: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await createDocument(COL.marks, {
        matchId,
        tournamentId: m.tournamentId,
        teamId,
        points: 1,
        minute: Math.floor((105 - timer) / 60),
        createdBy: profile?.id,
      });
      await updateDocument(COL.matches, matchId, {
        scoreA: m.scoreA + (isTeamA ? 1 : 0),
        scoreB: m.scoreB + (isTeamA ? 0 : 1),
      });
      toast.success("Point added");
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const removePoint = async (teamId: string, isTeamA: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const teamMarks = marks.data.filter(mk => mk.teamId === teamId);
      if (teamMarks.length === 0) {
        toast.error("No points to remove for this team");
        setBusy(false);
        return;
      }
      const lastMark = teamMarks.sort((a, b) => b.minute - a.minute)[0];
      if (!lastMark) {
        setBusy(false);
        return;
      }
      await deleteDocument(COL.marks, lastMark.id);
      
      await updateDocument(COL.matches, matchId, {
        scoreA: Math.max(0, m.scoreA - (isTeamA ? 1 : 0)),
        scoreB: Math.max(0, m.scoreB - (isTeamA ? 0 : 1)),
      });
      toast.success("Point removed");
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const logPenalty = async (infraction: string) => {
    if (!selectedEntity) {
      toast.error("Select an entity first");
      return;
    }
    setBusy(true);
    try {
      const isRed = selectedEntity.startsWith('R');
      const teamId = isRed ? m.teamAId : m.teamBId;
      
      await createDocument(COL.penalties, {
        matchId,
        tournamentId: m.tournamentId,
        teamId: teamId!,
        entity: selectedEntity,
        infraction,
        status: "active",
        durationSeconds: 30,
      });
      toast.success("Penalty logged");
      setSelectedEntity(null);
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const clearPenalty = async (penaltyId: string) => {
    setBusy(true);
    try {
      await updateDocument(COL.penalties, penaltyId, { status: "cleared" });
      toast.success("Penalty cleared");
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="font-body-md text-on-surface bg-background antialiased min-h-screen flex flex-col pt-16 pb-12 md:pb-0">
      
      {/* TopNavBar */}
      <header className="bg-surface-container-highest dark:bg-surface-container-high fixed top-0 w-full z-50 border-b border-outline-variant dark:border-outline flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-6">
          <Link to="/matches" className="text-primary hover:text-primary-container mr-2">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <h1 className="font-headline-md text-xl font-bold text-primary dark:text-primary-fixed-dim">
            AeroStrike Master Control
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => emergencyStop.ask(m)}
            disabled={busy}
            className="bg-secondary-container hover:bg-secondary text-on-secondary font-label-md text-xs px-6 py-2 rounded uppercase tracking-wider transition-colors flex items-center gap-2 shadow-lg"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            Emergency Stop
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-4 md:px-6 py-8 max-w-[1920px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column 1: Match Status & Timer (Left) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="glass-panel rounded-xl p-6 flex flex-col items-center">
              <h2 className="font-headline-md text-xl font-bold text-on-surface mb-2">
                Match #{m.slot} - {m.round}
              </h2>
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-3 h-3 rounded-full ${m.status === 'live' ? 'bg-primary-container animate-pulse' : 'bg-outline'}`}></div>
                <span className={`font-label-md text-xs uppercase tracking-widest ${m.status === 'live' ? 'text-primary' : 'text-on-surface'}`}>
                  {m.status}
                </span>
              </div>
              <div className="w-full text-center mb-8 bg-surface-container-low p-6 rounded-xl border border-outline-variant">
                <div className="font-label-md text-xs text-on-surface-variant uppercase tracking-widest mb-2">Time Remaining</div>
                <div className="font-headline-xl text-6xl leading-none font-bold tabular-nums text-on-surface">
                  {formatTime(timer)}
                </div>
              </div>
              <div className="flex gap-4 w-full mb-8">
                <button 
                  disabled={busy || m.status !== 'live'}
                  onClick={() => setStatus('paused')}
                  className="flex-1 bg-surface border-2 border-outline-variant hover:border-primary text-on-surface font-label-md text-sm py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[32px]">pause</span>
                  Pause
                </button>
                <button 
                  disabled={busy || m.status === 'live' || m.status === 'completed'}
                  onClick={() => setStatus('live')}
                  className="flex-1 bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary font-label-md text-sm py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-md disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Resume
                </button>
              </div>
              <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-widest mb-4 w-full text-left border-b border-outline-variant pb-2">Period Controls</h4>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label-md text-sm text-on-surface">Current Period</span>
                  <span className="font-headline-md text-lg font-bold text-primary">{m.currentPeriod || 1} / 3</span>
                </div>
                <button 
                  disabled={busy} onClick={nextPeriod}
                  className="w-full bg-surface border border-outline-variant hover:border-primary text-on-surface font-label-md text-sm py-3 rounded transition-colors flex items-center justify-center gap-2"
                >
                  Next Period
                  <span className="material-symbols-outlined">skip_next</span>
                </button>
                <button 
                  disabled={busy || m.status === 'completed'} onClick={() => setStatus('completed')}
                  className="w-full bg-surface border border-outline-variant hover:border-error text-on-surface hover:text-error font-label-md text-sm py-3 rounded transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  End Match Early
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Scoring & Quick Log (Center) */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* Main Scoreboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Team A */}
              <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden group border-2 border-primary">
                <div className="absolute inset-0 bg-primary opacity-5"></div>
                <h3 className="font-headline-lg text-2xl font-bold text-on-surface z-10 mb-2 truncate max-w-full">
                  {m.teamAName || 'Team A'}
                </h3>
                <div className="font-headline-xl text-[100px] leading-none font-bold tabular-nums text-primary mb-8 z-10">
                  {m.scoreA}
                </div>
                <div className="flex gap-4 z-10 w-full">
                  <button 
                    disabled={busy || !m.teamAId} onClick={() => removePoint(m.teamAId!, true)}
                    className="flex-1 bg-surface border-2 border-outline-variant hover:border-primary text-on-surface font-label-md text-sm py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[32px]">remove</span>
                    -1
                  </button>
                  <button 
                    disabled={busy || !m.teamAId} onClick={() => addPoint(m.teamAId!, true)}
                    className="flex-[2] bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary font-label-md text-sm py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-md disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[32px]">add</span>
                    +1 Point
                  </button>
                </div>
              </div>

              {/* Team B */}
              <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden group border-2 border-tertiary">
                <div className="absolute inset-0 bg-tertiary opacity-5"></div>
                <h3 className="font-headline-lg text-2xl font-bold text-on-surface z-10 mb-2 truncate max-w-full">
                  {m.teamBName || 'Team B'}
                </h3>
                <div className="font-headline-xl text-[100px] leading-none font-bold tabular-nums text-tertiary mb-8 z-10">
                  {m.scoreB}
                </div>
                <div className="flex gap-4 z-10 w-full">
                  <button 
                    disabled={busy || !m.teamBId} onClick={() => removePoint(m.teamBId!, false)}
                    className="flex-1 bg-surface border-2 border-outline-variant hover:border-tertiary text-on-surface font-label-md text-sm py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[32px]">remove</span>
                    -1
                  </button>
                  <button 
                    disabled={busy || !m.teamBId} onClick={() => addPoint(m.teamBId!, false)}
                    className="flex-[2] bg-tertiary-container hover:bg-tertiary text-on-tertiary-container hover:text-on-tertiary font-label-md text-sm py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-md disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[32px]">add</span>
                    +1 Point
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Logging */}
            <div className="glass-panel rounded-xl p-8 flex-1 flex flex-col bg-surface-container-lowest">
              <h3 className="font-headline-md text-xl font-bold text-on-surface flex items-center gap-2 mb-6 border-b border-outline-variant pb-4">
                <span className="material-symbols-outlined text-primary text-[28px]">gavel</span>
                Quick Penalty Log
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Step 1: Entity Select */}
                <div>
                  <label className="block font-label-sm text-xs text-on-surface-variant uppercase mb-4 tracking-widest">
                    1. Select Target Entity
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {['R1', 'R2', 'R3', 'R4'].map(r => (
                      <button 
                        key={r}
                        onClick={() => setSelectedEntity(r)}
                        className={`bg-surface border-2 py-4 rounded-lg transition-colors tabular-nums font-bold ${selectedEntity === r ? 'border-primary text-primary bg-primary-container' : 'border-outline-variant hover:border-primary text-on-surface'}`}
                      >
                        {r}
                      </button>
                    ))}
                    {['B1', 'B2', 'B3', 'B4'].map(b => (
                      <button 
                        key={b}
                        onClick={() => setSelectedEntity(b)}
                        className={`bg-surface border-2 py-4 rounded-lg transition-colors tabular-nums font-bold mt-2 ${selectedEntity === b ? 'border-tertiary text-tertiary bg-tertiary-container' : 'border-outline-variant hover:border-tertiary text-on-surface'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Infraction Select */}
                <div>
                  <label className="block font-label-sm text-xs text-on-surface-variant uppercase mb-4 tracking-widest">
                    2. Select Infraction
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Illegal Block', 'Boundary Violation', 'Unsafe Operation'].map(infraction => (
                      <button 
                        key={infraction}
                        disabled={busy || !selectedEntity}
                        onClick={() => logPenalty(infraction)}
                        className="w-full text-left bg-surface border-2 border-outline-variant hover:border-secondary hover:bg-surface-container-low text-on-surface text-sm px-6 py-4 rounded-lg transition-colors flex justify-between items-center shadow-sm disabled:opacity-50"
                      >
                        {infraction}
                        <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Active Logs & Telemetry (Right) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Active Penalties List */}
            <div className="glass-panel rounded-xl p-6 flex-1 flex flex-col max-h-[600px]">
              <h3 className="font-headline-md text-xl font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined text-secondary">warning</span>
                Active Penalties
              </h3>
              <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                {penalties.data.length === 0 ? (
                  <div className="text-sm text-on-surface-variant text-center py-8">No active penalties.</div>
                ) : (
                  penalties.data.map(p => {
                    const isRed = p.entity.startsWith('R');
                    return (
                      <div key={p.id} className="bg-surface-container-low border border-outline-variant rounded p-3 flex justify-between items-center group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-label-md font-bold ${isRed ? 'text-primary' : 'text-tertiary'}`}>
                              {p.entity}
                            </span>
                            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-mono uppercase">
                              Active
                            </span>
                          </div>
                          <div className="text-sm text-on-surface-variant">{p.infraction}</div>
                        </div>
                        <button 
                          onClick={() => clearPenalty(p.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-on-surface-variant hover:text-primary transition-opacity"
                          title="Clear Penalty"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Telemetry Removed per request */}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={emergencyStop.open}
        onOpenChange={emergencyStop.setOpen}
        title="Emergency Stop"
        description="Are you sure you want to stop this match immediately? This will cancel the match."
        confirmLabel="Stop Match"
        destructive={true}
        onConfirm={async () => {
          if (!emergencyStop.target) return;
          await setStatus('cancelled');
        }}
      />
    </div>
  );
}
