import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import { requireFirebase } from "./firebase";
import { COL } from "./collections";
import type { AuditLog } from "./types";

function toMillis(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return value;
  const ts = value as Timestamp;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  return undefined;
}

export function normalize<T>(id: string, data: DocumentData): T {
  const out: DocumentData = { ...data, id };
  for (const key of ["createdAt", "updatedAt", "scheduledAt", "startDate", "endDate"]) {
    if (key in out) out[key] = toMillis(out[key]) ?? out[key] ?? null;
  }
  return out as T;
}

/** Realtime subscription to a collection. Returns an unsubscribe function. */
export function subscribeCollection<T>(
  name: string,
  constraints: QueryConstraint[],
  onData: (rows: T[]) => void,
  onError: (error: Error) => void,
): () => void {
  const { db } = requireFirebase();
  const q = query(collection(db, name), ...constraints);
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => normalize<T>(d.id, d.data()))),
    (err) => onError(err as Error),
  );
}

export function subscribeDoc<T>(
  name: string,
  id: string,
  onData: (row: T | null) => void,
  onError: (error: Error) => void,
): () => void {
  const { db } = requireFirebase();
  return onSnapshot(
    doc(db, name, id),
    (snap) => onData(snap.exists() ? normalize<T>(snap.id, snap.data()) : null),
    (err) => onError(err as Error),
  );
}

export async function fetchAll<T>(name: string, constraints: QueryConstraint[] = []): Promise<T[]> {
  const { db } = requireFirebase();
  const snap = await getDocs(query(collection(db, name), ...constraints));
  return snap.docs.map((d) => normalize<T>(d.id, d.data()));
}

export async function fetchOne<T>(name: string, id: string): Promise<T | null> {
  const { db } = requireFirebase();
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? normalize<T>(snap.id, snap.data()) : null;
}

export async function createDocument<T extends object>(name: string, data: T): Promise<string> {
  const { db } = requireFirebase();
  const ref = await addDoc(collection(db, name), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function upsertDocument<T extends object>(
  name: string,
  id: string,
  data: T,
): Promise<void> {
  const { db } = requireFirebase();
  await setDoc(
    doc(db, name, id),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function updateDocument(
  name: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { db } = requireFirebase();
  await updateDoc(doc(db, name, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDocument(name: string, id: string): Promise<void> {
  const { db } = requireFirebase();
  await deleteDoc(doc(db, name, id));
}

/** Append an audit log entry. Never throws — auditing must not break the action. */
export async function writeAudit(
  entry: Omit<AuditLog, "id" | "createdAt">,
): Promise<void> {
  try {
    const { db } = requireFirebase();
    await addDoc(collection(db, COL.auditLogs), { ...entry, createdAt: serverTimestamp() });
  } catch (error) {
    console.warn("audit log failed", error);
  }
}

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    const { db } = requireFirebase();
    await addDoc(collection(db, COL.notifications), {
      userId,
      title,
      body,
      link: link ?? null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("notification failed", error);
  }
}

export { where, orderBy, query, collection, doc };
