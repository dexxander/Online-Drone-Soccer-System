import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, homeForRole } from "@/lib/store";
import type { AuthUser } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  referee: "Referee",
  coach: "Coach",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/**
 * Top-right auth affordance shared by the marketing/landing header.
 * Shows a "Sign in" link for signed-out visitors, and once a user is
 * authenticated it swaps to a profile trigger with a dropdown containing
 * a link to their workspace and a sign-out action.
 */
export function AccountMenu() {
  const navigate = useNavigate();
  // Kept in local state (rather than reading auth.current() directly on
  // every render) because signing out while already on this route doesn't
  // trigger a navigation-driven re-render — without local state the menu
  // would keep showing the signed-in user until something else forced a
  // re-render (e.g. a manual refresh).
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(auth.current());
    return auth.subscribe(() => setUser(auth.current()));
  }, []);

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
      >
        Sign in
      </Link>
    );
  }

  const signOut = () => {
    auth.logout();
    setUser(null);
    navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          <span className="mt-1 inline-block rounded-md border border-accent-border bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">
            {roleLabel[user.role] ?? user.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={homeForRole(user.role)} className="cursor-pointer">
            <LayoutDashboard className="size-4" strokeWidth={1.8} />
            Go to dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="size-4" strokeWidth={1.8} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
