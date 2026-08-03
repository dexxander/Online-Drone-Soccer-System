import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { auth, homeForRole } from "@/lib/store";
import type { UserRole } from "@/lib/types";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Drone Soccer League Control" },
      { name: "description", content: "Create a coach, referee or administrator account for the drone soccer league." },
      { property: "og:title", content: "Create account — Drone Soccer League Control" },
      { property: "og:description", content: "Join the league platform to register teams or officiate matches." },
    ],
  }),
  component: RegisterPage,
});

const roles: { value: UserRole; label: string }[] = [
  { value: "coach", label: "Coach" },
  { value: "referee", label: "Referee" },
  { value: "admin", label: "Administrator" },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [role, setRole] = useState<UserRole>("coach");
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Full name is required.");
    if (!form.email.includes("@")) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    auth.login(form.email, role);
    navigate({ to: homeForRole(role) });
  };

  return (
    <AuthShell title="Create your account" subtitle="Register to manage teams, matches or the league.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <input className="auth-input" value={form.name} onChange={set("name")} placeholder="Alex Rivera" />
        </Field>
        <Field label="Email">
          <input className="auth-input" type="email" value={form.email} onChange={set("email")} placeholder="you@club.io" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password">
            <input className="auth-input" type="password" value={form.password} onChange={set("password")} />
          </Field>
          <Field label="Confirm password">
            <input className="auth-input" type="password" value={form.confirm} onChange={set("confirm")} />
          </Field>
        </div>
        <Field label="Account type">
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  role === r.value
                    ? "border-primary bg-accent text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
