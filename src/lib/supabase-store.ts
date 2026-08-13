import { supabase } from "./supabase";
import { calculateEffectivePenalties } from "./penalties";
import type {
  AppState, Team, Player, Tournament, TournamentMatch, Announcement, AppUser, AuditLogEntry,
  MatchSlot, MatchSlotId, Match, MatchEvent, MatchEventType, Penalty, PenaltyType,
  EntityStatus, UserTag, MatchmakingType, TeamCategory
} from "./types";

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

// FIX: Removed static "AUG 2026" mock data
function getMatchSchedule(round: number, slot: number) {
  return {
    scheduledDate: undefined,
    scheduledTime: undefined,
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
  setTournamentStatus(id: string, status: "draft" | "active" | "completed"): void;
  removeTournament(id: string): void;
  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string): void;
  startMatch(slotId: MatchSlotId): void;
  pauseMatch(slotId: MatchSlotId): void;
  resumeMatch(slotId: MatchSlotId): void;
  endMatch(slotId: MatchSlotId): void;
  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number, isOwnGoal?: boolean): void;
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
  changeMatchPhase(slotId: MatchSlotId, phase: string, endCurrentPhase?: string): void;
}

export class SupabaseStore implements DataStore {
  private state: AppState = emptyState;
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrationError: string | null = null;
  private matchArchive: Record<string, { match: Match; events: MatchEvent[] }> = {};
  private writeQueue = Promise.resolve();
  private persistedEventIds = new Set<string>();
  private persistedPenaltyIds = new Set<string>();
  
  private slotLocks: Record<number, number> = {};

  private lockSlot(slotId: number) {
    this.slotLocks[slotId] = Date.now();
  }

