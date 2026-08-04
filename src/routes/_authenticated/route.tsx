import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, profile, initializing, configured } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!user.emailVerified) {
      navigate({ to: "/verify-email", replace: true });
      return;
    }
    if (profile?.role === "coach" && !profile.teamId && pathname !== "/team-setup") {
      navigate({ to: "/team-setup", replace: true });
    }
  }, [initializing, user, profile, pathname, navigate]);

  if (initializing || !user || !user.emailVerified || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your workspace…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}