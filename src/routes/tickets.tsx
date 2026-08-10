import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Ticket,
  CheckCircle2,
  Calendar,
  MapPin,
  QrCode,
  CreditCard,
  Sparkles,
  Info,
  Printer,
  X,
  User,
  Mail,
  Phone,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import type { Tournament } from "@/lib/types";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Spectator Tickets — Drone Soccer League Control" },
      {
        name: "description",
        content: "Reserve your seat for live Drone Soccer tournaments. Free spectator registration & seating arrangement.",
      },
    ],
  }),
  component: TicketsPage,
});

interface Seat {
  id: string; // e.g. "A-1"
  row: string;
  number: number;
  isOccupied: boolean;
}

type PricingMode = "free" | "paid";

export function TicketsPage() {
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

  // Selected Zone state
  const [selectedZone, setSelectedZone] = useState<"Zone A" | "Zone B">("Zone A");

  // Selected Seats state
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

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
    zone: string;
    seats: string[];
    issuedAt: string;
  } | null>(null);

  // Pre-occupied mock seats
  const occupiedSeatIds = useMemo(
    () => new Set(["A-3", "A-4", "B-2", "B-7", "C-1", "C-8", "D-5"]),
    []
  );

  // Generate seats grid (Rows A-D, Seats 1-8)
  const rows = ["A", "B", "C", "D"];
  const seatsPerRow = 8;

  const toggleSeat = (seatId: string) => {
    if (occupiedSeatIds.has(seatId)) return;
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seatId));
    } else {
      if (selectedSeatIds.length >= 4) {
        setFormError("Maximum 4 seats allowed per spectator booking.");
        return;
      }
      setFormError("");
      setSelectedSeatIds([...selectedSeatIds, seatId]);
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) {
      setFormError("Please select a tournament.");
      return;
    }
    if (selectedSeatIds.length === 0) {
      setFormError("Please select at least 1 seat on the arena layout.");
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
      zone: selectedZone,
      seats: [...selectedSeatIds].sort(),
      issuedAt: new Date().toLocaleString(),
    });
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Header ── */}
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
              className="rounded-lg bg-primary/10 px-3 py-2 text-[13px] font-semibold text-primary"
            >
              Tickets 🎟️
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              About
            </Link>
            <NotificationMenu />
            <AccountMenu />
          </nav>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Title / Hero */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Spectator & Visitor Portal
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Book Spectator Seats
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Reserve your sitting position inside the drone match arena. Catch the live high-speed aerial goal action!
            </p>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1.5 self-start">
            <button
              onClick={() => setPricingMode("free")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                pricingMode === "free"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ticket className="size-4" /> Free Admission
            </button>
            <button
              onClick={() => setPricingMode("paid")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                pricingMode === "paid"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard className="size-4" /> Paid Tickets
            </button>
          </div>
        </div>

        {/* Paid Mode Placeholder Alert Banner */}
        {pricingMode === "paid" && (
          <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 text-purple-900 dark:text-purple-200">
            <div className="flex items-start gap-3">
              <CreditCard className="size-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">
                  💳 Payment Gateway Integration (UI Placeholder)
                </h3>
                <p className="mt-1 text-xs text-purple-700 dark:text-purple-300/80 leading-relaxed">
                  Paid ticket options (e.g. VIP Front-Row Pass, Premium Lounge) are currently set up as a frontend placeholder. Banking and payment processing APIs will be connected in the backend later. You can toggle to <strong>Free Admission</strong> to test the full seating reservation and instant online E-Ticket generation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Booking Grid ── */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Tournament & Seating Arrangement (8 cols) */}
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            {/* 1. Tournament Picker */}
            <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="size-4 text-primary" /> Step 1: Select Tournament
              </h2>

              {state.tournaments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No active tournaments scheduled at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {state.tournaments.map((t) => {
                    const isSelected = selectedTournament?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTournament(t)}
                        className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                              {t.category || "Open Division"}
                            </span>
                            {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                          </div>
                          <h3 className="mt-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {t.name}
                          </h3>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <MapPin className="size-3" /> Arena Court A · {t.teamIds.length} Teams
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Interactive Seating Arrangement Map */}
            <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Ticket className="size-4 text-primary" /> Step 2: Choose Your Seats
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Click available seats to reserve your spectator position.
                  </p>
                </div>

                {/* Zone Switcher */}
                <div className="flex items-center rounded-lg border border-border bg-muted/50 p-1">
                  <button
                    onClick={() => setSelectedZone("Zone A")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      selectedZone === "Zone A"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Zone A (North Stand)
                  </button>
                  <button
                    onClick={() => setSelectedZone("Zone B")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      selectedZone === "Zone B"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Zone B (South Stand)
                  </button>
                </div>
              </div>

              {/* Arena Visual Header / Flight Cage */}
              <div className="mt-6 flex flex-col items-center">
                <div className="relative w-full max-w-md rounded-lg border border-cyan-500/40 bg-cyan-950/20 py-3 text-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
                    🛸 DRONE MATCH FLIGHT CAGE / ARENA COURT 🛸
                  </span>
                  <p className="text-[10px] text-cyan-300/70">Safe high-density netting area</p>
                </div>
                <div className="my-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  ↑ SPECTATOR GALLERY SEATING ({selectedZone}) ↑
                </div>
              </div>

              {/* Seats Grid */}
              <div className="mt-4 flex flex-col items-center gap-3">
                {rows.map((row) => (
                  <div key={row} className="flex items-center gap-2 sm:gap-3">
                    <span className="w-5 text-center font-mono text-xs font-bold text-muted-foreground">
                      {row}
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {Array.from({ length: seatsPerRow }).map((_, idx) => {
                        const seatNumber = idx + 1;
                        const seatId = `${row}-${seatNumber}`;
                        const isOccupied = occupiedSeatIds.has(seatId);
                        const isSelected = selectedSeatIds.includes(seatId);

                        return (
                          <button
                            key={seatId}
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seatId)}
                            title={
                              isOccupied
                                ? `Seat ${seatId} is already booked`
                                : isSelected
                                ? `Seat ${seatId} selected`
                                : `Select Seat ${seatId}`
                            }
                            className={`flex size-8 sm:size-9 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                              isOccupied
                                ? "cursor-not-allowed bg-muted text-muted-foreground/40 border border-border/50 opacity-60"
                                : isSelected
                                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 scale-105 shadow-md"
                                : "border border-border bg-background hover:border-primary hover:text-primary hover:scale-105"
                            }`}
                          >
                            {seatNumber < 10 ? `0${seatNumber}` : seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Seating Legend */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-border pt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded-md border border-border bg-background" />
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded-md bg-primary" />
                  <span className="font-semibold text-primary">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded-md bg-muted border border-border/50" />
                  <span className="text-muted-foreground">Occupied</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Spectator Details & Checkout Summary (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24 rounded-xl border border-border bg-background p-6 shadow-card">
              <h2 className="text-base font-bold text-foreground border-b border-border pb-3 flex items-center justify-between">
                <span>Booking Summary</span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                  {pricingMode === "free" ? "Free Admission" : "Paid Tier"}
                </span>
              </h2>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4">
                {/* Selected Info Summary */}
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tournament:</span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[180px]">
                      {selectedTournament?.name || "None Selected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seating Zone:</span>
                    <span className="font-semibold text-foreground">{selectedZone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Picked Seats ({selectedSeatIds.length}):</span>
                    <span className="font-bold text-primary">
                      {selectedSeatIds.length > 0
                        ? selectedSeatIds.sort().join(", ")
                        : "No seats chosen"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-sm">
                    <span>Total Fee:</span>
                    <span className="text-emerald-600">
                      {pricingMode === "free" ? "FREE ($0.00)" : "RM 25.00"}
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
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
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
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
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
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lift transition-all hover:bg-primary/90"
                >
                  <QrCode className="size-4" />
                  {pricingMode === "free" ? "Generate Online Spectator E-Ticket" : "Proceed to Payment (Placeholder)"}
                </button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Instant E-Ticket pass generated immediately with scannable QR Code.
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
              <p className="text-xs opacity-90">Arena Flight Cage Gallery · General Admission</p>
            </div>

            {/* Ticket Content Body */}
            <div className="p-6 space-y-4">
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
                <div className="rounded-lg bg-white p-3 shadow-md">
                  {/* Dynamic QR Code representation */}
                  <svg className="size-28" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="white" />
                    {/* Pattern blocks */}
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
                  <span className="text-muted-foreground block text-[10px] uppercase">Seating Zone</span>
                  <span className="font-bold text-primary">{issuedTicket.zone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Reserved Seats</span>
                  <span className="font-bold text-emerald-600">{issuedTicket.seats.join(", ")}</span>
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
                  onClick={() => {
                    setIssuedTicket(null);
                    setSelectedSeatIds([]);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Book Another Seat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
