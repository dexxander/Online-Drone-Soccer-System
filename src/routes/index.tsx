import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ShieldCheck, Gauge, Radio, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { LogoMark } from "@/components/LogoMark";
import { auth } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AW Drone Soccer Leagues System — Tournament Management" },
      {
        name: "description",
        content:
          "Run drone soccer competitions end to end: team registration, admin approvals, referee match control and a real-time live scoreboard.",
      },
      { property: "og:title", content: "AW Drone Soccer Leagues System" },
      {
        property: "og:description",
        content: "Registration, approvals, referee controls and a real-time scoreboard for drone soccer leagues.",
      },
    ],
  }),
  component: Landing,
});

const flow = [
  {
    n: "01",
    icon: Users,
    title: "Register",
    body: "Coaches submit team details and a full roster through a guided portal.",
    href: "/register-team" as const,
  },
  {
    n: "02",
    icon: ShieldCheck,
    title: "Approve",
    body: "Admins review every team and player, approving or rejecting from one queue.",
    href: "/admin" as const,
  },
  {
    n: "03",
    icon: Gauge,
    title: "Officiate",
    body: "Referees run the clock, score and penalties from pitchside controls.",
    href: "/referee" as const,
  },
  {
    n: "04",
    icon: Radio,
    title: "Broadcast",
    body: "Every call lands on the arena scoreboard instantly, synced across screens.",
    href: "/scoreboard" as const,
  },
];

function Landing() {
  const { state } = useMockWebSocket();
  const [user, setUser] = useState(auth.current());
  const registeredClubs = state.teams.length;
  const matchesOfficiated = state.matches.reduce(
    (total, slot) => total + slot.events.filter((event) => event.type === "match_ended").length,
    0,
  );
  const activeTournaments = state.tournaments.filter((tournament) => tournament.status === "active").length;
  const canRegisterTeam = !user || user.role === "coach";

  useEffect(() => auth.subscribe(() => setUser(auth.current())), []);

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="size-9 shadow-lift" />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">AW DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Leagues System
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/tournaments"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Matches
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              About
            </Link>
            <NotificationMenu />
            <AccountMenu />
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
            src="https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1&mute=1&loop=1&playlist=aqz-KE-bpKQ&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="Arena preview"
            frameBorder="0"
            allow="autoplay; encrypted-media"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.15_0.05_266/0.92)] via-[oklch(0.15_0.05_266/0.75)] to-[oklch(0.15_0.05_266/0.4)]" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-24 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[64px]">
              Every match.
              <br />
              Every call.
              <br />
              <span className="text-gold">One arena feed.</span>
            </h1>

            <div className="mt-8 flex flex-wrap gap-3">
              {canRegisterTeam && (
                <Link
                  to="/register-team"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-colors hover:bg-primary/90"
                >
                  Register your team <ArrowRight className="size-4" />
                </Link>
              )}
              <Link
                to="/scoreboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Watch live scoreboard
              </Link>
            </div>

            <div className="mt-8">
              <LiveTicker />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
          <Stat value={String(registeredClubs)} label="Registered clubs" />
          <Stat value={String(matchesOfficiated)} label="Matches officiated" />
          <Stat value={String(activeTournaments)} label="Active tournaments" />
          <div className="flex flex-col justify-center px-6 py-6">
            <span className="inline-flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-warning">
              <span className="size-2 rounded-full bg-warning shadow-[0_0_8px_2px_var(--color-warning)]" />
              Live
            </span>
            <span className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Synced across every screen
            </span>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-border bg-muted/20 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From registration to broadcast
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            One system carries a match through every stage — no spreadsheets, no separate scoreboard app.
          </p>

          <div className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-border lg:block" />
            {flow.map((step) => (
              <Link
                key={step.n}
                to={step.href}
                className="group relative flex flex-col gap-4 rounded-xl border border-border bg-background p-6 shadow-card transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{step.n}</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <p className="mx-auto w-full max-w-6xl px-6 text-xs text-muted-foreground">
          AW Drone Soccer Leagues System
        </p>
      </footer>
    </div>
  );
}

/* ── Stat cell ── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col justify-center px-6 py-6">
      <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{value}</span>
      <span className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Live match ticker — reads the same shared store the referee/scoreboard
   pages use, so the marketing page reflects real match state. ── */
function LiveTicker() {
  const { state } = useMockWebSocket();
  const m = state.match;
  const clock = useMatchClock(m.elapsedMs, m.runningSince);
  const isLive = m.status === "live" || m.status === "paused";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-xs text-white backdrop-blur-sm">
      <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider ${isLive ? "text-primary" : "text-white/60"}`}>
        <span
          className={`size-1.5 rounded-full ${isLive ? "bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" : "bg-muted-foreground"}`}
        />
        {isLive ? "Live now" : "Next match"}
      </span>
      <span className="text-white">
        {m.teamAName} <span className="text-white/60">vs</span> {m.teamBName}
      </span>
      {isLive && (
        <span className="text-warning">
          {m.scoreA}–{m.scoreB} · {formatClock(clock)}
        </span>
      )}
    </div>
  );
}
