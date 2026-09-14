import { createFileRoute } from "@tanstack/react-router";
import { Award, GraduationCap, Users, Wrench } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/about/credits")({
  head: () => ({
    meta: [
      { title: "Credits — AW Drone Soccer Leagues System" },
      { name: "description", content: "Everyone and everything behind this platform." },
    ],
  }),
  component: CreditsPage,
});

const ADVISORS = ["Professor Dr. Edmund Ng", "Dr. Hujie"];

const DEVELOPERS = ["Dexter Oliver Robilin", "Trevor Leong Thomas", "Job Vinius Johnny"];

/* PLACEHOLDER — swap in the real acknowledgments once confirmed. */
const ACKNOWLEDGMENTS = [
  "KKHS (Kolun Kuan Ho Secondary School) for hosting the program",
  "DAICOE for the official F9A-B rulebook and competition standards",
];

const BUILT_WITH = [
  "React & TanStack Router",
  "Tailwind CSS & shadcn/ui",
  "Supabase",
  "Recharts",
];

function CreditGroup({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Award;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreditsPage() {
  return (
    <PublicLayout>
      {/* ── Intro ── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Award className="size-3.5" /> Credits
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Built by a few people, made possible by more.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            A short list of everyone and everything that made this platform possible.
          </p>
        </div>
      </section>

      {/* ── Credit groups ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <CreditGroup icon={GraduationCap} title="Faculty advisors" items={ADVISORS} />
          <CreditGroup icon={Users} title="Development team" items={DEVELOPERS} />
          <CreditGroup icon={Award} title="Acknowledgments" items={ACKNOWLEDGMENTS} />
          <CreditGroup icon={Wrench} title="Built with" items={BUILT_WITH} />
        </div>
      </section>
    </PublicLayout>
  );
}