import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Quote } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/about/founder")({
  head: () => ({
    meta: [
      { title: "Founders — AW Drone Soccer Leagues System" },
      { name: "description", content: "The faculty advisors behind the drone soccer program at KKHS." },
    ],
  }),
  component: FounderPage,
});

/* ────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER DATA — swap in the real bios and photos once available.
 * These two names come from the official rulebook credit line
 * ("Prepared by: Professor Dr. Edmund Ng & Dr. Hujie"); confirm titles
 * and roles with them directly before publishing.
 * ──────────────────────────────────────────────────────────────────────── */
const FOUNDERS: Array<{
  name: string;
  role: string;
  bio: string;
  quote: string;
  photo: string | null;
}> = [
  {
    name: "Professor Dr. Edmund Ng",
    role: "Program Advisor, DAICOE",
    bio: "Oversees the drone soccer program at KKHS, including the official rulebook and competition standards this platform is built around.",
    quote: "Drone soccer teaches precision, teamwork, and fair play as much as any traditional sport.",
    photo: null,
  },
  {
    name: "Dr. Hujie",
    role: "Program Advisor, DAICOE",
    bio: "Co-author of the F9A-B rulebook and a driving force behind bringing structured youth drone soccer competitions to Sabah.",
    quote: "Every match should run on the same numbers, whether you're pitchside or watching from home.",
    photo: null,
  },
];

function initials(name: string) {
  return name
    .replace(/^(Professor|Dr\.)\s*/gi, "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function FounderPage() {
  return (
    <PublicLayout>
      {/* ── Intro ── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" /> Founders
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            The people who built the program this platform runs on.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Before there was a scoreboard to build, there was a rulebook and a competition format.
            AW Drone Soccer Leagues System exists to serve the program these advisors created at KKHS.
          </p>
        </div>
      </section>

      {/* ── Founder profiles ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2">
          {FOUNDERS.map((founder) => (
            <div key={founder.name} className="flex flex-col gap-5">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                {founder.photo ? (
                  <img src={founder.photo} alt={founder.name} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center">
                    <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                      {initials(founder.name)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">{founder.name}</h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  {founder.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{founder.bio}</p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-4 shadow-card">
                <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm italic leading-relaxed text-muted-foreground">"{founder.quote}"</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}