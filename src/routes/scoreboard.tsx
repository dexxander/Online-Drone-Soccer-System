import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Palette, Radio, Sparkles, Timer, Trophy, MonitorSmartphone, GitMerge, LayoutGrid, ShieldAlert, AlertCircle } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { cn } from "@/lib/utils";
import { AVAILABLE_TEAMS, initialState } from "@/lib/store";
import type { MatchSlot, Tournament, TournamentMatch, MatchEventType } from "@/lib/types";
import { calculateEffectivePenalties } from "@/lib/penalties";

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
    className: "bg-[radial-gradient(currentColor_2px,transparent_2px)] bg-[length:2.5rem_2.5rem] opacity-[0.04] dark:opacity-[0.07]" 
  },
  scanlines: { 
    id: "scanlines", 
    name: "CRT Scanlines", 
    className: "bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px]" 
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
  stars: { 
    id: "stars", 
    name: "Blinking Stars", 
    className: "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ccircle cx='20' cy='30' r='1' fill='%23fff' opacity='0.5'/%3E%3Ccircle cx='80' cy='120' r='1.5' fill='%23fff' opacity='0.8'/%3E%3Ccircle cx='150' cy='60' r='1' fill='%23fff' opacity='0.3'/%3E%3Ccircle cx='110' cy='170' r='2' fill='%23fff' opacity='0.6'/%3E%3Ccircle cx='180' cy='10' r='1' fill='%23fff' opacity='0.9'/%3E%3Ccircle cx='50' cy='180' r='1.5' fill='%23fff' opacity='0.4'/%3E%3C/svg%3E\")] animate-pulse opacity-40 dark:opacity-60" 
  },
  bubbles: { 
    id: "bubbles", 
    name: "Floating Bubbles", 
    className: "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='25' cy='25' r='10' fill='none' stroke='%23fff' stroke-width='1' opacity='0.2'/%3E%3Ccircle cx='75' cy='75' r='15' fill='none' stroke='%23fff' stroke-width='1' opacity='0.15'/%3E%3Ccircle cx='80' cy='20' r='5' fill='none' stroke='%23fff' stroke-width='1' opacity='0.25'/%3E%3Ccircle cx='20' cy='80' r='8' fill='none' stroke='%23fff' stroke-width='1' opacity='0.1'/%3E%3C/svg%3E\")] opacity-40 dark:opacity-60" 
  },
  circuit: { 
    id: "circuit", 
    name: "Copper Circuits", 
    className: "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cpath d='M10 10h20v20H10z' fill='none' stroke='%23fff' stroke-width='1' opacity='0.15'/%3E%3Cpath d='M30 20h20l20 20v20m-40-40l-20 20v20' fill='none' stroke='%23fff' stroke-width='1' opacity='0.15'/%3E%3Ccircle cx='70' cy='60' r='2' fill='%23fff' opacity='0.15'/%3E%3Ccircle cx='10' cy='60' r='2' fill='%23fff' opacity='0.15'/%3E%3C/svg%3E\")] opacity-50 dark:opacity-70" 
  },
  hexagons: { 
    id: "hexagons", 
    name: "Hexagon Grid", 
    className: "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z' fill='%23fff' fill-opacity='0.05'/%3E%3C/svg%3E\")] opacity-60 dark:opacity-80" 
  }
};

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
    clock: "text-slate-900 dark:text-white font-black drop-shadow-md",
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
    appBg: "bg-gradient-to-tr from-red-200/80 via-slate-50 to-blue-200/80 dark:from-red-950/80 dark:via-slate-950 dark:to-blue-950/80",
    headerBg: "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-b-white/50 dark:border-b-white/10 shadow-sm",
    cardBg: "bg-white/50 dark:bg-black/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
    border: "border-white/60 dark:border-white/10 border-t-white/90 dark:border-t-white/20",
    textMain: "text-slate-900 dark:text-slate-100",
    textMuted: "text-slate-600 dark:text-slate-400",
    clock: "text-slate-900 dark:text-white font-black drop-shadow-md",
    teamA: { text: "text-blue-700 dark:text-blue-400 drop-shadow-sm", border: "border-blue-300/70 dark:border-blue-500/40 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]", ring: "ring-blue-500/60", watermark: "opacity-[0.08]", bg: "bg-blue-500/10 dark:bg-blue-900/30" },
    teamB: { text: "text-red-700 dark:text-red-400 drop-shadow-sm", border: "border-red-300/70 dark:border-red-500/40 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]", ring: "ring-red-500/60", watermark: "opacity-[0.08]", bg: "bg-red-500/10 dark:bg-red-900/30" },
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

