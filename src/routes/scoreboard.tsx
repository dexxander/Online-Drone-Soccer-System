import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Palette, Radio, Sparkles, Timer, Trophy } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import { AVAILABLE_TEAMS, initialState } from "@/lib/store";
import type { MatchSlot, Tournament, TournamentMatch, MatchEventType } from "@/lib/types";
import { calculateEffectivePenalties } from "@/lib/penalties";
import { getMatchTitle, getCurrentPhase, eventLabel } from "@/lib/match-helpers";
import { LeaderboardBoard } from "@/components/scoreboard/LeaderboardBoard";
import { BracketBoard } from "@/components/scoreboard/BracketBoard";
import { GroupBoard } from "@/components/scoreboard/GroupBoard";
import { EmptyBoardState } from "@/components/scoreboard/EmptyBoardState";
import { MatchBoard } from "@/components/scoreboard/MatchBoard";
import { THEMES, type ThemeDef } from "@/lib/scoreboard-themes"; 
import { 
  buildLeaderboardRows, 
  sortLeaderboardRows, 
  usePenaltiesByMatch, 
  useLeaderboardStageSync, 
  type LeaderboardRow 
} from "@/lib/leaderboard";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — AW Drone Soccer Leagues System" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard with real-time scores, timer and penalties." },
    ],
  }),
  component: Scoreboard,
});

// ─── BACKGROUND EFFECTS ENGINE ─────────────────────────────────────────────

