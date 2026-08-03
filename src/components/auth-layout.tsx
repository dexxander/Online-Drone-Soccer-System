import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode | undefined;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link to="/" className="font-display text-sm font-bold tracking-[0.2em] uppercase">
          Drone Soccer League
        </Link>
        <div>
          <p className="eyebrow text-background/60">Broadcast-grade operations</p>
          <h2 className="mt-3 max-w-md font-display text-4xl font-extrabold leading-[1.05]">
            Run every fixture, bracket and scoreline from one control room.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-background/70">
            Live scoring, seeded brackets that advance themselves, automatic standings, and
            role-based access for organisers, referees, coaches and players.
          </p>
        </div>
        <p className="text-xs text-background/50">
          Secured by Firebase Authentication · Firestore · Cloud Storage
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 font-display text-sm font-bold lg:hidden"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              DS
            </span>
            Drone Soccer League
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
