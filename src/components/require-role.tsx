import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

/** Renders children only when the signed-in user holds one of `roles`. */
export function RequireRole({
  roles,
  children,
  fallback,
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode | undefined;
}) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) {
    return (
      fallback ?? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <ShieldAlert className="size-7 text-warning" />
          <div>
            <p className="font-display text-lg font-semibold">Restricted area</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your role does not have access to this page.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      )
    );
  }
  return <>{children}</>;
}
