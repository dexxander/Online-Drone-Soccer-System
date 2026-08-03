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
  UserRole,
} from "./types";

/**
 * ---------------------------------------------------------------------------
 * Data abstraction layer.
 *
 * Every UI component talks to the `store` object below and never to a concrete
 * backend. Swapping the LocalStore implementation for a Firebase/Firestore one
 * later only requires implementing `DataStore` — no UI refactor.
 * ---------------------------------------------------------------------------
 */

export interface DataStore {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  addTeam(input: Omit<Team, "id" | "status" | "createdAt">): Team;
  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>): void;
  setTeamStatus(id: string, status: EntityStatus): void;
  setPlayerStatus(id: string, status: EntityStatus): void;
  startMatch(): void;
  pauseMatch(): void;
  resumeMatch(): void;
  endMatch(): void;
  adjustScore(side: "A" | "B", delta: number): void;
  issuePenalty(side: "A" | "B", type: PenaltyType): void;
  resetMatch(): void;
}

const STORAGE_KEY = "ds-league-state-v1";
const CHANNEL = "ds-league-channel";

const uid = () => Math.random().toString(36).slice(2, 10);

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
  match: initialMatch,
  events: [],
};

class LocalStore implements DataStore {
  private state: AppState = initialState;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) this.state = { ...initialState, ...(JSON.parse(raw) as AppState) };
    } catch {
      /* ignore corrupt state */
    }
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
    });
    this.listeners.forEach((l) => l());
  }

  getState() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.hydrate();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Mutate + persist + broadcast: the "socket.emit" of this prototype. */
  private commit(next: AppState) {
    this.state = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota */
      }
      this.channel?.postMessage(next);
    }
    this.listeners.forEach((l) => l());
  }

  private log(type: MatchEventType, message: string, state: AppState): MatchEvent[] {
    const event: MatchEvent = {
      id: uid(),
      matchId: state.match.id,
      type,
      message,
      createdAt: Date.now(),
    };
    return [event, ...state.events].slice(0, 50);
  }

  addTeam(input: Omit<Team, "id" | "status" | "createdAt">) {
    const team: Team = { ...input, id: uid(), status: "pending", createdAt: Date.now() };
    this.commit({ ...this.state, teams: [team, ...this.state.teams] });
    return team;
  }

  addPlayers(teamId: string, players: Array<Omit<Player, "id" | "teamId" | "status" | "createdAt">>) {
    const rows: Player[] = players.map((p) => ({
      ...p,
      id: uid(),
      teamId,
      status: "pending",
      createdAt: Date.now(),
    }));
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

  startMatch() {
    const match: Match = { ...this.state.match, status: "live", elapsedMs: 0, runningSince: Date.now() };
    this.commit({ ...this.state, match, events: this.log("match_started", "Match started", this.state) });
  }

  pauseMatch() {
    const m = this.state.match;
    if (m.status !== "live") return;
    const match: Match = {
      ...m,
      status: "paused",
      elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0),
      runningSince: null,
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
      ...m,
      status: "finished",
      elapsedMs: m.elapsedMs + (m.runningSince ? Date.now() - m.runningSince : 0),
      runningSince: null,
    };
    this.commit({ ...this.state, match, events: this.log("match_ended", "Match ended", this.state) });
  }

  adjustScore(side: "A" | "B", delta: number) {
    const m = this.state.match;
    const key = side === "A" ? "scoreA" : "scoreB";
    const value = Math.max(0, m[key] + delta);
    const match: Match = { ...m, [key]: value } as Match;
    const name = side === "A" ? m.teamAName : m.teamBName;
    this.commit({
      ...this.state,
      match,
      events: this.log("score_changed", `${name} score ${delta > 0 ? "+" : "-"}1 (now ${value})`, this.state),
    });
  }

  issuePenalty(side: "A" | "B", type: PenaltyType) {
    const m = this.state.match;
    const match: Match = {
      ...m,
      penalties: [
        { id: uid(), matchId: m.id, side, type, createdAt: Date.now() },
        ...m.penalties,
      ],
    };
    const name = side === "A" ? m.teamAName : m.teamBName;
    this.commit({
      ...this.state,
      match,
      events: this.log("penalty_issued", `${type} penalty — ${name}`, this.state),
    });
  }

  resetMatch() {
    this.commit({ ...this.state, match: { ...initialMatch }, events: [] });
  }
}

export const store: DataStore & { hydrate: () => void } = new LocalStore();

/* ----------------------------- mock auth layer ---------------------------- */

const AUTH_KEY = "ds-league-auth-v1";

export const auth = {
  login(email: string, role: UserRole): AuthUser {
    const user: AuthUser = {
      id: uid(),
      name: email.split("@")[0] || "dev-admin",
      email,
      role,
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
  role === "referee" ? "/referee" : role === "coach" ? "/register-team" : "/admin";
