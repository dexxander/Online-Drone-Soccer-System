import { cn } from "@/lib/utils";
import type { ThemeDef } from "@/routes/scoreboard";

export function EmptyBoardState({ theme }: { theme: ThemeDef }) {
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