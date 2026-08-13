import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Play,
  Pause,
  Square,
  Minus,
  Plus,
  Swords,
  Trophy,
  Monitor,
  LogOut,
  History,
  ChevronLeft,
  ChevronRight,
  Radio,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { RefereeLayout } from "@/components/RefereeLayout";
import { EmptyState, Panel } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import type { Match, MatchEventType, MatchSlot, MatchSlotId, PenaltyType, TournamentMatch } from "@/lib/types";
import { calculateEffectivePenalties } from "@/lib/penalties";

import {
  auth,
  initialState,
  AVAILABLE_TEAMS,
  PRESENCE_HEARTBEAT_MS,
} from "@/lib/store";

export const Route = createFileRoute("/referee")({
  head: () => ({
    meta: [
      { title: "Referee control — Drone Soccer League Control" },
      { name: "description", content: "Officiate live drone soccer matches." },
    ],
  }),
  component: RefereePage,
});

const phases = ["Testing", "1st Half", "Half Time", "2nd Half", "Overtime"] as const;

const penaltyButtons: { label: string; type: PenaltyType; style: string }[] = [
  { label: "Warning", type: "Minor", style: "bg-muted text-foreground border border-border hover:bg-accent" },
  { label: "YELLOW CARD", type: "Major", style: "bg-warning-soft text-warning border border-warning/40 hover:bg-warning/20 font-bold" },
  { label: "RED CARD", type: "Technical", style: "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold shadow-sm" },
];

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

