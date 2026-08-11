import { supabase } from "./supabase";
import type {
  AppState, Team, Player, Tournament, TournamentMatch, Announcement, AppUser, AuditLogEntry,
  MatchSlot, MatchSlotId, Match, MatchEvent, MatchEventType, Penalty, PenaltyType,
  EntityStatus, UserTag, MatchmakingType, TeamCategory
} from "./types";

// ─── Case conversion helpers ────────────────────────────────────────────────

export function toSnake(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      let val = toSnake(v);
      if ((k === 'createdAt' || k === 'updatedAt') && typeof val === 'number') {
        val = new Date(val).toISOString();
      }
      return [snakeKey, val];
    })
  );
}

export function toCamel(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const camelKey = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      let val = toCamel(v);
      if ((camelKey === 'createdAt' || camelKey === 'updatedAt') && typeof val === 'string') {
        val = new Date(val).getTime();
      }
      if ((camelKey === 'timestamp' || camelKey === 'runningSince') && typeof val === 'string') {
        val = Number(val);
      }
      return [camelKey, val];
    })
  );
}

// ─── ID + bracket helpers ───────────────────────────────────────────────────

const uid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function currentAuditActor() {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem("ds-league-auth-v1");
    const user = raw ? JSON.parse(raw) : null;
    return user?.email || user?.name || "system";
  } catch {
    return "system";
  }
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
}

function getMatchSchedule(round: number, slot: number) {
  const dates = ["AUG 6, 2026", "AUG 7, 2026", "AUG 8, 2026", "AUG 9, 2026"];
  const times = ["14:00 PM", "15:30 PM", "17:00 PM", "18:30 PM", "20:00 PM"];
  return {
    scheduledDate: dates[Math.min(round - 1, dates.length - 1)] ?? "AUG 6, 2026",
    scheduledTime: times[slot % times.length] ?? "14:00 PM",
  };
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

function generateGroupStage(teamIds: string[], groupCount: number): TournamentMatch[] {
  const groups = Array.from({ length: Math.max(1, Math.min(groupCount, teamIds.length)) }, () => [] as string[]);
  [...new Set(teamIds)].sort(() => Math.random() - 0.5).forEach((teamId, index) => groups[index % groups.length]?.push(teamId));
  const matches: TournamentMatch[] = [];
  groups.forEach((group, groupIndex) => {
    let slot = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const sched = getMatchSchedule(1, matches.length);
        matches.push({
          id: uid(), phase: "group", groupNumber: groupIndex + 1, round: 1, slot: slot++,
          teamAId: group[i] ?? null, teamBId: group[j] ?? null, winnerId: null, isBye: false, ...sched,
        });
      }
    }
  });
  return matches;
}

function groupQualifiedTeams(tournament: Tournament): string[] | null {
  const groupMatches = tournament.matches.filter((m) => m.phase === "group");
  if (!groupMatches.length || groupMatches.some((m) => !m.winnerId)) return null;
  const groups = new Map<number, string[]>();
  groupMatches.forEach((match) => {
    const group = match.groupNumber ?? 1;
    const list = groups.get(group) ?? [];
    if (match.teamAId && !list.includes(match.teamAId)) list.push(match.teamAId);
    if (match.teamBId && !list.includes(match.teamBId)) list.push(match.teamBId);
    groups.set(group, list);
  });
  const qualifiers = tournament.qualifiersPerGroup ?? 2;
  const points = new Map<string, number>();
  groupMatches.forEach((match) => {
    if (match.winnerId) points.set(match.winnerId, (points.get(match.winnerId) ?? 0) + 3);
  });
  return [...groups.entries()].flatMap(([_, ids]) => ids
    .sort((a, b) => (points.get(b) ?? 0) - (points.get(a) ?? 0))
    .slice(0, Math.min(qualifiers, ids.length)));
}

