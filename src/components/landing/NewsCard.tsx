import { ExternalLink } from "lucide-react";
import { useLinkPreview } from "@/hooks/useLinkPreview";

export function NewsCard({ url, thumbnail }: { url: string; thumbnail: string | undefined }) {
  const { data, loading, error } = useLinkPreview(url);
  const hostname = new URL(url).hostname.replace("www.", "");
  const image = thumbnail ?? data?.image ?? null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card transition-colors hover:border-primary/40"
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted/40 text-sm text-muted-foreground">
        {image ? (
          <img src={image} alt="" className="size-full object-cover" />
        ) : loading ? (
          "Loading preview…"
        ) : (
          "No image available"
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {error ? hostname : data?.publisher ?? "…"}
        </span>
        <h3 className="mt-2 line-clamp-2 break-all flex-1 text-sm font-bold text-foreground group-hover:text-primary">
          {error ? url : data?.title ?? "Loading…"}
        </h3>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Read article <ExternalLink className="size-3" />
        </span>
      </div>
    </a>
  );
}