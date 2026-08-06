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
import { useEffect, useState } from "react";
import { RefereeLayout } from "@/components/RefereeLayout";
import { EmptyState, Panel } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import type { Match, MatchEventType, MatchSlot, MatchSlotId, PenaltyType, TournamentMatch } from "@/lib/types";

import {
  auth,
  initialState,
  AVAILABLE_TEAMS,
  rosterA,
  coachA,
  rosterB,
  coachB,
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
  const { state, emit } = useMockWebSocket();

  const matchSlots: MatchSlot[] = Array.isArray(state.matches) && state.matches.length === 2
    ? state.matches
    : [initialState.matches[0], initialState.matches[1]];

  const [viewMode, setViewMode] = useState<"tournaments" | "bracket" | "control">("tournaments");
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  // Which court (match slot) this control page is currently driving. Up to
  // two control pages — one per court — can run at the same time, each
  // independently controlling its own match.
  const [slotId, setSlotId] = useState<MatchSlotId>(1);

  const activeSlot = matchSlots.find((s) => s.slotId === slotId) ?? matchSlots[0];
  const rawMatch = safeMatch(activeSlot.match);
  const events = Array.isArray(activeSlot.events) ? activeSlot.events : [];

  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const players = Array.isArray(state.players) ? state.players : [];

  const elapsedMs = useMatchClock(rawMatch.elapsedMs, rawMatch.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  const live = rawMatch.status === "live";
  const isFinished = rawMatch.status === "finished";

  // Presence heartbeat: while this tab is actually on the live control
  // dashboard for `slotId`, let the rest of the app (mainly the public
  // scoreboard) know this court's control page is open. Stops the moment
  // the referee navigates away, switches courts, or closes the tab.
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
    if (team) {
      const teamPlayers = players.filter(p => p.teamId === team.id);
      if (teamPlayers.length > 0) {
        return teamPlayers.map(p => ({
          name: p.name || "Unknown",
          position: (p as any).position || (p as any).role || "Player",
          highlight: (p as any).position === "Striker" || (p as any).role === "Striker"
        }));
      }
    }
    
    if (teamName === "Sky Raptors") return rosterA;
    if (teamName === "Vortex United") return rosterB;
    
    return [];
  };

  const handleOpenBracket = (tournamentId: string) => {
    setActiveTournamentId(tournamentId);
    setViewMode("bracket");
  };

  const handleSelectMatch = (matchId: string, teamAId: string | null, teamBId: string | null) => {
    const teamAName = getTeamName(teamAId);
    const teamBName = getTeamName(teamBId);

    if (rawMatch.id !== matchId) {
      emit("setupLiveMatch", (s) => s.setupLiveMatch(slotId, matchId, teamAName, teamBName));
    }
    setViewMode("control");
  };

  const activePhase = isFinished ? 3 : live || rawMatch.status === "paused" ? 1 : 0;
  const teamAInfo = getTeamDetailsByName(rawMatch.teamAName);
  const teamBInfo = getTeamDetailsByName(rawMatch.teamBName);
  
  const dynamicRosterA = getDynamicRoster(rawMatch.teamAName);
  const dynamicRosterB = getDynamicRoster(rawMatch.teamBName);

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);
  const rounds = activeTournament
    ? Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b)
    : [];
  const maxRound = Math.max(...rounds, 0);
  const minRound = Math.min(...rounds, 0);

  return (
    <RefereeLayout match={rawMatch} slotId={slotId}>
      <div className="flex h-full flex-col gap-6 xl:flex-row">

        {/* ── Main Column ── */}
        <div className="flex-1 space-y-6">

          {/* ── Court Selector ── up to 2 matches can run at once; this
              picks which one THIS control page drives. ── */}
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
                      {slot.visibleOnScoreboard ? (
                        <Eye className="size-3.5 text-muted-foreground" strokeWidth={2} />
                      ) : (
                        <EyeOff className="size-3.5 text-muted-foreground" strokeWidth={2} />
                      )}
                      {isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          <Radio className="size-3" strokeWidth={2.5} /> Live
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {m.teamAName} <span className="font-normal text-muted-foreground">vs</span> {m.teamBName}
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

                                const scoreA = m.isBye ? "-" : (rawMatch.id === m.id ? rawMatch.scoreA : ((m as any).scoreA !== undefined ? (m as any).scoreA : "-"));
                                const scoreB = m.isBye ? "-" : (rawMatch.id === m.id ? rawMatch.scoreB : ((m as any).scoreB !== undefined ? (m as any).scoreB : "-"));

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

                                      {isPlayable && (
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-primary px-3 py-0.5 text-[9px] font-bold uppercase text-primary-foreground shadow-sm">
                                          Officiate Match
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
                  {isFinished && (
                    <span className="rounded bg-destructive/10 px-4 py-1.5 font-bold uppercase tracking-widest text-destructive">
                      Match Concluded (Read-Only)
                    </span>
                  )}
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                    {activeSlot.visibleOnScoreboard ? (
                      <Eye className="size-4 text-primary" strokeWidth={2} />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground" strokeWidth={2} />
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      Show on Scoreboard
                    </span>
                    <Switch
                      checked={activeSlot.visibleOnScoreboard}
                      onCheckedChange={(checked) => emit("setSlotVisibility", (s) => s.setSlotVisibility(slotId, checked))}
                    />
                  </label>
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
                      if (rawMatch.status === "paused") emit("updateMatch", (s) => s.resumeMatch(slotId));
                      else emit("updateMatch", (s) => s.startMatch(slotId));
                    }}
                    disabled={live || isFinished}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-lg font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="size-5" fill="currentColor" /> Start
                  </button>
                  <button
                    onClick={() => emit("updateMatch", (s) => s.pauseMatch(slotId))}
                    disabled={!live || isFinished}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 text-lg font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pause className="size-5" /> Pause
                  </button>
                  <button
                    onClick={() => emit("updateMatch", (s) => s.endMatch(slotId))}
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
                  penalties={rawMatch.penalties.filter(p => p.side === "A")}
                  disabled={isFinished}
                  onDecrement={() => emit("updateMatch", (s) => s.adjustScore(slotId, "A", -1))}
                  onIncrement={() => emit("updateMatch", (s) => s.adjustScore(slotId, "A", 1))}
                  onPenalty={(type: PenaltyType) => emit("updateMatch", (s) => s.issuePenalty(slotId, "A", type))}
                  roster={dynamicRosterA.length > 0 ? dynamicRosterA : rosterA}
                  coach={coachA}
                />
                <TeamPanel
                  teamName={rawMatch.teamBName}
                  sideLabel="RED TEAM"
                  initials={teamBInfo.initials}
                  logo={teamBInfo.logo}
                  accentColor="destructive"
                  score={rawMatch.scoreB}
                  penalties={rawMatch.penalties.filter(p => p.side === "B")}
                  disabled={isFinished}
                  onDecrement={() => emit("updateMatch", (s) => s.adjustScore(slotId, "B", -1))}
                  onIncrement={() => emit("updateMatch", (s) => s.adjustScore(slotId, "B", 1))}
                  onPenalty={(type: PenaltyType) => emit("updateMatch", (s) => s.issuePenalty(slotId, "B", type))}
                  roster={dynamicRosterB.length > 0 ? dynamicRosterB : rosterB}
                  coach={coachB}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Right Column: Event Feed ── */}
        {(viewMode === "control") && (
          <div className="flex w-full flex-col gap-6 xl:w-80">
            <div className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-card">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 p-4">
                <h3 className="text-lg font-bold text-foreground">Event Feed</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => emit("resetMatch", (s) => s.resetMatch(slotId))}
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
                  {events.map((evt, idx) => (
                    <li
                      key={evt.id}
                      className={cn(
                        "rounded-lg p-3 transition-colors",
                        idx === 0 ? "border border-primary/20 bg-primary/5" : "border-b border-border/20 hover:bg-muted/50"
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between">
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", eventLabelColor(evt.type))}>
                          {eventLabel(evt.type)}
                        </span>
                        <span className="font-mono text-[12px] text-muted-foreground">
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{evt.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
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

          <div className="flex gap-1">
            {penalties.map((p: any) => (
              <span key={p.id} className={cn("h-4 w-3 rounded-sm shadow-sm", p.type === "Major" ? "bg-warning" : p.type === "Technical" ? "bg-destructive" : "bg-muted-foreground")} />
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

function eventLabelColor(type: MatchEventType): string {
  switch (type) {
    case "score_changed": return "text-primary";
    case "match_ended": return "text-destructive";
    case "penalty_issued": return "text-warning";
    case "match_started": case "match_resumed": return "text-success";
    default: return "text-muted-foreground";
  }
}