import { supabase } from "./supabase";
import type {
  AppState, Team, Player, Tournament, TournamentMatch, Announcement, AppUser, AuditLogEntry,
  MatchSlot, MatchSlotId, Match, MatchEvent, MatchEventType, PenaltyType,
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
      if ((k === 'createdAt' || k === 'updatedAt' || k === 'timestamp') && typeof val === 'number') {
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
      if ((camelKey === 'createdAt' || camelKey === 'updatedAt' || camelKey === 'timestamp' || camelKey === 'runningSince') && typeof val === 'string') {
        val = new Date(val).getTime();
      }
      return [camelKey, val];
    })
  );
}

// ─── ID + bracket helpers (self-contained, no store.ts import) ──────────────

const uid = () => Math.random().toString(36).slice(2, 10);

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

// ─── DataStore interface (inlined to avoid circular import) ─────────────────

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
  createTournament(name: string, teamIds: string[], category?: TeamCategory, matchmakingType?: MatchmakingType, teamQuota?: number, manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }>): Tournament;
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
  addAnnouncement(input: Omit<Announcement, "id" | "createdAt">): Announcement;
  updateAnnouncement(id: string, patch: Partial<Omit<Announcement, "id" | "createdAt">>): void;
  removeAnnouncement(id: string): void;
  togglePinAnnouncement(id: string): void;
  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser;
  updateUserRole(id: string, role: UserTag): void;
  updateUserStatus(id: string, status: AppUser["status"]): void;
  removeUser(id: string): void;
  logAudit(action: string, performedBy: string, target: string, category: AuditLogEntry["category"], details?: string): void;
}

// ─── SupabaseStore ──────────────────────────────────────────────────────────

export class SupabaseStore implements DataStore {
  private state: AppState = emptyState;
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrationError: string | null = null;
  private matchArchive: Record<string, { match: Match; events: MatchEvent[] }> = {};

  getHydrationError() { return this.hydrationError; }

  async hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;

    try {
      const [
        { data: users },
        { data: teams },
        { data: players },
        { data: announcements },
        { data: tournaments },
        { data: auditLogs },
        { data: tournamentMatches }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('tournaments').select('*'),
        supabase.from('audit_logs').select('*'),
        supabase.from('tournament_matches').select('*')
      ]);

      const camelTournaments = toCamel(tournaments || []);
      const camelMatches = toCamel(tournamentMatches || []);

