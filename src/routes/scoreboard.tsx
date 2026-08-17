import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Palette, Radio, Sparkles, Timer, Trophy, MonitorSmartphone } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import { AVAILABLE_TEAMS, initialState } from "@/lib/store";
import type { MatchSlot, Tournament, TournamentMatch } from "@/lib/types";
import { calculateEffectivePenalties } from "@/lib/penalties";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — Drone Soccer League Control" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard with real-time scores, timer and penalties." },
    ],
  }),
  component: Scoreboard,
});

// ─── ADVANCED THEME ENGINE ─────────────────────────────────────────────────

type ThemeDef = {
  id: string;
  name: string;
  appBg: string;
  headerBg: string;
  cardBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  clock: string;
  teamA: { text: string; border: string; ring: string; watermark: string; bg: string };
  teamB: { text: string; border: string; ring: string; watermark: string; bg: string };
};

const THEMES: Record<string, ThemeDef> = {
  default: {
    id: "default",
    name: "Default Dark",
    appBg: "bg-background",
    headerBg: "bg-background",
    cardBg: "bg-background",
    border: "border-border",
    textMain: "text-foreground",
    textMuted: "text-muted-foreground",
    clock: "text-destructive",
    teamA: { text: "text-primary", border: "border-border", ring: "ring-primary/50", watermark: "opacity-[0.05]", bg: "bg-background" },
    teamB: { text: "text-destructive", border: "border-border", ring: "ring-destructive/50", watermark: "opacity-[0.05]", bg: "bg-background" },
  },
  kkhs: {
    id: "kkhs",
    name: "KKHS Pride",
    appBg: "bg-gradient-to-br from-blue-950 via-slate-900 to-red-950",
    headerBg: "bg-slate-950/40 backdrop-blur-xl border-b-yellow-500/30 shadow-lg",
    cardBg: "bg-slate-900/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
    border: "border-white/10 border-t-white/20",
    textMain: "text-slate-50",
    textMuted: "text-slate-300",
    clock: "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]",
    teamA: { text: "text-blue-400 drop-shadow-md", border: "border-blue-500/30", ring: "ring-blue-500/50", watermark: "opacity-[0.1]", bg: "bg-blue-950/20" },
    teamB: { text: "text-red-400 drop-shadow-md", border: "border-red-500/30", ring: "ring-red-500/50", watermark: "opacity-[0.1]", bg: "bg-red-950/20" },
  },
  cyber: {
    id: "cyber",
    name: "Neon Cyber",
    appBg: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-black to-black",
    headerBg: "bg-black/50 backdrop-blur-md border-b-orange-500/40 shadow-[0_4px_15px_rgba(249,115,22,0.1)]",
    cardBg: "bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(249,115,22,0.15)]",
    border: "border-orange-500/30",
    textMain: "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]",
    textMuted: "text-orange-200/60",
    clock: "text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] font-black",
    teamA: { text: "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]", border: "border-cyan-500/30 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]", ring: "ring-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.4)]", watermark: "opacity-[0.05]", bg: "bg-cyan-950/10" },
    teamB: { text: "text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]", border: "border-fuchsia-500/30 shadow-[inset_0_0_20px_rgba(217,70,239,0.1)]", ring: "ring-fuchsia-400/80 shadow-[0_0_15px_rgba(217,70,239,0.4)]", watermark: "opacity-[0.05]", bg: "bg-fuchsia-950/10" },
  },
  frosted: {
    id: "frosted",
    name: "Frosted Glass",
    appBg: "bg-gradient-to-tr from-rose-100 via-teal-50 to-indigo-100 dark:from-rose-950 dark:via-teal-950 dark:to-indigo-950",
    headerBg: "bg-white/30 dark:bg-black/30 backdrop-blur-lg border-b-white/40 dark:border-b-white/10",
    cardBg: "bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
    border: "border-white/50 dark:border-white/10 border-t-white/80 dark:border-t-white/20",
    textMain: "text-slate-800 dark:text-slate-100",
    textMuted: "text-slate-600 dark:text-slate-400",
    clock: "text-slate-900 dark:text-white font-black drop-shadow-sm",
    teamA: { text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200/50 dark:border-indigo-500/30", ring: "ring-indigo-400/50", watermark: "opacity-[0.04]", bg: "bg-indigo-50/30 dark:bg-indigo-900/20" },
    teamB: { text: "text-rose-600 dark:text-rose-400", border: "border-rose-200/50 dark:border-rose-500/30", ring: "ring-rose-400/50", watermark: "opacity-[0.04]", bg: "bg-rose-50/30 dark:bg-rose-900/20" },
  },
  sunset: {
    id: "sunset",
    name: "Sunset Vibes",
    appBg: "bg-gradient-to-br from-orange-500 via-rose-500 to-purple-700",
    headerBg: "bg-black/20 backdrop-blur-md border-b-white/10",
    cardBg: "bg-white/10 backdrop-blur-lg shadow-xl",
    border: "border-white/20 border-t-white/30",
    textMain: "text-white",
    textMuted: "text-white/80",
    clock: "text-yellow-300 drop-shadow-md font-black",
    teamA: { text: "text-yellow-300 drop-shadow-sm", border: "border-yellow-300/30", ring: "ring-yellow-300/60", watermark: "opacity-[0.15]", bg: "bg-yellow-500/10" },
    teamB: { text: "text-white drop-shadow-sm", border: "border-white/30", ring: "ring-white/60", watermark: "opacity-[0.15]", bg: "bg-white/10" },
  },
  midnight: {
    id: "midnight",
    name: "Midnight Aurora",
    appBg: "bg-[#0B0F19] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B0F19] to-[#0B0F19]",
    headerBg: "bg-slate-950/50 backdrop-blur-lg border-b-blue-500/20",
    cardBg: "bg-slate-900/50 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.4)]",
    border: "border-blue-500/10 border-t-blue-400/20",
    textMain: "text-slate-100",
    textMuted: "text-slate-400",
    clock: "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]",
    teamA: { text: "text-blue-400 drop-shadow-sm", border: "border-blue-500/20", ring: "ring-blue-400/50", watermark: "opacity-[0.05]", bg: "bg-blue-950/30" },
    teamB: { text: "text-emerald-400 drop-shadow-sm", border: "border-emerald-500/20", ring: "ring-emerald-400/50", watermark: "opacity-[0.05]", bg: "bg-emerald-950/30" },
  }
};

// ─── UTILITIES ─────────────────────────────────────────────────────────────

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

function getCurrentPhase(events: any[]) {
  const phaseEvent = events.find((e) => e.message.startsWith("PHASE_CHANGE:"));
  return phaseEvent ? phaseEvent.message.replace("PHASE_CHANGE:", "") : "Testing";
}

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

// ─── MAIN SCOREBOARD COMPONENT ─────────────────────────────────────────────

function Scoreboard() {
  const { state, socket } = useMockWebSocket();
  useTick(1000);

  // Persistent Theme State
  const [themeId, setThemeId] = useState<string>("default");
  useEffect(() => {
    const saved = localStorage.getItem("ds-scoreboard-theme");
    if (saved && THEMES[saved]) setThemeId(saved);
  }, []);

  const changeTheme = (newId: string) => {
    setThemeId(newId);
    localStorage.setItem("ds-scoreboard-theme", newId);
  };

  const theme = THEMES[themeId] || THEMES.default;

  useEffect(() => {
    void socket.refreshMatchSlots();
    void socket.refreshTournaments?.();
    const id = setInterval(() => {
      void socket.refreshMatchSlots();
      void socket.refreshTournaments?.();
    }, 1000);
    
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void socket.refreshMatchSlots();
        void socket.refreshTournaments?.();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [socket]);

  const slots: MatchSlot[] = Array.isArray(state.matches) && state.matches.length === 2
    ? state.matches
    : [initialState.matches[0], initialState.matches[1]];

  const teams = Array.isArray(state.teams) ? state.teams : [];
  const tournaments = Array.isArray(state.tournaments) ? state.tournaments : [];

  const visibleSlots = slots.filter((slot) => slot.visibleOnScoreboard);
  const anyLive = visibleSlots.some((slot) => slot.match.status === "live" || slot.match.status === "paused");

  const configSlot = slots.find(s => s.slotId === 1) || slots[0];
  const scoreboardMode = configSlot.scoreboardMode || "courts";
  const scoreboardTournamentId = configSlot.scoreboardTournamentId;

  return (
    <div className={cn("flex min-h-screen flex-col font-sans transition-all duration-700", theme.appBg, theme.textMain)}>
      <header className={cn("flex items-center justify-between px-6 py-4 shadow-sm transition-all duration-700", theme.headerBg, theme.border)}>
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold uppercase tracking-tight drop-shadow-sm">
            Drone Soccer Arena
          </h1>
          <div className="hidden items-center gap-2 md:flex">
            <span className={cn("flex h-2 w-2 rounded-full shadow-[0_0_5px_currentColor]", anyLive ? "animate-pulse bg-emerald-500" : "bg-slate-500")} />
            <span className={cn("text-xs font-bold uppercase tracking-widest", anyLive ? "text-emerald-500" : theme.textMuted)}>
              {anyLive ? "Live" : "Standby"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className={cn("size-4", theme.textMuted)} />
            <select
              className={cn("text-xs font-bold uppercase tracking-widest rounded-md px-2 py-1 outline-none cursor-pointer backdrop-blur-md transition-all duration-500", theme.cardBg, theme.textMuted, theme.border)}
              value={themeId}
              onChange={(e) => changeTheme(e.target.value)}
            >
              {Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <div className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest", theme.textMuted)}>
            <Radio className="size-4" strokeWidth={2.5} />
            <span>{visibleSlots.length === 2 ? "2 Courts" : visibleSlots.length === 1 ? "1 Court" : "No Court Open"}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className={cn("mx-auto flex w-full flex-col gap-8", (scoreboardMode === "courts" && visibleSlots.length === 2) ? "max-w-7xl" : "max-w-6xl")}>
          {scoreboardMode === "courts" && visibleSlots.length === 0 && <EmptyBoardState theme={theme} />}

          {scoreboardMode === "courts" && visibleSlots.length === 1 && (
            <MatchBoard slot={visibleSlots[0] as MatchSlot} teams={teams} tournaments={tournaments} size="full" theme={theme} />
          )}

          {scoreboardMode === "courts" && visibleSlots.length === 2 && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              {visibleSlots.map((slot) => (
                <MatchBoard key={slot.slotId} slot={slot} teams={teams} tournaments={tournaments} size="split" theme={theme} />
              ))}
            </div>
          )}

          {scoreboardMode === "bracket" && scoreboardTournamentId && (
            <BracketBoard 
              tournament={tournaments.find(t => t.id === scoreboardTournamentId)!} 
              teams={teams} 
              slots={slots}
              theme={theme} 
            />
          )}

          {scoreboardMode === "group" && scoreboardTournamentId && (
            <GroupBoard 
              tournament={tournaments.find(t => t.id === scoreboardTournamentId)!} 
              teams={teams} 
              slots={slots}
              theme={theme} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyBoardState({ theme }: { theme: ThemeDef }) {
  return (
    <div className={cn("mt-16 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-16 text-center shadow-sm transition-all duration-700", theme.cardBg, theme.border)}>
      <span className={cn("flex h-3 w-3 rounded-full opacity-30", theme.textMuted)} />
      <h2 className={cn("text-xl font-bold uppercase tracking-widest", theme.textMuted)}>Waiting for a match</h2>
      <p className={cn("max-w-sm text-sm opacity-80", theme.textMuted)}>
        Open Match Control on the referee dashboard and switch on "Show on Scoreboard" for a court to see it appear here.
        Up to two courts can be shown at once.
      </p>
    </div>
  );
}

// ─── COURT BOARD ───────────────────────────────────────────────────────────

function MatchBoard({
  slot,
  teams,
  tournaments,
  size,
  theme,
}: {
  slot: MatchSlot;
  teams: any[];
  tournaments: Tournament[];
  size: "full" | "split";
  theme: ThemeDef;
}) {
  const [isSwapped, setIsSwapped] = useState(false);
  const [colorScheme, setColorScheme] = useState<"default" | "swappedColors">("default");

  const isFull = size === "full";

  const m = slot.match;
  const events = Array.isArray(slot.events) ? slot.events : [];
  
  const displayEvents = events.filter((evt) => !evt.message.startsWith("PHASE_CHANGE:") && !evt.message.startsWith("PHASE_END:"));

  const activeTournament = tournaments.find((t) => t.matches.some((tm) => tm.id === m.id));
  
  const currentPhase = getCurrentPhase(events);
  let activeDurationMinutes = 3; 
  if (activeTournament) {
    if (currentPhase === "Testing") activeDurationMinutes = activeTournament.warmupDurationMinutes ?? 5;
    else if (currentPhase === "Half Time") activeDurationMinutes = activeTournament.halftimeDurationMinutes ?? 2;
    else if (currentPhase === "Overtime") activeDurationMinutes = activeTournament.overtimeDurationMinutes ?? 3;
    else activeDurationMinutes = activeTournament.halfDurationMinutes ?? 5;
  }

  const MATCH_DURATION_MS = activeDurationMinutes * 60 * 1000;

  const elapsedMs = useMatchClock(m.elapsedMs, m.runningSince);
  const remainingMs = Math.max(0, MATCH_DURATION_MS - elapsedMs);

  const teamAInfo = getTeamDetailsByName(m.teamAName, teams);
  const teamBInfo = getTeamDetailsByName(m.teamBName, teams);

  const rawPenaltiesA = Array.isArray(m.penalties) ? m.penalties.filter((p) => p.side === "A") : [];
  const rawPenaltiesB = Array.isArray(m.penalties) ? m.penalties.filter((p) => p.side === "B") : [];

  const penaltiesA = calculateEffectivePenalties(rawPenaltiesA);
  const penaltiesB = calculateEffectivePenalties(rawPenaltiesB);

  const tMatch = activeTournament?.matches.find((tm) => tm.id === m.id);
  const maxRound = activeTournament ? Math.max(...activeTournament.matches.map((tm) => tm.round)) : 1;
  const currentRound = tMatch?.round || 1;
  const matchTitle = activeTournament ? getMatchTitle(currentRound, maxRound) : "Friendly Match";
  const tournamentName = activeTournament ? activeTournament.name : "Exhibition";

  const scoreTextClass = isFull ? "text-[12rem]" : "text-[5rem]";
  const watermarkTextClass = isFull ? "text-[12rem]" : "text-[8rem]";
  const clockTextClass = isFull ? "text-[8rem]" : "text-[5rem]";
  const panelPadding = isFull ? "p-8" : "p-5";

  // Link Swapping state to the Theme Engine colors
  const leftColorTheme = colorScheme === "default" ? theme.teamA : theme.teamB;
  const rightColorTheme = colorScheme === "default" ? theme.teamB : theme.teamA;

  const leftTeamName = isSwapped ? m.teamBName : m.teamAName;
  const leftScore = isSwapped ? m.scoreB : m.scoreA;
  const leftInfo = isSwapped ? teamBInfo : teamAInfo;
  const leftPenalties = isSwapped ? penaltiesB : penaltiesA;

  const rightTeamName = isSwapped ? m.teamAName : m.teamBName;
  const rightScore = isSwapped ? m.scoreA : m.scoreB;
  const rightInfo = isSwapped ? teamAInfo : teamBInfo;
  const rightPenalties = isSwapped ? penaltiesA : penaltiesB;

  const isFinished = m.status === "finished";
  const leftIsWinner = isFinished && ((leftScore > rightScore && !rightPenalties.isDisqualified) || (rightPenalties.isDisqualified && !leftPenalties.isDisqualified));
  const rightIsWinner = isFinished && ((rightScore > leftScore && !leftPenalties.isDisqualified) || (leftPenalties.isDisqualified && !rightPenalties.isDisqualified));
  const winnerName = leftIsWinner ? leftTeamName : rightIsWinner ? rightTeamName : null;

  const firstHalfEndEvent = events.find((evt) => evt.message === "PHASE_END:1st Half");
  const finalPhaseEnded = (currentPhase === "2nd Half" || currentPhase === "Overtime") && remainingMs === 0 && (m.status === "paused" || isFinished);
  const finalPauseEvent = events.find((evt) => evt.type === "match_paused" && evt.message === "Match paused");
  const isHalfTimeNotice = currentPhase === "Half Time" && Boolean(firstHalfEndEvent);
  const isTimesUpNotice = finalPhaseEnded && Boolean(finalPauseEvent);
  const showWinner = isFinished && Boolean(winnerName);
  const showTimeUpNotice = !showWinner && (isHalfTimeNotice || isTimesUpNotice);
  const noticeTitle = isHalfTimeNotice ? "HALF TIME" : "TIME'S UP";
  const noticeSubtitle = isHalfTimeNotice ? "The first half has ended" : "The match has ended";

  const renderTeamPanel = (teamName: string, score: number, info: any, penalties: any, colorTheme: typeof theme.teamA, isWinner: boolean) => {
    return (
      <div className="flex flex-col gap-4">
        <div className={cn(
          "relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border flex-1 transition-all duration-700 backdrop-blur-md", 
          panelPadding, theme.cardBg, colorTheme.bg, 
          isWinner ? `ring-2 border-transparent ${colorTheme.ring}` : colorTheme.border
        )}>
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
            {info.logo ? (
              <img src={info.logo} className={cn("h-full w-full object-contain transition-all duration-700", colorTheme.watermark)} alt="" />
            ) : (
              <span className={cn("font-black leading-none transition-all duration-700", watermarkTextClass, theme.textMain, colorTheme.watermark)}>{info.initials}</span>
            )}
          </div>
          <h3 className={cn("relative z-10 font-bold text-center drop-shadow-sm transition-colors duration-700", colorTheme.text, isFull ? "text-2xl" : "text-xl")}>{teamName}</h3>
          <p className={cn("relative z-10 mt-4 font-mono font-bold leading-none tabular-nums drop-shadow-md transition-colors duration-700", colorTheme.text, scoreTextClass)}>
            {score.toString().padStart(2, '0')}
          </p>
          <div className="relative z-10 mt-6 flex min-h-[2rem] items-center justify-center gap-2">
            {penalties.isDisqualified ? (
              <span className="rounded bg-destructive/20 px-4 py-1 text-sm font-bold tracking-widest text-destructive border border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">DISQUALIFIED</span>
            ) : (
              penalties.badges.map((b: string, i: number) => (
                <span key={i} className={cn("h-8 w-6 rounded-sm shadow-md border border-black/10 backdrop-blur-sm", b === "Yellow" ? "bg-amber-400" : "bg-slate-500/80")} />
              ))
            )}
          </div>
        </div>
        
        {isWinner && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-6 py-2 text-base font-bold tracking-widest text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] backdrop-blur-md">
              <Trophy className="size-5" /> MATCH WINNER
            </div>
          </div>
        )}
      </div>
    );
  };

  const EventLogPanel = (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border transition-all duration-700 backdrop-blur-md", theme.cardBg, theme.border)}>
      <div className={cn("border-b px-4 py-3 bg-black/10 dark:bg-white/5", theme.border)}>
        <h3 className={cn("text-xs font-bold uppercase tracking-widest drop-shadow-sm", theme.textMuted)}>Event Log</h3>
      </div>
      <div className="flex flex-col gap-3 overflow-hidden p-4">
        {displayEvents.length === 0 ? (
          <p className={cn("py-6 text-center text-sm", theme.textMuted)}>No match events yet.</p>
        ) : (
          displayEvents.slice(0, isFull ? 4 : 3).map((evt) => {
            const isTeamA = m.teamAName && evt.message.includes(m.teamAName);
            const isTeamB = m.teamBName && evt.message.includes(m.teamBName);

            let side: 'left' | 'right' | 'center' = 'center';
            if (isTeamA && !isTeamB) side = isSwapped ? 'right' : 'left';
            else if (isTeamB && !isTeamA) side = isSwapped ? 'left' : 'right';

            let uiType: 'goal' | 'penalty' | 'system' = 'system';
            let penaltyLevel: 'warning' | 'yellow' | 'red' | null = null;

            if (evt.type === 'score_changed') uiType = 'goal';
            else if (evt.type === 'penalty_issued') {
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
                theme={theme}
              />
            );
          })
        )}
      </div>
    </div>
  );

  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);

  useEffect(() => {
    if (winnerName) {
      setShowWinnerOverlay(true);
      const timer = setTimeout(() => setShowWinnerOverlay(false), 6000);
      return () => clearTimeout(timer);
    } else {
      setShowWinnerOverlay(false);
    }
  }, [winnerName]);

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all duration-700 backdrop-blur-md shadow-sm", theme.teamA.text, theme.teamA.border, theme.cardBg)}>
          <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_5px_currentColor]", (m.status === "live" || m.status === "paused") ? "animate-pulse bg-emerald-500" : "bg-slate-500")} />
          Court {slot.slotId} — {currentPhase}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setColorScheme(colorScheme === "default" ? "swappedColors" : "default")}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-700 hover:brightness-110 backdrop-blur-md", theme.cardBg, theme.border, theme.textMuted)}
            title="Toggle panel color (Blue / Red)"
          >
            <Palette className="size-4" strokeWidth={2.5} />
            <span>Swap Color</span>
          </button>
          <button
            onClick={() => setIsSwapped(!isSwapped)}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-700 hover:brightness-110 backdrop-blur-md", theme.cardBg, theme.border, theme.textMuted)}
            title="Swap team sides visually"
          >
            <ArrowLeftRight className="size-4" strokeWidth={2.5} />
            <span>Swap Sides</span>
          </button>
        </div>
      </div>

      <div className="text-center drop-shadow-sm">
        <h2 className={cn("font-bold uppercase tracking-widest", isFull ? "text-3xl" : "text-xl")}>{matchTitle}</h2>
        <p className={cn("mt-1 text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>{tournamentName}</p>
      </div>

      <div className={cn("flex flex-col items-center justify-center rounded-xl border p-6 shadow-sm transition-all duration-700 backdrop-blur-md", theme.cardBg, theme.border)}>
        <p className={cn("font-mono font-bold tabular-nums", theme.clock, clockTextClass)}>
          {formatClock(remainingMs)}
        </p>
        <p className={cn("mt-2 text-xs font-bold uppercase tracking-widest drop-shadow-sm", theme.textMuted)}>{currentPhase} Time Remaining</p>
      </div>

      <div className={cn("grid gap-6 items-stretch", isFull ? "md:grid-cols-[1fr_2fr_1fr]" : "sm:grid-cols-2")}>
        {renderTeamPanel(leftTeamName, leftScore, leftInfo, leftPenalties, leftColorTheme, leftIsWinner)}
        {isFull && EventLogPanel}
        {renderTeamPanel(rightTeamName, rightScore, rightInfo, rightPenalties, rightColorTheme, rightIsWinner)}
      </div>

      {!isFull && EventLogPanel}

      {showTimeUpNotice && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950/70 p-6 text-center backdrop-blur-md animate-in fade-in duration-500">
          <div className={cn(
            "relative w-full max-w-xl overflow-hidden rounded-2xl border-2 bg-slate-950/95 px-8 py-10 text-white shadow-2xl sm:px-12 animate-in zoom-in-95 duration-500",
            isHalfTimeNotice ? "border-amber-400/60 shadow-[0_0_40px_rgba(251,191,36,0.2)]" : "border-red-400/60 shadow-[0_0_40px_rgba(248,113,113,0.2)]",
          )}>
            <div className={cn("absolute inset-x-0 top-0 h-2", isHalfTimeNotice ? "bg-amber-400" : "bg-red-500")} />
            <div className={cn(
              "mx-auto flex size-16 items-center justify-center rounded-full border-2",
              isHalfTimeNotice ? "border-amber-400/60 bg-amber-400/15 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]" : "border-red-400/60 bg-red-500/15 text-red-300 shadow-[0_0_15px_rgba(248,113,113,0.3)]",
            )}>
              <Timer className="size-8" strokeWidth={2.5} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-white/70">Match Status</p>
            <p className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-6xl drop-shadow-md">{noticeTitle}</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-base">{noticeSubtitle}</p>
            <div className={cn("mx-auto mt-7 h-1 w-24 rounded-full", isHalfTimeNotice ? "bg-amber-400" : "bg-red-500")} />
          </div>
        </div>
      )}
      

      {/* Broadcast-Style Winner Graphic */}
      {showWinnerOverlay && winnerName && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-xl bg-black/50 backdrop-blur-md animate-in fade-in duration-700">
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-slate-950/90 to-black/90 px-12 py-10 shadow-[0_0_80px_-15px_rgba(16,185,129,0.5)] animate-in zoom-in-90 slide-in-from-bottom-8 duration-700 ease-out backdrop-blur-xl">
            
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent opacity-100 rounded-2xl" />

            <div className="relative z-10 mb-5 flex size-20 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md">
              <Trophy className="size-10 text-emerald-400 drop-shadow-md" strokeWidth={1.5} />
            </div>

            <p className="relative z-10 text-xs font-bold uppercase tracking-[0.4em] text-emerald-100/60">
              Match Concluded
            </p>

            <h2 className="relative z-10 mt-2 text-center text-4xl font-black uppercase tracking-tight text-white sm:text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {winnerName}
            </h2>

            <div className="relative z-10 mt-6 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-emerald-500/80" />
              <span className="text-sm font-black uppercase tracking-[0.3em] text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                Winner
              </span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-emerald-500/80" />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// --- UTILITY UI COMPONENTS ---

function EventLogItem({ type, penaltyLevel, message, time, side, theme }: { type: 'goal' | 'penalty' | 'system' | 'phase' | 'phase_end', penaltyLevel?: 'warning' | 'yellow' | 'red' | null, message: string, time: string, side: 'left' | 'right' | 'center', theme: ThemeDef }) {
  let colorClass = `bg-black/5 dark:bg-white/5 ${theme.border}`;
  let indicatorColor = theme.textMuted;

  if (type === 'phase_end') {
    colorClass = 'border-red-500/30 text-red-700 dark:text-red-400 bg-red-500/10 font-bold shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]';
    indicatorColor = 'text-red-500';
  } else if (type === 'phase') {
    colorClass = 'border-indigo-500/30 text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 font-bold shadow-[inset_0_0_10px_rgba(99,102,241,0.05)]';
    indicatorColor = 'text-indigo-500';
  } else if (type === 'goal') {
    if (message.includes('OWN GOAL')) {
      colorClass = 'border-red-500/30 text-red-700 dark:text-red-500 bg-red-500/10 font-bold shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]';
      indicatorColor = 'text-red-600 dark:text-red-500';
    } else {
      colorClass = 'border-emerald-500/30 text-emerald-700 dark:text-emerald-500 bg-emerald-500/10 font-bold shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]';
      indicatorColor = 'text-emerald-600 dark:text-emerald-500';
    }
  } else if (type === 'penalty') {
    if (penaltyLevel === 'warning') {
      colorClass = 'border-slate-400/30 text-slate-700 dark:text-slate-300 bg-slate-500/10 font-bold shadow-[inset_0_0_10px_rgba(100,116,139,0.05)]';
      indicatorColor = 'text-slate-500';
    } else if (penaltyLevel === 'yellow') {
      colorClass = 'border-amber-500/40 text-amber-700 dark:text-amber-500 bg-amber-500/10 font-bold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]';
      indicatorColor = 'text-amber-600 dark:text-amber-500';
    } else if (penaltyLevel === 'red') {
      colorClass = 'border-red-500/30 text-red-700 dark:text-red-500 bg-red-500/10 font-bold shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]';
      indicatorColor = 'text-red-600 dark:text-red-500';
    }
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 backdrop-blur-sm transition-colors duration-500 ${colorClass}`}>
      <div className="flex w-4 justify-start">
        {side === 'left' && <span className={indicatorColor}>◀</span>}
      </div>

      <div className="flex-1 text-center">
        <p className="text-sm uppercase tracking-wide drop-shadow-sm">
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

// ─── TOURNAMENT VIEWS ────────────────────────────────────────────────────────

function BracketBoard({ tournament, teams, slots, theme }: { tournament: Tournament; teams: any[]; slots: MatchSlot[]; theme: ThemeDef }) {
  const getTeamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? "—" : "TBD");
  
  const groupMatches = tournament.matches.filter(m => m.phase === "group");
  const knockoutMatches = tournament.matches.filter(m => m.phase !== "group");
  const isGroupStageInProgress = tournament.groupStageEnabled && groupMatches.some(m => !m.winnerId && m.result !== "draw");
  
  if (isGroupStageInProgress) {
    return (
      <div className={cn("flex flex-col gap-6 p-12 rounded-xl border backdrop-blur-xl transition-all duration-700 text-center", theme.cardBg, theme.border)}>
        <Trophy className={cn("size-16 mx-auto mb-4", theme.teamA.text)} />
        <h2 className={cn("text-4xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-2 text-xl font-semibold uppercase tracking-widest", theme.textMuted)}>Knockout Bracket</p>
        <p className={cn("mt-8 text-lg", theme.textMuted)}>The group stage is currently in progress. The bracket will be generated once all group matches have concluded.</p>
      </div>
    );
  }

  const rounds = Array.from(new Set(knockoutMatches.map(m => m.round))).sort((a, b) => a - b);
  const maxRound = Math.max(...rounds, 0);

  return (
    <div className={cn("flex flex-col gap-6 overflow-x-auto pb-4 p-8 rounded-xl border backdrop-blur-xl transition-all duration-700", theme.cardBg, theme.border)}>
      <div className={cn("text-center mb-4")}>
        <h2 className={cn("text-3xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-1 text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>Knockout Bracket</p>
      </div>

      <div className="flex items-center gap-16 min-w-max border-b border-border pb-3">
        {rounds.map((round) => (
          <div key={round} className="w-[320px] flex items-center justify-between">
            <span className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", theme.textMuted)}>
              <span className={cn("flex size-6 items-center justify-center rounded-full text-[11px] font-bold", theme.teamA.bg, theme.textMain)}>
                {round}
              </span>
              {getMatchTitle(round, maxRound)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-stretch gap-16 min-w-max py-2">
        {rounds.map((round) => {
          const matches = knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
          const pairs: TournamentMatch[][] = [];
          for (let i = 0; i < matches.length; i += 2) {
            const pair = [matches[i], matches[i + 1]].filter((m): m is TournamentMatch => Boolean(m));
            pairs.push(pair);
          }
          return (
            <div key={round} className="w-[320px] flex flex-col justify-around">
              {pairs.map((pair, pi) => (
                <div key={pi} className="relative flex flex-col justify-around h-full my-6">
                  {pair.map((m) => {
                    const displayTeamA = m.isBye && !m.teamAId ? "BYE" : getTeamName(m.teamAId);
                    const displayTeamB = m.isBye && !m.teamBId ? "BYE" : getTeamName(m.teamBId);
                    const isTeamAWinner = m.winnerId !== null && m.winnerId === m.teamAId;
                    const isTeamBWinner = m.winnerId !== null && m.winnerId === m.teamBId;
                    
                    const liveSlot = slots.find(s => s.match.id === m.id);
                    const scoreA = m.isBye ? "-" : (liveSlot ? liveSlot.match.scoreA : (m.scoreA !== undefined ? m.scoreA : "-"));
                    const scoreB = m.isBye ? "-" : (liveSlot ? liveSlot.match.scoreB : (m.scoreB !== undefined ? m.scoreB : "-"));
                    
                    return (
                      <div key={m.id} className="relative py-3 z-10">
                        <div className={cn("relative flex flex-col rounded-xl border p-4 shadow-sm transition-all", theme.appBg, theme.border)}>
                          <div className="flex flex-col gap-3">
                            <div className={cn("flex items-center justify-between rounded-lg px-4 py-3 text-base font-bold border", isTeamAWinner ? cn("border-transparent ring-1", theme.teamA.ring, theme.teamA.bg) : cn("bg-black/20", theme.border))}>
                              <span className={cn(displayTeamA === "BYE" ? "italic opacity-50" : "", isTeamAWinner ? theme.textMain : theme.textMuted)}>{displayTeamA}</span>
                              <span className={cn("font-mono text-lg", liveSlot ? "text-emerald-500 animate-pulse" : "")}>{scoreA}</span>
                            </div>
                            <div className={cn("flex items-center justify-between rounded-lg px-4 py-3 text-base font-bold border", isTeamBWinner ? cn("border-transparent ring-1", theme.teamB.ring, theme.teamB.bg) : cn("bg-black/20", theme.border))}>
                              <span className={cn(displayTeamB === "BYE" ? "italic opacity-50" : "", isTeamBWinner ? theme.textMain : theme.textMuted)}>{displayTeamB}</span>
                              <span className={cn("font-mono text-lg", liveSlot ? "text-emerald-500 animate-pulse" : "")}>{scoreB}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupBoard({ tournament, teams, slots, theme }: { tournament: Tournament; teams: any[]; slots: MatchSlot[]; theme: ThemeDef }) {
  const getTeamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? "—" : "TBD");
  
  const groupMatches = tournament.matches.filter((m) => m.phase === "group");
  const groupCount = tournament.groupCount ?? Math.max(1, ...groupMatches.map((m) => m.groupNumber ?? 1));
  const groups = Array.from({ length: groupCount }, (_, index) => groupMatches.filter((m) => m.groupNumber === index + 1));
  const qualifiers = tournament.qualifiersPerGroup ?? 2;
  const scoringSystem = tournament.groupScoringSystem ?? "three-one-zero";

  const buildStandings = (matches: TournamentMatch[]) => {
    const teamIds = new Set<string>();
    matches.forEach((m) => { if (m.teamAId) teamIds.add(m.teamAId); if (m.teamBId) teamIds.add(m.teamBId); });
    const stats = new Map<string, { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; pts: number }>();
    teamIds.forEach((id) => stats.set(id, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0 }));
    
    matches.forEach((m) => {
      // Use live scores if the match is currently running
      const liveSlot = slots.find(s => s.match.id === m.id);
      const isLive = Boolean(liveSlot);
      const isCompleted = m.winnerId !== null || m.result === "draw";
      
      if (!isCompleted && !isLive) return;
      
      const scoreA = liveSlot ? liveSlot.match.scoreA : (m.scoreA ?? 0);
      const scoreB = liveSlot ? liveSlot.match.scoreB : (m.scoreB ?? 0);
      
      const a = m.teamAId ? stats.get(m.teamAId) : undefined;
      const b = m.teamBId ? stats.get(m.teamBId) : undefined;
      
      if (a) { a.played++; a.gf += scoreA; a.ga += scoreB; }
      if (b) { b.played++; b.gf += scoreB; b.ga += scoreA; }
      
      // Points are only awarded for completed matches, not live ones
      if (isCompleted) {
        if (m.result === "draw" && scoringSystem !== "winner-only") {
          if (a) { a.draws++; a.pts += 1; }
          if (b) { b.draws++; b.pts += 1; }
        } else if (m.winnerId) {
          const w = stats.get(m.winnerId);
          const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
          const l = loserId ? stats.get(loserId) : undefined;
          if (w) { w.wins++; w.pts += 3; }
          if (l) { l.losses++; }
        }
      }
    });
    
    return [...stats.entries()]
      .sort(([, a], [, b]) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
      .map(([id, s], rank) => ({ id, rank: rank + 1, ...s }));
  };

  if (!tournament.groupStageEnabled) {
    return (
      <div className={cn("flex flex-col gap-6 p-12 rounded-xl border backdrop-blur-xl transition-all duration-700 text-center", theme.cardBg, theme.border)}>
        <Trophy className={cn("size-16 mx-auto mb-4", theme.teamA.text)} />
        <h2 className={cn("text-4xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-8 text-lg", theme.textMuted)}>This tournament does not have a group stage.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8 p-8 rounded-xl border backdrop-blur-xl transition-all duration-700", theme.cardBg, theme.border)}>
      <div className="text-center mb-4">
        <h2 className={cn("text-3xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-1 text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>Group Stage Standings</p>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {groups.map((matches, index) => {
          const standings = buildStandings(matches);
          return (
            <div key={index} className={cn("w-full sm:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] rounded-xl border overflow-hidden", theme.border)}>
              <div className={cn("px-4 py-3 border-b", theme.border, theme.headerBg)}>
                <h3 className={cn("text-sm font-bold uppercase tracking-widest", theme.textMain)}>
                  Group {String.fromCharCode(65 + index)}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("border-b text-[10px] font-bold uppercase tracking-wider", theme.border, theme.textMuted, "bg-black/10")}>
                      <th className="w-8 py-3 pl-4 text-center">#</th>
                      <th className="py-3 pl-2 text-left">Team</th>
                      <th className="w-8 py-3 text-center">P</th>
                      <th className="w-8 py-3 text-center">W</th>
                      <th className="w-8 py-3 text-center">D</th>
                      <th className="w-8 py-3 text-center">L</th>
                      <th className="w-10 py-3 text-center">GD</th>
                      <th className="w-10 py-3 pr-4 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => {
                      const isQualifying = row.rank <= qualifiers;
                      const gd = row.gf - row.ga;
                      return (
                        <tr key={row.id} className={cn("border-b last:border-0", theme.border, isQualifying ? "bg-emerald-500/10" : "")}>
                          <td className="py-3 pl-4 text-center">
                            <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-bold", isQualifying ? "bg-emerald-500 text-white" : cn("bg-black/20", theme.textMuted))}>
                              {row.rank}
                            </span>
                          </td>
                          <td className={cn("py-3 pl-2 font-bold text-left", theme.textMain)}>
                            {getTeamName(row.id)}
                          </td>
                          <td className={cn("py-3 text-center", theme.textMuted)}>{row.played}</td>
                          <td className={cn("py-3 text-center", theme.textMuted)}>{row.wins}</td>
                          <td className={cn("py-3 text-center", theme.textMuted)}>{row.draws}</td>
                          <td className={cn("py-3 text-center", theme.textMuted)}>{row.losses}</td>
                          <td className={cn("py-3 text-center font-mono", gd > 0 ? "text-emerald-500" : gd < 0 ? "text-red-500" : theme.textMuted)}>
                            {gd > 0 ? `+${gd}` : gd}
                          </td>
                          <td className={cn("py-3 pr-4 text-center font-bold text-base", theme.textMain)}>
                            {row.pts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}