const PATTERNS: Record<string, { id: string; name: string; className: string }> = {
  none: { id: "none", name: "No Pattern", className: "" },
  grid: { 
    id: "grid", 
    name: "Cyber Grid", 
    className: "bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03] dark:opacity-[0.05]" 
  },
  dots: { 
    id: "dots", 
    name: "Dot Matrix", 
    className: "bg-[radial-gradient(currentColor_2px,transparent_2px)] bg-[size:1.5rem_1.5rem] opacity-[0.15] dark:opacity-[0.25]" 
  },
  scanlines: { 
    id: "scanlines", 
    name: "CRT Scanlines", 
    className: "bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[size:100%_4px]" 
  },
  stripes: { 
    id: "stripes", 
    name: "Danger Stripes", 
    className: "bg-[repeating-linear-gradient(45deg,currentColor,currentColor_2px,transparent_2px,transparent_16px)] opacity-[0.03] dark:opacity-[0.04]" 
  },
  vignette: {
    id: "vignette",
    name: "Dark Vignette",
    className: "bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] opacity-80 pointer-events-none"
  },
  crosshatch: {
    id: "crosshatch",
    name: "Solid Crosshatch",
    className: "bg-[linear-gradient(to_right,currentColor_2px,transparent_2px),linear-gradient(to_bottom,currentColor_2px,transparent_2px)] bg-[size:2rem_2rem] opacity-[0.12] dark:opacity-[0.25]"
  },
  radar: {
    id: "radar",
    name: "Radar Rings",
    className: "bg-[repeating-radial-gradient(circle_at_center,transparent_0,currentColor_2px,transparent_2px,transparent_4rem)] opacity-[0.15] dark:opacity-[0.25]"
  },
  checkerboard: {
    id: "checkerboard",
    name: "Retro Checkers",
    className: "bg-[repeating-conic-gradient(currentColor_0_25%,transparent_0_50%)] bg-[size:2rem_2rem] opacity-[0.03] dark:opacity-[0.06]"
  },
  dataTracks: {
    id: "dataTracks",
    name: "Data Tracks",
    className: "bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_2rem,currentColor_2rem,currentColor_2.15rem)] opacity-[0.15] dark:opacity-[0.25]"
  },
  starlight: {
    id: "starlight",
    name: "Starlight",
    className: "bg-[radial-gradient(currentColor_1px,transparent_1px),radial-gradient(currentColor_1px,transparent_1px)] bg-[size:3rem_3rem] bg-[position:0_0,1.5rem_1.5rem] opacity-[0.25] dark:opacity-[0.4]"
  },
  blueprint: {
    id: "blueprint",
    name: "Heavy Blueprint",
    className: "bg-[linear-gradient(to_right,currentColor_2px,transparent_2px),linear-gradient(to_bottom,currentColor_2px,transparent_2px)] bg-[size:5rem_5rem] opacity-[0.05] dark:opacity-[0.1]"
  },
  isometric: {
    id: "isometric",
    name: "Circuit Nodes",
    className: "bg-[radial-gradient(currentColor_3px,transparent_3px),linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.15] dark:opacity-[0.3]"
  },
  blinds: {
    id: "blinds",
    name: "Vertical Blinds",
    className: "bg-[repeating-linear-gradient(to_right,transparent_0,transparent_1rem,currentColor_1rem,currentColor_1.1rem)] opacity-[0.1] dark:opacity-[0.2]"
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

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

// ─── MAIN SCOREBOARD COMPONENT ─────────────────────────────────────────────

const defaultSyncState = {
  themeId: "default",
  patternId: "none",
  courtConfigs: {} as Record<string, { isSwapped: boolean; colorScheme: "default" | "swappedColors" }>
};

function Scoreboard() {
  const { state, socket } = useMockWebSocket();
  useTick(1000);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const tokenKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (tokenKey) {
          const sessionData = JSON.parse(localStorage.getItem(tokenKey) || "{}");
          const user = sessionData?.user;
          if (user) {
            const role = user?.app_metadata?.role || user?.user_metadata?.role;
            const hasAdminRole = role === 'admin' || role === 'referee';
            const allowedEmails = ['admin@dronesoccer.com', 'referee@kkhs.edu.my'];
            const hasAdminEmail = allowedEmails.includes(user.email);
            
            if (hasAdminRole || hasAdminEmail) {
              setIsAdmin(true);
              return;
            }
          }
        }
        setIsAdmin(false);
      } catch (err) {
        setIsAdmin(false);
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const [syncState, setSyncState] = useState(defaultSyncState);

  useEffect(() => {
    const saved = localStorage.getItem("ds-scoreboard-sync");
    if (saved) {
      try { setSyncState({ ...defaultSyncState, ...JSON.parse(saved) }); } catch (e) {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ds-scoreboard-sync" && e.newValue) {
        try { setSyncState({ ...defaultSyncState, ...JSON.parse(e.newValue) }); } catch (e) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateSyncState = (updates: Partial<typeof defaultSyncState>) => {
    if (!isAdmin) return; 
    setSyncState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem("ds-scoreboard-sync", JSON.stringify(next));
      return next;
    });
  };

  const updateCourtConfig = (slotId: string, updates: Partial<{ isSwapped: boolean; colorScheme: "default" | "swappedColors" }>) => {
    if (!isAdmin) return;
    setSyncState(prev => {
      const currentCourt = prev.courtConfigs[slotId] || { isSwapped: false, colorScheme: "default" };
      const next = {
        ...prev,
        courtConfigs: {
          ...prev.courtConfigs,
          [slotId]: { ...currentCourt, ...updates }
        }
      };
      localStorage.setItem("ds-scoreboard-sync", JSON.stringify(next));
      return next;
    });
  };

  const theme: ThemeDef = (THEMES[syncState.themeId] || THEMES['default']) as ThemeDef;
  const activePattern = (PATTERNS[syncState.patternId] || PATTERNS['none']) as typeof PATTERNS['none'];

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
  
  // Drives the entire dashboard. Synced from referee.tsx via websockets!
  const configSlot = slots.find(s => s.slotId === 1) || slots[0];
  
  // THE FIX: Unpack the mode and the stage cleanly
  const rawMode = configSlot?.scoreboardMode || "courts";
  const scoreboardMode = rawMode.startsWith("leaderboard") ? "leaderboard" : rawMode;
  const activeLeaderboardStage = rawMode === "leaderboard_knockout" ? "knockout" : "group";
  
  const scoreboardTournamentId = configSlot?.scoreboardTournamentId;
  const anyLive = visibleSlots.some((slot) => slot.match.status === "live" || slot.match.status === "paused");
  return (
    <div className={cn("relative z-0 flex min-h-screen flex-col font-sans transition-all duration-700", theme.appBg, theme.textMain)}>
      
      {/* GLOBAL BACKGROUND PATTERN LAYER */}
      <div className={cn("pointer-events-none absolute inset-0 transition-all duration-700", activePattern.className)} />

      <header className={cn("relative z-10 flex items-center justify-between px-6 py-4 shadow-sm transition-all duration-700", theme.headerBg, theme.border)}>
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold uppercase tracking-tight drop-shadow-sm">
            Drone Soccer Arena
          </h1>
          <div className="hidden items-center gap-2 md:flex">
            <span className={cn("flex h-2 w-2 rounded-full shadow-[0_0_5px_currentColor]", anyLive && scoreboardMode === "courts" ? "animate-pulse bg-emerald-500" : "bg-slate-500")} />
            <span className={cn("text-xs font-bold uppercase tracking-widest", anyLive && scoreboardMode === "courts" ? "text-emerald-500" : theme.textMuted)}>
              {scoreboardMode === "courts" ? (anyLive ? "Live" : "Standby") : "Tournament Mode"}
            </span>
          </div>
        </div>
        
        {isAdmin ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Palette className={cn("size-4", theme.textMuted)} />
              <select
                className={cn("text-xs font-bold uppercase tracking-widest rounded-md px-2 py-1 outline-none cursor-pointer backdrop-blur-md transition-all duration-500", theme.cardBg, theme.textMuted, theme.border)}
                value={syncState.themeId}
                onChange={(e) => updateSyncState({ themeId: e.target.value })}
              >
                {Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className={cn("size-4", theme.textMuted)} />
              <select
                className={cn("text-xs font-bold uppercase tracking-widest rounded-md px-2 py-1 outline-none cursor-pointer backdrop-blur-md transition-all duration-500", theme.cardBg, theme.textMuted, theme.border)}
                value={syncState.patternId}
                onChange={(e) => updateSyncState({ patternId: e.target.value })}
              >
                {Object.values(PATTERNS).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Radio className={cn("size-4 animate-pulse", theme.textMuted)} strokeWidth={2.5} />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", theme.textMuted)}>Live Broadcast</span>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 p-6">
        <div className={cn("mx-auto flex w-full flex-col gap-8 transition-all duration-500", (scoreboardMode === "courts" && visibleSlots.length === 2) ? "max-w-[100rem]" : "max-w-6xl")}>
          {scoreboardMode === "courts" && visibleSlots.length === 0 && <EmptyBoardState theme={theme} />}

          {scoreboardMode === "courts" && visibleSlots.length === 1 && visibleSlots[0] && (
            <MatchBoard 
              slot={visibleSlots[0]} 
              teams={teams} 
              tournaments={tournaments} 
              size="full" 
              theme={theme} 
              isAdmin={isAdmin} 
              courtConfig={syncState.courtConfigs[visibleSlots[0].slotId] as { isSwapped: boolean; colorScheme: "default" | "swappedColors" } | undefined}
              onUpdateConfig={(updates) => updateCourtConfig(String(visibleSlots[0]?.slotId ?? ""), updates)}
            />
          )}

          {scoreboardMode === "courts" && visibleSlots.length === 2 && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-16 2xl:gap-24 transition-all duration-500">
              {visibleSlots.map((slot) => (
                <MatchBoard 
                  key={slot.slotId} 
                  slot={slot} 
                  teams={teams} 
                  tournaments={tournaments} 
                  size="split" 
                  theme={theme} 
                  isAdmin={isAdmin}
                  courtConfig={syncState.courtConfigs[slot.slotId] as { isSwapped: boolean; colorScheme: "default" | "swappedColors" } | undefined}
                  onUpdateConfig={(updates) => updateCourtConfig(String(slot.slotId), updates)}
                />
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

          {scoreboardMode === "leaderboard" && scoreboardTournamentId && (
            <LeaderboardBoard 
              tournament={tournaments.find(t => t.id === scoreboardTournamentId)!} 
              teams={teams} 
              theme={theme} 
              activeStage={activeLeaderboardStage} 
            />
          )}
        </div>
      </main>
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