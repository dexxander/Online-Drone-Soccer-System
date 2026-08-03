export function formatDate(value?: number | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: number | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateTimeInput(value?: number | null): string {
  if (!value) return "";
  const d = new Date(value - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function fromDateTimeInput(value: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function firebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/invalid-email": "That email address is not valid.",
    "auth/user-not-found": "No account exists for that email.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/email-already-in-use": "An account already exists with that email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "permission-denied": "You do not have permission to perform this action.",
  };
  if (map[code]) return map[code]!;
  const message = (error as Error)?.message;
  return message ? message.replace(/^Firebase:\s*/, "") : "Something went wrong.";
}