function getMatchTitle(round: number, maxRound: number, phase?: string) {
  if (phase === "group") return "Group Stage";
  if (maxRound === 1) return "Exhibition Match";
  if (round === maxRound) return "Grand Final";
  if (round === maxRound - 1) return "Semi-Finals";
  if (round === maxRound - 2) return "Quarter-Finals";
  return `Round ${round}`;
}

function getCurrentPhase(events: any[]) {
  const phaseEvent = events.find((e: any) => e.message.startsWith("PHASE_CHANGE:"));
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
  const scoreboardMode = configSlot?.scoreboardMode || "courts";
  const scoreboardTournamentId = configSlot?.scoreboardTournamentId;
  const anyLive = visibleSlots.some((slot) => slot.match.status === "live" || slot.match.status === "paused");

  return (
    <div className={cn("relative z-0 flex min-h-screen flex-col font-sans transition-all duration-700", theme.appBg, theme.textMain)}>
      
      {/* GLOBAL BACKGROUND PATTERN LAYER */}
      <div className={cn("pointer-events-none absolute inset-0 z-[-1] transition-all duration-700", activePattern.className)} />

      <header className={cn("flex items-center justify-between px-6 py-4 shadow-sm transition-all duration-700", theme.headerBg, theme.border)}>
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

      <main className="flex-1 p-6">
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
        </div>
      </main>
    </div>
  );
}

// ─── TOURNAMENT VIEWER COMPONENTS ──────────────────────────────────────────

