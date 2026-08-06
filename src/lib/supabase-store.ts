import { supabase } from "./supabase";
import type { DataStore } from "./store";
import { store as localStore, initialState, initialMatchSlots, initialMatch, initialMatchSlot2 } from "./store";
import type {
  AppState, Team, Player, Tournament, Announcement, AppUser, AuditLogEntry,
  MatchSlot, MatchSlotId, Match, MatchEvent, PenaltyType, EntityStatus, UserTag, UserRole, MatchmakingType, TeamCategory
} from "./types";

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

export const uid = () => crypto.randomUUID();

export class SupabaseStore implements DataStore {
  private state: AppState = initialState;
  private listeners = new Set<() => void>();
  private hydrated = false;
  private matchArchive: Record<string, { match: Match; events: MatchEvent[] }> = {};

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
        matches: camelMatches.filter((m: any) => m.tournamentId === t.id)
      }));

      this.state = {
        ...initialState,
        users: toCamel(users) || [],
        teams: toCamel(teams) || [],
        players: toCamel(players) || [],
        announcements: toCamel(announcements) || [],
        tournaments: mappedTournaments,
        auditLogs: toCamel(auditLogs) || [],
      };
      this.commit(this.state);
    } catch (e) {
      console.error("Hydration failed", e);
    }
  }

  getState() { return this.state; }

  subscribe(listener: () => void) {
    this.hydrate();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(next: AppState) {
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  addTeam(input: Omit<Team, "id" | "status" | "createdAt">) {
    const team: Team = { ...input, id: uid(), status: "pending", createdAt: Date.now() };
    this.commit({ ...this.state, teams: [team, ...this.state.teams] });
    supabase.from('teams').insert(toSnake(team)).then();
    return team;
  }

  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>) {
    const rows: Player[] = players.map((p) => ({ ...p, id: uid(), teamId, status: "pending", createdAt: Date.now() }));
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
    this.commit({
      ...this.state,
      players: this.state.players.map((p) => (p.id === id ? { ...p, status } : p)),
    });
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

  createTournament(
    name: string,
    teamIds: string[],
    category?: TeamCategory | undefined,
    matchmakingType: MatchmakingType = "auto",
    teamQuota?: number | undefined,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }> | undefined
  ) {
    // Rely on local store implementation to generate the bracket for ease
    const t = localStore.createTournament(name, teamIds, category, matchmakingType, teamQuota, manualPairs);
    const mapped = toSnake(t);
    const tMatches = mapped.matches.map((m: any) => ({ ...m, tournament_id: mapped.id }));
    delete mapped.matches;

    supabase.from('tournaments').insert(mapped).then(() => {
      supabase.from('tournament_matches').insert(tMatches).then();
    });
    
    // Update our state with the localStore's updated tournaments
    this.commit({ ...this.state, tournaments: localStore.getState().tournaments });
    return t;
  }

  regenerateTournamentMatchmaking(
    tournamentId: string,
    matchmakingType: MatchmakingType,
    manualPairs?: Array<{ teamAId: string | null; teamBId: string | null }> | undefined
  ) {
    localStore.regenerateTournamentMatchmaking(tournamentId, matchmakingType, manualPairs);
    const nextTourneys = localStore.getState().tournaments;
    this.commit({ ...this.state, tournaments: nextTourneys });
    
    const t = nextTourneys.find((x) => x.id === tournamentId);
    if (t) {
       supabase.from('tournaments').update({ matchmaking_type: matchmakingType }).eq('id', tournamentId).then(() => {
           supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId).then(() => {
               supabase.from('tournament_matches').insert(t.matches.map(m => toSnake({ ...m, tournamentId }))).then();
           });
       });
    }
  }

  setMatchWinner(tournamentId: string, matchId: string, winnerId: string) {
    localStore.setMatchWinner(tournamentId, matchId, winnerId);
    this.commit({ ...this.state, tournaments: localStore.getState().tournaments });
    const t = this.state.tournaments.find(x => x.id === tournamentId);
    if (t) {
        // Just sync all matches for simplicity
        t.matches.forEach(m => {
            supabase.from('tournament_matches').update(toSnake(m)).eq('id', m.id).then();
        });
    }
  }

  removeTournament(id: string) {
    this.commit({ ...this.state, tournaments: this.state.tournaments.filter((t) => t.id !== id) });
    supabase.from('tournaments').delete().eq('id', id).then();
  }

  // --- MATCH SLOTS ---
  // To keep it simple, match slots still use LocalStore for real-time fast updates,
  // but we can persist final results to Supabase.
  
  private commitSlot(slotId: MatchSlotId, patch: Partial<Pick<MatchSlot, "match" | "events" | "visibleOnScoreboard" | "lastActiveAt">>) {
    // Update local state first
    const matches = this.state.matches.map((s) => (s.slotId === slotId ? { ...s, ...patch } : s)) as [MatchSlot, MatchSlot];
    const primary = matches[0];
    this.commit({ ...this.state, matches, match: primary.match, events: primary.events });
  }

  setupLiveMatch(slotId: MatchSlotId, tournamentMatchId: string, teamAName: string, teamBName: string) {
    localStore.setupLiveMatch(slotId, tournamentMatchId, teamAName, teamBName);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  startMatch(slotId: MatchSlotId) {
    localStore.startMatch(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  pauseMatch(slotId: MatchSlotId) {
    localStore.pauseMatch(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  resumeMatch(slotId: MatchSlotId) {
    localStore.resumeMatch(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  endMatch(slotId: MatchSlotId) {
    localStore.endMatch(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches, tournaments: localStore.getState().tournaments });
  }

  adjustScore(slotId: MatchSlotId, side: "A" | "B", delta: number) {
    localStore.adjustScore(slotId, side, delta);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  issuePenalty(slotId: MatchSlotId, side: "A" | "B", type: PenaltyType) {
    localStore.issuePenalty(slotId, side, type);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  resetMatch(slotId: MatchSlotId) {
    localStore.resetMatch(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  setSlotVisibility(slotId: MatchSlotId, visible: boolean) {
    localStore.setSlotVisibility(slotId, visible);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  touchSlotPresence(slotId: MatchSlotId) {
    localStore.touchSlotPresence(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

  releaseSlotPresence(slotId: MatchSlotId) {
    localStore.releaseSlotPresence(slotId);
    this.commit({ ...this.state, matches: localStore.getState().matches });
  }

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
    if (target) {
        this.updateAnnouncement(id, { pinned: !target.pinned });
    }
  }

  addUser(input: Omit<AppUser, "id" | "createdAt">): AppUser {
    // Note: in a real app, you can't insert users directly to auth.users, they must sign up.
    // This is just mapping the existing function to local state.
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
      id: uid(),
      action,
      performedBy,
      target,
      category,
      timestamp: Date.now(),
      ...(details ? { details } : {}),
    };
    this.commit({ ...this.state, auditLogs: [entry, ...(this.state.auditLogs || [])].slice(0, 200) });
    supabase.from('audit_logs').insert(toSnake(entry)).then();
  }
}
