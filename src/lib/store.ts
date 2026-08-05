import type {
  AppState,
  AuthUser,
  EntityStatus,
  Match,
  MatchEvent,
  MatchEventType,
  PenaltyType,
  Player,
  Team,
  TeamCategory,
  Tournament,
  TournamentMatch,
  UserRole,
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
  createTournament(name: string, teamIds: string[], category?: TeamCategory): Tournament;
  setMatchWinner(tournamentId: string, matchId: string, winnerId: string): void;
  removeTournament(id: string): void;
  setupLiveMatch(tournamentMatchId: string, teamAName: string, teamBName: string): void;
  startMatch(): void;
  pauseMatch(): void;
  resumeMatch(): void;
  endMatch(): void;
  adjustScore(side: "A" | "B", delta: number): void;
  issuePenalty(side: "A" | "B", type: PenaltyType): void;
  resetMatch(): void;
}

const STORAGE_KEY = "ds-league-state-v1";
const ARCHIVE_KEY = "ds-league-archive-v1"; 
const CHANNEL = "ds-league-channel";

const uid = () => Math.random().toString(36).slice(2, 10);

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
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
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const size = nextPowerOf2(shuffled.length);
  const byeCount = size - shuffled.length;
  const byeTeams = shuffled.slice(0, byeCount);
  const playingTeams = shuffled.slice(byeCount);

  const matches: TournamentMatch[] = [];
  let slot = 0;
  for (const teamId of byeTeams) {
    matches.push({ id: uid(), round: 1, slot: slot++, teamAId: teamId, teamBId: null, winnerId: teamId, isBye: true });
  }
  for (let i = 0; i < playingTeams.length; i += 2) {
    matches.push({
      id: uid(),
      round: 1,
      slot: slot++,
      teamAId: playingTeams[i] ?? null,
      teamBId: playingTeams[i + 1] ?? null,
      winnerId: null,
      isBye: false,
    }); 
  }

  let roundSize = size / 2;
  let round = 2;
  while (roundSize > 1) {
    const nextSize = roundSize / 2;
    for (let s = 0; s < nextSize; s++) {
      matches.push({ id: uid(), round, slot: s, teamAId: null, teamBId: null, winnerId: null, isBye: false });
    }
    roundSize = nextSize;
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
  id: "match-001",
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

export const initialState: AppState = {
  teams: [],
  players: [],
  tournaments: [],
  match: initialMatch,
  events: [],
};

class LocalStore implements DataStore {
  private state: AppState = initialState;
  private matchArchive: Record<string, { match: Match; events: MatchEvent[] }> = {}; 
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) this.state = { ...initialState, ...(JSON.parse(raw) as AppState) };
      
      const rawArchive = window.localStorage.getItem(ARCHIVE_KEY);
      if (rawArchive) this.matchArchive = JSON.parse(rawArchive);
    } catch { /* ignore corrupt state */ }
    
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<AppState>) => {
        this.state = e.data;
        this.listeners.forEach((l) => l());
      };
    }
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        this.state = JSON.parse(e.newValue) as AppState;
        this.listeners.forEach((l) => l());
      }
      if (e.key === ARCHIVE_KEY && e.newValue) {
        this.matchArchive = JSON.parse(e.newValue);
      }
    });
    this.listeners.forEach((l) => l());
  }

  getState() { return this.state; }

  subscribe(listener: () => void) {
    this.hydrate();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private syncArchive(next: AppState) {
    if (next.match.id && next.match.id !== "match-001") {
      this.matchArchive[next.match.id] = { match: next.match, events: next.events };
    }
    
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

  private log(type: MatchEventType, message: string, state: AppState): MatchEvent[] {
    const event: MatchEvent = { id: uid(), matchId: state.match.id, type, message, createdAt: Date.now() };
    return [event, ...state.events].slice(0, 50);
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

  createTournament(name: string, teamIds: string[], category?: TeamCategory) {
    const tournament: Tournament = {
      id: uid(), name, status: "active", teamIds, matches: generateBracket(teamIds), createdAt: Date.now(), ...(category ? { category } : {}),
    };
    this.commit({ ...this.state, tournaments: [tournament, ...this.state.tournaments] });
    return tournament;
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

  setupLiveMatch(tournamentMatchId: string, teamAName: string, teamBName: string) {
    const archived = this.matchArchive[tournamentMatchId];
    if (archived) {
      this.commit({ ...this.state, match: archived.match, events: archived.events });
      return;
    }

    const match: Match = {
      ...initialMatch,
      id: tournamentMatchId,
      teamAName,
      teamBName,
      status: "scheduled",
    };
    this.commit({ ...this.state, match, events: [] });
  }

  startMatch() {
    const match: Match = { ...this.state.match, status: "live", elapsedMs: 0, runningSince: Date.now() };
    this.commit({ ...this.state, match, events: this.log("match_started", "Match started", this.state) });
  }

  pauseMatch() {
    const m = this.state.match;
    if (m.status !== "live") return;
    const match: Match = {
      ...m, status: "paused", elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0), runningSince: null,
    };
    this.commit({ ...this.state, match, events: this.log("match_paused", "Match paused", this.state) });
  }

  resumeMatch() {
    const m = this.state.match;
    if (m.status !== "paused") return;
    const match: Match = { ...m, status: "live", runningSince: Date.now() };
    this.commit({ ...this.state, match, events: this.log("match_resumed", "Match resumed", this.state) });
  }

  endMatch() {
    const m = this.state.match;
    const match: Match = {
      ...m, status: "finished", elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0), runningSince: null,
    };
    
    let nextEvents = this.log("match_ended", "Match ended", { ...this.state, match });
    let nextState = { ...this.state, match, events: nextEvents };

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

  adjustScore(side: "A" | "B", delta: number) {
    const m = this.state.match;
    const key = side === "A" ? "scoreA" : "scoreB";
    const value = Math.max(0, m[key] + delta);
    const match: Match = { ...m, [key]: value } as Match;
    const name = side === "A" ? m.teamAName : m.teamBName;
    this.commit({ ...this.state, match, events: this.log("score_changed", `${name} score ${delta > 0 ? "+" : "-"}1 (now ${value})`, { ...this.state, match }) });
  }

  issuePenalty(side: "A" | "B", type: PenaltyType) {
    const m = this.state.match;
    const match: Match = {
      ...m, penalties: [{ id: uid(), matchId: m.id, side, type, createdAt: Date.now() }, ...m.penalties],
    };
    const name = side === "A" ? m.teamAName : m.teamBName;
    this.commit({ ...this.state, match, events: this.log("penalty_issued", `${type} penalty — ${name}`, { ...this.state, match }) });
  }

  // UPDATED: Now clears the CURRENT match's data while keeping the ID intact!
  resetMatch() {
    const m = this.state.match;
    const match: Match = {
      ...m,
      scoreA: 0,
      scoreB: 0,
      status: "scheduled",
      elapsedMs: 0,
      runningSince: null,
      penalties: [],
    };
    this.commit({ ...this.state, match, events: [] });
  }
}

export const store: DataStore & { hydrate: () => void } = new LocalStore();

const AUTH_KEY = "ds-league-auth-v1";

export const auth = {
  login(email: string, role: UserRole): AuthUser {
    const user: AuthUser = {
      id: `user_${email.trim().toLowerCase()}`, name: email.split("@")[0] || "dev-admin", email, role, token: `mock.${uid()}.${uid()}`,
    };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },
  current(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try { const raw = window.localStorage.getItem(AUTH_KEY); return raw ? (JSON.parse(raw) as AuthUser) : null; } catch { return null; }
  },
  logout() { window.localStorage.removeItem(AUTH_KEY); },
};

export const homeForRole = (role: UserRole) => role === "referee" ? "/referee" : role === "coach" ? "/register-team" : "/admin";