  private isSlotLocked(slotId: number) {
    return this.slotLocks[slotId] && (Date.now() - this.slotLocks[slotId] < 5000); 
  }

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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn(`Supabase ${label} skipped: no authenticated session`);
          return;
        }
        const { error } = await operation();
        if (error) console.error(`Supabase ${label} failed:`, error);
      } catch (e) {
        console.error(`Supabase ${label} threw:`, e);
      }
    });
  }

  private commit(next: AppState) {
    this.state = next;
    this.notify();
  }

  private getSlot(slotId: MatchSlotId): MatchSlot {
    return this.state.matches.find((s) => s.slotId === slotId) ?? this.state.matches[0];
  }

  private commitSlot(slotId: MatchSlotId, patch: Partial<Pick<MatchSlot, "match" | "events" | "visibleOnScoreboard" | "lastActiveAt">>) {
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, ...patch } : s)) as [MatchSlot, MatchSlot];
    
    this.commit({ ...this.state, matches, match: matches[0].match, events: matches[0].events });
    
    const changedSlot = matches.find((slot) => slot.slotId === slotId)!;
    if (patch.match !== undefined) this.persistMatchSlot(changedSlot);
    if (patch.events !== undefined) this.persistMatchEvents(changedSlot.slotId, changedSlot.events);
    if (patch.match !== undefined) this.persistMatchPenalties(changedSlot.slotId, changedSlot.match.penalties);
  }

  private applyMatchSlots(rows: any[], eventRows: any[] = [], penaltyRows: any[] = []) {
    if (!rows.length) return;
    const matches = this.state.matches.map((slot) => {
      if (this.isSlotLocked(slot.slotId)) {
        return slot; 
      }

      const row = rows.find((candidate) => candidate.slotId === slot.slotId);
      if (!row) return slot;

      // Events and penalties belong to a match, not merely to a reusable court.
      // During match setup the court row is updated before the old child rows
      // are deleted, so filtering only by slot can briefly leak the previous
      // match's cards/events into the new match.
      const matchId = row.tournamentMatchId || slot.match.id;
      const events = eventRows
        .filter((event) => event.slotId === slot.slotId && event.matchId === matchId)
        .map((event) => ({ ...event, matchId }));
      const slotPenalties = penaltyRows
        .filter((penalty) => penalty.slotId === slot.slotId && penalty.matchId === matchId)
        .map((penalty) => ({ ...penalty, matchId }));
      events.forEach((event) => this.persistedEventIds.add(event.id));
      slotPenalties.forEach((penalty) => this.persistedPenaltyIds.add(penalty.id));

      return {
        ...slot,
        match: {
          ...slot.match,
          id: matchId,
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

  private persistMatchSlot(slot: MatchSlot) {
    const row = {
      tournament_match_id: slot.match.id,
      team_a_name: slot.match.teamAName,
      team_b_name: slot.match.teamBName,
      score_a: slot.match.scoreA,
      score_b: slot.match.scoreB,
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
        match_id: event.matchId,
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
        match_id: penalty.matchId,
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
      this.persist('tournament status update', () => supabase.from('tournaments').update({ status: t.status }).eq('id', tournamentId));

      const newMatches = t.matches.filter((m) => !previousMatchIds.has(m.id));
      t.matches.filter((m) => previousMatchIds.has(m.id)).forEach(m => {
        this.persist('tournament match update', () => supabase.from('tournament_matches').update(toSnake(m)).eq('id', m.id));
      });
      if (newMatches.length) {
        this.persist('tournament knockout insert', () => supabase.from('tournament_matches').insert(newMatches.map(m => toSnake({ ...m, tournamentId }))));
      }
    }
  }

  setTournamentStatus(id: string, status: "draft" | "active" | "completed") {
    const tournaments = this.state.tournaments.map((t) => (t.id === id ? { ...t, status } : t));
    this.commit({ ...this.state, tournaments });
    this.persist('tournament status update', () => supabase.from('tournaments').update({ status }).eq('id', id));
    this.logAudit("Tournament status changed", currentAuditActor(), id, "Tournament", `Status manually set to ${status}`);
  }

  removeTournament(id: string) {
    this.commit({ ...this.state, tournaments: this.state.tournaments.filter((t) => t.id !== id) });
    this.persist('tournament delete', () => supabase.from('tournaments').delete().eq('id', id));
    this.logAudit("Tournament deleted", currentAuditActor(), id, "Tournament");
  }

  // FIX: Properly register synthetic manual events into `persistedEventIds` to prevent 409 Conflicts
  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string) {
    this.lockSlot(slotId);
    
    const oldSlot = this.getSlot(slotId);
    if (oldSlot.match.id && !oldSlot.match.id.startsWith("match-slot-")) {
        let finalOldMatch = { ...oldSlot.match };
        let finalOldEvents = [...oldSlot.events];
        
        if (finalOldMatch.status === "live") {
           finalOldMatch.status = "paused";
           finalOldMatch.elapsedMs += (finalOldMatch.runningSince ? Date.now() - finalOldMatch.runningSince : 0);
           finalOldMatch.runningSince = null;
           finalOldEvents = [{ id: uid(), matchId: finalOldMatch.id, type: "match_paused" as MatchEventType, message: "Match paused (switched out)", createdAt: Date.now() }, ...finalOldEvents].slice(0, 50);
        }

        this.matchArchive[oldSlot.match.id] = {
            match: finalOldMatch,
            events: finalOldEvents
        };
    }

    const t = this.state.tournaments.find(t => t.matches.some(m => m.id === tournamentMatchId));
    const tMatch = t?.matches.find(m => m.id === tournamentMatchId);
    
    const existingScoreA = (tMatch as any)?.scoreA || 0;
    const existingScoreB = (tMatch as any)?.scoreB || 0;
    const existingStatus = tMatch?.winnerId ? "finished" : "scheduled";

    const archived = this.matchArchive[tournamentMatchId];
    let matchToRestore: Match;
    let freshEvents: MatchEvent[] = [];

    if (archived) {
        freshEvents = archived.events.map(e => ({ ...e, id: uid(), matchId: tournamentMatchId }));
        matchToRestore = { ...archived.match, id: tournamentMatchId, penalties: archived.match.penalties.map(p => ({ ...p, id: uid(), matchId: tournamentMatchId })) };
    } else {
        let initialElapsed = 0;
        if (existingStatus === "finished") {
           const guessedPhase = (existingScoreA === existingScoreB) ? "Overtime" : "2nd Half";
           freshEvents = [
               { id: uid(), matchId: tournamentMatchId, type: "match_ended" as MatchEventType, message: "Match ended", createdAt: Date.now() },
               { id: uid(), matchId: tournamentMatchId, type: "match_paused" as MatchEventType, message: `PHASE_CHANGE:${guessedPhase}`, createdAt: Date.now() - 1000 }
           ];
           initialElapsed = 9999999;
        } else if (existingScoreA > 0 || existingScoreB > 0) {
           freshEvents = [{ id: uid(), matchId: tournamentMatchId, type: "match_paused" as MatchEventType, message: "PHASE_CHANGE:1st Half", createdAt: Date.now() }];
        } else {
           freshEvents = [{ id: uid(), matchId: tournamentMatchId, type: "match_paused" as MatchEventType, message: "PHASE_CHANGE:Testing", createdAt: Date.now() }];
        }

        matchToRestore = {
           ...defaultMatch(tournamentMatchId, teamAName, teamBName),
           scoreA: existingScoreA,
           scoreB: existingScoreB,
           status: existingStatus as any,
           elapsedMs: initialElapsed,
           penalties: []
        };
    }

    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, match: matchToRestore, events: freshEvents } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches, match: matches[0].match, events: matches[0].events });
    
    this.persist('setup live match DB sync', async () => {
        await supabase.from('match_events').delete().eq('slot_id', slotId);
        await supabase.from('penalties').delete().eq('slot_id', slotId);

        await supabase.from('match_slots').update({ 
          tournament_match_id: tournamentMatchId,
          team_a_name: teamAName,
          team_b_name: teamBName,
          score_a: matchToRestore.scoreA, 
          score_b: matchToRestore.scoreB, 
          status: matchToRestore.status,
          elapsed_ms: matchToRestore.elapsedMs, 
          running_since: matchToRestore.runningSince 
        }).eq('slot_id', slotId);

        if (freshEvents.length > 0) {
          // Tell the local UI that we have inserted these to prevent duplicate loops
          freshEvents.forEach(e => this.persistedEventIds.add(e.id));
          const rows = freshEvents.map(e => ({
            id: e.id, slot_id: slotId, match_id: e.matchId, type: e.type, message: e.message, created_at: e.createdAt
          }));
          await supabase.from('match_events').insert(rows);
        }
        return { error: null };
    });
  }

  startMatch(slotId: MatchSlotId) {
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const match: Match = { ...slot.match, status: "live", elapsedMs: 0, runningSince: Date.now() };
    const events = this.log("match_started", "Match started", match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  pauseMatch(slotId: MatchSlotId) {
    this.lockSlot(slotId);
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
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const m = slot.match;
    if (m.status !== "paused") return;
    const match: Match = { ...m, status: "live", runningSince: Date.now() };
    const events = this.log("match_resumed", "Match resumed", match.id, slot.events);
    this.commitSlot(slotId, { match, events });
  }

  endMatch(slotId: MatchSlotId) {
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const match: Match = {
      ...m, status: "finished", elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0), runningSince: null,
    };

    const nextEvents = this.log("match_ended", "Match ended", match.id, slot.events);
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, match, events: nextEvents } : s)) as [MatchSlot, MatchSlot];
    
    this.commit({ ...this.state, matches, match: matches[0].match, events: matches[0].events });
    
    const finishedSlot = matches.find((s) => s.slotId === slotId)!;
    this.persistMatchSlot(finishedSlot);
    this.persistMatchEvents(slotId, nextEvents);

    const t = this.state.tournaments.find(t => t.matches.some(tm => tm.id === match.id));
    if (t) {
      const tMatch = t.matches.find(tm => tm.id === match.id);
      if (tMatch && !tMatch.winnerId && tMatch.phase !== "group") {
        let winnerId = null;
        const disqualifiedA = calculateEffectivePenalties(match.penalties.filter((penalty) => penalty.side === "A")).isDisqualified;
        const disqualifiedB = calculateEffectivePenalties(match.penalties.filter((penalty) => penalty.side === "B")).isDisqualified;
        if (disqualifiedA && !disqualifiedB) winnerId = tMatch.teamBId;
        else if (disqualifiedB && !disqualifiedA) winnerId = tMatch.teamAId;
        else if (match.scoreA > match.scoreB) winnerId = tMatch.teamAId;
        else if (match.scoreB > match.scoreA) winnerId = tMatch.teamBId;
        
        if (winnerId) {
          this.setMatchWinner(t.id, match.id, winnerId);
        }
      }
    }
  }

  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number, isOwnGoal = false) {
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const sidePenalties = m.penalties.filter((penalty) => penalty.side === side);
    if (calculateEffectivePenalties(sidePenalties).isDisqualified) return;
    const key = side === "A" ? "scoreA" : "scoreB";
    const value = Math.max(0, m[key] + delta);
    const match: Match = { ...m, [key]: value } as Match;
    
    const scoringTeam = side === "A" ? m.teamAName : m.teamBName;
    const concedingTeam = side === "A" ? m.teamBName : m.teamAName;
    
    let msg = `${scoringTeam} score ${delta > 0 ? "+" : "-"}1`;
    if (isOwnGoal && delta > 0) {
      msg = `OWN GOAL by ${concedingTeam}`;
    }

    const events = this.log("score_changed", msg, match.id, slot.events);
    
    const tournaments = this.state.tournaments.map(t => {
      if (!t.matches.some(tm => tm.id === match.id)) return t;
      return {
        ...t,
        matches: t.matches.map(tm => tm.id === match.id ? { ...tm, [key]: value } : tm)
      };
    });

    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, match, events } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches, tournaments, match: matches[0].match, events: matches[0].events });

    const dbField = side === "A" ? "score_a" : "score_b";
    
    this.persist('score update', async () => {
        await supabase.from('match_slots').update({ [dbField]: value }).eq('slot_id', slotId);
        await supabase.from('tournament_matches').update({ [dbField]: value }).eq('id', match.id);
        return { error: null };
    });
    this.persistMatchEvents(slotId, events);
  }

  issuePenalty(slotId: MatchSlotId, side: "A" | "B", type: PenaltyType) {
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const m = slot.match;
    if (calculateEffectivePenalties(m.penalties.filter((penalty) => penalty.side === side)).isDisqualified) return;
    const penalty = { id: uid(), matchId: m.id, side, type, createdAt: Date.now() };
    const match: Match = { ...m, penalties: [penalty, ...m.penalties] };
    const name = side === "A" ? m.teamAName : m.teamBName;
    let events = this.log("penalty_issued", `${type} penalty — ${name}`, match.id, slot.events);
    const isDisqualified = calculateEffectivePenalties(match.penalties.filter((item) => item.side === side)).isDisqualified;
    if (isDisqualified && match.status === "live") {
      match.elapsedMs += match.runningSince ? Date.now() - match.runningSince : 0;
      match.status = "paused";
      match.runningSince = null;
      events = this.log("match_paused", `${name} disqualified — clock stopped`, match.id, events);
    }
    this.commitSlot(slotId, { match, events });
    this.logAudit("Penalty issued", currentAuditActor(), match.id, "System", `${type} penalty for ${name}`);
  }

  // FIX: Properly register synthetic manual events into `persistedEventIds` to prevent 409 Conflicts
  resetMatch(slotId: MatchSlotId) {
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const match: Match = { ...slot.match, scoreA: 0, scoreB: 0, status: "scheduled", elapsedMs: 0, runningSince: null, penalties: [] };
    
    const pauseEvt: MatchEvent = { id: uid(), matchId: match.id, type: "match_paused" as MatchEventType, message: "PHASE_CHANGE:Testing", createdAt: Date.now() };
    const freshEvents: MatchEvent[] = [pauseEvt];
    
    const tournaments = this.state.tournaments.map(t => {
      if (!t.matches.some(tm => tm.id === match.id)) return t;
      return {
        ...t,
        matches: t.matches.map(tm => tm.id === match.id ? { ...tm, scoreA: 0, scoreB: 0 } : tm)
      };
    });

    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, match, events: freshEvents } : s)) as [MatchSlot, MatchSlot];
    this.commit({ ...this.state, matches, tournaments, match: matches[0].match, events: matches[0].events });
    
    this.persist('reset bundle', async () => {
        await supabase.from('match_events').delete().eq('slot_id', slotId);
        await supabase.from('penalties').delete().eq('slot_id', slotId);
        await supabase.from('match_slots').update({ score_a: 0, score_b: 0, elapsed_ms: 0, running_since: null }).eq('slot_id', slotId);
        await supabase.from('tournament_matches').update({ score_a: 0, score_b: 0 }).eq('id', match.id);
        
        // Track the inserted ID so we don't duplicate it in loop
        this.persistedEventIds.add(pauseEvt.id);
        await supabase.from('match_events').insert([{
           id: pauseEvt.id, slot_id: slotId, match_id: pauseEvt.matchId, type: pauseEvt.type, message: pauseEvt.message, created_at: pauseEvt.createdAt
        }]);
        return { error: null };
    });
  }

  changeMatchPhase(slotId: MatchSlotId, phase: string, endCurrentPhase?: string) {
    this.lockSlot(slotId);
    const slot = this.getSlot(slotId);
    const m = slot.match;
    const match: Match = { ...m, status: "scheduled", elapsedMs: 0, runningSince: null };
    
    let nextEvents = slot.events;
    if (endCurrentPhase) {
      nextEvents = this.log("match_paused" as any, `PHASE_END:${endCurrentPhase}`, match.id, nextEvents);
    }
    nextEvents = this.log("match_paused" as any, `PHASE_CHANGE:${phase}`, match.id, nextEvents);
    
    this.commitSlot(slotId, { match, events: nextEvents });
    this.persist('reset timer for phase', () => supabase.from('match_slots').update({ status: 'scheduled', elapsed_ms: 0, running_since: null }).eq('slot_id', slotId));
  }

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