      const mappedTournaments = camelTournaments.map((t: any) => ({
        ...t,
        teamIds: [], // will be populated below
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
      this.notify();
    } catch (e) {
      console.error("Supabase hydration failed", e);
      this.hydrated = false; // allow a retry on next subscribe() instead of getting stuck on emptyState forever
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
  }

  private log(type: MatchEventType, message: string, matchId: string, events: MatchEvent[]): MatchEvent[] {
    const event: MatchEvent = { id: uid(), matchId, type, message, createdAt: Date.now() };
    return [event, ...events].slice(0, 50);
  }

  // ─── Teams ──────────────────────────────────────────────────────────────

  addTeam(input: Omit<Team, "id" | "status" | "createdAt">) {
    const team: Team = { ...input, id: uid(), status: "pending", createdAt: Date.now() };
    this.commit({ ...this.state, teams: [team, ...this.state.teams] });
    supabase.from('teams').insert(toSnake(team)).then();
    return team;
  }

  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>) {
    const rows: Player[] = players.map((p) => ({ ...p, id: uid(), teamId, status: "pending" as const, createdAt: Date.now() }));
    this.commit({ ...this.state, players: [...rows, ...this.state.players] });
    supabase.from('players').insert(rows.map(toSnake)).then();
  }

  setTeamStatus(id: string, status: EntityStatus) {
    this.commit({
      ...this.state,
      teams: this.state.teams.map((t) => (t.id === id ? { ...t, status } : t)),
      players: this.state.players.map((p) => (p.teamId === id ? { ...p, status } : p)),
    });
    supabase.from('teams').update({ status }).eq('id', id).then();
    supabase.from('players').update({ status }).eq('team_id', id).then();
  }

  setPlayerStatus(id: string, status: EntityStatus) {
    this.commit({ ...this.state, players: this.state.players.map((p) => (p.id === id ? { ...p, status } : p)) });
    supabase.from('players').update({ status }).eq('id', id).then();
  }

  updatePlayer(id: string, patch: Partial<Omit<Player, "id" | "createdAt">>) {
    this.commit({ ...this.state, players: this.state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    supabase.from('players').update(toSnake(patch)).eq('id', id).then();
  }

  removePlayer(id: string) {
    this.commit({ ...this.state, players: this.state.players.filter((p) => p.id !== id) });
    supabase.from('players').delete().eq('id', id).then();
  }

  updateTeam(id: string, patch: Partial<Omit<Team, "id" | "createdAt" | "ownerId">>) {
    this.commit({ ...this.state, teams: this.state.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    supabase.from('teams').update(toSnake(patch)).eq('id', id).then();
  }

  removeTeam(id: string) {
    this.commit({
      ...this.state,
      teams: this.state.teams.filter((t) => t.id !== id),
      players: this.state.players.filter((p) => p.teamId !== id),
    });
    supabase.from('teams').delete().eq('id', id).then();
  }

  // ─── Tournaments ────────────────────────────────────────────────────────

  createTournament(
    name: string,
    teamIds: string[],
    category?: TeamCategory,
    matchmakingType: MatchmakingType = "auto",
    teamQuota?: number,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }>
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

    // Persist to Supabase
    const mapped = toSnake({ ...tournament });
    const tMatches = (mapped.matches || []).map((m: any) => ({ ...m, tournament_id: mapped.id }));
    delete mapped.matches;
    delete mapped.team_ids;
    supabase.from('tournaments').insert(mapped).then(() => {
      if (tMatches.length) supabase.from('tournament_matches').insert(tMatches).then();
    });

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
      supabase.from('tournaments').update({ matchmaking_type: matchmakingType }).eq('id', tournamentId).then(() => {
        supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId).then(() => {
          supabase.from('tournament_matches').insert(t.matches.map(m => toSnake({ ...m, tournamentId }))).then();
        });
      });
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

    // Sync all affected matches to Supabase
    const t = tournaments.find(x => x.id === tournamentId);
    if (t) {
      t.matches.forEach(m => {
        supabase.from('tournament_matches').update(toSnake(m)).eq('id', m.id).then();
      });
    }
  }

  removeTournament(id: string) {
    this.commit({ ...this.state, tournaments: this.state.tournaments.filter((t) => t.id !== id) });
    supabase.from('tournaments').delete().eq('id', id).then();
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

    // Advance winner in tournament
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

    // Archive
    this.matchArchive[match.id] = { match, events: nextEvents };

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

  resetMatch(slotId: MatchSlotId) {
    const slot = this.getSlot(slotId);
    const match: Match = { ...slot.match, scoreA: 0, scoreB: 0, status: "scheduled", elapsedMs: 0, runningSince: null, penalties: [] };
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

  // ─── Announcements ─────────────────────────────────────────────────────

  addAnnouncement(input: Omit<Announcement, "id" | "createdAt">): Announcement {
    const ann: Announcement = { ...input, id: uid(), createdAt: Date.now() };
    this.commit({ ...this.state, announcements: [ann, ...(this.state.announcements || [])] });
    supabase.from('announcements').insert(toSnake(ann)).then();
    return ann;
  }

  updateAnnouncement(id: string, patch: Partial<Omit<Announcement, "id" | "createdAt">>) {
    this.commit({ ...this.state, announcements: (this.state.announcements || []).map((a) => a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a) });
    supabase.from('announcements').update(toSnake(patch)).eq('id', id).then();
  }

  removeAnnouncement(id: string) {
    this.commit({ ...this.state, announcements: (this.state.announcements || []).filter((a) => a.id !== id) });
    supabase.from('announcements').delete().eq('id', id).then();
  }

  togglePinAnnouncement(id: string) {
    const target = this.state.announcements.find(a => a.id === id);
    if (target) this.updateAnnouncement(id, { pinned: !target.pinned });
  }

  // ─── Users ──────────────────────────────────────────────────────────────

  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser {
    const newUser: AppUser = { ...input, id: uid(), createdAt: Date.now() };
    this.commit({ ...this.state, users: [newUser, ...(this.state.users || [])] });
    return newUser;
  }

  updateUserRole(id: string, role: UserTag) {
    this.commit({ ...this.state, users: (this.state.users || []).map((u) => (u.id === id ? { ...u, role } : u)) });
    supabase.from('users').update({ role }).eq('id', id).then();
  }

  updateUserStatus(id: string, status: AppUser["status"]) {
    this.commit({ ...this.state, users: (this.state.users || []).map((u) => (u.id === id ? { ...u, status } : u)) });
    supabase.from('users').update({ status }).eq('id', id).then();
  }

  removeUser(id: string) {
    this.commit({ ...this.state, users: (this.state.users || []).filter((u) => u.id !== id) });
    supabase.from('users').delete().eq('id', id).then();
  }

  logAudit(action: string, performedBy: string, target: string, category: AuditLogEntry["category"], details?: string) {
    const entry: AuditLogEntry = {
      id: uid(), action, performedBy, target, category,
      timestamp: Date.now(),
      ...(details ? { details } : {}),
    };
    this.commit({ ...this.state, auditLogs: [entry, ...(this.state.auditLogs || [])].slice(0, 200) });
    supabase.from('audit_logs').insert(toSnake(entry)).then();
  }
}