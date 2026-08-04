import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Swords, Monitor, LogOut } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { auth } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: "/referee";
  icon: typeof Swords;
};

const nav: NavItem[] = [{ label: "Match control", to: "/referee", icon: Swords }];

const booth = "oklch(0.19 0.028 265)";
const boothHover = "oklch(0.25 0.032 265)";
const boothBorder = "oklch(1 0 0 / 10%)";
const cardYellow = "oklch(0.8 0.16 92)";
const cardYellowSoft = "oklch(0.8 0.16 92 / 0.16)";

const boothPanel: CSSProperties = { background: booth, borderColor: boothBorder };
const boothBorderOnly: CSSProperties = { borderColor: boothBorder };

export function RefereeLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const user = auth.current();

  const signOut = () => {
    auth.logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r lg:flex" style={boothPanel}>
          <Link to="/" className="flex items-center gap-3 border-b px-5 py-4" style={boothBorderOnly}>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-white">Drone Soccer</span>
              <span className="block text-xs text-white/50">Referee Console</span>
            </span>
          </Link>

          <nav className="flex-1 space-y-1 p-3">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-3 text-sm font-medium transition-colors",
                    active ? "text-white" : "text-white/55 hover:text-white",
                  )}
                  style={active ? { background: cardYellowSoft } : undefined}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = boothHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {active && (
                    <span
                      className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                      style={{ background: cardYellow }}
                    />
                  )}
                  <item.icon
                    className="size-[18px]"
                    strokeWidth={1.8}
                    style={active ? { color: cardYellow } : undefined}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t p-3" style={boothBorderOnly}>
            <Link
              to="/scoreboard"
              target="_blank"
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
              style={boothBorderOnly}
              onMouseEnter={(e) => (e.currentTarget.style.background = boothHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Monitor className="size-[18px]" strokeWidth={1.8} />
              Open scoreboard
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:text-white"
              onMouseEnter={(e) => (e.currentTarget.style.background = boothHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut className="size-[18px]" strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[61px] items-center justify-between border-b px-6" style={boothPanel}>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                DS
              </span>
              <span className="text-sm font-bold text-white">Drone Soccer</span>
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-3">
              {user?.name && (
                <span className="hidden text-sm font-medium text-white/60 sm:inline">{user.name}</span>
              )}
              <span
                className="inline-flex -rotate-2 items-center rounded-[3px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-black/80 shadow-lift"
                style={{ background: cardYellow }}
              >
                Referee
              </span>
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}