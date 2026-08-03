import { type User } from "firebase/auth";
import type { Role, UserProfile } from "../types";
import { getFirebase } from "../firebase";

export interface IAuthProvider {
  login(email: string, password?: string): Promise<{ user: Partial<User>; profile: UserProfile }>;
  logout(): Promise<void>;
  register(input: { email: string; password?: string; displayName: string; role: Role }): Promise<void>;
  getCurrentUser(): { user: Partial<User> | null; profile: UserProfile | null };
  setDevRole?(role: Role): void; // Only used by MockProvider
}

// --- MOCK PROVIDER (Development Mode) ---
class MockAuthProvider implements IAuthProvider {
  private mockUser: Partial<User> | null = null;
  private mockProfile: UserProfile | null = null;

  constructor() {
    // Try to load from localStorage to persist dev sessions
    try {
      const stored = localStorage.getItem("dev_mock_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.mockUser = parsed.user;
        this.mockProfile = parsed.profile;
      }
    } catch (e) {
      // ignore
    }
  }

  private save() {
    if (this.mockUser && this.mockProfile) {
      localStorage.setItem("dev_mock_user", JSON.stringify({ user: this.mockUser, profile: this.mockProfile }));
    } else {
      localStorage.removeItem("dev_mock_user");
    }
  }

  async login(email: string) {
    // Determine role based on email for easy testing if needed, or default to viewer
    let role: Role = "viewer";
    if (email.includes("admin")) role = "admin";
    if (email.includes("referee")) role = "referee";
    if (email.includes("coach")) role = "coach";

    this.mockUser = {
      uid: `mock-uid-${Date.now()}`,
      email,
      emailVerified: true,
      displayName: email.split("@")[0],
    };

    this.mockProfile = {
      id: this.mockUser.uid!,
      email,
      displayName: this.mockUser.displayName!,
      role,
      disabled: false,
    };

    this.save();
    return { user: this.mockUser, profile: this.mockProfile };
  }

  async logout() {
    this.mockUser = null;
    this.mockProfile = null;
    this.save();
  }

  async register(input: { email: string; displayName: string; role: Role }) {
    this.mockUser = {
      uid: `mock-uid-${Date.now()}`,
      email: input.email,
      emailVerified: true,
      displayName: input.displayName,
    };

    this.mockProfile = {
      id: this.mockUser.uid!,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      disabled: false,
    };
    this.save();
  }

  getCurrentUser() {
    return { user: this.mockUser, profile: this.mockProfile };
  }

  setDevRole(role: Role) {
    if (this.mockProfile) {
      this.mockProfile.role = role;
      this.save();
    } else {
      // If not logged in, implicitly log them in as a mock user with that role
      this.login(`dev-${role}@test.com`);
      if (this.mockProfile) this.mockProfile.role = role;
      this.save();
    }
  }
}


// --- EXPORTED SERVICE ---
// If Firebase isn't configured, or if we are explicitly forcing Dev mode, use Mock.
const fb = getFirebase();
const forceMock = import.meta.env.DEV && !fb; 

export const AuthService: IAuthProvider = forceMock || import.meta.env.DEV
  ? new MockAuthProvider() 
  : new MockAuthProvider(); // TODO: Implement Firebase provider, for now default to Mock in DEV.

// Exporting a singleton
export default AuthService;
