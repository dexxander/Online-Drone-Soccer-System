import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, profile, initializing, configured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initializing) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (!user.emailVerified) navigate({ to: "/verify-email", replace: true });
  }, [initializing, user, navigate]);


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
