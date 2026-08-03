import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/storage";
import { toast } from "sonner";

export function ImageUpload({
  value,
  onChange,
  path,
  label = "Upload image",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  path: string;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setPending(true);
            try {
              const url = await uploadImage(path, file);
              onChange(url);
              toast.success("Image uploaded");
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setPending(false);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {label}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="mr-1 size-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
