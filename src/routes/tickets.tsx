import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Ticket,
  CheckCircle2,
  Calendar,
  MapPin,
  QrCode,
  CreditCard,
  Printer,
  X,
  User,
  Mail,
  Phone,
  ShieldAlert,
  Users,
  Minus,
  Plus,
} from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { Tournament } from "@/lib/types";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Spectator Tickets — AW Drone Soccer Leagues System" },
      {
        name: "description",
        content: "Register as a spectator for live Drone Soccer tournaments. Free seating admission & instant E-ticket pass.",
      },
    ],
  }),
  component: TicketsPage,
});

type PricingMode = "free" | "paid";

function TicketsPage() {
  const { state } = useMockWebSocket();
  const search = useSearch({ strict: false }) as { tournamentId?: string };

  // Select initial tournament
  const initialTournament = useMemo(() => {
    if (search.tournamentId) {
      return state.tournaments.find((t) => t.id === search.tournamentId) || state.tournaments[0] || null;
    }
    return state.tournaments[0] || null;
  }, [state.tournaments, search.tournamentId]);

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(initialTournament);
  const [pricingMode, setPricingMode] = useState<PricingMode>("free");
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);

  // Spectator Form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [formError, setFormError] = useState("");

  // Digital Ticket Modal state
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketId: string;
    visitorName: string;
    visitorEmail: string;
    tournamentName: string;
    quantity: number;
    issuedAt: string;
  } | null>(null);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pricingMode === "paid") {
      setFormError("Paid ticketing is not available yet. Switch to Free Admission to continue.");
      return;
    }
    if (!selectedTournament) {
      setFormError("Please select a tournament.");
      return;
    }
    if (!visitorName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }
    if (!visitorEmail.trim() || !visitorEmail.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setFormError("");
    const ticketCode = `DST-${Math.floor(100000 + Math.random() * 900000)}`;

    setIssuedTicket({
      ticketId: ticketCode,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim(),
      tournamentName: selectedTournament.name,
      quantity: ticketQuantity,
      issuedAt: new Date().toLocaleString(),
    });
  };

  return (
    <PublicLayout>
      {/* ── Main Container ── */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* The page starts with the decision users came to make: choose a match and reserve entry. */}
        <div className="flex flex-col gap-7 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Spectator access
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Reserve your place at the arena.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Choose a tournament, tell us who is coming, and receive a scannable spectator pass. Seating is free and open on a first-come, first-served basis.
            </p>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="flex w-full items-center rounded-lg border border-border bg-muted/40 p-1 sm:w-auto">
            <button
              type="button"
              aria-pressed={pricingMode === "free"}
              onClick={() => setPricingMode("free")}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:px-4 ${
                pricingMode === "free"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ticket className="size-4" aria-hidden="true" /> Free entry
            </button>
            <button
              type="button"
              aria-pressed={pricingMode === "paid"}
              onClick={() => setPricingMode("paid")}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:px-4 ${
                pricingMode === "paid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard className="size-4" aria-hidden="true" /> Paid later
            </button>
          </div>
        </div>

        {/* Paid Mode Placeholder Alert Banner */}
        {pricingMode === "paid" && (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-foreground">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold">
                  Paid tickets are not available yet.
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This view is reserved for a future payment flow. Switch back to <strong className="text-foreground">Free entry</strong> to register now.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Booking Grid ── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Tournament Selection & Free Seating Info (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Tournament Picker */}
            <div className="rounded-xl border border-border bg-background p-5 shadow-card sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Step 01</p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">Choose a tournament</h2>
                </div>
                <Calendar className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>

              {state.tournaments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">No active tournaments scheduled.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Please check back when the next arena date is published.</p>
                </div>
              ) : (
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {state.tournaments.map((t) => {
                    const isSelected = selectedTournament?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTournament(t)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center justify-between rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                              isSelected
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            {isSelected ? <CheckCircle2 className="size-4 text-primary" /> : <Calendar className="size-4" />}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-foreground">
                              {t.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                              <span>{t.category || "Open"} division</span>
                              <span className="flex items-center gap-1"><MapPin className="size-3" /> Arena Court A</span>
                              <span>{t.teamIds.length} Teams</span>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                            Chosen
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Free Seating Admission Details */}
            <div className="space-y-4 rounded-xl border border-border bg-background p-5 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Step 02</p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">Set your pass quantity</h2>
                </div>
                <Users className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>

              {/* Free Seating Explanation Banner (High-contrast White Background with Black Text) */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-bold text-foreground">
                  Open seating at the arena
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Seating is first-come, first-served. Your pass is used for entry validation at the gate.
                </p>
              </div>

              {/* Pass Quantity Selector */}
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Number of Spectator Passes</h3>
                  <p className="text-xs text-muted-foreground">Select total passes needed for you and your guests.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Remove one spectator pass"
                    onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                    className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="font-mono text-base font-bold text-foreground w-6 text-center">
                    {ticketQuantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Add one spectator pass"
                    onClick={() => setTicketQuantity(Math.min(5, ticketQuantity + 1))}
                    className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Spectator Details Form (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-xl border border-border bg-background p-5 shadow-lift sm:p-6">
              <div className="border-b border-border pb-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Step 03</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-foreground">Your details</h2>
                  <span className="text-xs font-bold text-success">
                    {pricingMode === "free" ? "Free entry" : "Unavailable"}
                  </span>
                </div>
              </div>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4">
                {/* Selected Info Summary */}
                <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tournament:</span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[180px]">
                      {selectedTournament?.name || "None Selected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seating Format:</span>
                    <span className="font-semibold text-foreground">Free Open Seating</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pass Quantity:</span>
                    <span className="font-bold text-primary">{ticketQuantity} Spectator Pass{ticketQuantity > 1 ? "es" : ""}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-sm">
                    <span>Total Fee:</span>
                    <span className="text-success">
                      {pricingMode === "free" ? "FREE ($0.00)" : "Unavailable"}
                    </span>
                  </div>
                </div>

                {/* Visitor Fields */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={visitorEmail}
                        onChange={(e) => setVisitorEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Contact / WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={visitorPhone}
                        onChange={(e) => setVisitorPhone(e.target.value)}
                        placeholder="+60 12-345 6789"
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={pricingMode === "paid"}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <QrCode className="size-4" />
                  {pricingMode === "free" ? "Create spectator pass" : "Payment unavailable"}
                </button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Your pass is generated immediately with a scannable QR code.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ── Digital E-Ticket Pass Modal ── */}
      {issuedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-2xl">
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-primary-foreground text-center relative">
              <button
                onClick={() => setIssuedTicket(null)}
                className="absolute right-3 top-3 rounded-full bg-black/20 p-1 hover:bg-black/40 text-white"
              >
                <X className="size-5" />
              </button>

              <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                OFFICIAL SPECTATOR PASS
              </span>
              <h2 className="mt-2 text-xl font-bold">{issuedTicket.tournamentName}</h2>
              <p className="text-xs opacity-90">Arena Flight Cage Gallery · Free Seating</p>
            </div>

            {/* Ticket Content Body */}
            <div className="p-6 space-y-4">
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
                <div className="rounded-lg bg-white p-3 shadow-md">
                  {/* Dynamic QR Code representation */}
                  <svg className="size-28" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="white" />
                    <path
                      d="M10,10 h30 v30 h-30 z M15,15 h20 v20 h-20 z M20,20 h10 v10 h-10 z"
                      fill="#0f172a"
                    />
                    <path
                      d="M60,10 h30 v30 h-30 z M65,15 h20 v20 h-20 z M70,20 h10 v10 h-10 z"
                      fill="#0f172a"
                    />
                    <path
                      d="M10,60 h30 v30 h-30 z M15,65 h20 v20 h-20 z M20,70 h10 v10 h-10 z"
                      fill="#0f172a"
                    />
                    <rect x="50" y="50" width="10" height="10" fill="#0f172a" />
                    <rect x="70" y="50" width="15" height="10" fill="#0f172a" />
                    <rect x="50" y="70" width="20" height="15" fill="#0f172a" />
                    <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
                  </svg>
                </div>
                <span className="mt-2 font-mono text-xs font-bold text-foreground">
                  PASS ID: {issuedTicket.ticketId}
                </span>
                <span className="text-[10px] text-muted-foreground">Scan at entrance gate for venue admission</span>
              </div>

              {/* Pass Details */}
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-border pt-3">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Spectator Name</span>
                  <span className="font-bold text-foreground">{issuedTicket.visitorName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Email</span>
                  <span className="font-semibold text-foreground truncate block">{issuedTicket.visitorEmail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Seating Format</span>
                  <span className="font-bold text-primary">Free Open Seating</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Pass Quantity</span>
                  <span className="font-bold text-emerald-600">{issuedTicket.quantity} Pass{issuedTicket.quantity > 1 ? "es" : ""}</span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                ⚠️ <strong>Safety Notice:</strong> Please remain behind the arena safety netting during active drone flights.
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-xs font-semibold hover:bg-muted"
                >
                  <Printer className="size-4" /> Print / Save Pass
                </button>
                <button
                  onClick={() => setIssuedTicket(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Register Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
