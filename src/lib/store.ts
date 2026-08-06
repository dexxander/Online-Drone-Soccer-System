import type {
  Announcement,
  AnnouncementCategory,
  AppState,
  AppUser,
  AuditLogEntry,
  AuthUser,
  EntityStatus,
  Match,
  MatchEvent,
  MatchEventType,
  MatchmakingType,
  MatchSlot,
  MatchSlotId,
  PenaltyType,
  Player,
  Team,
  TeamCategory,
  Tournament,
  TournamentMatch,
  UserRole,
  UserTag,
} from "./types";

export interface DataStore {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  addTeam(input: Omit<Team, "id" | "status" | "createdAt">): Team;
  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>): void;
  setTeamStatus(id: string, status: EntityStatus): void;
  setPlayerStatus(id: string, status: EntityStatus): void;
  updatePlayer(id: string, patch: Partial<Omit<Player, "id" | "createdAt">>): void;
  removePlayer(id: string): void;
  updateTeam(id: string, patch: Partial<Omit<Team, "id" | "createdAt" | "ownerId">>): void;
  removeTeam(id: string): void;
  createTournament(
    name: string,
    teamIds: string[],
    category?: TeamCategory | undefined,
    matchmakingType?: MatchmakingType | undefined,
    teamQuota?: number | undefined,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }> | undefined
  ): Tournament;
  regenerateTournamentMatchmaking(
    tournamentId: string,
    matchmakingType: MatchmakingType,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }> | undefined
  ): void;
  setMatchWinner(tournamentId: string, matchId: string, winnerId: string): void;
  removeTournament(id: string): void;

  // Match control — every action now targets a specific slot (Court 1 / Court 2)
  // so up to two matches can run independently at the same time.
  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string): void;
  startMatch(slotId: MatchSlotId): void;
  pauseMatch(slotId: MatchSlotId): void;
  resumeMatch(slotId: MatchSlotId): void;
  endMatch(slotId: MatchSlotId): void;
  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number): void;
  issuePenalty(slotId: MatchSlotId, side: "A" | "B", type: PenaltyType): void;
  resetMatch(slotId: MatchSlotId): void;

  // Scoreboard visibility toggle for a slot ("show this match on the public scoreboard").
  setSlotVisibility(slotId: MatchSlotId, visible: boolean): void;

  // Presence heartbeat — called by an open referee control page so the
  // public scoreboard knows this slot is currently being officiated.
  touchSlotPresence(slotId: MatchSlotId): void;
  releaseSlotPresence(slotId: MatchSlotId): void;

  // Announcements
  addAnnouncement(input: Omit<Announcement, "id" | "createdAt">): Announcement;
  updateAnnouncement(id: string, patch: Partial<Omit<Announcement, "id" | "createdAt">>): void;
  removeAnnouncement(id: string): void;
  togglePinAnnouncement(id: string): void;

  // App Users
  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser;
  updateUserRole(id: string, role: UserTag): void;
  updateUserStatus(id: string, status: AppUser["status"]): void;
  removeUser(id: string): void;

  // Audit Logs
  logAudit(action: string, performedBy: string, target: string, category: AuditLogEntry["category"], details?: string): void;
}

// Bumped to v4: AppState now carries `matches` (two independent match
// slots) instead of a single `match`. v3 (upstream) added scheduledDate/
// scheduledTime to tournament matches; v4 layers the multi-court slots on
// top. Old state is simply ignored on load — no migration code needed for
// a mock/local store.
const STORAGE_KEY = "ds-league-state-v4";
const ARCHIVE_KEY = "ds-league-archive-v4";
const CHANNEL = "ds-league-channel-v4";

/** How long a slot is considered "open" on the scoreboard after its last presence heartbeat. */
export const PRESENCE_TTL_MS = 8000;
/** How often an open control page pings presence for its slot. */
export const PRESENCE_HEARTBEAT_MS = 3000;

const DEFAULT_SLOT_MATCH_IDS = new Set(["match-slot-1", "match-slot-2"]);

const uid = () => Math.random().toString(36).slice(2, 10);

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
}

function getMatchSchedule(round: number, slot: number): { scheduledDate: string; scheduledTime: string } {
  const dates = ["AUG 6, 2026", "AUG 7, 2026", "AUG 8, 2026", "AUG 9, 2026"];
  const times = ["14:00 PM", "15:30 PM", "17:00 PM", "18:30 PM", "20:00 PM"];

  const dateStr = dates[Math.min(round - 1, dates.length - 1)] ?? "AUG 6, 2026";
  const timeStr = times[slot % times.length] ?? "14:00 PM";
  return { scheduledDate: dateStr, scheduledTime: timeStr };
}

function advanceWinner(matches: TournamentMatch[], match: TournamentMatch) {
  if (!match.winnerId) return;
  const nextRound = match.round + 1;
  const nextSlot = Math.floor(match.slot / 2);
  const next = matches.find((m) => m.round === nextRound && m.slot === nextSlot);
  if (!next) return;
  if (match.slot % 2 === 0) next.teamAId = match.winnerId;
  else next.teamBId = match.winnerId;
}

