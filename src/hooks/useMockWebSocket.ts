import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { store, initialState } from "@/lib/store";
import type { AppState } from "@/lib/types";

/**
 * Simulated real-time transport.
 *
 * Mirrors the Socket.IO API surface (`emit` / subscribed state) but uses a
 * BroadcastChannel + localStorage bridge so state syncs instantly across tabs.
 * Replacing this with a real socket client keeps the same component API:
 *
 *   const { state, emit } = useMockWebSocket();
 *   emit("updateMatch", (s) => s.adjustScore("A", 1));
 */
export function useMockWebSocket() {
  // `store` is a module-level singleton, so this subscribe function is stable
  // across renders — without useCallback, a fresh closure here forces
  // useSyncExternalStore to unsubscribe/resubscribe from the store on every
  // single render, which compounds badly on any page that re-renders often
  // (e.g. once per clock tick).
  const subscribe = useCallback((cb: () => void) => store.subscribe(cb), []);
  const state = useSyncExternalStore<AppState>(subscribe, () => store.getState(), () => initialState);

  const emit = (_event: string, action: (s: typeof store) => void) => {
    action(store);
  };

  return { state, emit, socket: store };
}

export function useAppState(): AppState {
  return useMockWebSocket().state;
}

/**
 * Live elapsed match time in ms, ticking locally from the shared clock.
 *
 * This is intentionally a plain useState/useEffect tick, not
 * useSyncExternalStore: useSyncExternalStore requires getSnapshot to return
 * an identical value between actual store notifications, but "current wall
 * clock time" changes on every call by definition — using it here violated
 * that contract and caused an ever-worsening render loop the longer a match
 * stayed live.
 */
export function useMatchClock(elapsedMs: number, runningSince: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!runningSince) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [runningSince]);

  return runningSince ? elapsedMs + (now - runningSince) : elapsedMs;
}

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}
