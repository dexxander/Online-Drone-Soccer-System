import type { Match, Standing, Team } from "./types";

/** Next power of two >= n (minimum 2). */
export function bracketSize(n: number): number {
  let size = 2;
  while (size < n) size *= 2;
  return Math.max(2, size);
}

export function roundCount(teamCount: number): number {
  return Math.log2(bracketSize(teamCount));
}

export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}

/** Standard seeded single-elimination pairing (1v16, 8v9, ...). */
export function seedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const round = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s, round - s);
    }
    seeds = next;
  }
  return seeds;
}

export interface PlannedMatch {
  round: number;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
}

/**
 * Build the full single-elimination skeleton. Round 1 is populated with the
 * seeded pairings (byes appear as a null opponent); later rounds are empty
 * placeholders that get filled as winners advance.
 */
export function generateBracket(teamIds: string[]): PlannedMatch[] {
  const size = bracketSize(teamIds.length);
  const total = Math.log2(size);
  const order = seedOrder(size);
  const matches: PlannedMatch[] = [];

  for (let i = 0; i < size / 2; i++) {
    const seedA = order[i * 2]!;
    const seedB = order[i * 2 + 1]!;
    matches.push({
      round: 1,
      slot: i,
      teamAId: teamIds[seedA - 1] ?? null,
      teamBId: teamIds[seedB - 1] ?? null,
    });
  }
  for (let round = 2; round <= total; round++) {
    const count = size / 2 ** round;
    for (let slot = 0; slot < count; slot++) {
      matches.push({ round, slot, teamAId: null, teamBId: null });
    }
  }
  return matches;
}

/** Where a winner of (round, slot) goes next. */
export function nextSlot(round: number, slot: number) {
  return { round: round + 1, slot: Math.floor(slot / 2), side: slot % 2 === 0 ? "A" : "B" } as const;
}

export function computeStandings(
  tournamentId: string,
  teams: Team[],
  matches: Match[],
): Standing[] {
  const byTeam = new Map<string, Standing>();
  for (const team of teams) {
    byTeam.set(team.id, {
      id: `${tournamentId}_${team.id}`,
      tournamentId,
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== "completed" || !m.teamAId || !m.teamBId) continue;
    const a = byTeam.get(m.teamAId);
    const b = byTeam.get(m.teamBId);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.goalsFor += m.scoreA;
    a.goalsAgainst += m.scoreB;
    b.goalsFor += m.scoreB;
    b.goalsAgainst += m.scoreA;
    if (m.scoreA > m.scoreB) {
      a.won++;
      b.lost++;
      a.points += 3;
    } else if (m.scoreB > m.scoreA) {
      b.won++;
      a.lost++;
      b.points += 3;
    } else {
      a.drawn++;
      b.drawn++;
      a.points += 1;
      b.points += 1;
    }
  }

  return [...byTeam.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor ||
      x.teamName.localeCompare(y.teamName),
  );
}