function generateBracket(teamIds: string[]): TournamentMatch[] {
  const shuffled = [...new Set(teamIds)].sort(() => Math.random() - 0.5);
  const size = nextPowerOf2(shuffled.length);
  const byeTeams = shuffled.slice(0, size - shuffled.length);
  const playingTeams = shuffled.slice(size - shuffled.length);

  const matches: TournamentMatch[] = [];
  let slot = 0;
  for (const teamId of byeTeams) {
    const sched = getMatchSchedule(1, slot);
    matches.push({ id: uid(), round: 1, slot: slot++, teamAId: teamId, teamBId: null, winnerId: teamId, isBye: true, ...sched });
  }
  for (let i = 0; i < playingTeams.length; i += 2) {
    const sched = getMatchSchedule(1, slot);
    matches.push({ id: uid(), round: 1, slot: slot++, teamAId: playingTeams[i] ?? null, teamBId: playingTeams[i + 1] ?? null, winnerId: null, isBye: false, ...sched });
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
  for (const m of matches.filter((m) => m.round === 1 && m.isBye)) advanceWinner(matches, m);
  return matches;
}

function generateManualBracket(manualPairs: Array<{ teamAId: string | null; teamBId: string | null }>): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  let slot = 0;
  const used = new Set<string>();
  for (const pair of manualPairs) {
    let tA = pair.teamAId && !used.has(pair.teamAId) ? pair.teamAId : null;
    if (tA) used.add(tA);
    let tB = pair.teamBId && !used.has(pair.teamBId) && pair.teamBId !== tA ? pair.teamBId : null;
    if (tB) used.add(tB);
    const isBye = !tA || !tB;
    const sched = getMatchSchedule(1, slot);
    matches.push({ id: uid(), round: 1, slot: slot++, teamAId: tA, teamBId: tB, winnerId: isBye ? (tA || tB || null) : null, isBye, ...sched });
  }
  const totalSlots = nextPowerOf2(matches.length);
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
  for (const m of matches.filter((m) => m.round === 1 && m.isBye)) advanceWinner(matches, m);
  return matches;
}

// ─── Default match slot data ────────────────────────────────────────────────

const defaultMatch = (id: string, teamA = "TBD", teamB = "TBD"): Match => ({
  id,
  tournamentName: "",
  teamAName: teamA,
  teamBName: teamB,
  scoreA: 0,
  scoreB: 0,
  status: "scheduled",
  elapsedMs: 0,
  runningSince: null,
  penalties: [],
});

const defaultSlots: [MatchSlot, MatchSlot] = [
  { slotId: 1, match: defaultMatch("match-slot-1"), events: [], visibleOnScoreboard: true, lastActiveAt: null },
  { slotId: 2, match: defaultMatch("match-slot-2"), events: [], visibleOnScoreboard: true, lastActiveAt: null },
];

export const emptyState: AppState = {
  teams: [],
  players: [],
  tournaments: [],
  matches: defaultSlots,
  match: defaultSlots[0].match,
  events: defaultSlots[0].events,
  announcements: [],
  users: [],
  auditLogs: [],
};

// ─── DataStore interface ────────────────────────────────────────────────────

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
  createTournament(name: string, teamIds: string[], category?: TeamCategory, matchmakingType?: MatchmakingType, teamQuota?: number, manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }>, groupStageEnabled?: boolean, groupCount?: number, qualifiersPerGroup?: number, logoUrl?: string | null, bannerUrl?: string | null, halfDurationMinutes?: number, halftimeDurationMinutes?: number, warmupDurationMinutes?: number, overtimeDurationMinutes?: number): Tournament;
  regenerateTournamentMatchmaking(tournamentId: string, matchmakingType: MatchmakingType, manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }>): void;
  setMatchWinner(tournamentId: string, matchId: string, winnerId: string): void;
  removeTournament(id: string): void;
  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string): void;
  startMatch(slotId: MatchSlotId): void;
  pauseMatch(slotId: MatchSlotId): void;
  resumeMatch(slotId: MatchSlotId): void;
  endMatch(slotId: MatchSlotId): void;
  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number): void;
  issuePenalty(slotId: MatchSlotId, side: "A" | "B", type: PenaltyType): void;
  resetMatch(slotId: MatchSlotId): void;
  setSlotVisibility(slotId: MatchSlotId, visible: boolean): void;
  touchSlotPresence(slotId: MatchSlotId): void;
  releaseSlotPresence(slotId: MatchSlotId): void;
  refreshMatchSlots(): Promise<void>;
  addAnnouncement(input: Omit<Announcement, "id" | "createdAt">): Announcement;
  updateAnnouncement(id: string, patch: Partial<Omit<Announcement, "id" | "createdAt">>): void;
  removeAnnouncement(id: string): void;
  togglePinAnnouncement(id: string): void;
  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser;
  updateUserRole(id: string, role: UserTag): void;
  updateUserStatus(id: string, status: AppUser["status"]): void;
  removeUser(id: string): void;
  logAudit(action: string, performedBy: string, target: string, category: AuditLogEntry["category"], details?: string): void;
  refreshAuditLogs(): Promise<void>;
  changeMatchPhase(slotId: MatchSlotId, phase: string): void;
}

