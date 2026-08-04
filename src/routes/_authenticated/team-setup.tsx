import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/primitives";
import { FormRow } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import { COL } from "@/lib/collections";
import { createDocument, updateDocument, writeAudit } from "@/lib/db";
import { STORAGE_PATHS } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team-setup")({
  head: () => ({
    meta: [{ title: "Set up your team — Drone Soccer League Control" }],
  }),
  component: TeamSetupPage,
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
  logoUrl: string | null;
};

const EMPTY: FormState = {
  name: "",
  shortName: "",
  city: "",
  contactEmail: "",
  logoUrl: null,
};

function TeamSetupPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Already has a team — nothing to do here, send them onward.
  if (profile?.teamId) {
    navigate({ to: "/players", replace: true });
    return null;
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
    const payload = {
      name: parsed.data.name.trim(),
      shortName: parsed.data.shortName.trim().toUpperCase(),
      city: parsed.data.city?.trim() ?? "",
      contactEmail: parsed.data.contactEmail.trim() || null,
      coachId: profile!.id,
      coachName: profile!.displayName,
      logoUrl: form.logoUrl,
      active: true,
    };
    try {
      const teamId = await createDocument(COL.teams, payload);
      await updateDocument(COL.users, profile!.id, { teamId });
      await writeAudit({
        actorId: profile!.id,
        actorEmail: profile!.email,
        action: "create",
        entity: "teams",
        entityId: teamId,
        details: payload.name,
      });
      toast.success("Team created — let's add your players");
      navigate({ to: "/players", replace: true });
    } catch (error) {
      toast.error(firebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Welcome"
        title="Set up your team"
        description="Create your club before adding players to your roster."
      />
      <div className="panel mx-auto max-w-lg space-y-4 p-6">
        <FormRow label="Team logo">
          <ImageUpload
            value={form.logoUrl}
            onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
            path={STORAGE_PATHS.teamLogos}
            label="Upload logo"
          />
        </FormRow>
        <FormRow label="Team name" htmlFor="name" error={errors["name"]}>
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
            error={errors["shortName"]}
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
          <FormRow label="City" htmlFor="city" error={errors["city"]}>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </FormRow>
        </div>
        <FormRow label="Contact email" htmlFor="contactEmail" error={errors["contactEmail"]}>
          <Input
            id="contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
          />
        </FormRow>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Users className="mr-2 size-4" />}
          {saving ? "Creating…" : "Create team"}
        </Button>
      </div>
    </>
  );
}