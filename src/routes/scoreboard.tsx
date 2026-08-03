import { createFileRoute } from "@tanstack/react-router";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live scoreboard — Drone Soccer League Control" },
      { name: "description", content: "Broadcast-ready live drone soccer scoreboard with real-time scores, timer and penalties." },
      { property: "og:title", content: "Live scoreboard — Drone Soccer" },
      { property: "og:description", content: "Real-time drone soccer match scores, clock and active penalties." },
    ],
  }),
  component: Scoreboard,
});

function Scoreboard() {
  const { state } = useMockWebSocket();
  const m = state.match;
  const clock = useMatchClock(m.elapsedMs, m.runningSince);

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.16_0.03_265)] px-6 py-8 text-[oklch(0.98_0_0)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[oklch(0.75_0.06_265)]">
            Live match
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{m.tournamentName}</h1>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${
            m.status === "live"
              ? "bg-[oklch(0.55_0.15_155)] text-white"
              : m.status === "paused"
                ? "bg-[oklch(0.6_0.14_70)] text-white"
                : "bg-white/10 text-white/70"
          }`}
        >
          {m.status}
        </span>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <TeamPanel name={m.teamAName} score={m.scoreA} />
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[oklch(0.75_0.06_265)]">
              Match time
            </p>
            <p className="mt-2 font-mono text-6xl font-bold tabular-nums md:text-7xl">
              {formatClock(clock)}
            </p>
          </div>
          <TeamPanel name={m.teamBName} score={m.scoreB} align="right" />
        </div>
      </main>

      <section className="border-t border-white/10 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[oklch(0.75_0.06_265)]">
          Active penalties
        </h2>
        {m.penalties.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No penalties issued.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {m.penalties.slice(0, 12).map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold"
              >
                <span className="text-[oklch(0.8_0.14_80)]">{p.type}</span>{" "}
                <span className="text-white/70">
                  · {p.side === "A" ? m.teamAName : m.teamBName} ·{" "}
                  {new Date(p.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TeamPanel({
  name,
  score,
  align = "left",
}: {
  name: string;
  score: number;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "md:text-right" : ""}>
      <p className="text-2xl font-semibold uppercase tracking-wide text-white/80 md:text-3xl">{name}</p>
      <p className="font-mono text-[7rem] font-bold leading-none tabular-nums md:text-[11rem]">{score}</p>
    </div>
  );
}
