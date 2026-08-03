import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QueryConstraint } from "firebase/firestore";
import { subscribeCollection, subscribeDoc } from "./db";
import { isFirebaseConfigured } from "./firebase";

export interface QueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Realtime collection hook. `constraints` are re-created on every render, so
 * pass a stable `deps` array to control resubscription.
 */
export function useCollectionData<T>(
  name: string,
  buildConstraints: () => QueryConstraint[],
  deps: unknown[] = [],
  enabled = true,
): QueryState<T[]> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const builder = useRef(buildConstraints);
  builder.current = buildConstraints;

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let unsub = () => {};
    try {
      unsub = subscribeCollection<T>(
        name,
        builder.current(),
        (rows) => {
          setData(rows);
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      );
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, enabled, ...deps]);

  return { data, loading, error };
}

export function useDocumentData<T>(
  name: string,
  id: string | undefined,
  enabled = true,
): QueryState<T | null> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !enabled || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let unsub = () => {};
    try {
      unsub = subscribeDoc<T>(
        name,
        id,
        (row) => {
          setData(row);
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      );
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
    return () => unsub();
  }, [name, id, enabled]);

  return { data, loading, error };
}

/** Client-side search + filter helper used by every table view. */
export function useFiltered<T>(
  rows: T[],
  search: string,
  fields: (keyof T)[],
  extra?: (row: T) => boolean,
): T[] {
  return useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (extra && !extra(row)) return false;
      if (!term) return true;
      return fields.some((f) => String(row[f] ?? "").toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, extra]);
}

export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, run };
}
