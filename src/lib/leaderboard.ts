import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { calculateEffectivePenalties } from "./penalties";
import type { Penalty, Team, Tournament, TournamentMatch } from "./types";

export type LeaderboardStage = "group" | "knockout";
export type SortKey = "avgScore" | "highestScore" | "goalDiff" | "totalScore" | "teamName";
export type SortDir = "asc" | "desc";

export interface LeaderboardRow {
  teamId: string;
  teamName: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  avgScore: number;
  highestScore: number;
  totalScore: number;
  isDisqualified: boolean;
  groupNumber?: number;
  isQualifier?: boolean;
}

interface TeamStageStats {
  played: number;
  gf: number;
  ga: number;
  pts: number;
  scores: number[];
  disqualified: boolean;
  groupNumber?: number;
}

function getStageMatches(tournament: Tournament, stage: LeaderboardStage): TournamentMatch[] {
  if (stage === "group") return tournament.matches.filter((m) => m.phase === "group");
  return tournament.matches.filter((m) => (m.phase ?? "knockout") === "knockout" && !m.isBye);
}

/** Local snake_case -> camelCase row mapper, kept independent of store.ts's internals. */
function camelizePenaltyRow(row: any): Penalty {
  return {
    id: row.id,
    matchId: row.match_id,
    side: row.side,
    type: row.type,
    createdAt: typeof row.created_at === "string" ? new Date(row.created_at).getTime() : row.created_at,
  } as Penalty;
}



export function buildLeaderboardRows(
  tournament: Tournament,
  teams: Team[],
  stage: LeaderboardStage,
  penaltiesByMatchId: Record<string, Penalty[]>
): LeaderboardRow[] {
  const scoringSystem = tournament.groupScoringSystem ?? "three-one-zero";
  const matches = getStageMatches(tournament, stage).filter((m) => m.winnerId !== null || m.result === "draw");

  const teamIds = new Set<string>();
  matches.forEach((m) => {
    if (m.teamAId) teamIds.add(m.teamAId);
    if (m.teamBId) teamIds.add(m.teamBId);
  });

  const stats = new Map<string, TeamStageStats>();
  teamIds.forEach((id) => {
    stats.set(id, { played: 0, gf: 0, ga: 0, pts: 0, scores: [], disqualified: false });
  });

  matches.forEach((m) => {
    const scoreA = m.scoreA ?? 0;
    const scoreB = m.scoreB ?? 0;
    const matchPenalties = penaltiesByMatchId[m.id] ?? [];
    const penaltiesA = matchPenalties.filter((p) => p.side === "A");
    const penaltiesB = matchPenalties.filter((p) => p.side === "B");
    const dqA = calculateEffectivePenalties(penaltiesA).isDisqualified;
    const dqB = calculateEffectivePenalties(penaltiesB).isDisqualified;

    if (m.teamAId) {
      const a = stats.get(m.teamAId)!;
      a.played += 1;
      a.gf += scoreA;
      a.ga += scoreB;
      a.scores.push(scoreA);
      if (dqA) a.disqualified = true;
      if (stage === "group" && m.groupNumber) a.groupNumber = m.groupNumber;
    }
    if (m.teamBId) {
      const b = stats.get(m.teamBId)!;
      b.played += 1;
      b.gf += scoreB;
      b.ga += scoreA;
      b.scores.push(scoreB);
      if (dqB) b.disqualified = true;
      if (stage === "group" && m.groupNumber) b.groupNumber = m.groupNumber;
    }

    if (m.result === "draw" && scoringSystem !== "winner-only") {
      if (m.teamAId) stats.get(m.teamAId)!.pts += 1;
      if (m.teamBId) stats.get(m.teamBId)!.pts += 1;
    } else if (m.winnerId) {
      stats.get(m.winnerId)!.pts += 3;
    }
  });

  const getTeamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown Team";

  const rows: LeaderboardRow[] = [];
  stats.forEach((s, teamId) => {
    const isDQ = s.disqualified;
    const row: LeaderboardRow = {
      teamId,
      teamName: getTeamName(teamId),
      played: s.played,
      // If Disqualified, wipe their stats to 0 cleanly
      goalsFor: isDQ ? 0 : s.gf,
      goalsAgainst: isDQ ? 0 : s.ga,
      goalDiff: isDQ ? 0 : s.gf - s.ga,
      avgScore: isDQ ? 0 : (s.played ? s.gf / s.played : 0),
      highestScore: isDQ ? 0 : (s.scores.length ? Math.max(...s.scores) : 0),
      totalScore: isDQ ? 0 : s.pts,
      isDisqualified: isDQ,
    };
    
    if (s.groupNumber !== undefined) row.groupNumber = s.groupNumber;
    if (stage === "group" && tournament.groupStageEnabled) row.isQualifier = false;

    rows.push(row);
  });

  // Calculate qualifiers if Group Stage
  if (stage === "group" && tournament.groupStageEnabled) {
    const qualifiersPerGroup = tournament.qualifiersPerGroup ?? 2;
    const groups = new Map<number, LeaderboardRow[]>();

    rows.forEach(r => {
      if (r.groupNumber) {
        if (!groups.has(r.groupNumber)) groups.set(r.groupNumber, []);
        groups.get(r.groupNumber)!.push(r);
      }
    });

    const wildcardsPool: LeaderboardRow[] = [];

    groups.forEach((groupRows) => {
      // Sort within group
      groupRows.sort((a, b) => b.totalScore - a.totalScore || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);

      groupRows.forEach((r, idx) => {
        if (r.isDisqualified) return;
        if (idx < qualifiersPerGroup) {
          r.isQualifier = true;
        } else {
          wildcardsPool.push(r);
        }
      });
    });

    const groupCount = tournament.groupCount ?? 1;
    if (groupCount === 7 || tournament.teamQuota === 21) {
      // Points -> Goal Diff -> Goals For
      wildcardsPool.sort((a, b) => b.totalScore - a.totalScore || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);

      for (let i = 0; i < Math.min(2, wildcardsPool.length); i++) {
        const wc = wildcardsPool[i];
        if (wc) wc.isQualifier = true;
      }
    }
  }

  return rows;
}

