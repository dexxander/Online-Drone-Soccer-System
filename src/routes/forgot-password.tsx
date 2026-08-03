import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormRow } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage } from "@/lib/format";
import { FirebaseNotConfigured } from "@/components/firebase-not-configured";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Drone Soccer League Control" },
      {
        name: "description",
        content: "Request a password reset link for your drone soccer league account.",
      },
      { property: "og:title", content: "Reset password — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Request a password reset link for your drone soccer league account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });

function ForgotPasswordPage() {
  const { resetPassword, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!configured) return <FirebaseNotConfigured />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await resetPassword(parsed.data.email);
      setSent(true);
      toast.success("Reset link sent");
    } catch (err) {
      toast.error(firebaseErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="We'll email you a secure link to choose a new password."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="panel flex flex-col items-center gap-3 p-8 text-center">
          <MailCheck className="size-8 text-success" />
          <p className="font-display font-semibold">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for {email}, a reset link is on its way. The link opens Firebase's
            secure password form.
          </p>
          <Button variant="outline" onClick={() => setSent(false)}>
            Send to a different address
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormRow label="Email" htmlFor="email" error={error}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormRow>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