function generateBracket(teamIds: string[]): TournamentMatch[] {
  const uniqueTeamIds = Array.from(new Set(teamIds));
  const shuffled = [...uniqueTeamIds].sort(() => Math.random() - 0.5);
  const size = nextPowerOf2(shuffled.length);
  const byeCount = size - shuffled.length;
  const byeTeams = shuffled.slice(0, byeCount);
  const playingTeams = shuffled.slice(byeCount);

  const matches: TournamentMatch[] = [];
  let slot = 0;
  for (const teamId of byeTeams) {
    const sched = getMatchSchedule(1, slot);
    matches.push({ id: uid(), round: 1, slot: slot++, teamAId: teamId, teamBId: null, winnerId: teamId, isBye: true, ...sched });
  }
  for (let i = 0; i < playingTeams.length; i += 2) {
    const sched = getMatchSchedule(1, slot);
    matches.push({
      id: uid(),
      round: 1,
      slot: slot++,
      teamAId: playingTeams[i] ?? null,
      teamBId: playingTeams[i + 1] ?? null,
      winnerId: null,
      isBye: false,
      ...sched,
    });
  }

  let roundSize = size / 2;
  let round = 2;
  while (roundSize > 1) {
    const nextSize = roundSize / 2;
    for (let s = 0; s < nextSize; s++) {
      const sched = getMatchSchedule(round, s);
      matches.push({ id: uid(), round, slot: s, teamAId: null, teamBId: null, winnerId: null, isBye: false, ...sched });
    }
    roundSize = nextSize;
    round++;
  }

  for (const m of matches.filter((m) => m.round === 1 && m.isBye)) {
    advanceWinner(matches, m);
  }
  return matches;
}

function generateManualBracket(
  manualPairs: Array<{ teamAId: string | null; teamBId: string | null }>
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  let slot = 0;
  const usedTeamIds = new Set<string>();

  for (const pair of manualPairs) {
    let teamAId: string | null = pair.teamAId;
    let teamBId: string | null = pair.teamBId;

    if (teamAId && usedTeamIds.has(teamAId)) {
      teamAId = null;
    }
    if (teamAId) usedTeamIds.add(teamAId);

    if (teamBId && (usedTeamIds.has(teamBId) || teamBId === teamAId)) {
      teamBId = null;
    }
    if (teamBId) usedTeamIds.add(teamBId);

    const isBye = !teamAId || !teamBId;
    const winnerId = isBye ? (teamAId || teamBId || null) : null;
    const sched = getMatchSchedule(1, slot);

    matches.push({
      id: uid(),
      round: 1,
      slot: slot++,
      teamAId,
      teamBId,
      winnerId,
      isBye,
      ...sched,
    });
  }

  const firstRoundCount = matches.length;
  const totalSlots = nextPowerOf2(firstRoundCount);

  let roundSize = totalSlots / 2;
  let round = 2;
  while (roundSize >= 1) {
    for (let s = 0; s < roundSize; s++) {
      const sched = getMatchSchedule(round, s);
      matches.push({ id: uid(), round, slot: s, teamAId: null, teamBId: null, winnerId: null, isBye: false, ...sched });
    }
    if (roundSize === 1) break;
    roundSize = roundSize / 2;
    round++;
  }

  for (const m of matches.filter((m) => m.round === 1 && m.isBye)) {
    advanceWinner(matches, m);
  }
  return matches;
}

export const AVAILABLE_TEAMS = [
  { id: "t1", name: "Sky Raptors", initials: "SR" },
  { id: "t2", name: "Vortex United", initials: "VU" },
  { id: "t3", name: "Aero Strikers", initials: "AS" },
  { id: "t4", name: "Void Runners", initials: "VR" },
  { id: "t5", name: "Neon Falcons", initials: "NF" },
  { id: "t6", name: "Apex Predators", initials: "AP" },
  { id: "t7", name: "Solar Flare FC", initials: "SF" },
  { id: "t8", name: "Quantum Pilots", initials: "QP" },
];

export const initialTeams: Team[] = [
  {
    id: "t1",
    name: "Sky Raptors",
    category: "Open",
    coachName: "Charles Davis",
    contactEmail: "cdavis@skyraptors.com",
    contactPhone: "+1 (555) 456-7890",
    status: "approved",
    createdAt: Date.now() - 86400000 * 90,
  },
  {
    id: "t2",
    name: "Vortex United",
    category: "Open",
    coachName: "Maria Rossi",
    contactEmail: "mrossi@vortexunited.io",
    contactPhone: "+1 (555) 567-8901",
    status: "approved",
    createdAt: Date.now() - 86400000 * 85,
  },
  {
    id: "t3",
    name: "Aero Strikers",
    category: "Collegiate",
    coachName: "Dr. Robert Vance",
    contactEmail: "rvance@aerostrikers.edu",
    contactPhone: "+1 (555) 678-9012",
    status: "approved",
    createdAt: Date.now() - 86400000 * 80,
  },
  {
    id: "t4",
    name: "Void Runners",
    category: "Open",
    coachName: "Elena Rostova",
    contactEmail: "erostova@voidrunners.com",
    contactPhone: "+1 (555) 789-0123",
    status: "approved",
    createdAt: Date.now() - 86400000 * 75,
  },
  {
    id: "t5",
    name: "Neon Falcons",
    category: "Youth",
    coachName: "Michael Sterling",
    contactEmail: "msterling@neonfalcons.org",
    contactPhone: "+1 (555) 890-1234",
    status: "approved",
    createdAt: Date.now() - 86400000 * 70,
  },
  {
    id: "t6",
    name: "Apex Predators",
    category: "Open",
    coachName: "Samantha Wright",
    contactEmail: "swright@apexpredators.com",
    contactPhone: "+1 (555) 901-2345",
    status: "approved",
    createdAt: Date.now() - 86400000 * 65,
  },
  {
    id: "t7",
    name: "Solar Flare FC",
    category: "Junior",
    coachName: "Jonathan Miller",
    contactEmail: "jmiller@solarflare.edu",
    contactPhone: "+1 (555) 012-3456",
    status: "approved",
    createdAt: Date.now() - 86400000 * 60,
  },
  {
    id: "t8",
    name: "Quantum Pilots",
    category: "Collegiate",
    coachName: "Dr. Aris Thorne",
    contactEmail: "athorne@quantumpilots.edu",
    contactPhone: "+1 (555) 123-4567",
    status: "approved",
    createdAt: Date.now() - 86400000 * 55,
  },
];

