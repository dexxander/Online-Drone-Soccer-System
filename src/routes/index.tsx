import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Radio, ArrowRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { LogoMark } from "@/components/LogoMark";
import { auth } from "@/lib/store";
import { FeatureRow } from "@/components/landing/FeatureRow";

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
    longBody: "Coaches create a team profile and submit a full player roster through a guided registration portal — no paperwork, no email threads.",
    href: "/register-team" as const,
    cta: "Register your team",
    public: true,
  },
  {
    n: "02",
    icon: Radio,
    title: "Broadcast",
    body: "Every call lands on the arena scoreboard instantly, synced across screens.",
    longBody: "Every score, penalty, and phase change lands on the arena scoreboard instantly, synced across every screen in the venue.",
    href: "/scoreboard" as const,
    cta: "Watch live scoreboard",
    public: true,
  },
];

const pastCompetitions = [
  {
    title: "Placeholder: Competition name / headline",
    source: "Publication name",
    date: "Month Year",
    url: "https://example.com",
  },
  {
    title: "Placeholder: Competition name / headline",
    source: "Publication name",
    date: "Month Year",
    url: "https://example.com",
  },
  {
    title: "Placeholder: Competition name / headline",
    source: "Publication name",
    date: "Month Year",
    url: "https://example.com",
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

      <div className="feature-rows">
        {flow.map((step) => (
          <FeatureRow
            key={step.n}
            icon={step.icon}
            title={step.title}
            body={step.longBody ?? step.body}
            href={step.href}
            cta={step.cta}
            showCta={step.public}
          />
        ))}
      </div>

      {/* ── Past Competitions ── */}
      <section className="border-b border-border bg-muted/20 py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Past competitions
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Coverage from tournaments run through this system.
          </p>

          <div className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 hide-scrollbar">
            {pastCompetitions.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card transition-colors hover:border-primary/40"
              >
                <div className="flex aspect-video items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                  Thumbnail placeholder
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.source} · {item.date}
                  </span>
                  <h3 className="mt-2 flex-1 text-sm font-bold text-foreground group-hover:text-primary">
                    {item.title}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Read article <ExternalLink className="size-3" />
                  </span>
                </div>
              </a>
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
