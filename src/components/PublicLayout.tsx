import { Link } from "@tanstack/react-router";
import { Phone, Mail, ChevronDown } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { NotificationMenu } from "@/components/NotificationMenu";
import { AccountMenu } from "@/components/AccountMenu";

const navLinkClass =
  "rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground";

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

/** Hover-based nav dropdown — opens on mouse-over, no click needed. The
 * panel sits in a zero-gap `top-full` hit area (inner `pt-2` for the visual
 * gap) so moving the pointer from trigger to panel doesn't lose hover state. */
function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <button type="button" className={`${navLinkClass} flex items-center gap-1`}>
        {label}
        <ChevronDown className="size-3 transition-transform duration-150 group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-30 w-44 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
        <div className="overflow-hidden rounded-lg border border-border bg-background py-1.5 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}

type NavRoute =
  | "/tournaments"
  | "/matches"
  | "/teams"
  | "/rankings"
  | "/about/rules"
  | "/about/founder"
  | "/about/credits";

function NavItem({ to, children }: { to: NavRoute; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}

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
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/" className={navLinkClass}>
                Home
              </Link>

              <NavGroup label="Events">
                <NavItem to="/tournaments">Tournaments</NavItem>
                <NavItem to="/matches">Matches</NavItem>
              </NavGroup>

              <NavGroup label="Teams">
                <NavItem to="/teams">All Teams</NavItem>
                <NavItem to="/rankings">Rankings</NavItem>
              </NavGroup>

              <NavGroup label="About">
                <NavItem to="/about/rules">Rules</NavItem>
                <NavItem to="/about/founder">Founders</NavItem>
                <NavItem to="/about/credits">Credits</NavItem>
              </NavGroup>

              <Link to="/support" className={navLinkClass}>
                Support
              </Link>
            </div>

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
            <div className="mt-5 flex flex-wrap items-center gap-6">
            {sponsors.map((sponsor, i) =>
                sponsor.logo ? (
                <img key={i} src={sponsor.logo} alt={sponsor.name} className="h-16 w-auto object-contain" />
                ) : (
                <div
                    key={i}
                    className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center text-[11px] text-muted-foreground"
                >
                    {sponsor.name}
                </div>
                )
            )}
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
                © {new Date().getFullYear()} AW Drone Soccer Leagues System. All rights reserved.
            </p>
        </div>
      </footer>
    </div>
  );
}