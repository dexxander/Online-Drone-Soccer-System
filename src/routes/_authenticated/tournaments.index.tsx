import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { orderBy } from "firebase/firestore";
import { Plus, Trophy } from "lucide-react";
import { PageHeader, TournamentStatusBadge } from "@/components/primitives";
import { DataState } from "@/components/states";
import { FormRow } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollectionData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { createDocument, writeAudit } from "@/lib/db";
import type { Tournament } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tournaments/")({
  head: () => ({
    meta: [
      { title: "Tournaments — Drone Soccer League Control" },
      {
        name: "description",
        content: "Create drone soccer tournaments, register teams and generate seeded brackets.",
      },
      { property: "og:title", content: "Tournaments — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Create drone soccer tournaments, register teams and generate seeded brackets.",
      },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin";
  const tournaments = useCollectionData<Tournament>(COL.tournaments, () => [orderBy("name")]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", season: "", location: "", description: "" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function create() {
    if (form.name.trim().length < 2) {
      setError("Tournament name is required");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const id = await createDocument(COL.tournaments, {
        name: form.name.trim(),
        season: form.season.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        imageUrl: null,
        status: "registration",
        startDate: null,
        endDate: null,
        teamIds: [],
        rounds: 0,
        championTeamId: null,
      });
      await writeAudit({
        actorId: profile!.id,
        actorEmail: profile!.email,
        action: "create",
        entity: "tournaments",
        entityId: id,
        details: form.name,
      });
      toast.success("Tournament created");
      setOpen(false);
      setForm({ name: "", season: "", location: "", description: "" });
    } catch (err) {
      toast.error(firebaseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Competition"
        title="Tournaments"
        description="Registration, seeded brackets, automatic progression and standings."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              New tournament
            </Button>
          ) : null
        }
      />

      <DataState
        loading={tournaments.loading}
        error={tournaments.error}
        empty={tournaments.data.length === 0}
        emptyTitle="No tournaments yet"
        emptyDescription="Create a tournament, register teams, then generate the bracket."
        emptyAction={canManage ? <Button onClick={() => setOpen(true)}>Create one</Button> : null}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.data.map((t) => (
            <Link
              key={t.id}
              to="/tournaments/$tournamentId"
              params={{ tournamentId: t.id }}
              className="panel flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <Trophy className="size-5 text-primary" />
                <TournamentStatusBadge status={t.status} />
              </div>
              <div>
                <p className="font-display text-lg font-bold">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[t.season, t.location].filter(Boolean).join(" · ") || "No details yet"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.teamIds?.length ?? 0} teams registered · starts {formatDate(t.startDate)}
              </p>
            </Link>
          ))}
        </div>
      </DataState>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New tournament</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormRow label="Name" error={error}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="National Drone Soccer Cup"
              />
            </FormRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label="Season">
                <Input
                  value={form.season}
                  onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))}
                  placeholder="2026"
                />
              </FormRow>
              <FormRow label="Location">
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </FormRow>
            </div>
            <FormRow label="Description">
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </FormRow>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Creating…" : "Create tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
