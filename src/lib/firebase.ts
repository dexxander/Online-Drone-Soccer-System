import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'] as string | undefined,
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'] as string | undefined,
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'] as string | undefined,
  storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'] as string | undefined,
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'] as string | undefined,
  appId: import.meta.env['VITE_FIREBASE_APP_ID'] as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

let services: FirebaseServices | null = null;

/** Lazily initialise Firebase. Returns null when env config is missing. */
export function getFirebase(): FirebaseServices | null {
  if (!isFirebaseConfigured) return null;
  if (services) return services;
  const app = getApps().length ? getApp() : initializeApp(config as Record<string, string>);
  services = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
  return services;
}

/** Same as getFirebase() but throws — use inside code paths that require Firebase. */
export function requireFirebase(): FirebaseServices {
  const s = getFirebase();
  if (!s) {
    throw new Error(
      "Firebase is not configured. Add VITE_FIREBASE_* environment variables and reload.",
    );
  }
  return s;
}
