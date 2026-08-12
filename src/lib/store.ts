import type {
  AppUser,
  AuthUser,
  UserRole,
} from "./types";

import { supabase } from "./supabase";
import { SupabaseStore, emptyState, type DataStore } from "./supabase-store";

export type { DataStore };

export const store: DataStore & { hydrate: () => void } = new SupabaseStore();
export const initialState = emptyState;

export const PRESENCE_TTL_MS = 8000;
export const PRESENCE_HEARTBEAT_MS = 3000;

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

const AUTH_KEY = "ds-league-auth-v1";
const AUTH_CHANGE_EVENT = "ds-league-auth-change";

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

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
  async login(email: string, password?: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || 'password123' });
    if (error) throw error;
    
    // Fetch role from users table
    const { data: userRow, error: userError } = await supabase.from('users').select('role, name').eq('id', data.user.id).single();
    
    if (userError) {
      console.error("Error fetching user profile:", userError);
    }
    
    // If the database returns null or there's an error, fallback to 'user'
    const role = userRow?.role || 'user';
    
    const user: AuthUser = {
      id: data.user.id,
      name: userRow?.name || email.split("@")[0],
      email,
      role: role as UserRole,
      token: data.session.access_token,
    };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    notifyAuthChange();
    return user;
  },
  async register(email: string, name: string, role: string, password?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password || 'password123',
      options: {
        data: { name, role }
      }
    });
    if (error) throw error;
    
    // Auto-login after register
    return this.login(email, password || 'password123');
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
  subscribe(listener: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const handleChange = () => listener();
    window.addEventListener(AUTH_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  },
  async logout() {
    window.localStorage.removeItem(AUTH_KEY);
    notifyAuthChange();
    await supabase.auth.signOut();
  },
};

export const homeForRole = (role: UserRole) =>
  role === "admin" ? "/admin" : role === "referee" ? "/referee" : role === "coach" ? "/register-team" : "/";
