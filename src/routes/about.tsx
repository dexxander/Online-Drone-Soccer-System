import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Users, Camera, Github, Linkedin, Mail } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { auth } from "@/lib/store";
import DroneArena from "@/components/DroneArena";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Drone Soccer League Control" },
      {
        name: "description",
        content: "Why this platform exists, and the team building it.",
      },
    ],
  }),
  component: AboutPage,
});

/* ────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER DATA — replace with the real team info.
 *
 * For each developer:
 *  - photo: put the real headshot in /public (e.g. /public/team/jane.jpg)
 *           and reference it here as "/team/jane.jpg". Leave it as `null`
 *           to keep showing the initials placeholder circle.
 *  - name / role / bio / links: swap in the real values.
 * ──────────────────────────────────────────────────────────────────────── */
const DEVELOPERS: Array<{
  name: string;
  role: string;
  bio: string;
  photo: string | null;
  email?: string;
  github?: string;
  linkedin?: string;
}> = [
  {
    name: "Dexter Oliver Robilin",
    role: "Lead Developer",
    bio: "Lead the development of this project, focusing on architecture and core features.",
    photo: null, // e.g. "/team/developer-one.jpg"
    email: "deux15012@gmail.com",
    github: "https://github.com/dexxander",
    linkedin: "https://www.linkedin.com/in/dexteroliverrobilin/",
  },
  {
    name: "Trevor Leong Thomas",
    role: "Frontend Developer",
    bio: "Design the referee and scoreboard interfaces, ensuring a smooth user experience.Created Drone SVG animations for the landing page.",
    photo: null, // e.g. "/team/developer-two.jpg"
    email: "trevorleongthomas@@gmail.com",
    github: "https://github.com/trevorleong55",
    linkedin: "https://www.linkedin.com/in/trevorleongthomas/",
  },
  {
    name: "Job Vinius",
    role: "Frontend Developer",
    bio: "Design the admin and coach interfaces, and implement the frontend workflow logic for match management.",
    photo: null, // e.g. "/team/developer-three.jpg"
    email: "jobvinius442@gmail.com",
    github: "https://github.com/JoblessPP",
    linkedin: "https://www.linkedin.com/in/jobvinius/",
  },
];

/* Group photo — set this to the real image path once you have one, e.g.
 * "/team/group-photo.jpg" after adding the file to /public/team/. Leave it
 * `null` to keep showing the placeholder frame below. */
const GROUP_PHOTO: string | null = null;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AboutPage() {
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
              to="/tickets"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Tickets
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-bold text-foreground sm:block"
            >
              About
            </Link>
            <NotificationMenu />
            <AccountMenu />
          </nav>
        </div>
      </header>

      {/* ── Purpose ── */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-14">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Target className="size-3.5" /> About this project
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              One shared source of truth for a drone soccer match day.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
              {/* PLACEHOLDER copy — replace with your real project description. */}
              Drone Soccer League Control exists to take a league's match day off spreadsheets and
              walkie-talkies and put it in one connected system. Coaches register their teams and
              rosters, admins approve entries and build tournament brackets, referees run the clock
              and score from pitchside, and every call is broadcast to the live scoreboard instantly —
              all reading from the same shared state, so nobody in the venue is ever looking at stale
              numbers.
            </p>
          </div>

          {/* Live drone arena — drag the drones through the goals */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:aspect-video">
            <DroneArena />
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Users className="size-3.5" /> The team
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Meet the developers
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {/* PLACEHOLDER copy */}
            The developers behind this SaaS platform.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DEVELOPERS.map((dev) => (
              <div
                key={dev.name}
                className="flex flex-col items-center rounded-xl border border-border bg-background p-6 text-center shadow-card"
              >
                {dev.photo ? (
                  <img
                    src={dev.photo}
                    alt={dev.name}
                    className="size-24 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                    {initials(dev.name)}
                  </span>
                )}
                <h3 className="mt-4 text-sm font-bold text-foreground">{dev.name}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{dev.role}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{dev.bio}</p>
                <div className="mt-4 flex items-center gap-3">
                  {dev.email && (
                    <a
                      href={`mailto:${dev.email}`}
                      aria-label={`Email ${dev.name}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="size-4" />
                    </a>
                  )}
                  {dev.github && (
                    <a
                      href={dev.github}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${dev.name} on GitHub`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Github className="size-4" />
                    </a>
                  )}
                  {dev.linkedin && (
                    <a
                      href={dev.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${dev.name} on LinkedIn`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Linkedin className="size-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Group photo ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Camera className="size-3.5" /> Group photo
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">The team, together</h2>

        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-background shadow-card">
          {GROUP_PHOTO ? (
            <img src={GROUP_PHOTO} alt="The team" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-muted text-muted-foreground">
              <Camera className="size-8" />
              <p className="text-sm font-semibold">Group photo placeholder</p>
              <p className="max-w-xs text-center text-xs">
                Add the real photo to /public/team/group-photo.jpg and set GROUP_PHOTO in about.tsx
              </p>
            </div>
          )}
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