import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Shield, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { auth } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: "/register-team";
  icon: typeof Shield;
};

const nav: NavItem[] = [{ label: "My teams", to: "/register-team", icon: Shield }];

export function CoachLayout({ children }: { children: ReactNode }) {
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
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
          <Link to="/" className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-foreground">Drone Soccer</span>
              <span className="block text-xs text-muted-foreground">Coach Portal</span>
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
              return (
                <Link key={item.label} to={item.to} className={classes}>
                  <item.icon className="size-[18px]" strokeWidth={1.8} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {user && (
            <div className="p-3">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-[18px]" strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          )}
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
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                    {user.name}
                  </span>
                  <span className="rounded-md border border-accent-border bg-accent px-3 py-1 text-xs font-medium text-primary">
                    Coach
                  </span>
                </>
              ) : (
                <Link
                  to="/login"
                  className="rounded-md border border-accent-border bg-accent px-3 py-1 text-xs font-medium text-primary hover:bg-accent/80"
                >
                  Sign in to track your teams
                </Link>
              )}
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