export const initialPlayers: Player[] = [
  // Sky Raptors (t1)
  { id: "p1-1", teamId: "t1", name: "Sam Taylor", number: 7, position: "Striker", studentId: "SR-701", status: "approved", createdAt: Date.now() - 86400000 * 30 },
  { id: "p1-2", teamId: "t1", name: "Marcus Lee", number: 12, position: "Defender", studentId: "SR-702", status: "approved", createdAt: Date.now() - 86400000 * 30 },
  { id: "p1-3", teamId: "t1", name: "Riley Quinn", number: 4, position: "Defender", studentId: "SR-703", status: "approved", createdAt: Date.now() - 86400000 * 30 },
  { id: "p1-4", teamId: "t1", name: "Alex Vance", number: 19, position: "Flex", studentId: "SR-704", status: "approved", createdAt: Date.now() - 86400000 * 30 },
  { id: "p1-5", teamId: "t1", name: "Jordan Blake", number: 1, position: "Goalkeeper", studentId: "SR-705", status: "approved", createdAt: Date.now() - 86400000 * 30 },

  // Vortex United (t2)
  { id: "p2-1", teamId: "t2", name: "Jason Chen", number: 10, position: "Striker", studentId: "VU-201", status: "approved", createdAt: Date.now() - 86400000 * 25 },
  { id: "p2-2", teamId: "t2", name: "Anya Patel", number: 8, position: "Defender", studentId: "VU-202", status: "approved", createdAt: Date.now() - 86400000 * 25 },
  { id: "p2-3", teamId: "t2", name: "Kai Nova", number: 33, position: "Defender", studentId: "VU-203", status: "approved", createdAt: Date.now() - 86400000 * 25 },
  { id: "p2-4", teamId: "t2", name: "Elena Rostova", number: 15, position: "Flex", studentId: "VU-204", status: "approved", createdAt: Date.now() - 86400000 * 25 },
  { id: "p2-5", teamId: "t2", name: "Leo Bennett", number: 9, position: "Striker", studentId: "VU-205", status: "approved", createdAt: Date.now() - 86400000 * 25 },

  // Aero Strikers (t3)
  { id: "p3-1", teamId: "t3", name: "Ethan Hunt", number: 11, position: "Striker", studentId: "AS-301", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p3-2", teamId: "t3", name: "Chloe Zhao", number: 5, position: "Defender", studentId: "AS-302", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p3-3", teamId: "t3", name: "Liam O'Connor", number: 22, position: "Defender", studentId: "AS-303", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p3-4", teamId: "t3", name: "Maya Lin", number: 14, position: "Flex", studentId: "AS-304", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p3-5", teamId: "t3", name: "Noah Smith", number: 2, position: "Goalkeeper", studentId: "AS-305", status: "approved", createdAt: Date.now() - 86400000 * 20 },

  // Void Runners (t4)
  { id: "p4-1", teamId: "t4", name: "Victor Stone", number: 99, position: "Striker", studentId: "VR-401", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p4-2", teamId: "t4", name: "Sarah Connor", number: 21, position: "Defender", studentId: "VR-402", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p4-3", teamId: "t4", name: "Brandon Stark", number: 6, position: "Defender", studentId: "VR-403", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p4-4", teamId: "t4", name: "Zoe Kravitz", number: 17, position: "Flex", studentId: "VR-404", status: "approved", createdAt: Date.now() - 86400000 * 20 },
  { id: "p4-5", teamId: "t4", name: "Dylan Harper", number: 88, position: "Striker", studentId: "VR-405", status: "approved", createdAt: Date.now() - 86400000 * 20 },

  // Neon Falcons (t5)
  { id: "p5-1", teamId: "t5", name: "Lucas Silva", number: 9, position: "Striker", studentId: "NF-501", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p5-2", teamId: "t5", name: "Sophia Martinez", number: 3, position: "Defender", studentId: "NF-502", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p5-3", teamId: "t5", name: "Oliver Brown", number: 18, position: "Defender", studentId: "NF-503", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p5-4", teamId: "t5", name: "Mia Johnson", number: 24, position: "Flex", studentId: "NF-504", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p5-5", teamId: "t5", name: "Ethan Davis", number: 13, position: "Goalkeeper", studentId: "NF-505", status: "approved", createdAt: Date.now() - 86400000 * 15 },

  // Apex Predators (t6)
  { id: "p6-1", teamId: "t6", name: "Ryan Gosling", number: 23, position: "Striker", studentId: "AP-601", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p6-2", teamId: "t6", name: "Hannah Abbott", number: 44, position: "Defender", studentId: "AP-602", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p6-3", teamId: "t6", name: "Christopher Nolan", number: 77, position: "Defender", studentId: "AP-603", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p6-4", teamId: "t6", name: "Amelia Watson", number: 16, position: "Flex", studentId: "AP-604", status: "approved", createdAt: Date.now() - 86400000 * 15 },
  { id: "p6-5", teamId: "t6", name: "Daniel Radcliffe", number: 80, position: "Defender", studentId: "AP-605", status: "approved", createdAt: Date.now() - 86400000 * 15 },

  // Solar Flare FC (t7)
  { id: "p7-1", teamId: "t7", name: "Gabriel Torque", number: 10, position: "Striker", studentId: "SF-701", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p7-2", teamId: "t7", name: "Isabella Santos", number: 2, position: "Defender", studentId: "SF-702", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p7-3", teamId: "t7", name: "Jackson Reed", number: 27, position: "Defender", studentId: "SF-703", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p7-4", teamId: "t7", name: "Lily Evans", number: 31, position: "Flex", studentId: "SF-704", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p7-5", teamId: "t7", name: "Benjamin Cole", number: 45, position: "Striker", studentId: "SF-705", status: "approved", createdAt: Date.now() - 86400000 * 10 },

  // Quantum Pilots (t8)
  { id: "p8-1", teamId: "t8", name: "Evelyn Reed", number: 8, position: "Striker", studentId: "QP-801", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p8-2", teamId: "t8", name: "Kevin Flynn", number: 55, position: "Defender", studentId: "QP-802", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p8-3", teamId: "t8", name: "Quorra Tron", number: 12, position: "Defender", studentId: "QP-803", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p8-4", teamId: "t8", name: "Sam Flynn", number: 91, position: "Flex", studentId: "QP-804", status: "approved", createdAt: Date.now() - 86400000 * 10 },
  { id: "p8-5", teamId: "t8", name: "Alan Bradley", number: 50, position: "Defender", studentId: "QP-805", status: "approved", createdAt: Date.now() - 86400000 * 10 },
];

export const rosterA = [
  { name: "S. Taylor", position: "Striker", highlight: true },
  { name: "M. Lee", position: "Defender" },
  { name: "R. Quinn", position: "Defender" },
];
export const coachA = "C. Davis";

export const rosterB = [
  { name: "J. Chen", position: "Striker", highlight: true },
  { name: "A. Patel", position: "Defender" },
  { name: "K. Nova", position: "Defender" },
];
export const coachB = "M. Rossi";

const initialMatch: Match = {
  id: "match-slot-1",
  tournamentName: "National Drone Soccer Championship",
  teamAName: "Sky Raptors",
  teamBName: "Vortex United",
  scoreA: 0,
  scoreB: 0,
  status: "scheduled",
  elapsedMs: 0,
  runningSince: null,
  penalties: [],
};

const initialMatchSlot2: Match = {
  id: "match-slot-2",
  tournamentName: "National Drone Soccer Championship",
  teamAName: "TBD",
  teamBName: "TBD",
  scoreA: 0,
  scoreB: 0,
  status: "scheduled",
  elapsedMs: 0,
  runningSince: null,
  penalties: [],
};

export const initialAnnouncements = [
  {
    id: "ann-1",
    title: "2026 National Drone Soccer Championship Registration Open",
    content: "Official team registration for the upcoming 2026 National Championship is now live! Coaches can submit team applications, player rosters, and technical specs through the online dashboard.",
    category: "Tournament" as const,
    author: "League Administrator",
    pinned: true,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "ann-2",
    title: "Updated FAI Class F9A Safety & Battery Guidelines",
    content: "Please review the updated safety regulations regarding LiPo battery charging stations, cage barrier nets, and striker radio frequencies before competing in official league matches.",
    category: "Rule Update" as const,
    author: "Technical Committee",
    pinned: false,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "ann-3",
    title: "Scheduled System Maintenance — Saturday 02:00 UTC",
    content: "The Drone Soccer League Control portal will undergo routine backend server maintenance. Real-time scoreboard and registration APIs will be temporarily paused for 30 minutes.",
    category: "Maintenance" as const,
    author: "System Operations",
    pinned: false,
    createdAt: Date.now() - 86400000 * 8,
  },
];

export const initialUsers = [
  {
    id: "usr-1",
    name: "League Administrator",
    email: "admin@dronesoccer.org",
    role: "admin" as const,
    status: "active" as const,
    phone: "+1 (555) 019-2831",
    createdAt: Date.now() - 86400000 * 120,
  },
  {
    id: "usr-2",
    name: "Alex Rivera",
    email: "alex.rivera@dronesoccer.org",
    role: "referee" as const,
    status: "active" as const,
    phone: "+1 (555) 234-5678",
    createdAt: Date.now() - 86400000 * 60,
  },
  {
    id: "usr-3",
    name: "Sarah Jenkins",
    email: "sarah.j@dronesoccer.org",
    role: "referee" as const,
    status: "active" as const,
    phone: "+1 (555) 345-6789",
    createdAt: Date.now() - 86400000 * 45,
  },
  {
    id: "usr-4",
    name: "Charles Davis",
    email: "cdavis@skyraptors.com",
    role: "coach" as const,
    teamName: "Sky Raptors",
    status: "active" as const,
    phone: "+1 (555) 456-7890",
    createdAt: Date.now() - 86400000 * 90,
  },
  {
    id: "usr-5",
    name: "Maria Rossi",
    email: "mrossi@vortexunited.io",
    role: "coach" as const,
    teamName: "Vortex United",
    status: "active" as const,
    phone: "+1 (555) 567-8901",
    createdAt: Date.now() - 86400000 * 75,
  },
  {
    id: "usr-6",
    name: "Sam Taylor",
    email: "staylor@skyraptors.com",
    role: "player" as const,
    teamName: "Sky Raptors",
    status: "active" as const,
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: "usr-7",
    name: "Jason Chen",
    email: "jchen@vortexunited.io",
    role: "player" as const,
    teamName: "Vortex United",
    status: "active" as const,
    createdAt: Date.now() - 86400000 * 25,
  },
  {
    id: "usr-8",
    name: "David Kim",
    email: "david.kim@gmail.com",
    role: "user" as const,
    status: "active" as const,
    createdAt: Date.now() - 86400000 * 10,
  },
];

export const initialAuditLogs = [
  {
    id: "al-1",
    action: "Team Approved",
    performedBy: "League Administrator",
    target: "Sky Raptors",
    category: "Team" as const,
    timestamp: Date.now() - 3600000 * 3,
    details: "Approved team registration and roster compliance for 2026 Open Division.",
  },
  {
    id: "al-2",
    action: "Announcement Created",
    performedBy: "League Administrator",
    target: "2026 National Drone Soccer Championship Registration Open",
    category: "Announcement" as const,
    timestamp: Date.now() - 3600000 * 18,
    details: "Published official championship registration notice to portal dashboard.",
  },
  {
    id: "al-3",
    action: "User Role Updated",
    performedBy: "League Administrator",
    target: "Sarah Jenkins (Promoted to Chief Referee)",
    category: "User Management" as const,
    timestamp: Date.now() - 3600000 * 42,
    details: "Assigned Head Referee credentials for National Tournament matches.",
  },
];

export const initialTournaments: Tournament[] = [
  {
    id: "tour-001",
    name: "2026 National Drone Soccer Championship",
    category: "Open",
    status: "active",
    teamIds: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"],
    matchmakingType: "auto",
    teamQuota: 8,
    createdAt: Date.now() - 86400000 * 7,
    matches: [
      { id: "m101", round: 1, slot: 0, teamAId: "t1", teamBId: "t2", winnerId: null, isBye: false, scheduledDate: "AUG 6, 2026", scheduledTime: "14:00 PM" },
      { id: "m102", round: 1, slot: 1, teamAId: "t3", teamBId: "t4", winnerId: null, isBye: false, scheduledDate: "AUG 6, 2026", scheduledTime: "15:30 PM" },
      { id: "m103", round: 1, slot: 2, teamAId: "t5", teamBId: "t6", winnerId: null, isBye: false, scheduledDate: "AUG 6, 2026", scheduledTime: "17:00 PM" },
      { id: "m104", round: 1, slot: 3, teamAId: "t7", teamBId: "t8", winnerId: null, isBye: false, scheduledDate: "AUG 6, 2026", scheduledTime: "18:30 PM" },
      { id: "m105", round: 2, slot: 0, teamAId: null, teamBId: null, winnerId: null, isBye: false, scheduledDate: "AUG 7, 2026", scheduledTime: "15:00 PM" },
      { id: "m106", round: 2, slot: 1, teamAId: null, teamBId: null, winnerId: null, isBye: false, scheduledDate: "AUG 7, 2026", scheduledTime: "16:30 PM" },
      { id: "m107", round: 3, slot: 0, teamAId: null, teamBId: null, winnerId: null, isBye: false, scheduledDate: "AUG 8, 2026", scheduledTime: "18:00 PM" },
    ],
  },
  {
    id: "tour-002",
    name: "Intercollegiate Drone Cup 2026",
    category: "Collegiate",
    status: "active",
    teamIds: ["t3", "t8"],
    matchmakingType: "manual",
    teamQuota: 4,
    createdAt: Date.now() - 86400000 * 3,
    matches: [
      { id: "m201", round: 1, slot: 0, teamAId: "t3", teamBId: "t8", winnerId: null, isBye: false, scheduledDate: "AUG 9, 2026", scheduledTime: "16:00 PM" },
      { id: "m202", round: 1, slot: 1, teamAId: "t1", teamBId: null, winnerId: "t1", isBye: true, scheduledDate: "AUG 9, 2026", scheduledTime: "17:30 PM" },
      { id: "m203", round: 2, slot: 0, teamAId: "t1", teamBId: null, winnerId: null, isBye: false, scheduledDate: "AUG 10, 2026", scheduledTime: "18:00 PM" },
    ],
  },
];

const initialMatchSlots: [MatchSlot, MatchSlot] = [
  { slotId: 1, match: initialMatch, events: [], visibleOnScoreboard: true, lastActiveAt: null },
  { slotId: 2, match: initialMatchSlot2, events: [], visibleOnScoreboard: true, lastActiveAt: null },
];

export const initialState: AppState = {
  teams: initialTeams,
  players: initialPlayers,
  tournaments: initialTournaments,
  matches: initialMatchSlots,
  // Legacy mirrors — always slot 1. Kept in sync by every commit.
  match: initialMatchSlots[0].match,
  events: initialMatchSlots[0].events,
  announcements: initialAnnouncements,
  users: initialUsers,
  auditLogs: initialAuditLogs,
};

class LocalStore implements DataStore {
  private state: AppState = initialState;
  private matchArchive: Record<string, { match: Match; events: MatchEvent[] }> = {};
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private hydrated = false;

  /** Normalizes a persisted/broadcast slot into a well-formed MatchSlot, falling back to defaults for anything missing or corrupt. */
  private static normalizeSlot(raw: Partial<MatchSlot> | undefined, slotId: MatchSlotId, resetPresence: boolean): MatchSlot {
    const fallback = initialMatchSlots[slotId - 1];
    return {
      slotId,
      match: raw?.match ?? fallback.match,
      events: Array.isArray(raw?.events) ? raw!.events : [],
      visibleOnScoreboard: typeof raw?.visibleOnScoreboard === "boolean" ? raw!.visibleOnScoreboard : true,
      // `resetPresence` is true ONLY for the one-time load from localStorage
      // on page open — a timestamp from a previous session shouldn't count
      // as "still open". For live cross-tab syncs (BroadcastChannel / the
      // `storage` event) we must preserve the incoming value as-is, or a
      // control page's heartbeat would get wiped the instant another tab
      // received it and the scoreboard would never see a slot as open.
      lastActiveAt: resetPresence
        ? null
        : (typeof raw?.lastActiveAt === "number" ? raw!.lastActiveAt : null),
    };
  }

  private static normalizeMatches(parsed: Partial<AppState>, resetPresence: boolean): [MatchSlot, MatchSlot] {
    if (Array.isArray(parsed.matches) && parsed.matches.length === 2) {
      return [
        LocalStore.normalizeSlot(parsed.matches[0], 1, resetPresence),
        LocalStore.normalizeSlot(parsed.matches[1], 2, resetPresence),
      ];
    }
    // Very old / foreign shape (or missing): start clean from defaults.
    return [
      LocalStore.normalizeSlot(undefined, 1, resetPresence),
      LocalStore.normalizeSlot(undefined, 2, resetPresence),
    ];
  }

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        const matches = LocalStore.normalizeMatches(parsed, true);
        this.state = {
          ...initialState,
          ...parsed,
          matches,
          match: matches[0].match,
          events: matches[0].events,
          teams: parsed.teams && parsed.teams.length >= 8 ? parsed.teams : initialTeams,
          players: parsed.players && parsed.players.length >= 40 ? parsed.players : initialPlayers,
        };
      }

      const rawArchive = window.localStorage.getItem(ARCHIVE_KEY);
      if (rawArchive) this.matchArchive = JSON.parse(rawArchive);
    } catch { /* ignore corrupt state */ }

    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<AppState>) => {
        const matches = LocalStore.normalizeMatches(e.data, false);
        this.state = { ...e.data, matches, match: matches[0].match, events: matches[0].events };
        this.listeners.forEach((l) => l());
      };
    }
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const parsed = JSON.parse(e.newValue) as AppState;
        const matches = LocalStore.normalizeMatches(parsed, false);
        this.state = { ...parsed, matches, match: matches[0].match, events: matches[0].events };
        this.listeners.forEach((l) => l());
      }
      if (e.key === ARCHIVE_KEY && e.newValue) {
        this.matchArchive = JSON.parse(e.newValue);
      }
    });
    // Best-effort: let go of this tab's presence if it's closed/refreshed
    // rather than waiting out the full presence TTL on the scoreboard.
    window.addEventListener("beforeunload", () => {
      this.state.matches.forEach((slot) => {
        if (slot.lastActiveAt !== null) this.releaseSlotPresence(slot.slotId);
      });
    });
    this.listeners.forEach((l) => l());
  }

  getState() { return this.state; }

  subscribe(listener: () => void) {
    this.hydrate();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getSlot(slotId: MatchSlotId): MatchSlot {
    return this.state.matches.find((s) => s.slotId === slotId) ?? this.state.matches[0];
  }

  /** Applies a partial patch to one slot and commits, keeping the legacy `match`/`events` mirror (slot 1) in sync. */
  private commitSlot(slotId: MatchSlotId, patch: Partial<Pick<MatchSlot, "match" | "events" | "visibleOnScoreboard" | "lastActiveAt">>) {
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, ...patch } : s)) as [MatchSlot, MatchSlot];
    const primary = matches[0];
    this.commit({ ...this.state, matches, match: primary.match, events: primary.events });
  }

  private syncArchive(next: AppState) {
    next.matches.forEach((slot) => {
      if (slot.match.id && !DEFAULT_SLOT_MATCH_IDS.has(slot.match.id)) {
        this.matchArchive[slot.match.id] = { match: slot.match, events: slot.events };
      }
    });

    next.tournaments = next.tournaments.map((t) => ({
      ...t,
      matches: t.matches.map((m) => {
        const archive = this.matchArchive[m.id];
        if (archive) {
          return { ...m, scoreA: archive.match.scoreA, scoreB: archive.match.scoreB, status: archive.match.status } as TournamentMatch;
        }
        return m;
      }),
    }));
  }

  private commit(next: AppState) {
    this.syncArchive(next);
    this.state = next;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(this.matchArchive));
      } catch { /* quota */ }
      this.channel?.postMessage(next);
    }
    this.listeners.forEach((l) => l());
  }

  private log(type: MatchEventType, message: string, matchId: string, events: MatchEvent[]): MatchEvent[] {
    const event: MatchEvent = { id: uid(), matchId, type, message, createdAt: Date.now() };
    return [event, ...events].slice(0, 50);
  }

  addTeam(input: Omit<Team, "id" | "status" | "createdAt">) {
    const team: Team = { ...input, id: uid(), status: "pending", createdAt: Date.now() };
    this.commit({ ...this.state, teams: [team, ...this.state.teams] });
    return team;
  }

  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>) {
    const rows: Player[] = players.map((p) => ({ ...p, id: uid(), teamId, status: "pending", createdAt: Date.now() }));
    this.commit({ ...this.state, players: [...rows, ...this.state.players] });
  }

  setTeamStatus(id: string, status: EntityStatus) {
    this.commit({
      ...this.state,
      teams: this.state.teams.map((t) => (t.id === id ? { ...t, status } : t)),
      players: this.state.players.map((p) => (p.teamId === id ? { ...p, status } : p)),
    });
  }

  setPlayerStatus(id: string, status: EntityStatus) {
    this.commit({
      ...this.state,
      players: this.state.players.map((p) => (p.id === id ? { ...p, status } : p)),
    });
  }

  updatePlayer(id: string, patch: Partial<Omit<Player, "id" | "createdAt">>) {
    this.commit({ ...this.state, players: this.state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  removePlayer(id: string) {
    this.commit({ ...this.state, players: this.state.players.filter((p) => p.id !== id) });
  }

  updateTeam(id: string, patch: Partial<Omit<Team, "id" | "createdAt" | "ownerId">>) {
    this.commit({ ...this.state, teams: this.state.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }

  removeTeam(id: string) {
    this.commit({
      ...this.state,
      teams: this.state.teams.filter((t) => t.id !== id),
      players: this.state.players.filter((p) => p.teamId !== id),
    });
  }

  createTournament(
    name: string,
    teamIds: string[],
    category?: TeamCategory | undefined,
    matchmakingType: MatchmakingType = "auto",
    teamQuota?: number | undefined,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }> | undefined
  ) {
    const matches =
      matchmakingType === "manual" && manualPairs && manualPairs.length > 0
        ? generateManualBracket(manualPairs)
        : generateBracket(teamIds);

    const tournament: Tournament = {
      id: uid(),
      name,
      status: "active",
      teamIds,
      matches,
      matchmakingType,
      ...(teamQuota ? { teamQuota } : {}),
      createdAt: Date.now(),
      ...(category ? { category } : {}),
    };
    this.commit({ ...this.state, tournaments: [tournament, ...this.state.tournaments] });
    this.logAudit(
      "Tournament Created",
      "Admin",
      name,
      "Tournament",
      `Matchmaking Mode: ${matchmakingType.toUpperCase()} (${teamIds.length} teams)`
    );
    return tournament;
  }

  regenerateTournamentMatchmaking(
    tournamentId: string,
    matchmakingType: MatchmakingType,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }> | undefined
  ) {
    const tournaments = this.state.tournaments.map((t) => {
      if (t.id !== tournamentId) return t;
      const matches =
        matchmakingType === "manual" && manualPairs && manualPairs.length > 0
          ? generateManualBracket(manualPairs)
          : generateBracket(t.teamIds);

      return {
        ...t,
        matchmakingType,
        matches,
        status: "active" as const,
      };
    });
    this.commit({ ...this.state, tournaments });
    const target = tournaments.find((t) => t.id === tournamentId);
    if (target) {
      this.logAudit(
        "Matchmaking Re-generated",
        "Admin",
        target.name,
        "Tournament",
        `New Mode: ${matchmakingType.toUpperCase()}`
      );
    }
  }

  setMatchWinner(tournamentId: string, matchId: string, winnerId: string) {
    const tournaments = this.state.tournaments.map((t) => {
      if (t.id !== tournamentId) return t;
      const matches = t.matches.map((m) => ({ ...m }));
      const match = matches.find((m) => m.id === matchId);
      if (!match) return t;
      match.winnerId = winnerId;
      advanceWinner(matches, match);
      const finalMatch = matches.reduce((a, b) => (b.round > a.round ? b : a));
      const status: Tournament["status"] = finalMatch.winnerId ? "completed" : "active";
      return { ...t, matches, status };
    });
    this.commit({ ...this.state, tournaments });
  }

  removeTournament(id: string) {
    this.commit({ ...this.state, tournaments: this.state.tournaments.filter((t) => t.id !== id) });
  }

  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string) {
    const archived = this.matchArchive[tournamentMatchId];
    if (archived) {
      this.commitSlot(slotId, { match: archived.match, events: archived.events });
      return;
    }

    const base = slotId === 2 ? initialMatchSlot2 : initialMatch;
    const match: Match = {
      ...base,
      id: tournamentMatchId,
      teamAName,
      teamBName,
      status: "scheduled",
    };
    this.commitSlot(slotId, { match, events: [] });
  }

  startMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const match: Match = { ...slot.match, status: "live", elapsedMs: 0, runningSince: Date.now() };
    const events = this.log("match_started", "Match started", match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  pauseMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    if (m.status !== "live") return;
    const match: Match = {
      ...m, status: "paused", elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0), runningSince: null,
    };
    const events = this.log("match_paused", "Match paused", match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  resumeMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    if (m.status !== "paused") return;
    const match: Match = { ...m, status: "live", runningSince: Date.now() };
    const events = this.log("match_resumed", "Match resumed", match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  endMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const match: Match = {
      ...m, status: "finished", elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0), runningSince: null,
    };

    const nextEvents = this.log("match_ended", "Match ended", match.id, slot.events);
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, match, events: nextEvents } : s)) as [MatchSlot, MatchSlot];
    const nextState: AppState = { ...this.state, matches, match: matches[0].match, events: matches[0].events };

    nextState.tournaments = nextState.tournaments.map((t) => {
      const tMatch = t.matches.find((tm) => tm.id === match.id);
      if (tMatch && !tMatch.winnerId) {
        if (match.scoreA > match.scoreB) tMatch.winnerId = tMatch.teamAId;
        else if (match.scoreB > match.scoreA) tMatch.winnerId = tMatch.teamBId;

        if (tMatch.winnerId) {
          advanceWinner(t.matches, tMatch);
          const finalMatch = t.matches.reduce((a, b) => (b.round > a.round ? b : a));
          t.status = finalMatch.winnerId ? "completed" : "active";
        }
      }
      return t;
    });

    this.commit(nextState);
  }

  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const key = side === "A" ? "scoreA" : "scoreB";
    const value = Math.max(0, m[key] + delta);
    const match: Match = { ...m, [key]: value } as Match;
    const name = side === "A" ? m.teamAName : m.teamBName;
    const events = this.log("score_changed", `${name} score ${delta > 0 ? "+" : "-"}1 (now ${value})`, match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  issuePenalty(slotId: MatchSlotId, side: "A" | "B", type: PenaltyType) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const match: Match = {
      ...m, penalties: [{ id: uid(), matchId: m.id, side, type, createdAt: Date.now() }, ...m.penalties],
    };
    const name = side === "A" ? m.teamAName : m.teamBName;
    const events = this.log("penalty_issued", `${type} penalty — ${name}`, match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  // Clears the CURRENT match's data while keeping the ID intact!
  resetMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const match: Match = {
      ...m,
      scoreA: 0,
      scoreB: 0,
      status: "scheduled",
      elapsedMs: 0,
      runningSince: null,
      penalties: [],
    };
    this.commitSlot(slotId, { match, events: [] });
  }

  setSlotVisibility(slotId: MatchSlotId, visible: boolean) {
    this.commitSlot(slotId, { visibleOnScoreboard: visible });
  }

  touchSlotPresence(slotId: MatchSlotId) {
    this.commitSlot(slotId, { lastActiveAt: Date.now() });
  }

  releaseSlotPresence(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    if (slot.lastActiveAt === null) return;
    this.commitSlot(slotId, { lastActiveAt: null });
  }

  addAnnouncement(input: Omit<Announcement, "id" | "createdAt">): Announcement {
    const ann: Announcement = {
      ...input,
      id: `ann-${uid()}`,
      createdAt: Date.now(),
    };
    const announcements = [ann, ...(this.state.announcements || [])];
    this.commit({ ...this.state, announcements });
    this.logAudit("Announcement Created", "Admin", ann.title, "Announcement", `Category: ${ann.category}`);
    return ann;
  }

  updateAnnouncement(id: string, patch: Partial<Omit<Announcement, "id" | "createdAt">>) {
    const announcements = (this.state.announcements || []).map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a
    );
    this.commit({ ...this.state, announcements });
    const target = announcements.find((a) => a.id === id);
    if (target) {
      this.logAudit("Announcement Updated", "Admin", target.title, "Announcement");
    }
  }

  removeAnnouncement(id: string) {
    const target = (this.state.announcements || []).find((a) => a.id === id);
    const announcements = (this.state.announcements || []).filter((a) => a.id !== id);
    this.commit({ ...this.state, announcements });
    if (target) {
      this.logAudit("Announcement Deleted", "Admin", target.title, "Announcement");
    }
  }

  togglePinAnnouncement(id: string) {
    const announcements = (this.state.announcements || []).map((a) =>
      a.id === id ? { ...a, pinned: !a.pinned } : a
    );
    this.commit({ ...this.state, announcements });
  }

  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser {
    const newUser: AppUser = {
      ...input,
      id: `usr-${uid()}`,
      createdAt: Date.now(),
    };
    const users = [newUser, ...(this.state.users || [])];
    this.commit({ ...this.state, users });
    this.logAudit("User Registered", "Admin", `${newUser.name} (${newUser.role})`, "User Management", `Email: ${newUser.email}`);
    return newUser;
  }

  updateUserRole(id: string, role: UserTag) {
    const users = (this.state.users || []).map((u) => (u.id === id ? { ...u, role } : u));
    this.commit({ ...this.state, users });
    const target = users.find((u) => u.id === id);
    if (target) {
      this.logAudit("User Role Updated", "Admin", `${target.name} -> ${role}`, "User Management");
    }
  }

  updateUserStatus(id: string, status: AppUser["status"]) {
    const users = (this.state.users || []).map((u) => (u.id === id ? { ...u, status } : u));
    this.commit({ ...this.state, users });
    const target = users.find((u) => u.id === id);
    if (target) {
      this.logAudit("User Status Changed", "Admin", `${target.name} (${status})`, "User Management");
    }
  }

  removeUser(id: string) {
    const target = (this.state.users || []).find((u) => u.id === id);
    const users = (this.state.users || []).filter((u) => u.id !== id);
    this.commit({ ...this.state, users });
    if (target) {
      this.logAudit("User Removed", "Admin", target.name, "User Management");
    }
  }

  logAudit(action: string, performedBy: string, target: string, category: AuditLogEntry["category"], details?: string) {
    const entry: AuditLogEntry = {
      id: `al-${uid()}`,
      action,
      performedBy,
      target,
      category,
      timestamp: Date.now(),
      ...(details ? { details } : {}),
    };
    const auditLogs = [entry, ...(this.state.auditLogs || [])].slice(0, 200);
    this.commit({ ...this.state, auditLogs });
  }
}

export const store: DataStore & { hydrate: () => void } = new LocalStore();

const AUTH_KEY = "ds-league-auth-v1";

export function detectRoleForEmail(email: string): UserRole {
  const normalized = email.trim().toLowerCase();
  const state = store.getState();
  const found = (state.users || []).find((u: AppUser) => u.email.toLowerCase() === normalized);
  if (found) {
    if (found.role === "admin") return "admin";
    if (found.role === "referee") return "referee";
    if (found.role === "coach") return "coach";
  }
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("referee")) return "referee";
  return "coach";
}

export const auth = {
  login(email: string, role?: UserRole): AuthUser {
    const resolvedRole = role || detectRoleForEmail(email);
    const user: AuthUser = {
      id: `user_${email.trim().toLowerCase()}`,
      name: email.split("@")[0] || "user",
      email,
      role: resolvedRole,
      token: `mock.${uid()}.${uid()}`,
    };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },
  current(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },
  logout() {
    window.localStorage.removeItem(AUTH_KEY);
  },
};

export const homeForRole = (role: UserRole) =>
  role === "referee" ? "/referee" : role === "coach" ? "/" : "/admin";