import type { MatchEventType } from "@/lib/types";

export function getMatchTitle(round: number, maxRound: number, phase?: string) {
  if (phase === "group") return "Group Stage";
  if (maxRound === 1) return "Exhibition Match";
  if (round === maxRound) return "Grand Final";
  if (round === maxRound - 1) return "Semi-Finals";
  if (round === maxRound - 2) return "Quarter-Finals";
  return `Round ${round}`;
}

export function getCurrentPhase(events: any[]) {
  const phaseEvent = events.find((e: any) => e.message.startsWith("PHASE_CHANGE:"));
  return phaseEvent ? phaseEvent.message.replace("PHASE_CHANGE:", "") : "Testing";
}

export function eventLabel(type: MatchEventType): string {
  switch (type) {
    case "match_started": return "STARTED";
    case "match_paused": return "PAUSED";
    case "match_resumed": return "RESUMED";
    case "match_ended": return "MATCH ENDED";
    case "score_changed": return "GOAL";
    case "penalty_issued": return "PENALTY";
    default: return String(type);
  }
}