import { writeBatch, doc, serverTimestamp, collection } from "firebase/firestore";
import { requireFirebase } from "./firebase";
import { COL } from "./collections";
import { computeStandings, generateBracket, nextSlot, roundCount } from "./bracket";
import { fetchAll, updateDocument } from "./db";
import { where } from "firebase/firestore";
import type { Match, Team, Tournament } from "./types";

/** Create every match document for a seeded single-elimination bracket. */
export async function generateTournamentBracket(
  tournament: Tournament,
  teams: Team[],
): Promise<void> {
  const { db } = requireFirebase();
  const ordered = tournament.teamIds
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is Team => Boolean(t));
  if (ordered.length < 2) throw new Error("Register at least two teams before generating a bracket.");

  const existing = await fetchAll<Match>(COL.matches, [where("tournamentId", "==", tournament.id)]);
  const planned = generateBracket(ordered.map((t) => t.id));
  const batch = writeBatch(db);

  for (const old of existing) batch.delete(doc(db, COL.matches, old.id));

  for (const p of planned) {
    const ref = doc(collection(db, COL.matches));
    const teamA = ordered.find((t) => t.id === p.teamAId) ?? null;
    const teamB = ordered.find((t) => t.id === p.teamBId) ?? null;
    // A first-round pairing with only one team is a bye: it is auto-completed.
    const isBye = p.round === 1 && Boolean(p.teamAId) !== Boolean(p.teamBId);
    batch.set(ref, {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      round: p.round,
      slot: p.slot,
      teamAId: p.teamAId,
      teamBId: p.teamBId,
      teamAName: teamA?.name ?? null,
      teamBName: teamB?.name ?? null,
      scoreA: 0,
      scoreB: 0,
      status: isBye ? "completed" : "scheduled",
      winnerId: isBye ? (p.teamAId ?? p.teamBId) : null,
      refereeId: null,
      venue: null,
      scheduledAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.update(doc(db, COL.tournaments, tournament.id), {
    rounds: roundCount(ordered.length),
    status: "in_progress",
    championTeamId: null,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  await propagateWinners(tournament.id);
}

/** Push every completed match's winner into its next-round slot. */
export async function propagateWinners(tournamentId: string): Promise<void> {
  const { db } = requireFirebase();
  const matches = await fetchAll<Match>(COL.matches, [where("tournamentId", "==", tournamentId)]);
  if (matches.length === 0) return;
  const byKey = new Map(matches.map((m) => [`${m.round}:${m.slot}`, m]));
  const maxRound = Math.max(...matches.map((m) => m.round));
  const batch = writeBatch(db);
  let writes = 0;

  for (const m of matches) {
    if (m.status !== "completed" || !m.winnerId || m.round >= maxRound) continue;
    const target = nextSlot(m.round, m.slot);
    const next = byKey.get(`${target.round}:${target.slot}`);
    if (!next) continue;
    const winnerName = m.winnerId === m.teamAId ? m.teamAName : m.teamBName;
    const currentId = target.side === "A" ? next.teamAId : next.teamBId;
    if (currentId === m.winnerId) continue;
    batch.update(doc(db, COL.matches, next.id), {
      [target.side === "A" ? "teamAId" : "teamBId"]: m.winnerId,
      [target.side === "A" ? "teamAName" : "teamBName"]: winnerName ?? null,
      updatedAt: serverTimestamp(),
    });
    writes++;
  }

  const final = matches.find((m) => m.round === maxRound);
  if (final?.status === "completed" && final.winnerId) {
    batch.update(doc(db, COL.tournaments, tournamentId), {
      championTeamId: final.winnerId,
      status: "completed",
      updatedAt: serverTimestamp(),
    });
    writes++;
  }

  if (writes > 0) await batch.commit();
}

/** Recompute and persist the standings table for a tournament. */
export async function refreshStandings(tournamentId: string, teams: Team[]): Promise<void> {
  const { db } = requireFirebase();
  const matches = await fetchAll<Match>(COL.matches, [where("tournamentId", "==", tournamentId)]);
  const rows = computeStandings(tournamentId, teams, matches);
  const batch = writeBatch(db);
  for (const row of rows) {
    batch.set(
      doc(db, COL.standings, row.id),
      { ...row, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();
}

/** Persist a final score, decide the winner, advance the bracket, refresh standings. */
export async function completeMatch(
  match: Match,
  scoreA: number,
  scoreB: number,
  teams: Team[],
  actorId: string,
): Promise<void> {
  const { db } = requireFirebase();
  const winnerId =
    scoreA === scoreB ? null : scoreA > scoreB ? match.teamAId : match.teamBId;

  await updateDocument(COL.matches, match.id, {
    scoreA,
    scoreB,
    status: "completed",
    winnerId,
  });

  await import("firebase/firestore").then(({ setDoc }) =>
    setDoc(doc(db, COL.scores, match.id), {
      matchId: match.id,
      tournamentId: match.tournamentId,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA,
      scoreB,
      winnerId,
      recordedBy: actorId,
      createdAt: serverTimestamp(),
    }),
  );

  await propagateWinners(match.tournamentId);
  await refreshStandings(match.tournamentId, teams);
}
