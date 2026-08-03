import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "./firebase";
import type { Role, UserProfile } from "./types";
import { AuthService } from "./services/AuthService";

interface AuthContextValue {
  user: Partial<User> | null;
  profile: UserProfile | null;
  role: Role | null;
  initializing: boolean;
  configured: boolean;
  register: (input: {
    email: string;
    password?: string;
    displayName: string;
    role: Role;
  }) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setDevRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Roles a brand new account may self-assign. Admin/referee are granted by an admin. */
export const SELF_SERVE_ROLES: Role[] = ["coach", "player", "viewer"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Initial load
  useEffect(() => {
    const { user, profile } = AuthService.getCurrentUser();
    setUser(user);
    setProfile(profile);
    setInitializing(false);
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    const data = await AuthService.login(email, password);
    setUser(data.user);
    setProfile(data.profile);
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    await AuthService.register(input);
    const data = AuthService.getCurrentUser();
    setUser(data.user);
    setProfile(data.profile);
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // Mock implementation doesn't actually reset passwords
    console.log("Password reset requested for", email);
  }, []);

  const resendVerification = useCallback(async () => {
    console.log("Email verification resent.");
  }, []);

  const refreshUser = useCallback(async () => {
    const data = AuthService.getCurrentUser();
    setUser(data.user);
    setProfile(data.profile);
  }, []);

  const setDevRole = useCallback((role: Role) => {
    if (AuthService.setDevRole) {
      AuthService.setDevRole(role);
      refreshUser();
    }
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      initializing,
      configured: isFirebaseConfigured,
      register,
      login,
      logout,
      resetPassword,
      resendVerification,
      refreshUser,
      setDevRole,
    }),
    [
      user,
      profile,
      initializing,
      register,
      login,
      logout,
      resetPassword,
      resendVerification,
      refreshUser,
      setDevRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function can(role: Role | null, action: keyof typeof PERMISSIONS): boolean {
  if (!role) return false;
  return (PERMISSIONS[action] as readonly Role[]).includes(role);
}

export const PERMISSIONS = {
  manageUsers: ["admin"],
  manageTeams: ["admin"],
  manageOwnTeam: ["admin", "coach"],
  managePlayers: ["admin", "coach"],
  manageTournaments: ["admin"],
  manageMatches: ["admin", "referee"],
  recordScores: ["admin", "referee"],
  manageAnnouncements: ["admin"],
  viewAuditLogs: ["admin"],
} as const;
