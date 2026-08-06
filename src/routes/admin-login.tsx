import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock, KeyRound } from "lucide-react";
import { auth, homeForRole, store } from "@/lib/store";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Drone Soccer League Control" },
      { name: "description", content: "Internal League Administration Portal" },
    ],
  }),
  component: HiddenAdminAuthPage,
});

function HiddenAdminAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [signUpError, setSignUpError] = useState("");

  // Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.includes("@") || signInPassword.length < 4) {
      setSignInError("Please enter a valid administrator email and password.");
      return;
    }
    setSignInError("");
    try {
      const user = await auth.login(signInEmail, signInPassword);
      if (user.role !== "admin") {
        await auth.logout();
        setSignInError("Unauthorized: Account does not have admin privileges.");
        return;
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      setSignInError(err.message || "Failed to sign in.");
    }
  };

  // Sign Up Submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim()) return setSignUpError("Full name is required.");
    if (!signUpEmail.includes("@")) return setSignUpError("Enter a valid email address.");
    if (signUpPassword.length < 6) return setSignUpError("Password must be at least 6 characters.");
    if (adminPasscode.trim() !== "ADMIN2026") {
      return setSignUpError("Invalid Admin Passcode! Internal authorization required.");
    }

    setSignUpError("");
    try {
      const user = await auth.register(signUpEmail, signUpName.trim(), "admin", signUpPassword);
      navigate({ to: "/admin" });
    } catch (err: any) {
      setSignUpError(err.message || "Failed to create admin account.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <Link to="/" className="flex items-center justify-center gap-3 group">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lift">
            DS
          </span>
          <div className="text-left">
            <span className="block text-sm font-extrabold text-foreground">DRONE SOCCER</span>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Internal Admin Portal
            </span>
          </div>
        </Link>

        {/* Auth Box */}
        <div className="rounded-2xl border border-border bg-background p-7 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h1 className="text-base font-bold text-foreground">
                {mode === "signin" ? "Administrator Sign In" : "Register Admin Account"}
              </h1>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              Restricted
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setSignInError("");
              }}
              className={`rounded-lg py-2 transition-colors ${
                mode === "signin"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setSignUpError("");
              }}
              className={`rounded-lg py-2 transition-colors ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Secret Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">Admin Email</label>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="auth-input"
                  placeholder="admin@dronesoccer.io"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">Password</label>
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="auth-input"
                  placeholder="••••••••"
                />
              </div>

              {signInError && <p className="text-xs font-semibold text-destructive">{signInError}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lift hover:bg-primary/90 transition-colors"
              >
                Access Admin Dashboard
              </button>
            </form>
          )}

          {/* Secret Sign Up Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">Full Name</label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="auth-input"
                  placeholder="Administrator Name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">Admin Email</label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="auth-input"
                  placeholder="new-admin@dronesoccer.io"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">Password</label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  className="auth-input"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Admin Secret Key</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Key: ADMIN2026</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className="auth-input pl-9"
                    placeholder="Enter Secret Passcode"
                  />
                </div>
              </div>

              {signUpError && <p className="text-xs font-semibold text-destructive">{signUpError}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lift hover:bg-primary/90 transition-colors"
              >
                Create Admin Account
              </button>
            </form>
          )}
        </div>

        {/* Return link */}
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            ← Return to Public Homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
