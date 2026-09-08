import type { ThemeDef } from "@/routes/scoreboard";

export function EventLogItem({ type, penaltyLevel, message, time, side, theme }: { type: 'goal' | 'penalty' | 'system' | 'phase' | 'phase_end', penaltyLevel?: 'warning' | 'yellow' | 'red' | null, message: string, time: string, side: 'left' | 'right' | 'center', theme: ThemeDef }) {
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