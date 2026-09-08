import type { MatchEventType } from "@/lib/types";
import { AVAILABLE_TEAMS } from "@/lib/store";

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

export function getTeamDetailsByName(name: string, dynamicTeams: any[]) {
  if (!name || name === "TBD") return { initials: "TB", logo: undefined };

  const dynamicTeam = dynamicTeams.find((t: any) => t.name === name);
  if (dynamicTeam) return { initials: dynamicTeam.name.substring(0, 2).toUpperCase(), logo: dynamicTeam.logoUrl || dynamicTeam.logo };

  const fallbackTeam = AVAILABLE_TEAMS.find((t) => t.name === name);
  return fallbackTeam
    ? { initials: fallbackTeam.initials, logo: (fallbackTeam as any).logoUrl || (fallbackTeam as any).logo }
    : { initials: name.substring(0, 2).toUpperCase(), logo: undefined };
}