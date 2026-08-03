import { createFileRoute } from "@tanstack/react-router";
import { where } from "firebase/firestore";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/primitives";
import { DataState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useCollectionData } from "@/lib/hooks";
import { COL } from "@/lib/collections";
import { deleteDocument, updateDocument } from "@/lib/db";
import type { Notification } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { firebaseErrorMessage, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Drone Soccer League Control" },
      { name: "description", content: "Personal alerts about fixtures, results and league news." },
      { property: "og:title", content: "Notifications — Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Personal alerts about fixtures, results and league news.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { profile } = useAuth();
  const list = useCollectionData<Notification>(
    COL.notifications,
    () => [where("userId", "==", profile?.id ?? "__none__")],
    [profile?.id],
    Boolean(profile?.id),
  );
  const unread = list.data.filter((n) => !n.read);

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={`${unread.length} unread`}
        actions={
          unread.length ? (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await Promise.all(
                    unread.map((n) => updateDocument(COL.notifications, n.id, { read: true })),
                  );
                  toast.success("All marked as read");
                } catch (error) {
                  toast.error(firebaseErrorMessage(error));
                }
              }}
            >
              <CheckCheck className="mr-2 size-4" />
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className="panel overflow-hidden">
        <DataState
          loading={list.loading}
          error={list.error}
          empty={list.data.length === 0}
          emptyTitle="You're all caught up"
          emptyDescription="Alerts about your fixtures and results will land here."
          emptyAction={undefined}
        >
          <ul className="divide-y divide-border">
            {[...list.data]
              .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
              .map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                  <Bell
                    className={n.read ? "mt-0.5 size-4 text-muted-foreground" : "mt-0.5 size-4 text-primary"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={n.read ? "font-medium text-muted-foreground" : "font-medium"}>
                      {n.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!n.read ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateDocument(COL.notifications, n.id, { read: true })}
                      >
                        Mark read
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteDocument(COL.notifications, n.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </DataState>
      </div>
    </>
  );
}
