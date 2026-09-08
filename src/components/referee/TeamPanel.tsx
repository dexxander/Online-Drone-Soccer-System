import { Minus, Plus, Trophy, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateEffectivePenalties } from "@/lib/penalties";
import type { PenaltyType } from "@/lib/types";

const penaltyButtons: { label: string; type: PenaltyType; style: string }[] = [
  { label: "Warning", type: "Minor", style: "bg-muted text-foreground border border-border hover:bg-accent" },
  { label: "YELLOW CARD", type: "Major", style: "bg-warning-soft text-warning border border-warning/40 hover:bg-warning/20 font-bold" },
  { label: "RED CARD", type: "Technical", style: "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold shadow-sm" },
];

export function TeamPanel({ teamName, sideLabel, initials, logo, accentColor, score, penalties, disabled, onDecrement, onIncrement, onPenalty, onOwnGoal, roster, isWinner, isDraw, coach }: any) {
  const isPrimary = accentColor === "primary";
  const effectivePenalties = calculateEffectivePenalties(penalties);

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("relative flex-1 flex flex-col rounded-xl border bg-background p-6 shadow-card transition-opacity", disabled ? "opacity-75" : "", isWinner ? "border-emerald-500 shadow-emerald-500/10" : isDraw ? "border-amber-500 shadow-amber-500/10" : "border-border")}>
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
              ) : effectivePenalties.badges.map((badge: string, index: number) => (
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
      {isDraw && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-amber-500/15 px-5 py-1.5 text-xs font-bold tracking-widest text-amber-600 border border-amber-500/30 shadow-sm">
            <ArrowLeftRight className="size-4" /> MATCH DRAWN
          </div>
        </div>
      )}
    </div>
  );
}