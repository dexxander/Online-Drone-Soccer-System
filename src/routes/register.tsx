import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormRow } from "@/components/confirm-dialog";
import { SELF_SERVE_ROLES, useAuth } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { firebaseErrorMessage } from "@/lib/format";

import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Drone Soccer League Control" },
      {
        name: "description",
        content:
          "Register as a coach, player or viewer to follow and manage drone soccer competition.",
      },
      { property: "og:title", content: "Create account — Drone Soccer League Control" },
      {
        property: "og:description",
        content:
          "Register as a coach, player or viewer to follow and manage drone soccer competition.",
      },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    displayName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(128),
    confirm: z.string(),
    role: z.enum(["coach", "player", "viewer"]),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

function RegisterPage() {
  const { register, user, configured, initializing } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    displayName: "",
    email: "",
    password: "",
    confirm: "",
    role: "viewer" as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!initializing && user) navigate({ to: "/verify-email", replace: true });
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
      await register({
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.displayName,
        role: parsed.data.role,
      });
      toast.success("Account created — check your inbox to verify your email");
      navigate({ to: "/verify-email", replace: true });
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Referee and administrator access is granted by a league administrator."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormRow label="Full name" htmlFor="displayName" error={errors['displayName']}>
          <Input
            id="displayName"
            value={values.displayName}
            onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
            placeholder="Alex Rivera"
          />
        </FormRow>
        <FormRow label="Email" htmlFor="email" error={errors['email']}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          />
        </FormRow>
        <FormRow label="I am a" error={errors['role']}>
          <Select
            value={values.role}
            onValueChange={(role) => setValues((v) => ({ ...v, role: role as Role }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELF_SERVE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Password" htmlFor="password" error={errors['password']}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          />
        </FormRow>
        <FormRow label="Confirm password" htmlFor="confirm" error={errors['confirm']}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
          />
        </FormRow>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
