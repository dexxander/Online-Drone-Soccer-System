export type EntityStatus = "pending" | "approved" | "rejected";

export type UserRole = "admin" | "referee" | "coach";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: PlayerPosition;
  studentId?: string;
  dateOfBirth?: string;
  status: EntityStatus;
  createdAt: number;
}

export type PlayerPosition = "Striker" | "Defender" | "Goalkeeper" | "Flex";

export interface Team {
  id: string;
  name: string;
  category: TeamCategory;
  coachName: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string | null;
  status: EntityStatus;
  createdAt: number;
  ownerId?: string;
}

export type TeamCategory = "Junior" | "Youth" | "Collegiate" | "Open";

export type PenaltyType = "Minor" | "Major" | "Technical";

export interface Penalty {
  id: string;
  matchId: string;
  side: "A" | "B";
  type: PenaltyType;
  createdAt: number;
}

export type MatchStatus = "scheduled" | "live" | "paused" | "finished";

export interface Match {
  id: string;
  tournamentName: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  /** Accumulated milliseconds before the current running segment. */
  elapsedMs: number;
  /** Timestamp when the current running segment began, or null when stopped. */
  runningSince: number | null;
  penalties: Penalty[];
}

export type MatchEventType =
  | "match_started"
  | "match_paused"
  | "match_resumed"
  | "match_ended"
  | "score_changed"
  | "penalty_issued";

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  message: string;
  createdAt: number;
}

/**
 * Up to two matches can run concurrently (e.g. two courts / two referee
 * control tabs). Each slot is fully independent: its own match, its own
 * event log, its own scoreboard visibility toggle, and its own presence
 * heartbeat so the public scoreboard can tell whether a control page for
 * that slot is currently open.
 */
export type MatchSlotId = 1 | 2;

export interface MatchSlot {
  slotId: MatchSlotId;
  match: Match;
  events: MatchEvent[];
  /** Referee-controlled toggle: should this slot appear on the public scoreboard when open? */
  visibleOnScoreboard: boolean;
  /** Timestamp (ms) of the last heartbeat from an open control page for this slot, or null if none is open. */
  lastActiveAt: number | null;
}

export type AnnouncementCategory = "General" | "Tournament" | "Rule Update" | "Maintenance" | "Urgent";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  author: string;
  pinned?: boolean | undefined;
  createdAt: number;
  updatedAt?: number | undefined;
}

export type UserTag = "admin" | "referee" | "coach" | "player" | "user";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserTag;
  status: "active" | "suspended" | "pending";
  teamName?: string | undefined;
  phone?: string | undefined;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  target: string;
  category: "User Management" | "Announcement" | "Tournament" | "Team" | "System";
  timestamp: number;
  details?: string | undefined;
}

export interface AppState {
  teams: Team[];
  players: Player[];
  tournaments: Tournament[];
  /**
   * The two concurrent match slots (Court 1 / Court 2). This is the source
   * of truth for referee control + the scoreboard.
   */
  matches: [MatchSlot, MatchSlot];
  /**
   * @deprecated Legacy mirror of `matches[0].match` / `matches[0].events`,
   * kept so pages that only ever cared about "the" live match (marketing
   * ticker, admin stat card, matches list, tournaments page) keep working
   * unchanged. Always points at slot 1 — new code should read from
   * `matches` instead.
   */
  match: Match;
  /** @deprecated see `match` above — mirrors `matches[0].events`. */
  events: MatchEvent[];
  announcements: Announcement[];
  users: AppUser[];
  auditLogs: AuditLogEntry[];
}

export type TournamentStatus = "draft" | "active" | "completed";

export interface TournamentMatch {
  id: string;
  round: number;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  isBye: boolean;
  scheduledDate?: string | undefined;
  scheduledTime?: string | undefined;
}

export type MatchmakingType = "auto" | "manual";

export interface Tournament {
  id: string;
  name: string;
  category?: TeamCategory | undefined;
  status: TournamentStatus;
  teamIds: string[];
  matches: TournamentMatch[];
  matchmakingType?: MatchmakingType | undefined;
  teamQuota?: number | undefined;
  createdAt: number;
}