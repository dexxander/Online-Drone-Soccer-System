import { Link } from "@tanstack/react-router";
import { Phone, Mail } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { NotificationMenu } from "@/components/NotificationMenu";
import { AccountMenu } from "@/components/AccountMenu";

const sponsors: { name: string; logo?: string }[] = [
  { name: "Sponsor placeholder", logo: "/sponsors/kkhs.png" },
];

const contactInfo = {
  phone: "+60 12-345 6789",
  email: "contact@example.com",
};

const socialLinks: { label: string; url: string }[] = [
  { label: "Facebook", url: "https://facebook.com" },
  { label: "Instagram", url: "https://instagram.com" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="size-9 shadow-lift" />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">AW DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Leagues System
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/tournaments"
              className="hidden rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="hidden rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Matches
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              About
            </Link>
            <NotificationMenu />
            <AccountMenu />
          </nav>
        </div>
      </header>

      {children}

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 divide-y divide-border px-6 py-12 sm:grid-cols-2 sm:gap-8 sm:divide-x sm:divide-y-0">
          <div className="sm:pr-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Collaborators &amp; Sponsors
            </h3>
            <div className="mt-5 flex flex-wrap gap-4">
              {sponsors.map((sponsor, i) => (
                <div
                  key={i}
                  className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center text-[11px] text-muted-foreground"
                >
                  {sponsor.logo ? (
                    <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    sponsor.name
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-10 sm:pl-8 sm:pt-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contact Us
            </h3>
            <div className="mt-5 flex flex-col gap-3">
              <a href={`tel:${contactInfo.phone}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary">
                <Phone className="size-4 text-muted-foreground" /> {contactInfo.phone}
              </a>
              <a href={`mailto:${contactInfo.email}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary">
                <Mail className="size-4 text-muted-foreground" /> {contactInfo.email}
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border py-6">
          <p className="mx-auto w-full max-w-6xl px-6 text-xs text-muted-foreground">
            © 2026 AW Drone Soccer Leagues System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}