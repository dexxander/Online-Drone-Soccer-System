import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Megaphone, Plus, Pin, Trash2, Edit3, X, Check, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { useMockWebSocket } from "@/hooks/useMockWebSocket";
import type { Announcement, AnnouncementCategory } from "@/lib/types";

export const Route = createFileRoute("/admin-announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — AW Drone Soccer Leagues System" },
      { name: "description", content: "Post, edit, pin, and manage league announcements for teams, coaches, and referees." },
    ],
  }),
  component: AdminAnnouncementsPage,
});

const categoryOptions: AnnouncementCategory[] = [
  "General",
  "Tournament",
  "Rule Update",
  "Maintenance",
  "Urgent",
];

const categoryColorMap: Record<AnnouncementCategory, string> = {
  Urgent: "bg-destructive/10 text-destructive border-destructive/30",
  "Rule Update": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Tournament: "bg-primary/10 text-primary border-primary/30",
  Maintenance: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  General: "bg-muted text-muted-foreground border-border",
};

function AdminAnnouncementsPage() {
  const { state, emit } = useMockWebSocket();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AnnouncementCategory | "all">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "General" as AnnouncementCategory,
    content: "",
    author: "League Administrator",
    pinned: false,
  });

  const announcements = state.announcements || [];

  const filtered = announcements.filter((a) => {
    const matchesSearch =
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Sort pinned first, then by date descending
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const pinnedCount = announcements.filter((a) => a.pinned).length;

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      category: "General",
      content: "",
      author: "League Administrator",
      pinned: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      content: item.content,
      author: item.author,
      pinned: !!item.pinned,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (editingItem) {
      emit("updateAnnouncement", (s) =>
        s.updateAnnouncement(editingItem.id, {
          title: formData.title.trim(),
          category: formData.category,
          content: formData.content.trim(),
          author: formData.author.trim() || "League Administrator",
          pinned: formData.pinned,
        })
      );
    } else {
      emit("addAnnouncement", (s) =>
        s.addAnnouncement({
          title: formData.title.trim(),
          category: formData.category,
          content: formData.content.trim(),
          author: formData.author.trim() || "League Administrator",
          pinned: formData.pinned,
        })
      );
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete the announcement "${title}"?`)) {
      emit("removeAnnouncement", (s) => s.removeAnnouncement(id));
    }
  };

  const handleTogglePin = (id: string) => {
    emit("togglePinAnnouncement", (s) => s.togglePinAnnouncement(id));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            League control
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Post, edit, pin, and delete official broadcast announcements for teams, coaches, and referees.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 shadow-sm"
        >
          <Plus className="size-4" /> New Announcement
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Announcements"
          value={announcements.length}
          hint="Published broadcast notices"
          icon={<Megaphone className="size-5" />}
        />
        <StatCard
          label="Pinned Notices"
          value={pinnedCount}
          hint="Highlighted at the top"
          icon={<Pin className="size-5" />}
        />
        <StatCard
          label="Categories"
          value={categoryOptions.length}
          hint="General, Tournament, Safety, Maintenance"
          icon={<ShieldAlert className="size-5" />}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="auth-input pl-9"
            placeholder="Search by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="auth-input sm:w-52"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as AnnouncementCategory | "all")}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <Panel title={`${sorted.length} Announcement${sorted.length === 1 ? "" : "s"}`}>
          {sorted.length === 0 ? (
            <EmptyState
              title={search || categoryFilter !== "all" ? "No matching announcements" : "No announcements posted yet"}
              description="Click 'New Announcement' above to publish your first announcement to the portal."
            />
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((item) => (
                <div key={item.id} className="p-5 transition-colors hover:bg-muted/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryColorMap[item.category]}`}
                        >
                          {item.category}
                        </span>
                        {item.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            <Pin className="size-3" /> Pinned
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {item.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                        <span>By <strong className="text-foreground">{item.author}</strong></span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {item.updatedAt && (
                          <>
                            <span>•</span>
                            <span className="italic">Edited {new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                      <button
                        onClick={() => handleTogglePin(item.id)}
                        title={item.pinned ? "Unpin announcement" : "Pin announcement"}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          item.pinned
                            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Pin className="size-3.5" />
                        {item.pinned ? "Pinned" : "Pin"}
                      </button>

                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <Edit3 className="size-3.5" /> Edit
                      </button>

                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Modal Dialog for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingItem ? "Edit Announcement" : "Create New Announcement"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 2026 Championship Safety Regulations"
                  className="auth-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Category
                  </label>
                  <select
                    className="auth-input"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AnnouncementCategory })
                    }
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    placeholder="League Administrator"
                    className="auth-input"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Content
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the full announcement text here..."
                  className="auth-input resize-none py-2.5"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinned"
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                />
                <label htmlFor="pinned" className="text-sm font-medium text-foreground cursor-pointer select-none">
                  Pin this announcement to top
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Check className="size-4" />
                  {editingItem ? "Save Changes" : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
