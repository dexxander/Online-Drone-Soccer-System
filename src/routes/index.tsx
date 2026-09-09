import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Radio, ArrowRight, Gauge, Trophy, Phone, Mail, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { LogoMark } from "@/components/LogoMark";
import { auth } from "@/lib/store";
import { FeatureRow } from "@/components/landing/FeatureRow";
import { NewsCard } from "@/components/landing/NewsCard";

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

const newsItems: { url: string; thumbnail?: string }[] = [
  { url: "https://sabah.sinchew.com.my/news/20260818/sabah/7769674", thumbnail: "/news/article1.jpg" },
];

const sponsors: { name: string; logo?: string }[] = [
  { name: "Sponsor placeholder" },
  { name: "Sponsor placeholder" },
  { name: "Sponsor placeholder" },
];

const contactInfo = {
  phone: "+60 12-345 6789",
  email: "contact@example.com",
};

const socialLinks: { label: string; url: string }[] = [
  { label: "Facebook", url: "https://facebook.com" },
  { label: "Instagram", url: "https://instagram.com" },
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
              className="hidden rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="hidden rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Matches
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:block"
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
            className="absolute left-1/2 top-1/2 h-[75vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
            src="https://www.youtube.com/embed/MiPOfNI3i9I?autoplay=1&mute=1&loop=1&playlist=MiPOfNI3i9I&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="Preview by Hu Jie"
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
          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md sm:grid-cols-3">
            <Stat value={String(registeredClubs)} label="Registered clubs" icon={Users} />
            <Stat value={String(matchesOfficiated)} label="Matches officiated" icon={Gauge} />
            <Stat value={String(activeTournaments)} label="Active tournaments" icon={Trophy} />
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

      {/* ── News ── */}
      <section className="border-b border-border bg-muted/20 py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            News
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Coverage from tournaments run through this system.
          </p>

          <div className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 hide-scrollbar">
            {newsItems.map((item) => (
              <NewsCard key={item.url} url={item.url} thumbnail={item.thumbnail} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 divide-y divide-border px-6 py-12 sm:grid-cols-2 sm:gap-8 sm:divide-x sm:divide-y-0">
          <div className="sm:pr-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Collaborators &amp; Sponsors
            </h3>
            <div className="mt-5 flex flex-wrap gap-4">
              {sponsors.map((sponsor, i) => (
                <div
                  key={i}
                  className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center text-[11px] text-muted-foreground"
                >
                  {sponsor.logo ? (
                    <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    sponsor.name
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-10 sm:pl-8 sm:pt-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contact Us
            </h3>
            <div className="mt-5 flex flex-col gap-3">
              <a href={`tel:${contactInfo.phone}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary">
                <Phone className="size-4 text-muted-foreground" /> {contactInfo.phone}
              </a>
              <a href={`mailto:${contactInfo.email}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary">
                <Mail className="size-4 text-muted-foreground" /> {contactInfo.email}
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border py-6">
          <p className="mx-auto w-full max-w-6xl px-6 text-xs text-muted-foreground">
            AW Drone Soccer Leagues System
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Stat cell ── */
function Stat({ value, label, icon: Icon }: { value: string; label: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col justify-center gap-2 bg-white/5 px-6 py-6">
      <Icon className="size-4 text-gold" />
      <span className="font-mono text-2xl font-bold tabular-nums text-white">{value}</span>
      <span className="text-xs uppercase tracking-wider text-white/60">{label}</span>
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
