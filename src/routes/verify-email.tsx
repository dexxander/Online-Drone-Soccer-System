import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage } from "@/lib/format";
import { FirebaseNotConfigured } from "@/components/firebase-not-configured";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify your email — Drone Soccer League Control" },
      {
        name: "description",
        content: "Confirm your email address to activate your drone soccer league account.",
      },
      { property: "og:title", content: "Verify your email — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Confirm your email address to activate your drone soccer league account.",
      },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user, initializing, configured, resendVerification, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (user.emailVerified) navigate({ to: "/dashboard", replace: true });
  }, [initializing, user, navigate]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshUser();
    }, 8000);
    return () => window.clearInterval(id);
  }, [refreshUser]);

  if (!configured) return <FirebaseNotConfigured />;

  return (
    <AuthLayout
      title="Verify your email"
      description={`We sent a confirmation link to ${user?.email ?? "your inbox"}.`}
      footer={
        <button
          className="font-medium text-primary hover:underline"
          onClick={async () => {
            await logout();
            navigate({ to: "/login", replace: true });
          }}
        >
          Sign out
        </button>
      }
    >
      <div className="panel flex flex-col items-center gap-4 p-8 text-center">
        <MailCheck className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          Click the link in the email to activate your account. This page updates automatically
          once verified.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await resendVerification();
                toast.success("Verification email sent");
              } catch (error) {
                toast.error(firebaseErrorMessage(error));
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Resend verification email
          </Button>
          <Button
            variant="outline"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              try {
                await refreshUser();
                toast.message("Status refreshed");
              } finally {
                setChecking(false);
              }
            }}
          >
            <RefreshCw className="mr-2 size-4" />
            I've verified — check again
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
