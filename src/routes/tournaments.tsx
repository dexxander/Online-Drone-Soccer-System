import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Trophy,
  Search,
  Calendar,
  Clock,
  Pin,
  ChevronRight,
  Radio,
  Sparkles,
  Newspaper,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { LogoMark } from "@/components/LogoMark";
import { auth } from "@/lib/store";
import type { MatchStatus, Tournament, TournamentMatch } from "@/lib/types";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — AW Drone Soccer Leagues System" },
      {
        name: "description",
        content:
          "Official Drone Soccer Tournament Portal. Track upcoming tournaments, scheduled match dates and start times, live scores, and official league news.",
      },
    ],
  }),
  component: TournamentsUserPage,
});

type SyncedTournamentMatch = TournamentMatch & {
  scoreA?: number;
  scoreB?: number;
  status?: MatchStatus;
};

function TournamentsUserPage() {
  const { state } = useMockWebSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const liveMatch = state.match;
  const isMatchLive = liveMatch.status === "live" || liveMatch.status === "paused";

  // Filter Announcements
  const filteredAnnouncements = useMemo(() => {
    return (state.announcements || []).filter((a) => {
      const matchesCategory = selectedCategory === "All" || a.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [state.announcements, selectedCategory, searchQuery]);

  const pinnedAnnouncement = useMemo(() => {
    return (state.announcements || []).find((a) => a.pinned) || state.announcements?.[0] || null;
  }, [state.announcements]);

  // Extract all upcoming matches across all tournaments
  const upcomingMatches = useMemo(() => {
    const list: Array<{ match: SyncedTournamentMatch; tournament: Tournament }> = [];
    (state.tournaments || []).forEach((t) => {
      t.matches.forEach((m) => {
        if (!m.isBye && (m.teamAId || m.teamBId)) {
          list.push({ match: m as SyncedTournamentMatch, tournament: t });
        }
      });
    });

    return list
      .filter(({ match, tournament }) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const teamA = (state.teams || []).find((t) => t.id === match.teamAId)?.name || "";
        const teamB = (state.teams || []).find((t) => t.id === match.teamBId)?.name || "";
        return (
          tournament.name.toLowerCase().includes(q) ||
          teamA.toLowerCase().includes(q) ||
          teamB.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.match.round - b.match.round || a.match.slot - b.match.slot);
  }, [state.tournaments, state.teams, searchQuery]);

  // Filter tournaments
  const tournaments = useMemo(() => {
    return (state.tournaments || []).filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q));
    });
  }, [state.tournaments, searchQuery]);

  const teamName = (id: string | null) => {
    if (!id) return "TBD";
    const team = (state.teams || []).find((t) => t.id === id);
    return team ? team.name : "TBD";
  };

  const getRoundLabel = (round: number, maxRound: number) => {
    if (maxRound === 1) return "Exhibition Match";
    if (round === maxRound) return "Grand Final";
    if (round === maxRound - 1) return "Semifinals";
    if (round === maxRound - 2) return "Quarterfinals";
    return `Round ${round}`;
  };

  const currentUser = auth.current();
  const isCoach = currentUser?.role === "coach";

  return (
    <div className="min-h-screen bg-surface text-foreground">
      {/* ── Public Top Navigation Header (Identical to Landing Page Nav) ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="size-9 shadow-lift" />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">AW DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Leagues System
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/tournaments"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-bold text-foreground sm:block"
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

      {/* ── Live Score Ticker Banner (if match is live) ── */}
      {isMatchLive && (
        <div className="border-b border-primary/30 bg-primary/10 px-6 py-2.5 shadow-inner">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive-foreground animate-pulse">
                <Radio className="size-3" /> LIVE NOW
              </span>
              <span className="font-bold text-foreground">
                {liveMatch.tournamentName || "League Match"}:
              </span>
              <span className="font-semibold text-foreground">
                {liveMatch.teamAName} <span className="text-primary font-bold">{liveMatch.scoreA}</span> -{" "}
                <span className="text-primary font-bold">{liveMatch.scoreB}</span> {liveMatch.teamBName}
              </span>
            </div>

            <Link
              to="/scoreboard"
              className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
            >
              Watch Arena Scoreboard Live <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Tournament Portal Content ── */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Page Title & Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Tournament Hub
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              Tournaments & Upcoming Matches
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Track upcoming tournaments, match start dates & times, and league announcements.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matches, teams, news..."
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
        </div>

        {/* 3-Column Tournament Hub Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ── LEFT COLUMN: Categories & Platform Info (3 Cols) ── */}
          <aside className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-border bg-background p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Layers className="size-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  News Categories
                </h2>
              </div>
              <div className="flex flex-col gap-1">
                {["All", "Tournament", "Rule Update", "General", "Maintenance"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {cat === "All"
                        ? (state.announcements || []).length
                        : (state.announcements || []).filter((a) => a.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Highlights Box */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-muted/50 p-5 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Sparkles className="size-4" /> Real-Time League Sync
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All tournament brackets, upcoming match start dates, referee calls, and live arena scoreboards are synced instantaneously across all devices.
              </p>
              <div className="pt-2">
                <Link
                  to="/matches"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  Explore All Matches & Brackets <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* ── CENTER COLUMN: News Feed & Announcements (5 Cols) ── */}
          <section className="space-y-6 lg:col-span-5">
            {/* Featured Hero News Banner */}
            {pinnedAnnouncement && (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-card hover:border-primary/50 transition-all">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-primary mb-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    <Pin className="size-3" /> Featured Announcement
                  </span>
                  <span className="text-muted-foreground font-normal">
                    {new Date(pinnedAnnouncement.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-foreground hover:text-primary transition-colors">
                  {pinnedAnnouncement.title}
                </h2>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {pinnedAnnouncement.content}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                  <span>Author: <strong className="text-foreground">{pinnedAnnouncement.author}</strong></span>
                  <span className="rounded bg-muted px-2 py-0.5 font-semibold text-foreground">
                    {pinnedAnnouncement.category}
                  </span>
                </div>
              </div>
            )}

            {/* News Feed Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Newspaper className="size-4 text-primary" /> Latest League Updates
                </h2>
                <span className="text-xs text-muted-foreground">
                  Showing {filteredAnnouncements.length} Articles
                </span>
              </div>

              {filteredAnnouncements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No announcements found matching your filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAnnouncements.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-border bg-background p-4 shadow-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-semibold text-foreground">
                          {item.category}
                        </span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── RIGHT COLUMN: Upcoming Matches & Upcoming Tournaments (4 Cols) ── */}
          <aside className="space-y-8 lg:col-span-4">
            {/* UPCOMING MATCHES BOX */}
            <div className="rounded-2xl border border-border bg-background p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> Upcoming Matches
                </h2>
                <Link to="/matches" className="text-[11px] font-bold text-primary hover:underline">
                  View All ({upcomingMatches.length})
                </Link>
              </div>

              {upcomingMatches.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  No upcoming matches scheduled.
                </p>
              ) : (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {upcomingMatches.map(({ match, tournament }) => {
                    const maxRound = Math.max(...tournament.matches.map((m) => m.round));
                    const isWinnerA = match.winnerId && match.winnerId === match.teamAId;
                    const isWinnerB = match.winnerId && match.winnerId === match.teamBId;

                    return (
                      <div
                        key={match.id}
                        className="rounded-xl border border-border bg-muted/20 p-3 shadow-xs hover:border-primary/40 transition-all space-y-2"
                      >
                        {/* Round Header & Scheduled Date/Time */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground border-b border-border/40 pb-1.5">
                          <span className="uppercase tracking-wider text-primary">
                            {getRoundLabel(match.round, maxRound)}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-foreground">
                            <Calendar className="size-3 text-muted-foreground" />
                            {match.scheduledDate || "AUG 6, 2026"} · {match.scheduledTime || "14:00 PM"}
                          </span>
                        </div>

                        {/* Match Teams Row */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={isWinnerA ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                              {teamName(match.teamAId)}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {match.scoreA !== undefined ? match.scoreA : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={isWinnerB ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                              {teamName(match.teamBId)}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {match.scoreB !== undefined ? match.scoreB : "-"}
                            </span>
                          </div>
                        </div>

                        {/* Tournament Source Badge */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[180px] font-medium">{tournament.name}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-bold uppercase text-foreground">
                            Scheduled
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* UPCOMING & ACTIVE TOURNAMENTS BOX */}
            <div className="rounded-2xl border border-border bg-background p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Trophy className="size-4 text-primary" /> Upcoming Tournaments
                </h2>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {tournaments.length} Active
                </span>
              </div>

              {tournaments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  No active tournaments.
                </p>
              ) : (
                <div className="space-y-3">
                  {tournaments.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-border bg-muted/20 p-3 shadow-xs space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground hover:text-primary">
                          {t.name}
                        </span>
                        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {t.category || "Open"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="capitalize font-semibold text-foreground">
                          Status: {t.status}
                        </span>
                        <span>
                          {t.teamIds.length} / {t.teamQuota || 8} Teams Registered
                        </span>
                      </div>

                      <div className="pt-1 grid grid-cols-2 gap-2">
                        <Link
                          to="/matches"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-1.5 text-[11px] font-bold text-foreground hover:bg-muted transition-colors shadow-xs"
                        >
                          View Bracket <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ── Public Footer ── */}
      <footer className="mt-12 border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row text-xs text-muted-foreground">
          <p>© 2026 Online Drone Soccer System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-foreground">About Platform</Link>
            <Link to="/tournaments" className="hover:text-foreground">Tournaments Hub</Link>
            <Link to="/matches" className="hover:text-foreground">Matches & Brackets</Link>
            <Link to="/scoreboard" className="hover:text-foreground">Arena Scoreboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
