import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Shield,
  UserRound,
  Swords,
  Trophy,
  Megaphone,
  Bell,
  ScrollText,
  LogOut,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { RoleBadge } from "@/components/primitives";
import { initials } from "@/lib/format";
import { useCollectionData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { where } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
}

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  {
    to: "/tournaments",
    label: "Tournaments",
    icon: <Trophy className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  {
    to: "/matches",
    label: "Matches",
    icon: <Swords className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  {
    to: "/teams",
    label: "Teams",
    icon: <Shield className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  {
    to: "/players",
    label: "Players",
    icon: <UserRound className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  {
    to: "/announcements",
    label: "Announcements",
    icon: <Megaphone className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: <Bell className="size-4" />,
    roles: ["admin", "referee", "coach", "player", "viewer"],
  },
  { to: "/users", label: "Users", icon: <Users className="size-4" />, roles: ["admin"] },
  {
    to: "/audit-logs",
    label: "Audit log",
    icon: <ScrollText className="size-4" />,
    roles: ["admin"],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const role = profile?.role ?? "viewer";
  const items = NAV.filter((item) => item.roles.includes(role));

  const { data: unread } = useCollectionData<Notification>(
    COL.notifications,
    () => [where("userId", "==", profile?.id ?? "__none__"), where("read", "==", false)],
    [profile?.id],
    Boolean(profile?.id),
  );

  async function handleSignOut() {
    try {
      await logout();
      toast.success("Signed out");
      navigate({ to: "/login", replace: true });
    } catch {
      toast.error("Could not sign out");
    }
  }

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
              DS
            </span>
            <span className="font-display text-sm font-bold leading-tight">
              Drone Soccer
              <span className="block text-[11px] font-medium text-muted-foreground">
                League Control
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.to === "/notifications" && unread.length > 0 ? (
                  <Badge className="h-5 min-w-5 justify-center px-1.5">{unread.length}</Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent/60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
              {initials(profile?.displayName ?? "?")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {profile?.displayName ?? "Account"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {profile?.email}
              </span>
            </span>
            <Settings className="size-4 text-muted-foreground" />
          </Link>
          <Button variant="ghost" className="mt-1 w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex-1" />
          {profile ? <RoleBadge role={profile.role} /> : null}
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
