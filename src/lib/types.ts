export const ROLES = ["admin", "referee", "coach", "player", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  referee: "Referee",
  coach: "Coach",
  player: "Player",
  viewer: "Viewer",
};

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  teamId?: string | null;
  phone?: string | null;
  disabled?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  city?: string;
  coachId?: string | null;
  coachName?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export const PLAYER_POSITIONS = ["striker", "defender", "goalkeeper"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export interface Player {
  id: string;
  fullName: string;
  teamId: string;
  jerseyNumber: number;
  position: PlayerPosition;
  droneId?: string | null;
  userId?: string | null;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export const MATCH_STATUSES = ["scheduled", "live", "completed", "cancelled"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export interface Match {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  round: number;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAName?: string | null;
  teamBName?: string | null;
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  winnerId?: string | null;
  refereeId?: string | null;
  venue?: string | null;
  scheduledAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
}

export const TOURNAMENT_STATUSES = [
  "draft",
  "registration",
  "in_progress",
  "completed",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export interface Tournament {
  id: string;
  name: string;
  season?: string;
  description?: string;
  location?: string;
  imageUrl?: string | null;
  status: TournamentStatus;
  startDate?: number | null;
  endDate?: number | null;
  teamIds: string[];
  rounds: number;
  championTeamId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

/** A single scoring event ("mark") inside a match. */
export interface Mark {
  id: string;
  matchId: string;
  tournamentId: string;
  teamId: string;
  playerId?: string | null;
  playerName?: string | null;
  points: number;
  minute: number;
  note?: string | null;
  createdBy?: string;
  createdAt?: number;
}

/** Final score snapshot written when a match completes. */
export interface ScoreRecord {
  id: string;
  matchId: string;
  tournamentId: string;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  recordedBy?: string;
  createdAt?: number;
}

export interface Standing {
  id: string; // `${tournamentId}_${teamId}`
  tournamentId: string;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  updatedAt?: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Role | "all";
  pinned: boolean;
  authorId?: string;
  authorName?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  link?: string | null;
  createdAt?: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  createdAt?: number;
}
