import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export function FeatureRow({
  icon: Icon,
  image,
  title,
  body,
  href,
  cta,
  showCta,
}: {
  icon: LucideIcon;
  image?: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  showCta: boolean;
}) {
  return (
    <section className="feature-row border-b border-border">
      <div className="feature-row-inner mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 py-20 lg:flex-row lg:gap-16">
        <div className="w-full overflow-hidden rounded-2xl border border-border lg:w-1/2">
          <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 text-sm text-muted-foreground">
            {image ? (
              <img src={image} alt={title} className="size-full object-cover" />
            ) : (
              <Icon className="size-8 opacity-30" />
            )}
          </div>
        </div>
        <div className="w-full lg:w-1/2">
          <h3 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h3>
          <p className="mt-4 max-w-md text-muted-foreground">{body}</p>
          {showCta && (
            <div className="mt-6">
              <Link
                to={href as any}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {cta}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}