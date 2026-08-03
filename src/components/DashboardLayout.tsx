import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Trophy,
  Swords,
  Shield,
  User,
  Megaphone,
  Bell,
  Users,
  ScrollText,
  Monitor,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to?: "/admin" | "/referee" | "/register-team";
  icon: typeof LayoutGrid;
};

const nav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutGrid },
  { label: "Tournaments", icon: Trophy },
  { label: "Matches", to: "/referee", icon: Swords },
  { label: "Teams", to: "/register-team", icon: Shield },
  { label: "Players", icon: User },
  { label: "Announcements", icon: Megaphone },
  { label: "Notifications", icon: Bell },
  { label: "Users", icon: Users },
  { label: "Audit log", icon: ScrollText },
];

export function DashboardLayout({
  children,
  roleLabel = "Administrator",
}: {
  children: ReactNode;
  roleLabel?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
          <Link to="/" className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-foreground">Drone Soccer</span>
              <span className="block text-xs text-muted-foreground">League Control</span>
            </span>
          </Link>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((item) => {
              const active = pathname === item.to;
              const classes = cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              );
              const inner = (
                <>
                  <item.icon className="size-[18px]" strokeWidth={1.8} />
                  {item.label}
                </>
              );
              return item.to ? (
                <Link key={item.label} to={item.to} className={classes}>
                  {inner}
                </Link>
              ) : (
                <span key={item.label} className={cn(classes, "cursor-default opacity-70")}>
                  {inner}
                </span>
              );
            })}
          </nav>
          <div className="p-3">
            <Link
              to="/scoreboard"
              target="_blank"
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Monitor className="size-[18px]" strokeWidth={1.8} />
              Open scoreboard
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[61px] items-center justify-between border-b border-border bg-background px-6">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                DS
              </span>
              <span className="text-sm font-bold">Drone Soccer</span>
            </Link>
            <div className="hidden lg:block" />
            <span className="rounded-md border border-accent-border bg-accent px-3 py-1 text-xs font-medium text-primary">
              {roleLabel}
            </span>
          </header>
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
