import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { orderBy } from "firebase/firestore";
import { Plus, Pin, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/primitives";
import { DataState } from "@/components/states";
import { ConfirmDialog, FormRow, useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
import { useCollectionData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { createDocument, deleteDocument, updateDocument, writeAudit } from "@/lib/db";
import { ROLES, type Announcement, type Role } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Drone Soccer League Control" },
      {
        name: "description",
        content: "League bulletins for organisers, referees, coaches, players and viewers.",
      },
      { property: "og:title", content: "Announcements — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "League bulletins for organisers, referees, coaches, players and viewers.",
      },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin";
  const list = useCollectionData<Announcement>(COL.announcements, () => [
    orderBy("createdAt", "desc"),
  ]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all" as Role | "all",
    pinned: false,
  });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm<Announcement>();

  const visible = list.data.filter(
    (a) => a.audience === "all" || a.audience === profile?.role || canManage,
  );

  async function save() {
    if (form.title.trim().length < 3 || form.body.trim().length < 3) {
      setError("Add a title and a message");
      return;
    }
    setError(undefined);
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      pinned: form.pinned,
      authorId: profile!.id,
      authorName: profile!.displayName,
    };
    try {
      if (editing) await updateDocument(COL.announcements, editing.id, payload);
      else await createDocument(COL.announcements, payload);
      await writeAudit({
        actorId: profile!.id,
        actorEmail: profile!.email,
        action: editing ? "update" : "create",
        entity: "announcements",
        entityId: editing?.id ?? payload.title,
        details: payload.title,
      });
      toast.success(editing ? "Announcement updated" : "Announcement published");
      setOpen(false);
    } catch (err) {
      toast.error(firebaseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Communications"
        title="Announcements"
        description="Targeted bulletins delivered to the whole league or a single role."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setForm({ title: "", body: "", audience: "all", pinned: false });
                setOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              New announcement
            </Button>
          ) : null
        }
      />

      <DataState
        loading={list.loading}
        error={list.error}
        empty={visible.length === 0}
        emptyTitle="No announcements"
        emptyDescription="League updates will appear here."
      >
        <div className="space-y-4">
          {[...visible]
            .sort((a, b) => Number(b.pinned) - Number(a.pinned))
            .map((a) => (
              <article key={a.id} className="panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {a.pinned ? (
                    <Badge className="gap-1">
                      <Pin className="size-3" />
                      Pinned
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="capitalize">
                    {a.audience === "all" ? "Everyone" : a.audience}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {a.authorName} · {formatDateTime(a.createdAt)}
                  </span>
                  {canManage ? (
                    <span className="ml-auto flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit announcement"
                        onClick={() => {
                          setEditing(a);
                          setForm({
                            title: a.title,
                            body: a.body,
                            audience: a.audience,
                            pinned: a.pinned,
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete announcement"
                        onClick={() => confirm.ask(a)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 font-display text-lg font-bold">{a.title}</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </article>
            ))}
        </div>
      </DataState>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormRow label="Title" error={error}>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </FormRow>
            <FormRow label="Message">
              <Textarea
                rows={5}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </FormRow>
            <FormRow label="Audience">
              <Select
                value={form.audience}
                onValueChange={(audience) =>
                  setForm((f) => ({ ...f, audience: audience as Role | "all" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Pin to top</p>
              <Switch
                checked={form.pinned}
                onCheckedChange={(pinned) => setForm((f) => ({ ...f, pinned }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title="Delete this announcement?"
        description="It will be removed for everyone immediately."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!confirm.target) return;
          try {
            await deleteDocument(COL.announcements, confirm.target.id);
            toast.success("Announcement deleted");
          } catch (error) {
            toast.error(firebaseErrorMessage(error));
          }
        }}
      />
    </>
  );
}
