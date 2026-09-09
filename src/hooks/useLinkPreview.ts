import { useEffect, useState } from "react";

type LinkPreview = {
  title: string;
  image: string | null;
  publisher: string;
};

const cache = new Map<string, LinkPreview>();

export function useLinkPreview(url: string) {
  const [data, setData] = useState<LinkPreview | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache.has(url)) {
      setData(cache.get(url)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status !== "success") throw new Error("preview failed");
        const preview: LinkPreview = {
          title: json.data.title ?? url,
          image: json.data.image?.url ?? json.data.screenshot?.url ?? null,
          publisher: json.data.publisher ?? new URL(url).hostname.replace("www.", ""),
        };
        cache.set(url, preview);
        setData(preview);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}