// ─── SupabaseStore ──────────────────────────────────────────────────────────

export class SupabaseStore implements DataStore {
  private state: AppState = emptyState;
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrationError: string | null = null;
  private matchArchive: Record<string, { match: Match; events: MatchEvent[] }> = {};
  private writeQueue = Promise.resolve();
  private persistedEventIds = new Set<string>();
  private persistedPenaltyIds = new Set<string>();

  getHydrationError() { return this.hydrationError; }

  async hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;

    try {
      const responses = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('tournaments').select('*'),
        supabase.from('audit_logs').select('*'),
        supabase.from('tournament_matches').select('*'),
        supabase.from('tournament_teams').select('*'),
        supabase.from('match_slots').select('*'),
        supabase.from('match_events').select('*').order('created_at', { ascending: false }),
        supabase.from('penalties').select('*').order('created_at', { ascending: false })
      ]);
      const firstError = responses.find((response) => response.error)?.error;
      if (firstError) throw firstError;
      const [users, teams, players, announcements, tournaments, auditLogs, tournamentMatches, tournamentTeams, matchSlots, matchEvents, penalties] = responses.map((response) => response.data);

      const camelTournaments = toCamel(tournaments || []);
      const camelMatches = toCamel(tournamentMatches || []);
      const camelTournamentTeams = toCamel(tournamentTeams || []);

      const mappedTournaments = camelTournaments.map((t: any) => ({
        ...t,
        teamIds: camelTournamentTeams
          .filter((link: any) => link.tournamentId === t.id)
          .map((link: any) => link.teamId),
        matches: camelMatches.filter((m: any) => m.tournamentId === t.id)
      }));

      this.state = {
        ...emptyState,
        users: toCamel(users) || [],
        teams: toCamel(teams) || [],
        players: toCamel(players) || [],
        announcements: toCamel(announcements) || [],
        tournaments: mappedTournaments,
        auditLogs: toCamel(auditLogs) || [],
      };
      this.applyMatchSlots(toCamel(matchSlots) || [], toCamel(matchEvents) || [], toCamel(penalties) || []);
      this.notify();
    } catch (e) {
      console.error("Supabase hydration failed", e);
      this.hydrated = false; 
      this.hydrationError = e instanceof Error ? e.message : String(e);
      this.notify();
    }
  }

  getState() { return this.state; }

  subscribe(listener: () => void) {
    this.hydrate();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private persist(label: string, operation: () => PromiseLike<{ error: unknown | null }>) {
    this.writeQueue = this.writeQueue.then(async () => {
      const { error } = await operation();
      if (error) throw error;
    }).catch((error) => {
      console.error(`Supabase ${label} failed:`, error);
    });
  }

  private commit(next: AppState) {
    this.state = next;
    this.notify();
  }

  // ─── Match slot helpers ─────────────────────────────────────────────────

  private getSlot(slotId: MatchSlotId): MatchSlot {
    return this.state.matches.find((s) => s.slotId === slotId) ?? this.state.matches[0];
  }

  private commitSlot(slotId: MatchSlotId, patch: Partial<Pick<MatchSlot, "match" | "events" | "visibleOnScoreboard" | "lastActiveAt">>) {
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, ...patch } : s)) as [MatchSlot, MatchSlot];
    const primary = matches[0];
    this.commit({ ...this.state, matches, match: primary.match, events: primary.events });
    const changedSlot = matches.find((slot) => slot.slotId === slotId)!;
    
    // Core state DB save
    if (patch.match !== undefined) this.persistMatchSlot(changedSlot);
    if (patch.events !== undefined) this.persistMatchEvents(changedSlot.slotId, changedSlot.events);
    if (patch.match !== undefined) this.persistMatchPenalties(changedSlot.slotId, changedSlot.match.penalties);
  }

  private applyMatchSlots(rows: any[], eventRows: any[] = [], penaltyRows: any[] = []) {
    if (!rows.length) return;
    const matches = this.state.matches.map((slot) => {
      const row = rows.find((candidate) => candidate.slotId === slot.slotId);
      if (!row) return slot;
      const events = eventRows
        .filter((event) => event.slotId === slot.slotId)
        .map((event) => ({ ...event, matchId: event.matchId || row.tournamentMatchId || slot.match.id }));
      const slotPenalties = penaltyRows
        .filter((penalty) => penalty.slotId === slot.slotId)
        .map((penalty) => ({ ...penalty, matchId: penalty.matchId || row.tournamentMatchId || slot.match.id }));
      events.forEach((event) => this.persistedEventIds.add(event.id));
      slotPenalties.forEach((penalty) => this.persistedPenaltyIds.add(penalty.id));
      return {
        ...slot,
        match: {
          ...slot.match,
          id: row.tournamentMatchId || slot.match.id,
          teamAName: row.teamAName || "TBD",
          teamBName: row.teamBName || "TBD",
          scoreA: Number(row.scoreA) || 0,
          scoreB: Number(row.scoreB) || 0,
          status: row.status || "scheduled",
          elapsedMs: Number(row.elapsedMs) || 0,
          runningSince: row.runningSince == null ? null : Number(row.runningSince),
          penalties: slotPenalties,
        },
        events,
        visibleOnScoreboard: row.visibleOnScoreboard ?? true,
        lastActiveAt: row.lastActiveAt == null ? null : Number(row.lastActiveAt),
      };
    }) as [MatchSlot, MatchSlot];
    this.state = { ...this.state, matches, match: matches[0].match, events: matches[0].events };
  }

  async refreshMatchSlots() {
    const { data, error } = await supabase.from('match_slots').select('*');
    if (error) {
      console.error('Supabase match slot refresh failed:', error);
      return;
    }
    const [{ data: eventData, error: eventError }, { data: penaltyData, error: penaltyError }] = await Promise.all([
      supabase.from('match_events').select('*').order('created_at', { ascending: false }),
      supabase.from('penalties').select('*').order('created_at', { ascending: false }),
    ]);
    if (eventError || penaltyError) {
      console.error('Supabase live event refresh failed:', eventError || penaltyError);
      return;
    }
    this.applyMatchSlots(toCamel(data || []), toCamel(eventData || []), toCamel(penaltyData || []));
    this.notify();
  }

  async refreshAuditLogs() {
    const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.error('Supabase audit log refresh failed:', error);
      return;
    }
    this.state = { ...this.state, auditLogs: toCamel(data || []) };
    this.notify();
  }

  // =====================================================================================
  // CRITICAL FIX 1: Removed scores and `.single()` from full row payload
  // =====================================================================================
  private persistMatchSlot(slot: MatchSlot) {
    const row = {
      tournament_match_id: slot.match.id,
      team_a_name: slot.match.teamAName,
      team_b_name: slot.match.teamBName,
      status: slot.match.status,
      elapsed_ms: slot.match.elapsedMs,
      running_since: slot.match.runningSince,
    };
    this.persist('match slot update', () => supabase.from('match_slots').update(row).eq('slot_id', slot.slotId));
  }

  private persistMatchEvents(slotId: MatchSlotId, events: MatchEvent[]) {
    const newEvents = events.filter((event) => !this.persistedEventIds.has(event.id));
    newEvents.forEach((event) => {
      this.persistedEventIds.add(event.id);
      const row = {
        id: event.id,
        slot_id: slotId,
        type: event.type,
        message: event.message,
        created_at: event.createdAt,
      };
      this.persist('match event insert', () => supabase.from('match_events').insert(row));
    });
  }

  private persistMatchPenalties(slotId: MatchSlotId, penalties: Penalty[]) {
    const newPenalties = penalties.filter((penalty) => !this.persistedPenaltyIds.has(penalty.id));
    newPenalties.forEach((penalty) => {
      this.persistedPenaltyIds.add(penalty.id);
      const row = {
        id: penalty.id,
        slot_id: slotId,
        side: penalty.side,
        type: penalty.type,
        created_at: penalty.createdAt,
      };
      this.persist('penalty insert', () => supabase.from('penalties').insert(row));
    });
  }

  private log(type: MatchEventType, message: string, matchId: string, events: MatchEvent[]): MatchEvent[] {
    const event: MatchEvent = { id: uid(), matchId, type, message, createdAt: Date.now() };
    return [event, ...events].slice(0, 50);
  }

  // ─── Teams & Tournaments ────────────────────────────────────────────────────────

  addTeam(input: Omit<Team, "id" | "status" | "createdAt">) {
    const team: Team = { ...input, id: uid(), status: "pending", createdAt: Date.now() };
    this.commit({ ...this.state, teams: [team, ...this.state.teams] });
    this.persist('team insert', () => supabase.from('teams').insert(toSnake(team)));
    this.logAudit("Team created", currentAuditActor(), team.name, "Team", `Coach: ${team.coachName}`);
    return team;
  }

  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>) {
    const rows: Player[] = players.map((p) => ({ ...p, id: uid(), teamId, status: "pending" as const, createdAt: Date.now() }));
    this.commit({ ...this.state, players: [...rows, ...this.state.players] });
    this.persist('player insert', () => supabase.from('players').insert(rows.map(toSnake)));
    this.logAudit("Players added", currentAuditActor(), teamId, "Team", `${rows.length} player(s) added`);
  }

  setTeamStatus(id: string, status: EntityStatus) {
    this.commit({
      ...this.state,
      teams: this.state.teams.map((t) => (t.id === id ? { ...t, status } : t)),
      players: this.state.players.map((p) => (p.teamId === id ? { ...p, status } : p)),
    });
    this.persist('team status update', () => supabase.from('teams').update({ status }).eq('id', id));
    this.persist('player status update', () => supabase.from('players').update({ status }).eq('team_id', id));
    this.logAudit("Team status updated", currentAuditActor(), id, "Team", `Status: ${status}`);
  }

  setPlayerStatus(id: string, status: EntityStatus) {
    this.commit({ ...this.state, players: this.state.players.map((p) => (p.id === id ? { ...p, status } : p)) });
    this.persist('player status update', () => supabase.from('players').update({ status }).eq('id', id));
    this.logAudit("Player status updated", currentAuditActor(), id, "Team", `Status: ${status}`);
  }

  updatePlayer(id: string, patch: Partial<Omit<Player, "id" | "createdAt">>) {
    this.commit({ ...this.state, players: this.state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    this.persist('player update', () => supabase.from('players').update(toSnake(patch)).eq('id', id));
    this.logAudit("Player updated", currentAuditActor(), id, "Team");
  }

  removePlayer(id: string) {
    this.commit({ ...this.state, players: this.state.players.filter((p) => p.id !== id) });
    this.persist('player delete', () => supabase.from('players').delete().eq('id', id));
    this.logAudit("Player deleted", currentAuditActor(), id, "Team");
  }

  updateTeam(id: string, patch: Partial<Omit<Team, "id" | "createdAt" | "ownerId">>) {
    this.commit({ ...this.state, teams: this.state.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    this.persist('team update', () => supabase.from('teams').update(toSnake(patch)).eq('id', id));
    this.logAudit("Team updated", currentAuditActor(), id, "Team");
  }

  removeTeam(id: string) {
    this.commit({
      ...this.state,
      teams: this.state.teams.filter((t) => t.id !== id),
      players: this.state.players.filter((p) => p.teamId !== id),
    });
    this.persist('team delete', () => supabase.from('teams').delete().eq('id', id));
    this.logAudit("Team deleted", currentAuditActor(), id, "Team");
  }

  createTournament(
    name: string,
    teamIds: string[],
    category?: TeamCategory,
    matchmakingType: MatchmakingType = "auto",
    teamQuota?: number,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }>,
    groupStageEnabled = false,
    groupCount = 4,
    qualifiersPerGroup = 2,
    logoUrl = null,
    bannerUrl = null,
    halfDurationMinutes = 5,
    halftimeDurationMinutes = 2,
    warmupDurationMinutes = 5,
    overtimeDurationMinutes = 3
  ) {
    const uniqueTeamIds = [...new Set(teamIds)].slice(0, 128);
    if (uniqueTeamIds.length < 2) throw new Error("A tournament requires at least 2 teams.");
    if (teamQuota && (teamQuota < 2 || teamQuota > 128)) throw new Error("Tournament team quota must be between 2 and 128.");
    const matches = groupStageEnabled
      ? generateGroupStage(uniqueTeamIds, groupCount)
      :
      matchmakingType === "manual" && manualPairs && manualPairs.length > 0
        ? generateManualBracket(manualPairs)
        : generateBracket(uniqueTeamIds);

    const tournament: Tournament = {
      id: uid(),
      name,
      status: "active",
      teamIds: uniqueTeamIds,
      matches,
      matchmakingType,
      ...(teamQuota ? { teamQuota } : {}),
      groupStageEnabled,
      ...(groupStageEnabled ? { groupCount, qualifiersPerGroup } : {}),
      logoUrl,
      bannerUrl,
      halfDurationMinutes,
      halftimeDurationMinutes,
      warmupDurationMinutes,
      overtimeDurationMinutes,
      createdAt: Date.now(),
      ...(category ? { category } : {}),
    };

    this.commit({ ...this.state, tournaments: [tournament, ...this.state.tournaments] });

    // Keep the database payload aligned with the deployed Supabase schema.
    // The client model also contains UI-only bracket/group fields, but sending
    // those fields to PostgREST makes the entire tournament insert fail when
    // the corresponding columns do not exist in the database.
    const mapped = {
      id: tournament.id,
      name: tournament.name,
      category: tournament.category ?? null,
      status: tournament.status,
      matchmaking_type: tournament.matchmakingType ?? null,
      team_quota: tournament.teamQuota ?? null,
      created_at: new Date(tournament.createdAt).toISOString(),
      logo_url: tournament.logoUrl ?? null,
      banner_url: tournament.bannerUrl ?? null,
      half_duration_minutes: tournament.halfDurationMinutes ?? 5,
      halftime_duration_minutes: tournament.halftimeDurationMinutes ?? 2,
      warmup_duration_minutes: tournament.warmupDurationMinutes ?? 5,
      overtime_duration_minutes: tournament.overtimeDurationMinutes ?? 3,
    };
    const tMatches = tournament.matches.map((match) => ({
      id: match.id,
      tournament_id: tournament.id,
      round: match.round,
      slot: match.slot,
      team_a_id: match.teamAId,
      team_b_id: match.teamBId,
      winner_id: match.winnerId,
      is_bye: match.isBye,
      scheduled_date: match.scheduledDate ?? null,
      scheduled_time: match.scheduledTime ?? null,
    }));
    this.persist('tournament insert', async () => {
      const result = await supabase.from('tournaments').insert(mapped);
      if (result.error) return result;
      if (tMatches.length) {
        const matchResult = await supabase.from('tournament_matches').insert(tMatches);
        if (matchResult.error) return matchResult;
      }
      const teamLinks = uniqueTeamIds.map((teamId) => ({ tournament_id: mapped.id, team_id: teamId }));
      if (teamLinks.length) return supabase.from('tournament_teams').insert(teamLinks);
      return result;
    });
    this.logAudit("Tournament created", currentAuditActor(), tournament.name, "Tournament", `${uniqueTeamIds.length} team(s)`);

    return tournament;
  }

  regenerateTournamentMatchmaking(
    tournamentId: string,
    matchmakingType: MatchmakingType,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }>
  ) {
    const tournaments = this.state.tournaments.map((t) => {
      if (t.id !== tournamentId) return t;
      const matches =
        matchmakingType === "manual" && manualPairs && manualPairs.length > 0
          ? generateManualBracket(manualPairs)
          : generateBracket(t.teamIds);
      return { ...t, matchmakingType, matches, status: "active" as const };
    });
    this.commit({ ...this.state, tournaments });

    const t = tournaments.find((x) => x.id === tournamentId);
    if (t) {
      this.persist('tournament matchmaking update', async () => {
        const updateResult = await supabase.from('tournaments').update({ matchmaking_type: matchmakingType }).eq('id', tournamentId);
        if (updateResult.error) return updateResult;
        const deleteResult = await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);
        if (deleteResult.error) return deleteResult;
        return supabase.from('tournament_matches').insert(t.matches.map(m => toSnake({ ...m, tournamentId })));
      });
    }
  }

  setMatchWinner(tournamentId: string, matchId: string, winnerId: string) {
    const previousMatchIds = new Set(this.state.tournaments.find(x => x.id === tournamentId)?.matches.map(m => m.id) ?? []);
    const tournaments = this.state.tournaments.map((t) => {
      if (t.id !== tournamentId) return t;
      const matches = t.matches.map((m) => ({ ...m }));
      const match = matches.find((m) => m.id === matchId);
      if (!match) return t;
      match.winnerId = winnerId;
      if (match.phase === "group") {
        const updated = { ...t, matches };
        const qualified = groupQualifiedTeams(updated);
        if (qualified) {
          const knockout = generateBracket(qualified).map((m) => ({ ...m, phase: "knockout" as const }));
          return { ...updated, matches: [...matches.filter((m) => m.phase !== "knockout"), ...knockout], status: "active" as const };
        }
        return { ...updated, matches, status: "active" as const };
      }
      advanceWinner(matches, match);
      const knockoutMatches = matches.filter((m) => (m.phase ?? "knockout") === "knockout");
      const finalMatch = knockoutMatches.reduce((a, b) => (b.round > a.round ? b : a));
      const status: Tournament["status"] = finalMatch.winnerId ? "completed" : "active";
      return { ...t, matches, status };
    });
    this.commit({ ...this.state, tournaments });

    const t = tournaments.find(x => x.id === tournamentId);
    if (t) {
      const newMatches = t.matches.filter((m) => !previousMatchIds.has(m.id));
      t.matches.filter((m) => previousMatchIds.has(m.id)).forEach(m => {
        this.persist('tournament match update', () => supabase.from('tournament_matches').update(toSnake(m)).eq('id', m.id));
      });
      if (newMatches.length) {
        this.persist('tournament knockout insert', () => supabase.from('tournament_matches').insert(newMatches.map(m => toSnake({ ...m, tournamentId }))));
      }
    }
  }

  removeTournament(id: string) {
    this.commit({ ...this.state, tournaments: this.state.tournaments.filter((t) => t.id !== id) });
    this.persist('tournament delete', () => supabase.from('tournaments').delete().eq('id', id));
    this.logAudit("Tournament deleted", currentAuditActor(), id, "Tournament");
  }

  // ─── Live Match Slots ───────────────────────────────────────────────────

  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string) {
    const archived = this.matchArchive[tournamentMatchId];
    if (archived) {
      this.commitSlot(slotId, { match: archived.match, events: archived.events });
      return;
    }
    const match: Match = defaultMatch(tournamentMatchId, teamAName, teamBName);
    this.commitSlot(slotId, { match, events: [] });
    // Reset DB Scores directly
    this.persist('reset scores', () => supabase.from('match_slots').update({ score_a: 0, score_b: 0 }).eq('slot_id', slotId));
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
      if (tMatch && !tMatch.winnerId && tMatch.phase !== "group") {
        if (match.scoreA > match.scoreB) tMatch.winnerId = tMatch.teamAId;
        else if (match.scoreB > match.scoreA) tMatch.winnerId = tMatch.teamBId;
        if (tMatch.winnerId) {
          advanceWinner(t.matches, tMatch);
          const knockoutMatches = t.matches.filter((m) => (m.phase ?? "knockout") === "knockout");
          const finalMatch = knockoutMatches.reduce((a, b) => (b.round > a.round ? b : a));
          t.status = finalMatch.winnerId ? "completed" : "active";
        }
      }
      return t;
    });

    this.matchArchive[match.id] = { match, events: nextEvents };

    this.commit(nextState);
    const finishedSlot = nextState.matches.find((slot) => slot.slotId === slotId)!;
    this.persistMatchSlot(finishedSlot);
    this.persistMatchEvents(slotId, nextEvents);
  }

  // =====================================================================================
  // CRITICAL FIX 2: ATOMIC RPC SCORE INCREMENTS
  // =====================================================================================
  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const key = side === "A" ? "scoreA" : "scoreB";
    const value = Math.max(0, m[key] + delta);
    const match: Match = { ...m, [key]: value } as Match;
    const name = side === "A" ? m.teamAName : m.teamBName;
    const events = this.log("score_changed", `${name} score ${delta > 0 ? "+" : "-"}1`, match.id, slot.events);
    
    // Update local state instantly so the referee doesn't feel a delay
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, match, events } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches, match: matches[0].match, events: matches[0].events });

    // Send targeted atomic update to DB
    this.persist('atomic score update', () => supabase.rpc('increment_slot_score', {
      p_slot_id: slotId,
      p_side: side,
      p_delta: delta
    }));
    
    this.persistMatchEvents(slotId, events);
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
    this.logAudit("Penalty issued", currentAuditActor(), match.id, "System", `${type} penalty for ${name}`);
  }

  resetMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const match: Match = { ...slot.match, scoreA: 0, scoreB: 0, status: "scheduled", elapsedMs: 0, runningSince: null, penalties: [] };
    this.commitSlot(slotId, { match, events: [] });
    // Reset DB Scores directly
    this.persist('reset scores', () => supabase.from('match_slots').update({ score_a: 0, score_b: 0 }).eq('slot_id', slotId));
  }

  changeMatchPhase(slotId: MatchSlotId, phase: string) {
    const slot = this.getSlot(slotId);
    const m = slot.match;
    // Reset the clock, pause the match, but KEEP the scores
    const match: Match = { ...m, status: "scheduled", elapsedMs: 0, runningSince: null };
    // Log a phase change event so the scoreboard knows what time limit to use
    const events = this.log("match_paused" as any, `PHASE_CHANGE:${phase}`, match.id, slot.events);
    
    this.commitSlot(slotId, { match, events });
    this.persist('reset timer for phase', () => supabase.from('match_slots').update({ status: 'scheduled', elapsed_ms: 0, running_since: null }).eq('slot_id', slotId));
  }

  // =====================================================================================
  // CRITICAL FIX 3: TARGETED DB PATCHES FOR PRESENCE & VISIBILITY
  // =====================================================================================
  setSlotVisibility(slotId: MatchSlotId, visible: boolean) {
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, visibleOnScoreboard: visible } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches });
    this.persist('visibility update', () => supabase.from('match_slots').update({ visible_on_scoreboard: visible }).eq('slot_id', slotId));
  }

  touchSlotPresence(slotId: MatchSlotId) {
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, lastActiveAt: Date.now() } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches });
    this.persist('presence update', () => supabase.from('match_slots').update({ last_active_at: Date.now() }).eq('slot_id', slotId));
  }

  releaseSlotPresence(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    if (slot.lastActiveAt === null) return;
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, lastActiveAt: null } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches });
    this.persist('presence release', () => supabase.from('match_slots').update({ last_active_at: null }).eq('slot_id', slotId));
  }

  // ─── Announcements ─────────────────────────────────────────────────────

  addAnnouncement(input: Omit<Announcement, "id" | "createdAt">): Announcement {
    const ann: Announcement = { ...input, id: uid(), createdAt: Date.now() };
    this.commit({ ...this.state, announcements: [ann, ...(this.state.announcements || [])] });
    this.persist('announcement insert', () => supabase.from('announcements').insert(toSnake(ann)));
    this.logAudit("Announcement created", currentAuditActor(), ann.title, "Announcement");
    return ann;
  }

  updateAnnouncement(id: string, patch: Partial<Omit<Announcement, "id" | "createdAt">>) {
    this.commit({ ...this.state, announcements: (this.state.announcements || []).map((a) => a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a) });
    this.persist('announcement update', () => supabase.from('announcements').update(toSnake(patch)).eq('id', id));
    this.logAudit("Announcement updated", currentAuditActor(), id, "Announcement");
  }

  removeAnnouncement(id: string) {
    this.commit({ ...this.state, announcements: (this.state.announcements || []).filter((a) => a.id !== id) });
    this.persist('announcement delete', () => supabase.from('announcements').delete().eq('id', id));
    this.logAudit("Announcement deleted", currentAuditActor(), id, "Announcement");
  }

  togglePinAnnouncement(id: string) {
    const target = this.state.announcements.find(a => a.id === id);
    if (target) this.updateAnnouncement(id, { pinned: !target.pinned });
  }

  // ─── Users ──────────────────────────────────────────────────────────────

  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser {
    const newUser: AppUser = { ...input, id: uid(), createdAt: Date.now() };
    this.commit({ ...this.state, users: [newUser, ...(this.state.users || [])] });
    this.persist('user insert', () => supabase.from('users').insert(toSnake(newUser)));
    this.logAudit("User created", currentAuditActor(), newUser.email, "User Management", `Role: ${newUser.role}`);
    return newUser;
  }

  updateUserRole(id: string, role: UserTag) {
    this.commit({ ...this.state, users: (this.state.users || []).map((u) => (u.id === id ? { ...u, role } : u)) });
    this.persist('user role update', () => supabase.from('users').update({ role }).eq('id', id));
    this.logAudit("User role updated", currentAuditActor(), id, "User Management", `Role: ${role}`);
  }

  updateUserStatus(id: string, status: AppUser["status"]) {
    this.commit({ ...this.state, users: (this.state.users || []).map((u) => (u.id === id ? { ...u, status } : u)) });
    this.persist('user status update', () => supabase.from('users').update({ status }).eq('id', id));
    this.logAudit("User status updated", currentAuditActor(), id, "User Management", `Status: ${status}`);
  }

  removeUser(id: string) {
    this.commit({ ...this.state, users: (this.state.users || []).filter((u) => u.id !== id) });
    this.persist('user delete', () => supabase.from('users').delete().eq('id', id));
    this.logAudit("User deleted", currentAuditActor(), id, "User Management");
  }

  logAudit(action: string, performedBy: string, target: string, category: AuditLogEntry["category"], details?: string) {
    const entry: AuditLogEntry = {
      id: uid(), action, performedBy, target, category,
      timestamp: Date.now(),
      ...(details ? { details } : {}),
    };
    this.commit({ ...this.state, auditLogs: [entry, ...(this.state.auditLogs || [])].slice(0, 200) });
    this.persist('audit log insert', () => supabase.from('audit_logs').insert(toSnake(entry)));
  }
}
