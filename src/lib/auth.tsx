import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase, isFirebaseConfigured } from "./firebase";
import { COL } from "./collections";
import type { Role, UserProfile } from "./types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: Role | null;
  initializing: boolean;
  configured: boolean;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role: Role;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Roles a brand new account may self-assign. Admin/referee are granted by an admin. */
export const SELF_SERVE_ROLES: Role[] = ["coach", "player", "viewer"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      setUser({ uid: "mock-uid", email: "admin@test.com", emailVerified: true } as User);
      setInitializing(false);
      return;
    }
    const unsubAuth = onAuthStateChanged(fb.auth, (next) => {
      setUser(next);
      setInitializing(false);
    });
    const unsubToken = onIdTokenChanged(fb.auth, (next) => setUser(next));
    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb || !user) {
      if (!fb && user?.uid === "mock-uid") {
        setProfile({
          id: "mock-uid",
          email: "admin@test.com",
          displayName: "Mock Admin",
          role: "admin",
          disabled: false,
          teamId: null,
          createdAt: 0,
          updatedAt: 0,
        });
      } else {
        setProfile(null);
      }
      return;
    }
    const ref = doc(fb.db, COL.users, user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({ id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) });
        } else {
          setProfile(null);
        }
      },
      () => setProfile(null),
    );
    return () => unsub();
  }, [user]);

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    const fb = getFirebase();
    if (!fb) throw new Error("Firebase is not configured.");
    const cred = await createUserWithEmailAndPassword(fb.auth, input.email, input.password);
    await updateProfile(cred.user, { displayName: input.displayName });
    await setDoc(doc(fb.db, COL.users, cred.user.uid), {
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      teamId: null,
      disabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await sendEmailVerification(cred.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const fb = getFirebase();
    if (!fb) throw new Error("Firebase is not configured.");
    const cred = await signInWithEmailAndPassword(fb.auth, email, password);
    const ref = doc(fb.db, COL.users, cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: cred.user.email,
        displayName: cred.user.displayName ?? email.split("@")[0],
        role: "viewer",
        teamId: null,
        disabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if ((snap.data() as UserProfile).disabled) {
      await signOut(fb.auth);
      throw new Error("This account has been deactivated. Contact an administrator.");
    }
  }, []);

  const logout = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) return;
    await signOut(fb.auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const fb = getFirebase();
    if (!fb) throw new Error("Firebase is not configured.");
    await sendPasswordResetEmail(fb.auth, email, {
      url: `${window.location.origin}/login`,
    });
  }, []);

  const resendVerification = useCallback(async () => {
    const fb = getFirebase();
    if (!fb?.auth.currentUser) throw new Error("You are not signed in.");
    await sendEmailVerification(fb.auth.currentUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const fb = getFirebase();
    if (!fb?.auth.currentUser) return;
    await fb.auth.currentUser.reload();
    setUser({ ...fb.auth.currentUser } as User);
  }, []);

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
