import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Trophy,
  Shield,
  User,
  Megaphone,
  Users,
  ScrollText,
  Monitor,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { auth } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/LogoMark";

type NavItem = {
  label: string;
  to?:
    | "/admin"
    | "/referee"
    | "/register-team"
    | "/admin-teams"
    | "/admin-players"
    | "/admin-tournaments"
    | "/admin-announcements"
    | "/admin-users"
    | "/admin-audit-log";
  icon: typeof LayoutGrid;
};

const nav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutGrid },
  { label: "Tournaments", to: "/admin-tournaments", icon: Trophy },
  { label: "Teams", to: "/admin-teams", icon: Shield },
  { label: "Players", to: "/admin-players", icon: User },
  { label: "Announcements", to: "/admin-announcements", icon: Megaphone },
  { label: "Users", to: "/admin-users", icon: Users },
  { label: "Audit log", to: "/admin-audit-log", icon: ScrollText },
];

export function DashboardLayout({
  children,
  roleLabel = "Administrator",
}: {
  children: ReactNode;
  roleLabel?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const signOut = () => {
    auth.logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
          <Link to="/" className="flex items-center gap-3 border-b border-border px-5 py-4">
            <LogoMark />
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
          <div className="space-y-1 p-3">
            <Link
              to="/scoreboard"
              target="_blank"
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Monitor className="size-[18px]" strokeWidth={1.8} />
              Open scoreboard
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-[18px]" strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[61px] items-center justify-between border-b border-border bg-background px-6">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <LogoMark className="size-8" />
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
