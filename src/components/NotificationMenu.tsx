import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap,
  Radio,
  Megaphone,
  CheckCheck,
} from "lucide-react";
import { auth } from "@/lib/store";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CoachNotification {
  id: string;
  title: string;
  message: string;
  type:
    | "team_approved"
    | "team_rejected"
    | "player_approved"
    | "tournament_joined"
    | "tournament_started"
    | "match_live"
    | "announcement";
  timestamp: number;
  link: string;
  read: boolean;
}

const STORAGE_KEY = "ds_notifications_read_v1";

export function NotificationMenu() {
  const user = auth.current();
  const { state } = useMockWebSocket();
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    } catch (e) {
      console.error(e);
    }
  };

  const notifications = useMemo(() => {
    if (!user) return [];

    const list: CoachNotification[] = [];

    // Filter teams belonging to this user/coach
    const myTeams = (state.teams || []).filter(
      (t) =>
        t.ownerId === user.id ||
        t.contactEmail?.toLowerCase() === user.email.toLowerCase() ||
        t.coachName?.toLowerCase() === user.name.toLowerCase() ||
        user.role === "coach", // Show all coach teams for active coach session
    );

    // 1. Team Status Notifications
    myTeams.forEach((team) => {
      if (team.status === "approved") {
        list.push({
          id: `team-approved-${team.id}`,
          title: "Team Approved!",
          message: `Your team "${team.name}" has been approved by the league administration.`,
          type: "team_approved",
          timestamp: team.createdAt || Date.now() - 3600000,
          link: "/register-team",
          read: readIds.has(`team-approved-${team.id}`),
        });
      } else if (team.status === "rejected") {
        list.push({
          id: `team-rejected-${team.id}`,
          title: "Team Status Update",
          message: `Registration for "${team.name}" was not approved. Please review details.`,
          type: "team_rejected",
          timestamp: team.createdAt || Date.now() - 3600000,
          link: "/register-team",
          read: readIds.has(`team-rejected-${team.id}`),
        });
      }

      (state.players || [])
        .filter((player) => player.teamId === team.id && player.status === "approved")
        .forEach((player) => {
          list.push({
            id: `player-approved-${player.id}`,
            title: "Player Approved!",
            message: `Player "${player.name}" on "${team.name}" has been approved by the league administration.`,
            type: "player_approved",
            timestamp: player.createdAt || Date.now() - 3600000,
            link: "/register-team",
            read: readIds.has(`player-approved-${player.id}`),
          });
        });

      // 2. Tournament Joined & Active Notifications for team
      (state.tournaments || []).forEach((t) => {
        if (t.teamIds?.includes(team.id)) {
          list.push({
            id: `team-tourney-${team.id}-${t.id}`,
            title: "Enrolled in Tournament",
            message: `"${team.name}" is registered for "${t.name}".`,
            type: "tournament_joined",
            timestamp: t.createdAt || Date.now() - 1800000,
            link: "/tournaments",
            read: readIds.has(`team-tourney-${team.id}-${t.id}`),
          });

          if (t.status === "active") {
            list.push({
              id: `tourney-active-${t.id}-${team.id}`,
              title: "Tournament Started!",
              message: `Tournament "${t.name}" is now ACTIVE. Matches are being scheduled!`,
              type: "tournament_started",
              timestamp: Date.now() - 900000,
              link: "/tournaments",
              read: readIds.has(`tourney-active-${t.id}-${team.id}`),
            });
          }
        }
      });

      // 3. Live Match Notifications
      (state.matches || []).forEach((slot) => {
        if (
          slot?.match &&
          (slot.match.status === "live" || slot.match.status === "paused")
        ) {
          const match = slot.match;
          if (
            match.teamAName.toLowerCase() === team.name.toLowerCase() ||
            match.teamBName.toLowerCase() === team.name.toLowerCase()
          ) {
            list.push({
              id: `match-live-${match.id}-${team.id}`,
              title: "Live Match in Progress!",
              message: `${match.teamAName} vs ${match.teamBName} is currently live on Court ${slot.slotId}!`,
              type: "match_live",
              timestamp: Date.now(),
              link: "/matches",
              read: readIds.has(`match-live-${match.id}-${team.id}`),
            });
          }
        }
      });
    });

    // 4. Important Announcements for Coaches
    (state.announcements || []).slice(0, 3).forEach((ann) => {
      if (ann.category === "Urgent" || ann.category === "Tournament" || ann.pinned) {
        list.push({
          id: `announcement-${ann.id}`,
          title: `Announcement: ${ann.title}`,
          message: ann.content.length > 90 ? `${ann.content.slice(0, 90)}...` : ann.content,
          type: "announcement",
          timestamp: ann.createdAt || Date.now() - 86400000,
          link: "/tournaments",
          read: readIds.has(`announcement-${ann.id}`),
        });
      }
    });

    // Deduplicate by ID & Sort newest first
    const uniqueMap = new Map<string, CoachNotification>();
    list.forEach((n) => uniqueMap.set(n.id, n));

    return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [user, state, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAllRead = () => {
    const nextSet = new Set(readIds);
    notifications.forEach((n) => nextSet.add(n.id));
    saveReadIds(nextSet);
  };

  const markAsRead = (id: string) => {
    if (!readIds.has(id)) {
      const nextSet = new Set(readIds);
      nextSet.add(id);
      saveReadIds(nextSet);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm">
              <span className="absolute size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                No notifications right now
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const iconMap = {
                team_approved: <CheckCircle2 className="size-4 text-emerald-500" />,
                team_rejected: <XCircle className="size-4 text-destructive" />,
                player_approved: <CheckCircle2 className="size-4 text-emerald-500" />,
                tournament_joined: <Trophy className="size-4 text-primary" />,
                tournament_started: <Zap className="size-4 text-amber-500 animate-bounce" />,
                match_live: <Radio className="size-4 text-destructive animate-pulse" />,
                announcement: <Megaphone className="size-4 text-purple-500" />,
              };

              return (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/50",
                    !n.read ? "bg-accent/40" : "bg-transparent",
                  )}
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background border border-border shadow-xs">
                    {iconMap[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-xs font-semibold truncate", !n.read ? "text-foreground font-bold" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-muted-foreground/70">
                      {formatTimeAgo(n.timestamp)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
