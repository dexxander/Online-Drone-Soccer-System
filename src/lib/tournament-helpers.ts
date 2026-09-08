import type { Tournament } from "@/lib/types";

export function getAssignedTeamIdsExcept(
  pairs: Array<{ teamAId: string | null; teamBId: string | null }>,
  currentSlotIndex: number,
  currentSide: "teamAId" | "teamBId"
): Set<string> {
  const set = new Set<string>();
  pairs.forEach((p, idx) => {
    if (p.teamAId && !(idx === currentSlotIndex && currentSide === "teamAId")) {
      set.add(p.teamAId);
    }
    if (p.teamBId && !(idx === currentSlotIndex && currentSide === "teamBId")) {
      set.add(p.teamBId);
    }
  });
  return set;
}

export function getTournamentTeamIds(tournament: Tournament): string[] {
  return [...new Set([
    ...tournament.teamIds,
    ...tournament.matches.flatMap((match) => [match.teamAId, match.teamBId].filter((id): id is string => Boolean(id))),
  ])];
}