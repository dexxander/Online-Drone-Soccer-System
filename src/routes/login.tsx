import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormRow } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage } from "@/lib/format";

import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Drone Soccer League Control" },
      {
        name: "description",
        content: "Sign in to manage drone soccer tournaments, matches, teams and live scoring.",
      },
      { property: "og:title", content: "Sign in — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Sign in to manage drone soccer tournaments, matches, teams and live scoring.",
      },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

function LoginPage() {
  const { login, user, configured, initializing } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!initializing && user) navigate({ to: "/dashboard", replace: true });
  }, [initializing, user, navigate]);



  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      toast.success("Welcome back");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Access your league control room."
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormRow label="Email" htmlFor="email" error={errors['email']}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            placeholder="you@club.org"
          />
        </FormRow>
        <FormRow label="Password" htmlFor="password" error={errors['password']}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          />
        </FormRow>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
