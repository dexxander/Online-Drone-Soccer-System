import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/about/founder")({
  head: () => ({
    meta: [
      { title: "Founders — AW Drone Soccer Leagues System" },
      { name: "description", content: "The founders behind the drone soccer program at DAICOE KK High School." },
    ],
  }),
  component: FounderPage,
});

function FounderPage() {
  return (
    <PublicLayout>
      <section className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" /> Founders
        </span>
        <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          Coming soon
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          This page will introduce the founders of the drone soccer program at DAICOE KK High
          School. Details are on the way.
        </p>
      </section>
    </PublicLayout>
  );
}