function RefereePage() {
  const { state, emit, socket } = useMockWebSocket();

  const matchSlots: MatchSlot[] = Array.isArray(state.matches) && state.matches.length === 2
    ? state.matches
    : [initialState.matches[0], initialState.matches[1]];

  const [viewMode, setViewMode] = useState<"tournaments" | "bracket" | "control">("tournaments");
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [joinConfirm, setJoinConfirm] = useState<{ slotId: MatchSlotId, matchId: string } | null>(null);
  const [showFinalizePrompt, setShowFinalizePrompt] = useState(false);
  const [phaseConfirmation, setPhaseConfirmation] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<MatchSlotId>(1);

  const activeSlot = matchSlots.find((s) => s.slotId === slotId) ?? matchSlots[0] ?? initialState.matches[0];
  const rawMatch = safeMatch(activeSlot?.match);
  const events = Array.isArray(activeSlot?.events) ? activeSlot.events : [];

  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const players = Array.isArray(state.players) ? state.players : [];

  const live = rawMatch.status === "live";
  const isFinished = rawMatch.status === "finished";

  const viewedTournament = tournaments.find(t => t.id === activeTournamentId);
  const activeMatchTournament = tournaments.find((t) => t.matches.some((tm) => tm.id === rawMatch.id));
  
  const currentPhase = getCurrentPhase(events);
  let activeDurationMinutes = 3;
  if (activeMatchTournament) {
    if (currentPhase === "Testing") activeDurationMinutes = activeMatchTournament.warmupDurationMinutes ?? 5;
    else if (currentPhase === "Half Time") activeDurationMinutes = activeMatchTournament.halftimeDurationMinutes ?? 2;
    else if (currentPhase === "Overtime") activeDurationMinutes = activeMatchTournament.overtimeDurationMinutes ?? 3;
    else activeDurationMinutes = activeMatchTournament.halfDurationMinutes ?? 5; 
  }

  const MATCH_DURATION_MS = activeDurationMinutes * 60 * 1000;
  const elapsedMs = useMatchClock(rawMatch.elapsedMs, rawMatch.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  // FIX: Tie the auto-advance blocker directly to the specific Match ID to prevent cross-court bleeding
  const hasEndedRef = useRef<string | null>(null);
  useEffect(() => {
    if (live && remainingMs === 0 && hasEndedRef.current !== rawMatch.id) {
      hasEndedRef.current = rawMatch.id;

      if (currentPhase === "Testing") {
        emit("updateMatch", (s: any) => s.changeMatchPhase(slotId, "1st Half", "Testing"));
      } else if (currentPhase === "1st Half") {
        emit("updateMatch", (s: any) => s.changeMatchPhase(slotId, "Half Time", "1st Half"));
      } else if (currentPhase === "Half Time") {
        emit("updateMatch", (s: any) => s.changeMatchPhase(slotId, "2nd Half", "Half Time"));
      } else if (currentPhase === "2nd Half") {
        if (rawMatch.scoreA === rawMatch.scoreB) {
          emit("updateMatch", (s: any) => s.changeMatchPhase(slotId, "Overtime", "2nd Half"));
        } else {
          emit("updateMatch", (s: any) => s.pauseMatch(slotId));
          setShowFinalizePrompt(true);
        }
      } else if (currentPhase === "Overtime") {
        emit("updateMatch", (s: any) => s.pauseMatch(slotId));
        setShowFinalizePrompt(true);
      }
    } else if (remainingMs > 0) {
      hasEndedRef.current = null;
    }
  }, [live, remainingMs, slotId, currentPhase, rawMatch.scoreA, rawMatch.scoreB, rawMatch.id, emit]);

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

  useEffect(() => {
    if (viewMode !== "control") return;
    emit("touchSlotPresence", (s) => s.touchSlotPresence(slotId));
    const id = setInterval(() => {
      emit("touchSlotPresence", (s) => s.touchSlotPresence(slotId));
    }, PRESENCE_HEARTBEAT_MS);
    return () => {
      clearInterval(id);
      emit("releaseSlotPresence", (s) => s.releaseSlotPresence(slotId));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, slotId]);

  const signOut = () => {
    auth.logout();
    window.location.href = "/login";
  };

  const requestPhaseChange = (phase: string) => {
    if (phase === currentPhase || isFinished) return;
    setPhaseConfirmation(phase);
  };

  const getTeamName = (id: string | null) => {
    if (!id) return "TBD";
    const dynamicTeam = teams.find((t) => t.id === id);
    if (dynamicTeam) return dynamicTeam.name;
    const fallbackTeam = AVAILABLE_TEAMS.find((t) => t.id === id);
    return fallbackTeam ? fallbackTeam.name : "TBD";
  };

  const getTeamDetailsByName = (name: string) => {
    if (!name || name === "TBD") return { initials: "TB", logo: undefined };
    const dynamicTeam = teams.find((t) => t.name === name);
    if (dynamicTeam) return { initials: dynamicTeam.name.substring(0, 2).toUpperCase(), logo: dynamicTeam.logoUrl || (dynamicTeam as any).logo };
    const fallbackTeam = AVAILABLE_TEAMS.find((t) => t.name === name);
    return fallbackTeam ? { initials: fallbackTeam.initials, logo: (fallbackTeam as any).logoUrl || (fallbackTeam as any).logo } : { initials: name.substring(0, 2).toUpperCase(), logo: undefined };
  };

  const getDynamicRoster = (teamName: string) => {
    if (!teamName || teamName === "TBD") return [];

    const team = teams.find(t => t.name === teamName);
    if (!team) return [];

    const teamPlayers = players.filter(p => p.teamId === team.id);
    return teamPlayers.map(p => ({
      name: p.name || "Unknown",
      position: (p as any).position || (p as any).role || "Player",
      highlight: (p as any).position === "Striker" || (p as any).role === "Striker"
    }));
  };

  const getDynamicCoach = (teamName: string) => {
    if (!teamName || teamName === "TBD") return undefined;
    const team = teams.find(t => t.name === teamName);
    return team?.coachName || undefined;
  };

  const handleOpenBracket = (tournamentId: string) => {
    setActiveTournamentId(tournamentId);
    setViewMode("bracket");
  };

  const handleSelectMatch = (matchId: string, teamAId: string | null, teamBId: string | null) => {
    const existingSlotForMatch = matchSlots.find((s) => s.match.id === matchId);

    if (existingSlotForMatch) {
      if (existingSlotForMatch.slotId === slotId) {
        setViewMode("control");
        return;
      }
      setJoinConfirm({ slotId: existingSlotForMatch.slotId, matchId });
      return;
    }

    const teamAName = getTeamName(teamAId);
    const teamBName = getTeamName(teamBId);

    // Bypassed alert directly, smoothly archives the old match and sets up the new one
    if (rawMatch.id !== matchId) {
      emit("setupLiveMatch", (s: any) => s.setupLiveMatch(slotId, matchId, teamAName, teamBName));
    }
    setViewMode("control");
  };

  const teamAInfo = getTeamDetailsByName(rawMatch.teamAName);
  const teamBInfo = getTeamDetailsByName(rawMatch.teamBName);
  const penaltiesA = rawMatch.penalties.filter((penalty) => penalty.side === "A");
  const penaltiesB = rawMatch.penalties.filter((penalty) => penalty.side === "B");
  const teamADisqualified = calculateEffectivePenalties(penaltiesA).isDisqualified;
  const teamBDisqualified = calculateEffectivePenalties(penaltiesB).isDisqualified;
  const winningTeamName = teamADisqualified && !teamBDisqualified
    ? rawMatch.teamBName
    : teamBDisqualified && !teamADisqualified
    ? rawMatch.teamAName
    : rawMatch.scoreA > rawMatch.scoreB
    ? rawMatch.teamAName
    : rawMatch.scoreB > rawMatch.scoreA
    ? rawMatch.teamBName
    : null;
  
  const dynamicRosterA = getDynamicRoster(rawMatch.teamAName);
  const dynamicRosterB = getDynamicRoster(rawMatch.teamBName);
  const dynamicCoachA = getDynamicCoach(rawMatch.teamAName);
  const dynamicCoachB = getDynamicCoach(rawMatch.teamBName);

  const rounds = viewedTournament
    ? Array.from(new Set(viewedTournament.matches.map(m => m.round))).sort((a, b) => a - b)
    : [];
  const maxRound = Math.max(...rounds, 0);

  return (
    <RefereeLayout match={rawMatch} slotId={slotId}>
      <div className="flex h-full flex-col gap-6 xl:flex-row">

        {/* ── Main Column ── */}
        <div className="flex-1 space-y-6">

          {/* ── Global Scoreboard Controls ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Monitor className="size-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">Scoreboard Output</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {matchSlots.map((slot) => (
                <label key={slot.slotId} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 transition-colors hover:bg-muted">
                  <div className="flex items-center gap-1.5">
                    {slot.visibleOnScoreboard ? (
                      <Eye className="size-4 text-primary" strokeWidth={2.5} />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground" strokeWidth={2.5} />
                    )}
                    <span className={cn("text-[11px] font-bold uppercase tracking-wider", slot.visibleOnScoreboard ? "text-primary" : "text-muted-foreground")}>
                      Court {slot.slotId}
                    </span>
                  </div>
                  <Switch
                    checked={slot.visibleOnScoreboard}
                    onCheckedChange={(checked) => emit("setSlotVisibility", (s: any) => s.setSlotVisibility(slot.slotId, checked))}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* ── Court Selector ── */}
          <div className="grid grid-cols-2 gap-4">
            {matchSlots.map((slot) => {
              const m = safeMatch(slot.match);
              const isActive = slot.slotId === slotId;
              const isLive = m.status === "live" || m.status === "paused";
              const slotTourney = tournaments.find((t) => t.matches.some((tm) => tm.id === m.id));

              return (
                <button
                  key={slot.slotId}
                  onClick={() => setSlotId(slot.slotId)}
                  className={cn(
                    "flex flex-col rounded-xl border p-4 text-left shadow-card transition-colors",
                    isActive ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[11px] font-bold uppercase tracking-wider", isActive ? "text-primary" : "text-muted-foreground")}>
                      Court {slot.slotId} {slotTourney ? ` • ${slotTourney.name}` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", isLive ? "text-primary" : "text-muted-foreground")}>
                        <Radio className="size-3" strokeWidth={2.5} /> {isLive ? "Live" : "Standby"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {m.teamAName && m.teamBName && m.teamAName !== "TBD" ? (
                      <span className="flex items-center gap-1.5">
                        <span className={m.status === "finished" ? "opacity-50" : ""}>{m.teamAName}</span>
                        <span className="font-normal text-muted-foreground text-xs">vs</span>
                        <span className={m.status === "finished" ? "opacity-50" : ""}>{m.teamBName}</span>
                        {m.status === "finished" && <span className="text-[9px] font-bold uppercase text-destructive">(Finished)</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs font-normal">No match assigned</span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <NavCard onClick={() => setViewMode("tournaments")} icon={<Trophy className="size-8" strokeWidth={1.6} />} label="Tournament Brackets" active={viewMode === "tournaments" || viewMode === "bracket"} />
            <NavCard onClick={() => setViewMode("control")} icon={<Swords className="size-8" strokeWidth={1.6} />} label="Match Control" active={viewMode === "control"} />
            <NavCard href="/scoreboard" icon={<Monitor className="size-8" strokeWidth={1.6} />} label="Open Scoreboard" external />
            <NavCard onClick={signOut} icon={<LogOut className="size-8" strokeWidth={1.6} />} label="Sign Out" danger />
          </div>

          {viewMode === "tournaments" ? (
            <Panel title="Active Tournaments">
              {tournaments.length === 0 ? (
                <EmptyState title="No active tournaments" description="Tournaments generated in the Admin dashboard will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3 font-semibold">Tournament Name</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.map((t) => (
                        <tr key={t.id} onClick={() => handleOpenBracket(t.id)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30">
                          <td className="px-5 py-4 font-semibold text-foreground">{t.name}</td>
                          <td className="px-5 py-4">
                            <span className={cn("rounded px-2 py-1 text-[10px] font-bold uppercase", t.status === "completed" ? "bg-success/20 text-success" : "bg-primary/20 text-primary")}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <ChevronRight className="inline size-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          ) : viewMode === "bracket" && viewedTournament ? (
            <Panel title={`Bracket: ${viewedTournament.name}`}>
              <div className="p-5">
                <button onClick={() => setViewMode("tournaments")} className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="size-3.5" /> Back to Tournaments
                </button>
                <div className="flex flex-col gap-6 overflow-x-auto pb-4">
                  <div className="flex items-center gap-16 min-w-max border-b border-border pb-3">
                    {rounds.map((round) => (
                      <div key={round} className="w-[280px] flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                            {round}
                          </span>
                          {getMatchTitle(round, maxRound)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-stretch gap-16 min-w-max min-h-[480px] py-2">
                    {rounds.map((round) => {
                      const matches = viewedTournament.matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
                      const isLast = round === maxRound;
                      const pairs: TournamentMatch[][] = [];
                      for (let i = 0; i < matches.length; i += 2) {
                        const pair = [matches[i], matches[i + 1]].filter((m): m is TournamentMatch => Boolean(m));
                        pairs.push(pair);
                      }
                      return (
                        <div key={round} className="w-[280px] flex flex-col justify-around">
                          {pairs.map((pair, pi) => (
                            <div key={pi} className="relative flex flex-col justify-around h-full my-4">
                              {pair.map((m) => {
                                const isPlayable = !m.isBye && Boolean(m.teamAId) && Boolean(m.teamBId) && !m.winnerId;
                                const isCompleted = m.winnerId !== null;
                                const isClickable = isPlayable || (isCompleted && !m.isBye);
                                const isTeamAWinner = m.winnerId !== null && m.winnerId === m.teamAId;
                                const isTeamBWinner = m.winnerId !== null && m.winnerId === m.teamBId;
                                const displayTeamA = m.isBye && !m.teamAId ? "BYE" : getTeamName(m.teamAId);
                                const displayTeamB = m.isBye && !m.teamBId ? "BYE" : getTeamName(m.teamBId);
                                const liveSlot = matchSlots.find((slot) => slot.match.id === m.id);
                                const scoreA = m.isBye ? "-" : (liveSlot ? liveSlot.match.scoreA : ((m as any).scoreA !== undefined ? (m as any).scoreA : "-"));
                                const scoreB = m.isBye ? "-" : (liveSlot ? liveSlot.match.scoreB : ((m as any).scoreB !== undefined ? (m as any).scoreB : "-"));
                                const hasWinner = !!m.winnerId;
                                return (
                                  <div key={m.id} className="relative py-2 z-10">
                                    <div
                                      className={cn("relative flex flex-col rounded-xl border p-3 shadow-sm transition-all", isClickable ? "border-primary/50 bg-primary/5 hover:border-primary cursor-pointer" : "border-border bg-muted/20 opacity-80")}
                                      onClick={() => isClickable && handleSelectMatch(m.id, m.teamAId, m.teamBId)}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className={cn("flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm font-semibold border border-border", isTeamAWinner && "border-emerald-500 text-emerald-600 bg-emerald-500/10")}>
                                          <div className="flex items-center gap-2">
                                            <span className={displayTeamA === "BYE" ? "italic text-muted-foreground" : ""}>{displayTeamA}</span>
                                            {isTeamAWinner && !m.isBye && <Trophy className="size-3.5 text-emerald-600" />}
                                          </div>
                                          <span className="font-mono text-muted-foreground">{scoreA}</span>
                                        </div>
                                        <div className={cn("flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm font-semibold border border-border", isTeamBWinner && "border-emerald-500 text-emerald-600 bg-emerald-500/10")}>
                                          <div className="flex items-center gap-2">
                                            <span className={displayTeamB === "BYE" ? "italic text-muted-foreground" : ""}>{displayTeamB}</span>
                                            {isTeamBWinner && !m.isBye && <Trophy className="size-3.5 text-emerald-600" />}
                                          </div>
                                          <span className="font-mono text-muted-foreground">{scoreB}</span>
                                        </div>
                                      </div>
                                      {isPlayable && !liveSlot && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-primary px-3 py-0.5 text-[9px] font-bold uppercase text-primary-foreground shadow-sm">Officiate Match</div>}
                                      {isPlayable && liveSlot && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full bg-indigo-500 px-3 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm border border-indigo-400">{liveSlot.slotId === slotId ? `Resume Court ${liveSlot.slotId}` : `Switch to Court ${liveSlot.slotId}`}</div>}
                                      {isCompleted && !m.isBye && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-emerald-600 px-3 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">Review Match</div>}
                                      {m.isBye && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-muted-foreground/80 px-3 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">Auto-Advance</div>}
                                    </div>
                                    {!isLast && <div className={`absolute -right-8 top-1/2 h-[2.5px] w-8 -translate-y-1/2 transition-colors ${hasWinner ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />}
                                  </div>
                                );
                              })}
                              {!isLast && (
                                <>
                                  <div className={`absolute -right-8 top-[25%] bottom-[25%] w-[2.5px] z-0 transition-colors ${pair.some((m) => !!m.winnerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                                  <div className={`absolute -right-16 top-1/2 h-[2.5px] w-8 -translate-y-1/2 z-0 transition-colors ${pair.some((m) => !!m.winnerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>
          ) : (
            /* ── 3. LIVE CONTROL DASHBOARD ── */
            <>
              <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-card", isFinished ? "border-destructive bg-destructive/5" : "border-border bg-background")}>
                <button
                  onClick={() => setViewMode("bracket")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  <ChevronLeft className="size-4" /> Back to Bracket
                </button>

                <div className="flex items-center gap-3">
                  <span className={cn("rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border", live || rawMatch.status === "paused" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border")}>
                    {live || rawMatch.status === "paused" ? "Live" : "Standby"}
                  </span>
                  {isFinished && (
                    <span className="rounded bg-destructive/10 px-4 py-1.5 font-bold uppercase tracking-widest text-destructive text-[11px]">
                      Match Concluded (Read-Only)
                    </span>
                  )}
                </div>
              </div>

              {/* Match Clock Tile */}
              <div className="flex flex-col items-center rounded-xl border border-border bg-background p-6 shadow-card lg:p-8">
                <div className="mb-6 flex w-full max-w-lg gap-1 rounded-lg bg-muted p-1">
                  {phases.map((phase) => (
                    <button
                      key={phase}
                      onClick={() => requestPhaseChange(phase)}
                      className={cn(
                        "flex-1 rounded-md px-2 py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-colors",
                        phase === currentPhase ? "border border-border bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {phase}
                    </button>
                  ))}
                </div>

                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {currentPhase} Countdown
                </div>
                <div className="mb-8 font-mono text-7xl font-bold tabular-nums leading-none tracking-tight text-destructive lg:text-8xl">
                  {formatClock(remainingMs)}
                </div>

                <div className="flex w-full flex-wrap justify-center gap-4">
                  <button
                    onClick={() => {
                      if (rawMatch.status === "paused") emit("updateMatch", (s: any) => s.resumeMatch(slotId));
                      else emit("updateMatch", (s: any) => s.startMatch(slotId));
                    }}
                    disabled={live || isFinished || teamADisqualified || teamBDisqualified}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-lg font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="size-5" fill="currentColor" /> Start
                  </button>
                  <button
                    onClick={() => emit("updateMatch", (s: any) => s.pauseMatch(slotId))}
                    disabled={!live || isFinished}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 text-lg font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pause className="size-5" /> Pause
                  </button>
                  <button
                    onClick={() => setShowFinalizePrompt(true)}
                    disabled={rawMatch.status === "scheduled" || isFinished}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-destructive px-6 py-3 text-lg font-bold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/85 disabled:cursor-not-allowed disabled:opacity-40 lg:ml-8"
                  >
                    <Square className="size-5" /> End Match
                  </button>
                </div>
              </div>

              {/* Team Panels */}
              <div className="grid gap-6 lg:grid-cols-2">
                <TeamPanel
                  teamName={rawMatch.teamAName}
                  sideLabel="BLUE TEAM"
                  initials={teamAInfo.initials}
                  logo={teamAInfo.logo}
                  accentColor="primary"
                  score={rawMatch.scoreA}
                  penalties={penaltiesA}
                  disabled={isFinished || teamADisqualified}
                  isWinner={isFinished && rawMatch.scoreA > rawMatch.scoreB}
                  onDecrement={() => emit("updateMatch", (s: any) => s.adjustScore(slotId, "A", -1))}
                  onIncrement={() => emit("updateMatch", (s: any) => s.adjustScore(slotId, "A", 1))}
                  onPenalty={(type: PenaltyType) => emit("updateMatch", (s: any) => s.issuePenalty(slotId, "A", type))}
                  onOwnGoal={() => emit("updateMatch", (s: any) => s.adjustScore(slotId, "B", 1, true))}
                  roster={dynamicRosterA}
                  coach={dynamicCoachA}
                />
                <TeamPanel
                  teamName={rawMatch.teamBName}
                  sideLabel="RED TEAM"
                  initials={teamBInfo.initials}
                  logo={teamBInfo.logo}
                  accentColor="destructive"
                  score={rawMatch.scoreB}
                  penalties={penaltiesB}
                  disabled={isFinished || teamBDisqualified}
                  isWinner={isFinished && rawMatch.scoreB > rawMatch.scoreA}
                  onDecrement={() => emit("updateMatch", (s: any) => s.adjustScore(slotId, "B", -1))}
                  onIncrement={() => emit("updateMatch", (s: any) => s.adjustScore(slotId, "B", 1))}
                  onPenalty={(type: PenaltyType) => emit("updateMatch", (s: any) => s.issuePenalty(slotId, "B", type))}
                  onOwnGoal={() => emit("updateMatch", (s: any) => s.adjustScore(slotId, "A", 1, true))}
                  roster={dynamicRosterB}
                  coach={dynamicCoachB}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Right Column: Event Feed ── */}
        {(viewMode === "control") && (
          <div className="flex w-full flex-col gap-6 xl:sticky xl:top-6 xl:h-[calc(100vh-48px)] xl:w-80">
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-card">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 p-4">
                <h3 className="text-lg font-bold text-foreground">Event Feed</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => emit("resetMatch", (s: any) => s.resetMatch(slotId))}
                    disabled={isFinished}
                    className="text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <History className="size-5 text-muted-foreground" />
                </div>
              </div>
              <div className="hide-scrollbar flex-1 overflow-y-auto p-2">
                {events.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No events yet. Start the match to begin recording.
                  </p>
                )}
                <ul className="space-y-1">
                  {events.map((evt, idx) => {
                    const isPhaseChange = evt.message.startsWith("PHASE_CHANGE:");
                    const isPhaseEnd = evt.message.startsWith("PHASE_END:");
                    let labelColor = "text-muted-foreground";
                    let messageColor = "text-foreground";

                    if (isPhaseEnd) {
                      labelColor = "text-red-500";
                      messageColor = "text-red-600 dark:text-red-400 font-bold";
                    } else if (isPhaseChange) {
                      labelColor = "text-indigo-500";
                      messageColor = "text-indigo-600 dark:text-indigo-400 font-bold";
                    } else if (evt.type === "score_changed") {
                      if (evt.message.includes("OWN GOAL")) {
                         labelColor = "text-destructive";
                         messageColor = "text-destructive dark:text-red-500 font-bold";
                      } else {
                         labelColor = "text-emerald-600 dark:text-emerald-500";
                         messageColor = "text-emerald-600 dark:text-emerald-500 font-bold";
                      }
                    } else if (evt.type === "penalty_issued") {
                      if (evt.message.includes("Minor")) {
                        labelColor = "text-slate-500";
                        messageColor = "text-slate-600 dark:text-slate-400 font-bold";
                      } else if (evt.message.includes("Major")) {
                        labelColor = "text-yellow-600 dark:text-yellow-500";
                        messageColor = "text-yellow-600 dark:text-yellow-500 font-bold";
                      } else if (evt.message.includes("Technical")) {
                        labelColor = "text-red-600 dark:text-red-500";
                        messageColor = "text-red-600 dark:text-red-500 font-bold";
                      }
                    } else if (evt.type === "match_started" || evt.type === "match_resumed") {
                      labelColor = "text-emerald-600 dark:text-emerald-500";
                    } else if (evt.type === "match_ended") {
                      labelColor = "text-destructive";
                    }

                    const displayMsg = isPhaseEnd
                      ? `End of ${evt.message.replace("PHASE_END:", "")}`
                      : isPhaseChange
                      ? `Phase changed to ${evt.message.replace("PHASE_CHANGE:", "")}`
                      : evt.message;

                    return (
                      <li
                        key={evt.id}
                        className={cn(
                          "rounded-lg p-3 transition-colors",
                          idx === 0 ? "border border-primary/20 bg-primary/5" : "border-b border-border/20 hover:bg-muted/50"
                        )}
                      >
                        <div className="mb-1 flex items-start justify-between">
                          <span className={cn("text-[11px] font-bold uppercase tracking-wider", labelColor)}>
                            {isPhaseEnd ? "PHASE END" : isPhaseChange ? "PHASE" : eventLabel(evt.type)}
                          </span>
                          <span className="font-mono text-[12px] text-muted-foreground">
                            {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        <p className={cn("text-sm", messageColor)}>{displayMsg}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Join Confirmation Modal */}
      {joinConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-foreground">Change Court to Co-Officiate?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              You are currently assigned to <strong>Court {slotId}</strong>. This match is already active on <strong>Court {joinConfirm.slotId}</strong>. Do you want to change to Court {joinConfirm.slotId} to officiate together with the other referee?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setJoinConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSlotId(joinConfirm.slotId);
                  setViewMode("control");
                  setJoinConfirm(null);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                Yes, Change to Court {joinConfirm.slotId}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Match Confirmation Modal */}
      {showFinalizePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-foreground">Finalize Match Score?</h3>
            {winningTeamName && (
              <div className="mb-5 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <div className="mb-1 text-2xl animate-bounce" aria-hidden="true">🎉 🏆 🎉</div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600">Congratulations!</p>
                <p className="mt-1 text-xl font-black uppercase text-emerald-700 dark:text-emerald-400">{winningTeamName} Wins!</p>
              </div>
            )}
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to end the match and permanently finalize the score? <br/><br/>
              <strong className="text-foreground text-base block text-center bg-muted rounded-lg py-2">
                {rawMatch.teamAName} {rawMatch.scoreA} - {rawMatch.scoreB} {rawMatch.teamBName}
              </strong>
              <br/>
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFinalizePrompt(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  emit("updateMatch", (s: any) => s.endMatch(slotId));
                  setShowFinalizePrompt(false);
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 shadow-sm"
              >
                End Match & Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      {phaseConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-foreground">Change Match Phase?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Change the phase from <strong className="text-foreground">{currentPhase}</strong> to <strong className="text-primary">{phaseConfirmation}</strong>? The phase timer will be reset.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPhaseConfirmation(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => {
                  emit("updateMatch", (s: any) => s.changeMatchPhase(slotId, phaseConfirmation));
                  setPhaseConfirmation(null);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                Confirm Phase Change
              </button>
            </div>
          </div>
        </div>
      )}
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
    status: match.status === "scheduled" || match.status === "live" || match.status === "paused" || match.status === "finished" ? match.status : fallback.status,
    elapsedMs: typeof match.elapsedMs === "number" && Number.isFinite(match.elapsedMs) ? match.elapsedMs : 0,
    runningSince: typeof match.runningSince === "number" && Number.isFinite(match.runningSince) ? match.runningSince : null,
    penalties: Array.isArray(match.penalties) ? match.penalties : [],
  };
}

function NavCard({ href, onClick, icon, label, active, danger, external }: any) {
  const classes = cn(
    "flex flex-col items-center justify-center gap-2 rounded-xl p-4 shadow-sm transition-colors cursor-pointer",
    active ? "bg-primary text-primary-foreground hover:bg-primary/85" : danger ? "border border-border bg-background text-destructive hover:bg-destructive/10" : "border border-border bg-background text-foreground hover:bg-muted"
  );
  if (onClick) return <button onClick={onClick} className={classes}>{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></button>;
  if (external) return <Link to={href} target="_blank" className={classes}>{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></Link>;
  return <Link to={href} className={classes}>{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></Link>;
}

function TeamPanel({ teamName, sideLabel, initials, logo, accentColor, score, penalties, disabled, onDecrement, onIncrement, onPenalty, onOwnGoal, roster, isWinner }: any) {
  const isPrimary = accentColor === "primary";
  const effectivePenalties = calculateEffectivePenalties(penalties);

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("relative flex-1 flex flex-col rounded-xl border bg-background p-6 shadow-card transition-opacity", disabled ? "opacity-75" : "", isWinner ? "border-emerald-500 shadow-emerald-500/10" : "border-border")}>
        <div className="mb-6 flex items-center justify-between border-b border-border/30 pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground lg:text-2xl">{teamName}</h2>
            <span className="mt-1 inline-block rounded bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sideLabel}</span>
          </div>

          {logo ? (
            <img
              src={logo}
              alt={`${teamName} Logo`}
              className={cn("size-12 rounded-full object-contain border-2 bg-white", isPrimary ? "border-primary" : "border-destructive")}
            />
          ) : (
            <div className={cn("flex size-12 items-center justify-center rounded-full border-2 font-bold", isPrimary ? "border-primary bg-primary/10 text-primary" : "border-destructive bg-destructive/10 text-destructive")}>
              {initials}
            </div>
          )}
        </div>

        <div className="mb-8 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-6">
            <button onClick={onDecrement} disabled={disabled} className="flex size-16 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"><Minus className="size-7" /></button>
            <span className="w-32 text-center font-mono text-8xl font-bold tabular-nums leading-none text-foreground lg:text-[96px]">{score}</span>
            <button onClick={onIncrement} disabled={disabled} className="flex size-20 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform hover:bg-primary/85 active:scale-95 disabled:opacity-50 disabled:active:scale-100"><Plus className="size-10" /></button>
          </div>
          <button onClick={onOwnGoal} disabled={disabled} className="w-full rounded-lg border-2 border-destructive/40 bg-destructive px-5 py-3 text-sm font-black uppercase tracking-wider text-destructive-foreground shadow-md transition-all hover:bg-destructive/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
            Register Own Goal — Award Point to Opponent
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Penalty Entry</h3>

            <div className="flex items-center gap-1">
              {effectivePenalties.isDisqualified ? (
                <span className="rounded bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Disqualified</span>
              ) : effectivePenalties.badges.map((badge, index) => (
                <span key={`${badge}-${index}`} className={cn("h-4 w-3 rounded-sm shadow-sm", badge === "Yellow" ? "bg-warning" : "bg-muted-foreground")} />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {penaltyButtons.map((p) => (
              <button key={p.label} onClick={() => onPenalty(p.type)} disabled={disabled} className={cn("flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50", p.style)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-border/30 pt-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Roster</h3>
          
          {roster.length === 0 ? (
            <p className="text-sm font-mono text-muted-foreground italic">No players registered.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm text-foreground">
              {roster.map((p: any) => (
                <li key={p.name} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                  <span className={cn("font-semibold", p.highlight ? (isPrimary ? "text-primary" : "text-destructive") : "")}>{p.name}</span>
                  <span className="text-muted-foreground">{p.position}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {isWinner && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-1.5 text-xs font-bold tracking-widest text-emerald-600 border border-emerald-500/30 shadow-sm">
            <Trophy className="size-4" /> MATCH WINNER
          </div>
        </div>
      )}
    </div>
  );
}

function eventLabel(type: MatchEventType): string {
  switch (type) {
    case "match_started": return "STARTED";
    case "match_paused": return "PAUSED";
    case "match_resumed": return "RESUMED";
    case "match_ended": return "MATCH ENDED";
    case "score_changed": return "GOAL";
    case "penalty_issued": return "PENALTY";
    default: return type;
  }
}
