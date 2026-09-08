import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function NavCard({ href, onClick, icon, label, active, danger, external }: any) {
  const classes = cn(
    "flex flex-col items-center justify-center gap-2 rounded-xl p-4 shadow-sm transition-colors cursor-pointer",
    active ? "bg-primary text-primary-foreground hover:bg-primary/85" : danger ? "border border-border bg-background text-destructive hover:bg-destructive/10" : "border border-border bg-background text-foreground hover:bg-muted"
  );
  if (onClick) return <button onClick={onClick} className={classes}>{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></button>;
  if (external) return <Link to={href} target="_blank" className={classes}>{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></Link>;
  return <Link to={href} className={classes}>{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></Link>;
}