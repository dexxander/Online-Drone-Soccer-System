import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="size-6 text-destructive" />
      <p className="max-w-md text-sm text-foreground">{message}</p>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  icon?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div>
        <p className="font-display text-base font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Standard loading / error / empty wrapper for every data view. */
export function DataState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyTitle: string;
  emptyDescription?: string | undefined;
  emptyAction?: ReactNode | undefined;
  children: ReactNode;
}) {
  if (loading) return <TableSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (empty)
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  return <>{children}</>;
}
