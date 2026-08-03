import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { orderBy, where } from "firebase/firestore";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader, MatchStatusBadge } from "@/components/primitives";
import { DataState, ErrorState, LoadingState } from "@/components/states";
import { ConfirmDialog, FormRow, useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionData, useDocumentData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { createDocument, deleteDocument, updateDocument, writeAudit } from "@/lib/db";
import { completeMatch } from "@/lib/tournament-service";
import type { Mark, Match, Player, Team } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage, formatDateTime, fromDateTimeInput, toDateTimeInput } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/matches/$matchId")({
  head: () => ({
    meta: [
      { title: "Match centre — Drone Soccer League Control" },
      {
        name: "description",
        content: "Live drone soccer match control: record marks, manage state and finalise scores.",
      },
      { property: "og:title", content: "Match centre — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Live drone soccer match control: record marks, manage state and finalise scores.",
      },
    ],
  }),
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const { profile } = useAuth();
  const canScore = profile?.role === "admin" || profile?.role === "referee";

  const match = useDocumentData<Match>(COL.matches, matchId);
  const teams = useCollectionData<Team>(COL.teams, () => [orderBy("name")]);
  const players = useCollectionData<Player>(COL.players, () => []);
  const marks = useCollectionData<Mark>(
    COL.marks,
    () => [where("matchId", "==", matchId)],
    [matchId],
  );

  const [markOpen, setMarkOpen] = useState(false);
  const [markTeam, setMarkTeam] = useState("");
  const [markPlayer, setMarkPlayer] = useState("none");
  const [markMinute, setMarkMinute] = useState("1");
  const [markNote, setMarkNote] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [busy, setBusy] = useState(false);
  const finalise = useConfirm<Match>();
  const removeMark = useConfirm<Mark>();

  if (match.loading) return <LoadingState label="Loading match…" />;
  if (match.error) return <ErrorState message={match.error} />;
  if (!match.data)
    return (
      <ErrorState
        message="This match no longer exists."
        action={
          <Button asChild variant="outline">
            <Link to="/matches">Back to matches</Link>
          </Button>
        }
      />
    );

  const m = match.data;
  const locked = m.status === "completed" || m.status === "cancelled";

  async function setStatus(status: Match["status"]) {
    setBusy(true);
    try {
      await updateDocument(COL.matches, matchId, { status });
      toast.success(`Match marked ${status}`);
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function addMark() {
    if (!markTeam) {
      toast.error("Choose which team scored.");
      return;
    }
    const minute = Number(markMinute);
    if (!Number.isFinite(minute) || minute < 0 || minute > 200) {
      toast.error("Enter a valid minute.");
      return;
    }
    setBusy(true);
    try {
      const player = players.data.find((p) => p.id === markPlayer);
      await createDocument(COL.marks, {
        matchId,
        tournamentId: m.tournamentId,
        teamId: markTeam,
        playerId: markPlayer === "none" ? null : markPlayer,
        playerName: player?.fullName ?? null,
        points: 1,
        minute,
        note: markNote.trim() || null,
        createdBy: profile!.id,
      });
      const isA = markTeam === m.teamAId;
      await updateDocument(COL.matches, matchId, {
        scoreA: m.scoreA + (isA ? 1 : 0),
        scoreB: m.scoreB + (isA ? 0 : 1),
        status: m.status === "scheduled" ? "live" : m.status,
      });
      toast.success("Mark recorded");
      setMarkOpen(false);
      setMarkNote("");
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/matches">
          <ArrowLeft className="mr-2 size-4" />
          All matches
        </Link>
      </Button>

      <PageHeader
        eyebrow={m.tournamentName ?? "Fixture"}
        title={`${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`}
        description={`${formatDateTime(m.scheduledAt)}${m.venue ? ` · ${m.venue}` : ""}`}
        actions={<MatchStatusBadge status={m.status} />}
      />

      <div className="panel flex flex-col items-center gap-2 p-8">
        <div className="flex w-full max-w-xl items-center justify-between gap-6">
          <p className="flex-1 text-right font-display text-lg font-semibold">
            {m.teamAName ?? "TBD"}
          </p>
          <p className="scoreline text-5xl">
            {m.scoreA} <span className="text-muted-foreground">–</span> {m.scoreB}
          </p>
          <p className="flex-1 font-display text-lg font-semibold">{m.teamBName ?? "TBD"}</p>
        </div>
        {canScore ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              disabled={busy || locked || !m.teamAId || !m.teamBId}
              onClick={() => {
                setMarkTeam(m.teamAId ?? "");
                setMarkPlayer("none");
                setMarkOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Record mark
            </Button>
            {m.status === "scheduled" ? (
              <Button variant="outline" disabled={busy} onClick={() => setStatus("live")}>
                Start match
              </Button>
            ) : null}
            {!locked ? (
              <Button variant="outline" disabled={busy} onClick={() => finalise.ask(m)}>
                Finalise result
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setScheduledAt(toDateTimeInput(m.scheduledAt));
                setVenue(m.venue ?? "");
                setScheduleOpen(true);
              }}
            >
              Schedule
            </Button>
            {!locked ? (
              <Button variant="ghost" disabled={busy} onClick={() => setStatus("cancelled")}>
                Cancel match
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider">
            Marks ({marks.data.length})
          </h2>
        </header>
        <DataState
          loading={marks.loading}
          error={marks.error}
          empty={marks.data.length === 0}
          emptyTitle="No marks recorded"
          emptyDescription="Referees record each scoring event as the match runs."
        >
          <ul className="divide-y divide-border">
            {[...marks.data]
              .sort((a, b) => a.minute - b.minute)
              .map((mk) => {
                const team = teams.data.find((t) => t.id === mk.teamId);
                return (
                  <li key={mk.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-12 font-mono text-sm text-muted-foreground">
                      {mk.minute}'
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{team?.name ?? "Unknown team"}</p>
                      <p className="text-xs text-muted-foreground">
                        {mk.playerName ?? "Unattributed"}
                        {mk.note ? ` · ${mk.note}` : ""}
                      </p>
                    </div>
                    {canScore && !locked ? (
                      <Button variant="ghost" size="sm" onClick={() => removeMark.ask(mk)}>
                        Remove
                      </Button>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </DataState>
      </section>

      {/* Record mark */}
      <Dialogish open={markOpen} onOpenChange={setMarkOpen} title="Record a mark">
        <div className="space-y-4">
          <FormRow label="Scoring team">
            <Select value={markTeam} onValueChange={setMarkTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {m.teamAId ? <SelectItem value={m.teamAId}>{m.teamAName}</SelectItem> : null}
                {m.teamBId ? <SelectItem value={m.teamBId}>{m.teamBName}</SelectItem> : null}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Pilot">
            <Select value={markPlayer} onValueChange={setMarkPlayer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unattributed</SelectItem>
                {players.data
                  .filter((p) => p.teamId === markTeam)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Minute">
            <Input
              type="number"
              min={0}
              value={markMinute}
              onChange={(e) => setMarkMinute(e.target.value)}
            />
          </FormRow>
          <FormRow label="Note" hint="Optional referee note">
            <Textarea value={markNote} onChange={(e) => setMarkNote(e.target.value)} rows={2} />
          </FormRow>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMarkOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={addMark} disabled={busy}>
              Record mark
            </Button>
          </div>
        </div>
      </Dialogish>

      {/* Schedule */}
      <Dialogish open={scheduleOpen} onOpenChange={setScheduleOpen} title="Schedule match">
        <div className="space-y-4">
          <FormRow label="Kick-off">
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </FormRow>
          <FormRow label="Venue">
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Arena 1" />
          </FormRow>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await updateDocument(COL.matches, matchId, {
                    scheduledAt: fromDateTimeInput(scheduledAt),
                    venue: venue.trim() || null,
                  });
                  toast.success("Schedule saved");
                  setScheduleOpen(false);
                } catch (error) {
                  toast.error(firebaseErrorMessage(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Dialogish>

      <ConfirmDialog
        open={finalise.open}
        onOpenChange={finalise.setOpen}
        destructive={false}
        title="Finalise this result?"
        description={`Final score ${m.scoreA}–${m.scoreB}. The winner advances in the bracket and standings are recalculated.`}
        confirmLabel="Finalise"
        onConfirm={async () => {
          try {
            await completeMatch(m, m.scoreA, m.scoreB, teams.data, profile!.id);
            await writeAudit({
              actorId: profile!.id,
              actorEmail: profile!.email,
              action: "complete",
              entity: "matches",
              entityId: m.id,
              details: `${m.scoreA}-${m.scoreB}`,
            });
            toast.success("Result recorded and bracket advanced");
          } catch (error) {
            toast.error(firebaseErrorMessage(error));
          }
        }}
      />

      <ConfirmDialog
        open={removeMark.open}
        onOpenChange={removeMark.setOpen}
        title="Remove this mark?"
        description="The scoreline is adjusted immediately."
        confirmLabel="Remove mark"
        onConfirm={async () => {
          const mk = removeMark.target;
          if (!mk) return;
          try {
            await deleteDocument(COL.marks, mk.id);
            const isA = mk.teamId === m.teamAId;
            await updateDocument(COL.matches, matchId, {
              scoreA: Math.max(0, m.scoreA - (isA ? 1 : 0)),
              scoreB: Math.max(0, m.scoreB - (isA ? 0 : 1)),
            });
            toast.success("Mark removed");
          } catch (error) {
            toast.error(firebaseErrorMessage(error));
          }
        }}
      />
    </>
  );
}

/** Small dialog wrapper to keep this file readable. */
function Dialogish({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="panel w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
