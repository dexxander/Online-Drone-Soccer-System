import { AlertTriangle } from "lucide-react";

/** Rendered whenever VITE_FIREBASE_* env variables are missing. */
export function FirebaseNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6">
      <div className="panel max-w-xl p-8">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-6 text-warning" />
          <h1 className="text-xl font-bold">Firebase configuration required</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          This application connects directly to Firebase. Add the following environment
          variables (locally in <code className="font-mono">.env</code>, or in your Vercel
          project settings) and reload.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
          {`VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=`}
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          Values come from Firebase console → Project settings → Your apps → Web app config.
        </p>
      </div>
    </div>
  );
}
