import { useSyncExternalStore } from "react";
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
  const state = useSyncExternalStore<AppState>(
    (cb) => store.subscribe(cb),
    () => store.getState(),
    () => initialState,
  );

  const emit = (_event: string, action: (s: typeof store) => void) => {
    action(store);
  };

  return { state, emit, socket: store };
}

export function useAppState(): AppState {
  return useMockWebSocket().state;
}

/** Live elapsed match time in ms, ticking locally from the shared clock. */
export function useMatchClock(elapsedMs: number, runningSince: number | null) {
  const subscribe = (cb: () => void) => {
    if (!runningSince) return () => {};
    const id = setInterval(cb, 250);
    return () => clearInterval(id);
  };
  return useSyncExternalStore(
    subscribe,
    () => elapsedMs + (runningSince ? Date.now() - runningSince : 0),
    () => elapsedMs,
  );
}

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}
