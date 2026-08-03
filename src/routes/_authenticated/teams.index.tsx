import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { orderBy } from "firebase/firestore";
import { Plus, Search, Pencil, Trash2, Shield } from "lucide-react";
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
import { ImageUpload } from "@/components/image-upload";
import { useCollectionData, useFiltered } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { createDocument, deleteDocument, updateDocument, writeAudit } from "@/lib/db";
import { STORAGE_PATHS } from "@/lib/storage";
import type { Player, Team, UserProfile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage, initials } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teams/")({
  head: () => ({
    meta: [
      { title: "Teams — Drone Soccer League Control" },
      {
        name: "description",
        content: "Manage drone soccer clubs, coaches, logos and roster availability.",
      },
      { property: "og:title", content: "Teams — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Manage drone soccer clubs, coaches, logos and roster availability.",
      },
    ],
  }),
  component: TeamsPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Team name is required").max(80),
  shortName: z.string().trim().min(2, "Add a 2–5 letter code").max(5),
  city: z.string().trim().max(80).optional(),
  contactEmail: z.string().trim().email("Enter a valid email").max(255).or(z.literal("")),
});

type FormState = {
  name: string;
  shortName: string;
  city: string;
  contactEmail: string;
  coachId: string;
  logoUrl: string | null;
  active: boolean;
};

const EMPTY: FormState = {
  name: "",
  shortName: "",
  city: "",
  contactEmail: "",
  coachId: "none",
  logoUrl: null,
  active: true,
};

function TeamsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin";
  const canEditOwn = profile?.role === "coach";

  const teams = useCollectionData<Team>(COL.teams, () => [orderBy("name")]);
  const players = useCollectionData<Player>(COL.players, () => []);
  const users = useCollectionData<UserProfile>(COL.users, () => [], [], canManage);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<Team | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm<Team>();

  const coaches = useMemo(() => users.data.filter((u) => u.role === "coach"), [users.data]);

  const filtered = useFiltered<Team>(
    teams.data,
    search,
    ["name", "shortName", "city"],
    useMemo(
      () => (team: Team) =>
        statusFilter === "all" ? true : statusFilter === "active" ? team.active : !team.active,
      [statusFilter],
    ),
  );

  const rosterCount = (teamId: string) => players.data.filter((p) => p.teamId === teamId).length;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setForm({
      name: team.name,
      shortName: team.shortName,
      city: team.city ?? "",
      contactEmail: team.contactEmail ?? "",
      coachId: team.coachId ?? "none",
      logoUrl: team.logoUrl ?? null,
      active: team.active,
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
    setErrors({});
    setSaving(true);
    const coach = coaches.find((c) => c.id === form.coachId);
    const payload = {
      name: form.name.trim(),
      shortName: form.shortName.trim().toUpperCase(),
      city: form.city.trim(),
      contactEmail: form.contactEmail.trim() || null,
      coachId: form.coachId === "none" ? null : form.coachId,
      coachName: coach?.displayName ?? null,
      logoUrl: form.logoUrl,
      active: form.active,
    };
    try {
      if (editing) {
        await updateDocument(COL.teams, editing.id, payload);
        await writeAudit({
          actorId: profile!.id,
          actorEmail: profile!.email,
          action: "update",
          entity: "teams",
          entityId: editing.id,
          details: payload.name,
        });
        toast.success("Team updated");
      } else {
        const id = await createDocument(COL.teams, payload);
        await writeAudit({
          actorId: profile!.id,
          actorEmail: profile!.email,
          action: "create",
          entity: "teams",
          entityId: id,
          details: payload.name,
        });
        toast.success("Team created");
      }
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
        eyebrow="Competition"
        title="Teams"
        description="Clubs registered in the league, their coaches and roster size."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              New team
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search teams by name, code or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        <DataState
          loading={teams.loading}
          error={teams.error}
          empty={filtered.length === 0}
          emptyTitle={search ? "No teams match your search" : "No teams registered"}
          emptyDescription={
            search
              ? "Try a different name, code or city."
              : "Create the first club to start building fixtures."
          }
          emptyAction={
            canManage && !search ? <Button onClick={openCreate}>Create a team</Button> : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead className="text-right">Roster</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted font-display text-xs font-bold">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} alt="" className="size-full object-cover" />
                        ) : (
                          initials(team.name)
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to="/teams/$teamId"
                          params={{ teamId: team.id }}
                          className="font-medium hover:text-primary"
                        >
                          {team.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {team.shortName}
                          {team.city ? ` · ${team.city}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {team.coachName ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="text-right font-mono">{rosterCount(team.id)}</TableCell>
                  <TableCell>
                    {team.active ? (
                      <Badge variant="outline" className="border-success/25 bg-success/10 text-success">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canManage || (canEditOwn && profile?.teamId === team.id) ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${team.name}`}
                          onClick={() => openEdit(team)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${team.name}`}
                          onClick={() => confirm.ask(team)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit team" : "New team"}</DialogTitle>
            <DialogDescription>
              Team details are shared across fixtures, brackets and standings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormRow label="Team logo">
              <ImageUpload
                value={form.logoUrl}
                onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
                path={STORAGE_PATHS.teamLogos}
                label="Upload logo"
              />
            </FormRow>
            <FormRow label="Team name" htmlFor="name" error={errors['name']}>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Skyline Rotors"
              />
            </FormRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow
                label="Short code"
                htmlFor="shortName"
                error={errors['shortName']}
                hint="2–5 characters, shown on scoreboards"
              >
                <Input
                  id="shortName"
                  value={form.shortName}
                  maxLength={5}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shortName: e.target.value.toUpperCase() }))
                  }
                  placeholder="SKY"
                />
              </FormRow>
              <FormRow label="City" htmlFor="city" error={errors['city']}>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </FormRow>
            </div>
            <FormRow label="Contact email" htmlFor="contactEmail" error={errors['contactEmail']}>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              />
            </FormRow>
            {canManage ? (
              <FormRow label="Coach">
                <Select
                  value={form.coachId}
                  onValueChange={(coachId) => setForm((f) => ({ ...f, coachId }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            ) : null}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive teams cannot be added to new tournaments.
                </p>
              </div>
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
              {saving ? "Saving…" : editing ? "Save changes" : "Create team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title={`Delete ${confirm.target?.name ?? "team"}?`}
        description="This permanently removes the team. Players linked to it keep their records but lose their club."
        confirmLabel="Delete team"
        onConfirm={async () => {
          if (!confirm.target) return;
          try {
            await deleteDocument(COL.teams, confirm.target.id);
            await writeAudit({
              actorId: profile!.id,
              actorEmail: profile!.email,
              action: "delete",
              entity: "teams",
              entityId: confirm.target.id,
              details: confirm.target.name,
            });
            toast.success("Team deleted");
          } catch (error) {
            toast.error(firebaseErrorMessage(error));
          }
        }}
      />

      {teams.data.length === 0 && !teams.loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5" /> Teams power brackets, standings and match reports.
        </p>
      ) : null}
    </>
  );
}
