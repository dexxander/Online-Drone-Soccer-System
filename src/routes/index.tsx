import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, ShieldCheck, Timer, Trophy, Users, Gauge } from "lucide-react";

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

const features = [
  {
    icon: Users,
    title: "Team & player registration",
    body: "Coaches submit rosters through a guided portal; entries land in the admin queue as pending.",
  },
  {
    icon: ShieldCheck,
    title: "Admin oversight",
    body: "Approve or reject teams and players from professional data tables with live counters.",
  },
  {
    icon: Gauge,
    title: "Referee match control",
    body: "Start, pause, resume and end matches with large scoring and penalty controls.",
  },
  {
    icon: Radio,
    title: "Real-time scoreboard",
    body: "Broadcast-ready display that syncs instantly across tabs and screens — no refresh.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">Drone Soccer</span>
              <span className="block text-xs text-muted-foreground">League Control</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/scoreboard"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            >
              Live scoreboard
            </Link>
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent px-3 py-1 text-xs font-semibold text-primary">
            <Trophy className="size-3.5" /> National Championship · Season 4
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
            Competition software for the drone soccer arena.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            One control plane for registrations, approvals, referee decisions and the live audience
            display — with real-time sync built in from the first whistle.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register-team"
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-colors hover:bg-primary/90"
            >
              Register your team
            </Link>
            <Link
              to="/scoreboard"
              className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Open live scoreboard
            </Link>
          </div>

          <dl className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              { k: "Registered clubs", v: "128", i: Users },
              { k: "Matches officiated", v: "1,940", i: Timer },
              { k: "Arena displays synced", v: "24", i: Radio },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border bg-background p-5 shadow-card">
                <s.i className="size-4 text-primary" />
                <dd className="mt-3 text-3xl font-bold tabular-nums">{s.v}</dd>
                <dt className="mt-1 text-sm text-muted-foreground">{s.k}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-border bg-background py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <h2 className="text-2xl font-bold tracking-tight">Everything a league day needs</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border border-border p-6">
                  <f.icon className="size-5 text-primary" />
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <p className="mx-auto w-full max-w-6xl px-6 text-xs text-muted-foreground">
          Drone Soccer League Control — prototype build. Data is stored locally and synced across tabs.
        </p>
      </footer>
    </div>
  );
}
