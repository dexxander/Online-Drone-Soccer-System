import { ArrowLeftRight, Palette, Radio, Sparkles, Timer, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/hooks/useMockWebSocket";
import type { MatchSlot, MatchEventType } from "@/lib/types";
import { calculateEffectivePenalties } from "@/lib/penalties";
import type { ThemeDef } from "@/routes/scoreboard";
import { getCurrentPhase, eventLabel } from "@/lib/match-helpers";
import { EventLogItem } from "@/components/scoreboard/EventLogItem";

export function MatchBoard({
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