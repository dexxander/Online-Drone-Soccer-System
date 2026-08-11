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
import { useEffect, useState, useRef, useCallback } from "react";
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

const phases = ["Testing", "1st Half", "Half Time", "2nd Half"] as const;
const MATCH_DURATION_MS = 3 * 60 * 1000;

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

function RefereePage() {
  const { state, emit, socket } = useMockWebSocket();

  // Simple UI pause timer to prevent the screen from flickering when clicking fast
  const lastActionTime = useRef<number>(0);
  const safeEmit = useCallback((action: string, callback: any) => {
    lastActionTime.current = Date.now();
    emit(action, callback);
  }, [emit]);

  const matchSlots: MatchSlot[] = Array.isArray(state.matches) && state.matches.length === 2
    ? state.matches
    : [initialState.matches[0], initialState.matches[1]];

  const [viewMode, setViewMode] = useState<"tournaments" | "bracket" | "control">("tournaments");
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  
  // Modal state for confirming if referee wants to co-officiate a shared court
  const [joinConfirm, setJoinConfirm] = useState<{ slotId: MatchSlotId, matchId: string } | null>(null);

  // Which court (match slot) this control page is currently driving.
  const [slotId, setSlotId] = useState<MatchSlotId>(1);

  const activeSlot = matchSlots.find((s) => s.slotId === slotId) ?? matchSlots[0];
  const rawMatch = safeMatch(activeSlot.match);
  const events = Array.isArray(activeSlot.events) ? activeSlot.events : [];

  // =========================================================================
  // OPTIMISTIC UI: Instant Local Screen Updates
  // =========================================================================
  const [optimisticScoreA, setOptimisticScoreA] = useState(rawMatch.scoreA);
  const [optimisticScoreB, setOptimisticScoreB] = useState(rawMatch.scoreB);

  useEffect(() => {
    // Only pull the server score if the referee hasn't clicked a button recently
    if (Date.now() - lastActionTime.current > 1500) {
      setOptimisticScoreA(rawMatch.scoreA);
      setOptimisticScoreB(rawMatch.scoreB);
    }
  }, [rawMatch.scoreA, rawMatch.scoreB]);

  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const players = Array.isArray(state.players) ? state.players : [];

  const elapsedMs = useMatchClock(rawMatch.elapsedMs, rawMatch.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  const live = rawMatch.status === "live";
  const isFinished = rawMatch.status === "finished";

  // Background polling (Pauses briefly after clicks to let the DB process the math)
  useEffect(() => {
    void socket.refreshMatchSlots();
    const id = setInterval(() => {
      // Only pull fresh data if it's been at least 1.5 seconds since the referee last clicked a button
      if (Date.now() - lastActionTime.current > 1500) {
        void socket.refreshMatchSlots();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [socket]);

  // Presence heartbeat
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

    if (activeSlot.match.status === "live" || activeSlot.match.status === "paused") {
      alert("This court is currently running an active match. Please end it or switch to an empty court to start a new match.");
      return;
    }

    const teamAName = getTeamName(teamAId);
    const teamBName = getTeamName(teamBId);

    if (rawMatch.id !== matchId) {
      safeEmit("setupLiveMatch", (s: any) => s.setupLiveMatch(slotId, matchId, teamAName, teamBName));
    }
    setViewMode("control");
  };

  const activePhase = isFinished ? 3 : live || rawMatch.status === "paused" ? 1 : 0;
  const teamAInfo = getTeamDetailsByName(rawMatch.teamAName);
  const teamBInfo = getTeamDetailsByName(rawMatch.teamBName);
  
  const dynamicRosterA = getDynamicRoster(rawMatch.teamAName);
  const dynamicRosterB = getDynamicRoster(rawMatch.teamBName);
  const dynamicCoachA = getDynamicCoach(rawMatch.teamAName);
  const dynamicCoachB = getDynamicCoach(rawMatch.teamBName);

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);
  const rounds = activeTournament
    ? Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b)
    : [];
  const maxRound = Math.max(...rounds, 0);

  return (
    <RefereeLayout match={rawMatch} slotId={slotId}>
      <div className="flex h-full flex-col gap-6 xl:flex-row">

        {/* ── Main Column ── */}
        <div className="flex-1 space-y-6">

          {/* ── Global Scoreboard Controls (Always Visible) ── */}
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
                    onCheckedChange={(checked) => safeEmit("setSlotVisibility", (s: any) => s.setSlotVisibility(slot.slotId, checked))}
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
                      Court {slot.slotId}
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
            /* ── 1. TOURNAMENT LIST VIEW ── */
            <Panel title="Active Tournaments">
              {tournaments.length === 0 ? (
                <EmptyState
                  title="No active tournaments"
                  description="Tournaments generated in the Admin dashboard will appear here."
                />
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
                        <tr
                          key={t.id}
                          onClick={() => handleOpenBracket(t.id)}
                          className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30"
                        >
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
          ) : viewMode === "bracket" && activeTournament ? (
            /* ── 2. VISUAL BRACKET VIEW ── */
            <Panel title={`Bracket: ${activeTournament.name}`}>
              <div className="p-5">
                <button
                  onClick={() => setViewMode("tournaments")}
                  className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-3.5" /> Back to Tournaments
                </button>

                <div className="flex flex-col gap-6 overflow-x-auto pb-4">
                  {/* Round Headers */}
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

                  {/* Bracket Columns */}
                  <div className="flex items-stretch gap-16 min-w-max min-h-[480px] py-2">
                    {rounds.map((round) => {
                      const matches = activeTournament.matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
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
                                      className={cn(
                                        "relative flex flex-col rounded-xl border p-3 shadow-sm transition-all",
                                        isClickable ? "border-primary/50 bg-primary/5 hover:border-primary cursor-pointer" : "border-border bg-muted/20 opacity-80"
                                      )}
                                      onClick={() => isClickable && handleSelectMatch(m.id, m.teamAId, m.teamBId)}
                                    >
                                      <div className="flex flex-col gap-2">
                                        {/* Team A Slot */}
                                        <div className={cn("flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm font-semibold border border-border", isTeamAWinner && "border-emerald-500 text-emerald-600 bg-emerald-500/10")}>
                                          <div className="flex items-center gap-2">
                                            <span className={displayTeamA === "BYE" ? "italic text-muted-foreground" : ""}>{displayTeamA}</span>
                                            {isTeamAWinner && !m.isBye && <Trophy className="size-3.5 text-emerald-600" />}
                                          </div>
                                          <span className="font-mono text-muted-foreground">{scoreA}</span>
                                        </div>

                                        {/* Team B Slot */}
                                        <div className={cn("flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm font-semibold border border-border", isTeamBWinner && "border-emerald-500 text-emerald-600 bg-emerald-500/10")}>
                                          <div className="flex items-center gap-2">
                                            <span className={displayTeamB === "BYE" ? "italic text-muted-foreground" : ""}>{displayTeamB}</span>
                                            {isTeamBWinner && !m.isBye && <Trophy className="size-3.5 text-emerald-600" />}
                                          </div>
                                          <span className="font-mono text-muted-foreground">{scoreB}</span>
                                        </div>
                                      </div>

                                      {isPlayable && !liveSlot && (
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-primary px-3 py-0.5 text-[9px] font-bold uppercase text-primary-foreground shadow-sm">
                                          Officiate Match
                                        </div>
                                      )}
                                      {isPlayable && liveSlot && (
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full bg-indigo-500 px-3 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm border border-indigo-400">
                                          {liveSlot.slotId === slotId ? `Resume Court ${liveSlot.slotId}` : `Switch to Court ${liveSlot.slotId}`}
                                        </div>
                                      )}
                                      {isCompleted && !m.isBye && (
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-emerald-600 px-3 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
                                          Review Match
                                        </div>
                                      )}
                                      {m.isBye && (
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-muted-foreground/80 px-3 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
                                          Auto-Advance
                                        </div>
                                      )}
                                    </div>

                                    {/* Horizontal Line extending right from match box */}
                                    {!isLast && (
                                      <div
                                        className={`absolute -right-8 top-1/2 h-[2.5px] w-8 -translate-y-1/2 transition-colors ${
                                          hasWinner ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                                        }`}
                                      />
                                    )}
                                  </div>
                                );
                              })}

                              {/* Bracket Spine Connector for the Pair */}
                              {!isLast && (
                                <>
                                  <div
                                    className={`absolute -right-8 top-[25%] bottom-[25%] w-[2.5px] z-0 transition-colors ${
                                      pair.some((m) => !!m.winnerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                                    }`}
                                  />
                                  {/* Forward Stem to Next Round */}
                                  <div
                                    className={`absolute -right-16 top-1/2 h-[2.5px] w-8 -translate-y-1/2 z-0 transition-colors ${
                                      pair.some((m) => !!m.winnerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                                    }`}
                                  />
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
                <div className="mb-6 flex w-full max-w-lg rounded-lg bg-muted p-1">
                  {phases.map((phase, i) => (
                    <button
                      key={phase}
                      className={cn(
                        "flex-1 rounded-md px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                        i === activePhase ? "border border-border bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {phase}
                    </button>
                  ))}
                </div>

                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Countdown Timer</div>
                <div className="mb-8 font-mono text-7xl font-bold tabular-nums leading-none tracking-tight text-destructive lg:text-8xl">
                  {formatClock(remainingMs)}
                </div>

                <div className="flex w-full flex-wrap justify-center gap-4">
                  <button
                    onClick={() => {
                      if (rawMatch.status === "paused") safeEmit("updateMatch", (s: any) => s.resumeMatch(slotId));
                      else safeEmit("updateMatch", (s: any) => s.startMatch(slotId));
                    }}
                    disabled={live || isFinished}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-lg font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="size-5" fill="currentColor" /> Start
                  </button>
                  <button
                    onClick={() => safeEmit("updateMatch", (s: any) => s.pauseMatch(slotId))}
                    disabled={!live || isFinished}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 text-lg font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pause className="size-5" /> Pause
                  </button>
                  <button
                    onClick={() => safeEmit("updateMatch", (s: any) => s.endMatch(slotId))}
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
                  score={optimisticScoreA}
                  penalties={rawMatch.penalties.filter(p => p.side === "A")}
                  disabled={isFinished}
                  onDecrement={() => {
                    setOptimisticScoreA(prev => Math.max(0, prev - 1));
                    safeEmit("updateMatch", (s: any) => s.adjustScore(slotId, "A", -1));
                  }}
                  onIncrement={() => {
                    setOptimisticScoreA(prev => prev + 1);
                    safeEmit("updateMatch", (s: any) => s.adjustScore(slotId, "A", 1));
                  }}
                  onPenalty={(type: PenaltyType) => safeEmit("updateMatch", (s: any) => s.issuePenalty(slotId, "A", type))}
                  roster={dynamicRosterA}
                  coach={dynamicCoachA}
                />
                <TeamPanel
                  teamName={rawMatch.teamBName}
                  sideLabel="RED TEAM"
                  initials={teamBInfo.initials}
                  logo={teamBInfo.logo}
                  accentColor="destructive"
                  score={optimisticScoreB}
                  penalties={rawMatch.penalties.filter(p => p.side === "B")}
                  disabled={isFinished}
                  onDecrement={() => {
                    setOptimisticScoreB(prev => Math.max(0, prev - 1));
                    safeEmit("updateMatch", (s: any) => s.adjustScore(slotId, "B", -1));
                  }}
                  onIncrement={() => {
                    setOptimisticScoreB(prev => prev + 1);
                    safeEmit("updateMatch", (s: any) => s.adjustScore(slotId, "B", 1));
                  }}
                  onPenalty={(type: PenaltyType) => safeEmit("updateMatch", (s: any) => s.issuePenalty(slotId, "B", type))}
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
                    onClick={() => safeEmit("resetMatch", (s: any) => s.resetMatch(slotId))}
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
                    let labelColor = "text-muted-foreground";
                    let messageColor = "text-foreground";

                    if (evt.type === "score_changed") {
                      labelColor = "text-emerald-600 dark:text-emerald-500";
                      messageColor = "text-emerald-600 dark:text-emerald-500 font-bold";
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
                            {eventLabel(evt.type)}
                          </span>
                          <span className="font-mono text-[12px] text-muted-foreground">
                            {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        <p className={cn("text-sm", messageColor)}>{evt.message}</p>
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
    </RefereeLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Helpers & Sub-components                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

function TeamPanel({ teamName, sideLabel, initials, logo, accentColor, score, penalties, disabled, onDecrement, onIncrement, onPenalty, roster }: any) {
  const isPrimary = accentColor === "primary";
  const effectivePenalties = calculateEffectivePenalties(penalties);

  return (
    <div className={cn("flex flex-col rounded-xl border bg-background p-6 shadow-card transition-opacity", disabled ? "opacity-75 border-border" : "border-border")}>
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

      <div className="mb-8 flex items-center justify-center gap-6">
        <button onClick={onDecrement} disabled={disabled} className="flex size-16 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"><Minus className="size-7" /></button>
        <span className="w-32 text-center font-mono text-8xl font-bold tabular-nums leading-none text-foreground lg:text-[96px]">{score}</span>
        <button onClick={onIncrement} disabled={disabled} className="flex size-20 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform hover:bg-primary/85 active:scale-95 disabled:opacity-50 disabled:active:scale-100"><Plus className="size-10" /></button>
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