function BracketBoard({ tournament, teams, slots, theme }: { tournament: Tournament; teams: any[]; slots: MatchSlot[]; theme: ThemeDef }) {
  const getTeamName = (id: string | null) => (id ? teams.find((t: any) => t.id === id)?.name ?? "—" : "TBD");
  
  const groupMatches = tournament.matches?.filter((m: TournamentMatch) => m.phase === "group") ?? [];
  const knockoutMatches = tournament.matches?.filter((m: TournamentMatch) => m.phase !== "group") ?? [];
  const isGroupStageInProgress = tournament.groupStageEnabled && groupMatches.some((m: TournamentMatch) => !m.winnerId && m.result !== "draw");
  
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

  const rounds: number[] = Array.from(new Set(knockoutMatches.map((m: TournamentMatch) => m.round))).sort((a, b) => a - b);
  const maxRound = Math.max(...rounds, 0);

  return (
    <div className={cn("flex flex-col gap-6 overflow-x-auto pb-4 p-8 rounded-xl border backdrop-blur-xl transition-all duration-700", theme.cardBg, theme.border)}>
      <div className={cn("text-center mb-4")}>
        <h2 className={cn("text-3xl font-black uppercase tracking-widest drop-shadow-sm", theme.textMain)}>{tournament.name}</h2>
        <p className={cn("mt-1 text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>Knockout Bracket</p>
      </div>

      <div className="flex items-center gap-16 min-w-max border-b border-border pb-3">
        {rounds.map((round: number) => (
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
        {rounds.map((round: number) => {
          const matches = knockoutMatches.filter((m: TournamentMatch) => m.round === round).sort((a: TournamentMatch, b: TournamentMatch) => a.slot - b.slot);
          const pairs: TournamentMatch[][] = [];
          for (let i = 0; i < matches.length; i += 2) {
            const pair = [matches[i], matches[i + 1]].filter((m): m is TournamentMatch => Boolean(m));
            pairs.push(pair);
          }
          return (
            <div key={round} className="w-[320px] flex flex-col justify-around">
              {pairs.map((pair: TournamentMatch[], pi: number) => (
                <div key={pi} className="relative flex flex-col justify-around h-full my-6">
                  {pair.map((m: TournamentMatch) => {
                    const displayTeamA = m.isBye && !m.teamAId ? "BYE" : getTeamName(m.teamAId);
                    const displayTeamB = m.isBye && !m.teamBId ? "BYE" : getTeamName(m.teamBId);
                    const isTeamAWinner = m.winnerId !== null && m.winnerId === m.teamAId;
                    const isTeamBWinner = m.winnerId !== null && m.winnerId === m.teamBId;
                    
                    const liveSlot = slots.find((s: MatchSlot) => s.match.id === m.id);
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
  const getTeamName = (id: string | null) => (id ? teams.find((t: any) => t.id === id)?.name ?? "—" : "TBD");
  
  const groupMatches = tournament.matches?.filter((m: TournamentMatch) => m.phase === "group") ?? [];
  const groupCount = tournament.groupCount ?? Math.max(1, ...groupMatches.map((m: TournamentMatch) => m.groupNumber ?? 1));
  const groups = Array.from({ length: groupCount }, (_, index) => groupMatches.filter((m: TournamentMatch) => m.groupNumber === index + 1));
  const qualifiers = tournament.qualifiersPerGroup ?? 2;
  const scoringSystem = tournament.groupScoringSystem ?? "three-one-zero";

  const buildStandings = (matches: TournamentMatch[]) => {
    const teamIds = new Set<string>();
    matches.forEach((m: TournamentMatch) => { if (m.teamAId) teamIds.add(m.teamAId); if (m.teamBId) teamIds.add(m.teamBId); });
    const stats = new Map<string, { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; pts: number }>();
    teamIds.forEach((id: string) => stats.set(id, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0 }));
    
    matches.forEach((m: TournamentMatch) => {
      const liveSlot = slots.find((s: MatchSlot) => s.match.id === m.id);
      const isLive = Boolean(liveSlot);
      const isCompleted = m.winnerId !== null || m.result === "draw";
      
      if (!isCompleted && !isLive) return;
      
      const scoreA = liveSlot ? liveSlot.match.scoreA : (m.scoreA ?? 0);
      const scoreB = liveSlot ? liveSlot.match.scoreB : (m.scoreB ?? 0);
      
      const a = m.teamAId ? stats.get(m.teamAId) : undefined;
      const b = m.teamBId ? stats.get(m.teamBId) : undefined;
      
      if (a) { a.played++; a.gf += scoreA; a.ga += scoreB; }
      if (b) { b.played++; b.gf += scoreB; b.ga += scoreA; }
      
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
        <p className={cn("mt-1 text-sm font-semibold uppercase tracking-widest", theme.textMuted)}>Group Stage Overview</p>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {groups.map((matches: TournamentMatch[], index: number) => {
          const standings = buildStandings(matches);
          return (
            <div key={index} className={cn("w-full sm:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-1rem)] rounded-xl border overflow-hidden shadow-sm", theme.border, theme.cardBg)}>
              <div className={cn("px-4 py-3 border-b", theme.border, theme.headerBg)}>
                <h3 className={cn("text-sm font-bold uppercase tracking-widest", theme.textMain)}>
                  Group {String.fromCharCode(65 + index)}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("border-b text-[10px] font-bold uppercase tracking-wider", theme.border, theme.textMuted, "bg-black/10 dark:bg-white/5")}>
                      <th className="w-8 py-2.5 text-center">#</th>
                      <th className="py-2.5 pl-2 text-left">Team</th>
                      <th className="w-8 py-2.5 text-center">P</th>
                      <th className="w-8 py-2.5 text-center">W</th>
                      <th className="w-8 py-2.5 text-center">D</th>
                      <th className="w-8 py-2.5 text-center">L</th>
                      <th className="w-10 py-2.5 text-center">GD</th>
                      <th className="w-10 py-2.5 pr-4 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => {
                      const isQualifying = row.rank <= qualifiers;
                      const gd = row.gf - row.ga;
                      return (
                        <tr key={row.id} className={cn("border-b last:border-0", theme.border, isQualifying ? theme.teamA.bg : "bg-transparent")}>
                          <td className="py-2.5 pl-2 text-center">
                            <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-bold", isQualifying ? theme.teamA.text + " bg-black/20" : theme.textMuted)}>
                              {row.rank}
                            </span>
                          </td>
                          <td className={cn("py-2.5 pl-2 font-bold text-left", isQualifying ? theme.textMain : theme.textMuted)}>
                            {getTeamName(row.id)}
                          </td>
                          <td className={cn("py-2.5 text-center tabular-nums font-medium", theme.textMuted)}>{row.played}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-bold", theme.textMain)}>{row.wins}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-medium", theme.textMuted)}>{row.draws}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-medium", theme.textMuted)}>{row.losses}</td>
                          <td className={cn("py-2.5 text-center tabular-nums font-bold", gd > 0 ? "text-emerald-500" : gd < 0 ? "text-red-500" : theme.textMuted)}>
                            {gd > 0 ? `+${gd}` : gd}
                          </td>
                          <td className={cn("py-2.5 pr-4 text-center tabular-nums font-black text-lg", theme.textMain)}>{row.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── FIXTURES LIST UNDER THE STANDINGS ── */}
              <div className={cn("border-t px-4 py-3 bg-black/10 dark:bg-white/5", theme.border)}>
                <p className={cn("mb-3 text-[10px] font-bold uppercase tracking-widest", theme.textMuted)}>Fixtures</p>
                <div className="flex flex-col gap-2">
                  {matches.length === 0 ? (
                    <p className={cn("text-xs", theme.textMuted)}>No fixtures</p>
                  ) : matches.map((match: TournamentMatch) => {
                    const decided = !!match.winnerId || match.result === "draw";
                    const liveSlot = slots.find(s => s.match.id === match.id);
                    const scoreA = liveSlot ? liveSlot.match.scoreA : (match.scoreA ?? 0);
                    const scoreB = liveSlot ? liveSlot.match.scoreB : (match.scoreB ?? 0);
                    
                    return (
                      <div key={match.id} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs border", decided ? cn("bg-black/10 dark:bg-white/5", theme.border) : cn("bg-transparent", theme.border))}>
                        <span className={cn("flex-1 truncate text-right font-semibold", match.winnerId === match.teamAId ? theme.textMain : theme.textMuted)}>
                          {getTeamName(match.teamAId)}
                        </span>
                        
                        {decided ? (
                          <span className={cn("shrink-0 rounded px-2 py-1 text-[10px] font-bold tabular-nums border", theme.cardBg, theme.border, theme.textMain)}>
                            {scoreA} – {scoreB}
                          </span>
                        ) : (
                          <span className={cn("shrink-0 text-[10px] font-bold", theme.textMuted)}>vs</span>
                        )}

                        <span className={cn("flex-1 truncate font-semibold", match.winnerId === match.teamBId ? theme.textMain : theme.textMuted)}>
                          {getTeamName(match.teamBId)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EMPTY STATE AND LIVE COURTS ───────────────────────────────────────────

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

function MatchBoard({
  slot,
  teams,
  tournaments,
  size,
  theme,
  isAdmin,
  courtConfig,
  onUpdateConfig
}: {
  slot: MatchSlot;
  teams: any[];
  tournaments: Tournament[];
  size: "full" | "split";
  theme: ThemeDef;
  isAdmin: boolean;
  courtConfig: { isSwapped: boolean; colorScheme: "default" | "swappedColors" } | undefined;
  onUpdateConfig: (updates: { isSwapped?: boolean; colorScheme?: "default" | "swappedColors" }) => void;
}) {
  const isSwapped = courtConfig?.isSwapped ?? false;
  const colorScheme = courtConfig?.colorScheme ?? "default";
  const isFull = size === "full";

  const m = slot.match;
  const events = Array.isArray(slot.events) ? slot.events : [];
  
  const displayEvents = events.filter((evt: any) => !evt.message.startsWith("PHASE_CHANGE:") && !evt.message.startsWith("PHASE_END:"));
  const activeTournament = tournaments.find((t: Tournament) => t.matches?.some((tm: TournamentMatch) => tm.id === m.id));
  const tMatch = activeTournament?.matches?.find((tm: TournamentMatch) => tm.id === m.id);
  
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

  const rawPenaltiesA = Array.isArray(m.penalties) ? m.penalties.filter((p: any) => p.side === "A") : [];
  const rawPenaltiesB = Array.isArray(m.penalties) ? m.penalties.filter((p: any) => p.side === "B") : [];

  const penaltiesA = calculateEffectivePenalties(rawPenaltiesA);
  const penaltiesB = calculateEffectivePenalties(rawPenaltiesB);

  const maxRound = activeTournament ? Math.max(...(activeTournament.matches?.map((tm: TournamentMatch) => tm.round) ?? [1])) : 1;
  const currentRound = tMatch?.round || 1;
  
  const matchTitle = activeTournament ? getMatchTitle(currentRound, maxRound, tMatch?.phase) : "Friendly Match";
  const tournamentName = activeTournament ? activeTournament.name : "Exhibition";

  const scoreTextClass = isFull ? "text-[8rem]" : "text-[5rem]";
  const watermarkTextClass = isFull ? "text-[12rem]" : "text-[8rem]";
  const clockTextClass = isFull ? "text-7xl" : "text-5xl";
  const panelPadding = isFull ? "p-8" : "p-5";

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
  const isGroupPhase = tMatch?.phase === "group";

  const leftIsWinner = isFinished && ((leftScore > rightScore && !rightPenalties.isDisqualified) || (rightPenalties.isDisqualified && !leftPenalties.isDisqualified));
  const rightIsWinner = isFinished && ((rightScore > leftScore && !leftPenalties.isDisqualified) || (leftPenalties.isDisqualified && !rightPenalties.isDisqualified));
  
  const isDraw = isFinished && leftScore === rightScore && !leftPenalties.isDisqualified && !rightPenalties.isDisqualified && isGroupPhase;

  const matchResultTitle = leftIsWinner ? leftTeamName : rightIsWinner ? rightTeamName : isDraw ? "MATCH DRAWN" : null;

  const firstHalfEndEvent = events.find((evt: any) => evt.message === "PHASE_END:1st Half");
  const finalPhaseEnded = (currentPhase === "2nd Half" || currentPhase === "Overtime") && remainingMs === 0 && (m.status === "paused" || isFinished);
  const finalPauseEvent = events.find((evt: any) => evt.type === "match_paused" && evt.message === "Match paused");
  
  const isHalfTimeNotice = currentPhase === "Half Time" && Boolean(firstHalfEndEvent);
  const isTimesUpNotice = finalPhaseEnded && Boolean(finalPauseEvent);
  
  const showWinner = isFinished && Boolean(matchResultTitle);
  const showTimeUpNotice = !showWinner && (isHalfTimeNotice || isTimesUpNotice);
  
  const noticeTitle = isHalfTimeNotice ? "HALF TIME" : "TIME'S UP";
  const noticeSubtitle = isHalfTimeNotice ? "The first half has ended" : "The match has ended";

  const renderTeamPanel = (teamName: string, score: number, info: any, penalties: any, colorTheme: typeof theme.teamA, isWinner: boolean, isTeamDraw: boolean) => {
    return (
      <div className="flex flex-col gap-4">
        <div className={cn(
          "relative z-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border flex-1 transition-all duration-700 backdrop-blur-md", 
          panelPadding, theme.cardBg, colorTheme.bg, 
          isWinner ? `ring-2 border-transparent ${colorTheme.ring}` : 
          isTeamDraw ? `ring-2 border-transparent ring-amber-400/50` : colorTheme.border
        )}>
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-8">
            {info.logo ? (
              <img src={info.logo} className={cn("h-full w-full object-contain transition-all duration-700", colorTheme.watermark)} alt="" />
            ) : (
              <span className={cn("font-black leading-none transition-all duration-700", watermarkTextClass, theme.textMain, colorTheme.watermark)}>{info.initials}</span>
            )}
          </div>
          <h3 className={cn("relative z-10 font-bold text-center drop-shadow-sm transition-colors duration-700", colorTheme.text, isFull ? "text-3xl" : "text-2xl")}>{teamName}</h3>
          <p className={cn("relative z-10 mt-4 font-mono font-bold leading-none tabular-nums drop-shadow-md transition-colors duration-700", colorTheme.text, scoreTextClass)}>
            {score.toString().padStart(2, '0')}
          </p>
          <div className="relative z-10 mt-6 flex min-h-[2rem] items-center justify-center gap-2">
            {penalties.isDisqualified ? (
              <span className="rounded bg-destructive/20 px-4 py-1 text-sm font-bold tracking-widest text-destructive border border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">DISQUALIFIED</span>
            ) : (
              penalties.badges.map((b: string, i: number) => (
                <span key={`${b}-${i}`} className={cn("h-8 w-6 rounded-sm shadow-md border border-black/10 backdrop-blur-sm", b === "Yellow" ? "bg-amber-400" : "bg-slate-500/80")} />
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
        {isTeamDraw && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-6 py-2 text-base font-bold tracking-widest text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-md">
              <ArrowLeftRight className="size-5" /> DRAW
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
          displayEvents.slice(0, isFull ? 4 : 3).map((evt: any) => {
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
    let timer: NodeJS.Timeout;
    
    if (matchResultTitle) {
      setShowWinnerOverlay(true);
      timer = setTimeout(() => setShowWinnerOverlay(false), 6000);
    } else {
      setShowWinnerOverlay(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [matchResultTitle]);

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all duration-700 backdrop-blur-md shadow-sm", theme.teamA.text, theme.teamA.border, theme.cardBg)}>
          <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_5px_currentColor]", (m.status === "live" || m.status === "paused") ? "animate-pulse bg-emerald-500" : "bg-slate-500")} />
          Court {slot.slotId} — {currentPhase}
        </span>
        
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateConfig({ colorScheme: colorScheme === "default" ? "swappedColors" : "default" })}
              className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-700 hover:brightness-110 backdrop-blur-md", theme.cardBg, theme.border, theme.textMuted)}
              title="Toggle panel color (Blue / Red)"
            >
              <Palette className="size-4" strokeWidth={2.5} />
              <span>Swap Color</span>
            </button>
            <button
              onClick={() => onUpdateConfig({ isSwapped: !isSwapped })}
              className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-700 hover:brightness-110 backdrop-blur-md", theme.cardBg, theme.border, theme.textMuted)}
              title="Swap team sides visually"
            >
              <ArrowLeftRight className="size-4" strokeWidth={2.5} />
              <span>Swap Sides</span>
            </button>
          </div>
        )}
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
        {renderTeamPanel(leftTeamName, leftScore, leftInfo, leftPenalties, leftColorTheme, leftIsWinner, isDraw)}
        {isFull && EventLogPanel}
        {renderTeamPanel(rightTeamName, rightScore, rightInfo, rightPenalties, rightColorTheme, rightIsWinner, isDraw)}
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
      

      {/* Broadcast-Style Winner/Draw Graphic */}
      {showWinnerOverlay && matchResultTitle && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-xl bg-black/50 backdrop-blur-md animate-in fade-in duration-700">
          <div className={`relative flex flex-col items-center justify-center rounded-2xl border bg-gradient-to-b from-slate-950/90 to-black/90 px-12 py-10 animate-in zoom-in-90 slide-in-from-bottom-8 duration-700 ease-out backdrop-blur-xl ${isDraw ? 'border-amber-500/40 shadow-[0_0_80px_-15px_rgba(245,158,11,0.5)]' : 'border-emerald-500/40 shadow-[0_0_80px_-15px_rgba(16,185,129,0.5)]'}`}>
            
            <div className={`absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent opacity-100 rounded-2xl ${isDraw ? 'from-amber-900/40' : 'from-emerald-900/40'}`} />

            <div className={`relative z-10 mb-5 flex size-20 items-center justify-center rounded-full border backdrop-blur-md ${isDraw ? 'border-amber-400/40 bg-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'border-emerald-400/40 bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]'}`}>
              {isDraw ? (
                <ArrowLeftRight className="size-10 text-amber-400 drop-shadow-md" strokeWidth={1.5} />
              ) : (
                <Trophy className="size-10 text-emerald-400 drop-shadow-md" strokeWidth={1.5} />
              )}
            </div>

            <p className={`relative z-10 text-xs font-bold uppercase tracking-[0.4em] ${isDraw ? 'text-amber-100/60' : 'text-emerald-100/60'}`}>
              Match Concluded
            </p>

            <h2 className="relative z-10 mt-2 text-center text-4xl font-black uppercase tracking-tight text-white sm:text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {matchResultTitle}
            </h2>

            <div className="relative z-10 mt-6 flex items-center gap-4">
              <div className={`h-[1px] w-12 bg-gradient-to-r from-transparent ${isDraw ? 'to-amber-500/80' : 'to-emerald-500/80'}`} />
              <span className={`text-sm font-black uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] ${isDraw ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'text-emerald-400'}`}>
                {isDraw ? "Points Shared" : "Winner"}
              </span>
              <div className={`h-[1px] w-12 bg-gradient-to-l from-transparent ${isDraw ? 'to-amber-500/80' : 'to-emerald-500/80'}`} />
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

function eventLabel(type: MatchEventType): string {
  switch (type) {
    case "match_started": return "STARTED";
    case "match_paused": return "PAUSED";
    case "match_resumed": return "RESUMED";
    case "match_ended": return "MATCH ENDED";
    case "score_changed": return "GOAL";
    case "penalty_issued": return "PENALTY";
    default: return String(type);
  }
}