import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LifeBuoy, Mail, Phone, Send, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — AW Drone Soccer Leagues System" },
      {
        name: "description",
        content: "Answers to common questions, plus a way to reach the team directly.",
      },
    ],
  }),
  component: SupportPage,
});

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How do I register my team?",
    a: "Go to Register Team from the navigation, create a coach account, and fill in your team's details and roster. An admin reviews and approves new teams before they can be entered into a tournament.",
  },
  {
    q: "How do I check when my team plays next?",
    a: "Visit the Matches page for a full chronological schedule, or your team's profile page under Teams for a match history and upcoming fixtures specific to your roster.",
  },
  {
    q: "Where can I follow a match live?",
    a: "The Scoreboard page mirrors the referee's console in real time, showing score, clock, and penalties as they happen pitchside.",
  },
  {
    q: "Who do I contact about a scoring dispute?",
    a: "Reach out to the tournament's assigned referee through the contact details on your event page, or use the form on this page and we'll route it to the right official.",
  },
  {
    q: "I found a bug or the site isn't loading correctly. What do I do?",
    a: "Send us a message below with what you were doing, your device and browser, and a screenshot if you have one. We look at every report.",
  },
];

function SupportPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.includes("@") || !form.message.trim()) {
      setError("Please fill in your name, a valid email, and a message.");
      return;
    }
    setError("");
    // NOTE: no backend endpoint wired up yet — swap this for a real API call
    // (e.g. an email service or a `support_tickets` table) when one exists.
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      {/* ── Intro ── */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <LifeBuoy className="size-3.5" /> Support
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Questions about registration, matches, or the platform? Start here.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Check the FAQ below first, most questions from coaches, referees, and spectators are
            answered there. Can't find what you need? Send us a message and we'll get back to you.
          </p>
        </div>
      </section>

      {/* ── FAQ + Contact ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* FAQ */}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-4">
              {FAQS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-sm font-semibold text-foreground">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact form */}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Contact us</h2>

            {submitted ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-8 text-center shadow-card">
                <CheckCircle2 className="size-8 text-primary" />
                <p className="text-sm font-semibold text-foreground">Message sent</p>
                <p className="text-sm text-muted-foreground">
                  Thanks, {form.name.split(" ")[0]}. We'll reply to {form.email} soon.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-border bg-background p-6 shadow-card">
                <div>
                  <label className="text-xs font-semibold text-foreground">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="auth-input mt-1.5"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="auth-input mt-1.5"
                    placeholder="you@club.io"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="auth-input mt-1.5"
                    placeholder="What's this about?"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="auth-input mt-1.5 min-h-[120px] resize-none"
                    placeholder="Tell us what's going on"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Send className="size-4" /> Send message
                </button>
              </form>
            )}

            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              <a href="tel:+60123456789" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                <Phone className="size-4 text-muted-foreground" /> +60 12-345 6789
              </a>
              <a href="mailto:contact@example.com" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                <Mail className="size-4 text-muted-foreground" /> contact@example.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}