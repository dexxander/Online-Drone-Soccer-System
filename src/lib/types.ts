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
  status: EntityStatus;
  createdAt: number;
  /** Auth user id of the coach who submitted this team, when signed in. */
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

export interface AppState {
  teams: Team[];
  players: Player[];
  match: Match;
  events: MatchEvent[];
}