export function sortLeaderboardRows(rows: LeaderboardRow[], key: SortKey, dir: SortDir, stage: LeaderboardStage): LeaderboardRow[] {
  const sign = dir === "asc" ? 1 : -1;

  const compare = (a: LeaderboardRow, b: LeaderboardRow) => {
    if (key === "teamName") return sign * a.teamName.localeCompare(b.teamName);
    const diff = (a[key] as number) - (b[key] as number);
    if (diff !== 0) return sign * diff;
    return b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor;
  };

  // Strictly enforce logical groupings for stages
  if (stage === "group") {
    const dq = rows.filter(r => r.isDisqualified).sort((a, b) => a.teamName.localeCompare(b.teamName));
    const qualifiers = rows.filter(r => r.isQualifier && !r.isDisqualified).sort(compare);
    const eliminated = rows.filter(r => !r.isQualifier && !r.isDisqualified).sort(compare);
    return [...qualifiers, ...eliminated, ...dq];
  } else {
    const clean = rows.filter((r) => !r.isDisqualified).sort(compare);
    const dq = rows.filter((r) => r.isDisqualified).sort((a, b) => a.teamName.localeCompare(b.teamName));
    return [...clean, ...dq];
  }
}

/** Fetches every penalty for a given set of tournament-match ids (Live Polling). */
export function usePenaltiesByMatch(matchIds: string[]): Record<string, Penalty[]> {
  const [data, setData] = useState<Record<string, Penalty[]>>({});
  const key = [...matchIds].sort().join(",");

  useEffect(() => {
    if (!matchIds.length) {
      setData({});
      return;
    }
    let cancelled = false;
    
    const fetchPenalties = async () => {
      const { data: rows, error } = await supabase.from("penalties").select("*").in("match_id", matchIds);
      if (error || cancelled) return;
      
      const grouped: Record<string, Penalty[]> = {};
      (rows || []).forEach((row: any) => {
        const penalty = camelizePenaltyRow(row);
        (grouped[penalty.matchId] ??= []).push(penalty);
      });
      setData(grouped);
    };

    fetchPenalties();
    // Poll every 2 seconds to catch live Disqualifications immediately
    const interval = setInterval(fetchPenalties, 2000); 

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
}

const STAGE_STORAGE_KEY = "ds-scoreboard-leaderboard-stage";

export function useLeaderboardStageSync(): [LeaderboardStage, (stage: LeaderboardStage) => void] {
  const [stage, setStageState] = useState<LeaderboardStage>(() => {
    return (window.localStorage.getItem(STAGE_STORAGE_KEY) as LeaderboardStage) || "group";
  });

  useEffect(() => {
    // Listens for changes from other tabs/windows (e.g., Scoreboard TV)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STAGE_STORAGE_KEY && (e.newValue === "group" || e.newValue === "knockout")) {
        setStageState(e.newValue);
      }
    };
    
    // Listens for changes from components within the SAME window
    const handleLocal = (e: Event) => {
      const customEvent = e as CustomEvent<LeaderboardStage>;
      setStageState(customEvent.detail);
    };
    
    window.addEventListener("storage", handleStorage);
    window.addEventListener("ds-stage-sync", handleLocal);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ds-stage-sync", handleLocal);
    };
  }, []);

  const setStage = (next: LeaderboardStage) => {
    setStageState(next);
    window.localStorage.setItem(STAGE_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("ds-stage-sync", { detail: next }));
  };

  return [stage, setStage];
}