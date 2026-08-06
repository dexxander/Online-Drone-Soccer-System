import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { auth, homeForRole } from "@/lib/store";
import type { UserRole } from "@/lib/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Drone Soccer League Control" },
      { name: "description", content: "Sign in to manage drone soccer registrations, matches and live scoring." },
      { property: "og:title", content: "Sign in — Drone Soccer League Control" },
      { property: "og:description", content: "Access the admin, referee or coach workspace." },
    ],
  }),
  component: LoginPage,
});


function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 4) {
      setError("Enter a valid email and a password of at least 4 characters.");
      return;
    }
    try {
      const loggedUser = await auth.login(email, password);
      
      // Prevent admins from logging in through the regular portal
      if (loggedUser.role === "admin") {
        await auth.logout();
        setError("Administrators must sign in through the internal /admin-login portal.");
        return;
      }
      
      navigate({ to: homeForRole(loggedUser.role) });
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your league workspace.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@club.io"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="••••••••"
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            DS
          </span>
          <span className="text-sm font-bold">Drone Soccer League Control</span>
        </Link>
        <div className="rounded-2xl border border-border bg-background p-7 shadow-card">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
