import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Users,
  LayoutGrid,
  Cpu,
  Timer,
  Target,
  ShieldAlert,
  Trophy,
  Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/about/rules")({
  head: () => ({
    meta: [
      { title: "Rules — AW Drone Soccer Leagues System" },
      {
        name: "description",
        content: "The essential 3v3 youth drone soccer rules: field, hardware, scoring, fouls and format.",
      },
    ],
  }),
  component: RulesPage,
});

/* Condensed from the official 3v3 Youth Drone Soccer rulebook
 * (F9A-B 200mm standard). Each section mirrors one numbered block of the
 * rulebook poster. */
const SECTIONS: Array<{
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
  points: string[];
}> = [
  {
    n: "01",
    icon: Users,
    title: "Team composition",
    body: "Three players take the field per side: one forward and two defenders, with up to two substitutes and one coach on the sideline.",
    points: [
      "On field: 1 Forward (LED drone), 2 Defenders",
      "Up to 2 substitutes and 1 coach or team leader",
      "Only the forward's drone carries LED lights for identification",
      "Only LED-equipped drones are allowed on court; drones modified to increase attack power or interfere with opponents are disqualified",
      "Teams are grouped by age: Primary (Lower/Upper), Junior High, Senior High/Vocational",
    ],
  },
  {
    n: "02",
    icon: LayoutGrid,
    title: "Field and goal standards",
    body: "Matches are played in one of two standard cage sizes, both fully enclosed, with a controlled area for pilots and coaches outside the perimeter.",
    points: [
      "Education Youth League: 6m × 3m × 3m",
      "Physical Education Bureau League: 14m × 7m × 5m",
      "Goal inner diameter: 400mm, boundary line width 1m",
      "Center kick-off circle diameter: 2m",
      "Operation area is outside the field perimeter; only pilots and coaches may enter it",
    ],
  },
  {
    n: "03",
    icon: Cpu,
    title: "Drone and hardware specifications",
    body: "Every drone is built around the same 200mm protective cage, with strict limits on power and weight to keep the sport safe at close range.",
    points: [
      "200mm spherical cage, non-metallic plastic, metal frames or wires prohibited",
      "Wireless control, battery ≤17V, weight ≤300g, max 4 motors",
      "GPS, altitude hold and auxiliary stabilization are required",
      "LED colors are uniform per team: red vs blue, mounted on the front for identification",
    ],
  },
  {
    n: "04",
    icon: Timer,
    title: "Match duration",
    body: "A full match runs 8 minutes across two halves, with a short prep window before kickoff and a defined tie-break procedure if scores are level.",
    points: [
      "1 minute pre-match preparation to test and warm up drones",
      "First half 3 minutes, half-time break 1 minute, second half 3 minutes",
      "Tied after full time: 2-minute golden-goal extra time",
      "Still tied: sudden-death shootout, one shooter per team per round",
    ],
  },
  {
    n: "05",
    icon: Target,
    title: "Scoring and goal validation",
    body: "A goal only counts once the drone has fully cleared the far side of the ring, and there is a specific restart procedure after every score.",
    points: [
      "Valid goal: the entire drone passes completely through the opponent's goal — 1 point",
      "Own goal: drone enters its own goal — 1 point awarded to the opponent",
      "After a goal, the scoring team's drone returns to its own half before the restart",
      "Play restarts from the center circle",
    ],
  },
  {
    n: "06",
    icon: ShieldAlert,
    title: "Fouls, warnings and penalties",
    body: "Discipline escalates in three tiers, from a warning through a yellow-card suspension to outright disqualification for serious offenses.",
    points: [
      "Warning: unsafe takeoff or collision, coaching/family/subs entering the field, repeatedly entering the operating area, disrespecting officials — two warnings equal a yellow card",
      "Yellow card: 1-minute suspension for repeating a warned violation, switching or interfering with an opponent's controller, intentional destruction, or unsportsmanlike conduct — a second yellow is a red card",
      "Red card / disqualification: deliberately attacking people or equipment, damaging the field, or verbal abuse and serious misconduct",
    ],
  },
  {
    n: "07",
    icon: Trophy,
    title: "Competition format",
    body: "Tournaments run a round-robin group stage before moving into single-elimination knockouts, with a clear tiebreaker order for seeding.",
    points: [
      "Group stage: round robin within each group — win 3pts, draw 1pt, loss 0pts",
      "Knockout stage: single elimination, first loss eliminates a team",
      "Ranking ties broken in order: points, then goal difference, then total goals",
    ],
  },
  {
    n: "08",
    icon: Flag,
    title: "Win determination",
    body: "The team with more goals at full time wins outright; unresolved matches move through extra time and then a shootout.",
    points: [
      "Most goals at the end of regulation wins the match",
      "Level at full time: 2-minute golden-goal extra time",
      "Still level: sudden-death shootout decides the winner",
      "Two yellow cards or one red card on a team results in a forfeit to the opponent",
    ],
  },
];

function RulesPage() {
  return (
    <PublicLayout>
      {/* ── Intro ── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="size-3.5" /> Rules
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            3v3 Youth Drone Soccer, the essentials.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            The condensed F9A-B 200mm standard used across national youth competitions: how teams
            are set up, what the drones must meet, and how a match is scored, officiated, and won.
          </p>
        </div>
      </section>

      {/* ── Rule sections ── */}
      {SECTIONS.map((section, i) => (
        <section key={section.n} className="border-b border-border last:border-0">
          <div
            className={`mx-auto flex w-full max-w-6xl flex-col items-start gap-10 px-6 py-16 lg:flex-row lg:gap-16 ${
              i % 2 === 1 ? "lg:flex-row-reverse" : ""
            }`}
          >
            {/* Visual panel */}
            <div className="flex w-full items-center justify-center rounded-xl border border-border bg-muted/30 py-14 lg:w-2/5">
              <div className="flex flex-col items-center gap-3">
                <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <section.icon className="size-7" />
                </span>
                <span className="font-mono text-4xl font-black text-muted-foreground/30">{section.n}</span>
              </div>
            </div>

            {/* Copy */}
            <div className="w-full lg:w-3/5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Rule {section.n}
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {section.title}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{section.body}</p>
              <ul className="mt-5 space-y-2.5">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </PublicLayout>
  );
}