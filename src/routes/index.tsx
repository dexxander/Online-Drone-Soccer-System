import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ShieldCheck, Gauge, Radio, ArrowRight } from "lucide-react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drone Soccer League Control — Tournament Management" },
      {
        name: "description",
        content:
          "Run drone soccer competitions end to end: team registration, admin approvals, referee match control and a real-time live scoreboard.",
      },
      { property: "og:title", content: "Drone Soccer League Control" },
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
  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lift">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                League Control
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/scoreboard"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Live scoreboard
            </Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              to="/register-team"
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Register team
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1fr_440px] lg:items-center lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" />
              League control · Season 4
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[64px]">
              Every match.
              <br />
              Every call.
              <br />
              <span className="text-primary">One arena feed.</span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Register teams, approve rosters, referee from pitchside and broadcast the score to
              every screen in the venue — synced in real time, no refresh.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register-team"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-colors hover:bg-primary/90"
              >
                Register your team <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/scoreboard"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Watch live scoreboard
              </Link>
            </div>

            <div className="mt-8">
              <LiveTicker />
            </div>
          </div>

          <CagedDrone />
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
          <Stat value="128" label="Registered clubs" />
          <Stat value="1,940" label="Matches officiated" />
          <Stat value="24" label="Arena displays" />
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

      {/* ── Match-day flow ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">How a league day runs</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Four roles, one shared state. Each step below is a real workspace in the platform.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map((f) => (
            <Link
              key={f.n}
              to={f.href}
              className="group flex flex-col rounded-xl border border-border bg-background p-5 shadow-card transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">{f.n}</span>
                <f.icon className="size-4 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-foreground">{f.title}</h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <p className="mx-auto w-full max-w-6xl px-6 text-xs text-muted-foreground">
          Drone Soccer League Control — prototype build. Data is stored locally and synced across tabs.
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs shadow-card">
      <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider ${isLive ? "text-primary" : "text-muted-foreground"}`}>
        <span
          className={`size-1.5 rounded-full ${isLive ? "bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" : "bg-muted-foreground"}`}
        />
        {isLive ? "Live now" : "Next match"}
      </span>
      <span className="text-foreground">
        {m.teamAName} <span className="text-muted-foreground">vs</span> {m.teamBName}
      </span>
      {isLive && (
        <span className="text-warning">
          {m.scoreA}–{m.scoreB} · {formatClock(clock)}
        </span>
      )}
    </div>
  );
}

/* ── Signature hero graphic: a high-fidelity caged drone-soccer ball,
   drawn from the app's existing theme tokens. ── */
function CagedDrone() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px] group">
      {/* Dynamic Glow - Atmospheric under-glow reacting to drone state */}
      <div className="pointer-events-none absolute inset-12 rounded-full bg-primary/20 blur-[80px] animate-pulse" />

      <svg
        viewBox="0 0 400 400"
        className="relative size-full drop-shadow-2xl"
        style={{ animation: "ds-hover 4s ease-in-out infinite" }}
      >
        <defs>
          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Protective Cage - Geodesic Pattern */}
        <g fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/30">
          <circle cx="200" cy="200" r="180" />
          <circle cx="200" cy="200" r="140" strokeDasharray="8 12" />

          {/* Hexagonal Cage Struts */}
          <path d="M200 20 L355 110 L355 290 L200 380 L45 290 L45 110 Z" />
          <path d="M200 20 V380 M45 110 L355 290 M45 290 L355 110" opacity="0.5" />

          {/* Inner Structural Ribs */}
          <g opacity="0.4">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <line
                key={deg}
                x1="200"
                y1="200"
                x2={200 + 180 * Math.cos((deg * Math.PI) / 180)}
                y2={200 + 180 * Math.sin((deg * Math.PI) / 180)}
              />
            ))}
          </g>
        </g>

        {/* Rotor Arms & Motors */}
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-foreground">
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg}, 200, 200)`}>
              {/* Carbon Fiber Arm */}
              <line x1="200" y1="200" x2="200" y2="120" strokeWidth="6" className="opacity-80" />
              <line x1="200" y1="200" x2="200" y2="120" stroke="var(--color-primary)" strokeWidth="1.5" />

              {/* Motor Housing */}
              <circle cx="200" cy="115" r="12" fill="var(--color-background)" strokeWidth="2" />
              <circle cx="200" cy="115" r="4" fill="var(--color-primary)" />

              {/* Spinning Propellers */}
              <g transform="translate(200, 115)">
                <ellipse rx="45" ry="6" fill="var(--color-primary)" opacity="0.15">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.1s" repeatCount="indefinite" />
                </ellipse>
                <path d="M-40 0 Q-20 -5 0 0 Q20 5 40 0" stroke="currentColor" strokeWidth="1" opacity="0.6">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.1s" repeatCount="indefinite" />
                </path>
              </g>
            </g>
          ))}
        </g>

        {/* Central Flight Controller Core */}
        <g transform="translate(200, 200)">
          {/* Main Housing */}
          <rect x="-35" y="-35" width="70" height="70" rx="12" fill="var(--color-background)" stroke="currentColor" strokeWidth="2" />

          {/* Status LEDs & Electronics */}
          <circle r="22" fill="url(#core-glow)" className="animate-pulse" />
          <g filter="url(#neon-glow)">
            <circle r="8" fill="var(--color-primary)" />
          </g>

          {/* Decorative Technical Detail */}
          <path d="M-20 -20 H20 M-20 20 H20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <path d="M-20 -20 V20 M20 -20 V20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </g>

        {/* Dynamic Telemetry Ring */}
        <circle cx="200" cy="200" r="155" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="2 10" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="25s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Animation Definitions */}
      <style>{`
        @keyframes ds-hover {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(1deg); }
          75% { transform: translateY(4px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}