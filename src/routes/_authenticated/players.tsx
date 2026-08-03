import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { orderBy } from "firebase/firestore";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/primitives";
import { DataState } from "@/components/states";
import { ConfirmDialog, FormRow, useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCollectionData, useFiltered } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { createDocument, deleteDocument, updateDocument, writeAudit } from "@/lib/db";
import { PLAYER_POSITIONS, type Player, type PlayerPosition, type Team } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/players")({
  head: () => ({
    meta: [
      { title: "Players — Drone Soccer League Control" },
      {
        name: "description",
        content: "Pilot rosters, jersey numbers, positions and drone identifiers.",
      },
      { property: "og:title", content: "Players — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Pilot rosters, jersey numbers, positions and drone identifiers.",
      },
    ],
  }),
  component: PlayersPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Player name is required").max(80),
  teamId: z.string().min(1, "Select a team"),
  jerseyNumber: z.coerce.number().int().min(0).max(99),
  position: z.enum(PLAYER_POSITIONS),
  droneId: z.string().trim().max(40).optional(),
});

type FormState = {
  fullName: string;
  teamId: string;
  jerseyNumber: string;
  position: PlayerPosition;
  droneId: string;
  active: boolean;
};

const EMPTY: FormState = {
  fullName: "",
  teamId: "",
  jerseyNumber: "1",
  position: "striker",
  droneId: "",
  active: true,
};

function PlayersPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isCoach = profile?.role === "coach";
  const canManage = isAdmin || isCoach;

  const players = useCollectionData<Player>(COL.players, () => [orderBy("fullName")]);
  const teams = useCollectionData<Team>(COL.teams, () => [orderBy("name")]);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm<Player>();

  const teamName = (id: string) => teams.data.find((t) => t.id === id)?.name ?? "Unassigned";
  const editableTeams = isAdmin
    ? teams.data
    : teams.data.filter((t) => t.coachId === profile?.id || t.id === profile?.teamId);

  const filtered = useFiltered<Player>(
    players.data,
    search,
    ["fullName", "droneId"],
    useMemo(
      () => (p: Player) => (teamFilter === "all" ? true : p.teamId === teamFilter),
      [teamFilter],
    ),
  );

  const mayEdit = (p: Player) =>
    isAdmin || editableTeams.some((t) => t.id === p.teamId);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, teamId: editableTeams[0]?.id ?? "" });
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(p: Player) {
    setEditing(p);
    setForm({
      fullName: p.fullName,
      teamId: p.teamId,
      jerseyNumber: String(p.jerseyNumber),
      position: p.position,
      droneId: p.droneId ?? "",
      active: p.active,
    });
    setErrors({});
    setDialogOpen(true);
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    const duplicate = players.data.find(
      (p) =>
        p.teamId === parsed.data.teamId &&
        p.jerseyNumber === parsed.data.jerseyNumber &&
        p.id !== editing?.id,
    );
    if (duplicate) {
      setErrors({ jerseyNumber: "That jersey number is already taken on this team." });
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = {
      fullName: parsed.data.fullName,
      teamId: parsed.data.teamId,
      jerseyNumber: parsed.data.jerseyNumber,
      position: parsed.data.position,
      droneId: form.droneId.trim() || null,
      active: form.active,
    };
    try {
      if (editing) {
        await updateDocument(COL.players, editing.id, payload);
        toast.success("Player updated");
      } else {
        await createDocument(COL.players, payload);
        toast.success("Player added");
      }
      await writeAudit({
        actorId: profile!.id,
        actorEmail: profile!.email,
        action: editing ? "update" : "create",
        entity: "players",
        entityId: editing?.id ?? payload.fullName,
        details: payload.fullName,
      });
      setDialogOpen(false);
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Rosters"
        title="Players"
        description="Every registered pilot across the league."
        actions={
          canManage ? (
            <Button onClick={openCreate} disabled={editableTeams.length === 0}>
              <Plus className="mr-2 size-4" />
              Add player
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search players or drone IDs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.data.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        <DataState
          loading={players.loading}
          error={players.error}
          empty={filtered.length === 0}
          emptyTitle={search || teamFilter !== "all" ? "No matching players" : "No players yet"}
          emptyDescription="Add pilots to a team to build a competition roster."
          emptyAction={canManage ? <Button onClick={openCreate}>Add player</Button> : null}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Drone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.jerseyNumber}</TableCell>
                  <TableCell className="font-medium">{p.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{teamName(p.teamId)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{p.position}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.droneId || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "outline" : "secondary"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {mayEdit(p) ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${p.fullName}`}
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${p.fullName}`}
                            onClick={() => confirm.ask(p)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit player" : "Add player"}</DialogTitle>
            <DialogDescription>Pilots must have a unique jersey number per team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormRow label="Full name" htmlFor="fullName" error={errors['fullName']}>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </FormRow>
            <FormRow label="Team" error={errors['teamId']}>
              <Select
                value={form.teamId}
                onValueChange={(teamId) => setForm((f) => ({ ...f, teamId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {editableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label="Jersey number" htmlFor="jersey" error={errors['jerseyNumber']}>
                <Input
                  id="jersey"
                  type="number"
                  min={0}
                  max={99}
                  value={form.jerseyNumber}
                  onChange={(e) => setForm((f) => ({ ...f, jerseyNumber: e.target.value }))}
                />
              </FormRow>
              <FormRow label="Position" error={errors['position']}>
                <Select
                  value={form.position}
                  onValueChange={(position) =>
                    setForm((f) => ({ ...f, position: position as PlayerPosition }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_POSITIONS.map((pos) => (
                      <SelectItem key={pos} value={pos} className="capitalize">
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            </div>
            <FormRow label="Drone ID" htmlFor="droneId" hint="Optional hardware identifier">
              <Input
                id="droneId"
                value={form.droneId}
                onChange={(e) => setForm((f) => ({ ...f, droneId: e.target.value }))}
              />
            </FormRow>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Active on roster</p>
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title={`Remove ${confirm.target?.fullName ?? "player"}?`}
        description="The player is permanently removed from the league roster."
        confirmLabel="Remove player"
        onConfirm={async () => {
          if (!confirm.target) return;
          try {
            await deleteDocument(COL.players, confirm.target.id);
            await writeAudit({
              actorId: profile!.id,
              actorEmail: profile!.email,
              action: "delete",
              entity: "players",
              entityId: confirm.target.id,
              details: confirm.target.fullName,
            });
            toast.success("Player removed");
          } catch (error) {
            toast.error(firebaseErrorMessage(error));
          }
        }}
      />
    </>
  );
}
