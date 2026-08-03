import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatchStatus, Role, TournamentStatus } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  icon?: ReactNode | undefined;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </div>
      <p className="scoreline mt-3 text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const tone: Record<Role, string> = {
    admin: "bg-primary/10 text-primary border-primary/20",
    referee: "bg-warning/15 text-warning-foreground border-warning/30",
    coach: "bg-success/10 text-success border-success/25",
    player: "bg-accent text-accent-foreground border-transparent",
    viewer: "bg-muted text-muted-foreground border-transparent",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", tone[role])}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  if (status === "live") {
    return (
      <Badge className="gap-1.5 border-transparent bg-live text-live-foreground">
        <span className="live-pulse size-1.5 rounded-full bg-current" />
        LIVE
      </Badge>
    );
  }
  const tone: Record<Exclude<MatchStatus, "live">, string> = {
    scheduled: "bg-muted text-muted-foreground border-transparent",
    completed: "bg-success/10 text-success border-success/25",
    cancelled: "bg-destructive/10 text-destructive border-destructive/25",
  };
  const label: Record<Exclude<MatchStatus, "live">, string> = {
    scheduled: "Scheduled",
    completed: "Final",
    cancelled: "Cancelled",
  };
  return (
    <Badge variant="outline" className={tone[status]}>
      {label[status]}
    </Badge>
  );
}

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const tone: Record<TournamentStatus, string> = {
    draft: "bg-muted text-muted-foreground border-transparent",
    registration: "bg-primary/10 text-primary border-primary/20",
    in_progress: "bg-live/10 text-live border-live/25",
    completed: "bg-success/10 text-success border-success/25",
  };
  const label: Record<TournamentStatus, string> = {
    draft: "Draft",
    registration: "Registration open",
    in_progress: "In progress",
    completed: "Completed",
  };
  return (
    <Badge variant="outline" className={tone[status]}>
      {label[status]}
    </Badge>
  );
}
