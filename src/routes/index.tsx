import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ShieldCheck, Gauge, Radio, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drone Soccer League Control — Tournament Management" },
      {
        name: "description",
        content:
          "Run drone soccer competitions end to end: team registration, admin approvals, referee match control and a real-time live scoreboard.",
      },
      { property: "og:title", content: "Drone Soccer League Control" },
      {
        property: "og:description",
        content: "Registration, approvals, referee controls and a real-time scoreboard for drone soccer leagues.",
      },
    ],
  }),
  component: Landing,
});

const flow = [
  {
    n: "01",
    icon: Users,
    title: "Register",
    body: "Coaches submit team details and a full roster through a guided portal.",
    href: "/register-team" as const,
  },
  {
    n: "02",
    icon: ShieldCheck,
    title: "Approve",
    body: "Admins review every team and player, approving or rejecting from one queue.",
    href: "/admin" as const,
  },
  {
    n: "03",
    icon: Gauge,
    title: "Officiate",
    body: "Referees run the clock, score and penalties from pitchside controls.",
    href: "/referee" as const,
  },
  {
    n: "04",
    icon: Radio,
    title: "Broadcast",
    body: "Every call lands on the arena scoreboard instantly, synced across screens.",
    href: "/scoreboard" as const,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lift">
              DS
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                League Control
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/scoreboard"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Live scoreboard
            </Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              to="/register-team"
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Register team
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1fr_440px] lg:items-center lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" />
              League control · Season 4
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[64px]">
              Every match.
              <br />
              Every call.
              <br />
              <span className="text-primary">One arena feed.</span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Register teams, approve rosters, referee from pitchside and broadcast the score to
              every screen in the venue — synced in real time, no refresh.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register-team"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-colors hover:bg-primary/90"
              >
                Register your team <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/scoreboard"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Watch live scoreboard
              </Link>
            </div>

            <div className="mt-8">
              <LiveTicker />
            </div>
          </div>

          <CagedDrone />
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
          <Stat value="128" label="Registered clubs" />
          <Stat value="1,940" label="Matches officiated" />
          <Stat value="24" label="Arena displays" />
          <div className="flex flex-col justify-center px-6 py-6">
            <span className="inline-flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-warning">
              <span className="size-2 rounded-full bg-warning shadow-[0_0_8px_2px_var(--color-warning)]" />
              Live
            </span>
            <span className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Synced across every screen
            </span>
          </div>
        </div>
      </section>

      {/* ── Match-day flow ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">How a league day runs</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Four roles, one shared state. Each step below is a real workspace in the platform.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map((f) => (
            <Link
              key={f.n}
              to={f.href}
              className="group flex flex-col rounded-xl border border-border bg-background p-5 shadow-card transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">{f.n}</span>
                <f.icon className="size-4 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-foreground">{f.title}</h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <p className="mx-auto w-full max-w-6xl px-6 text-xs text-muted-foreground">
          Drone Soccer League Control — prototype build. Data is stored locally and synced across tabs.
        </p>
      </footer>
    </div>
  );
}

/* ── Stat cell ── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col justify-center px-6 py-6">
      <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{value}</span>
      <span className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Live match ticker — reads the same shared store the referee/scoreboard
   pages use, so the marketing page reflects real match state. ── */
function LiveTicker() {
  const { state } = useMockWebSocket();
  const m = state.match;
  const clock = useMatchClock(m.elapsedMs, m.runningSince);
  const isLive = m.status === "live" || m.status === "paused";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs shadow-card">
      <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider ${isLive ? "text-primary" : "text-muted-foreground"}`}>
        <span
          className={`size-1.5 rounded-full ${isLive ? "bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" : "bg-muted-foreground"}`}
        />
        {isLive ? "Live now" : "Next match"}
      </span>
      <span className="text-foreground">
        {m.teamAName} <span className="text-muted-foreground">vs</span> {m.teamBName}
      </span>
      {isLive && (
        <span className="text-warning">
          {m.scoreA}–{m.scoreB} · {formatClock(clock)}
        </span>
      )}
    </div>
  );
}

/* ── Reads a resolved color from the app's CSS custom properties so the
   Three.js materials below stay in sync with the design tokens, instead of
   hardcoding hex values that would drift from the theme. ── */
function readCssColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const probe = document.createElement("div");
  probe.style.color = `var(${varName})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return resolved || fallback;
}

/* ── Signature hero graphic: a real 3D caged drone-soccer ball rendered
   with Three.js — geodesic cage, spinning rotor arms, mouse-reactive tilt.
   Colors are pulled from the app's theme tokens at mount time. ── */
function CagedDrone() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const primaryColor = new THREE.Color(readCssColor("--color-primary", "#4f46e5"));
    const frameColor = new THREE.Color(readCssColor("--color-foreground", "#1a1a2e"));

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directLight = new THREE.DirectionalLight(0xffffff, 1);
    directLight.position.set(5, 5, 5);
    scene.add(directLight);
    const pointLight = new THREE.PointLight(primaryColor, 2, 15);
    pointLight.position.set(-2, 3, 2);
    scene.add(pointLight);

    const droneGroup = new THREE.Group();
    scene.add(droneGroup);

    const frameMaterial = new THREE.MeshPhongMaterial({ color: frameColor, specular: 0x666666, shininess: 100 });
    const primaryMaterial = new THREE.MeshPhongMaterial({
      color: primaryColor,
      emissive: primaryColor.clone().multiplyScalar(0.15),
      shininess: 100,
    });
    const cageMaterial = new THREE.MeshPhongMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });

    // Central flight-controller core
    const coreGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const core = new THREE.Mesh(coreGeometry, frameMaterial);
    droneGroup.add(core);

    const coreDetailGeo = new THREE.BoxGeometry(0.4, 0.1, 0.4);
    const coreDetail = new THREE.Mesh(coreDetailGeo, primaryMaterial);
    coreDetail.position.y = 0.25;
    core.add(coreDetail);

    // Rotor arms + spinning propellers
    const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, 2, 8);
    const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
    const propGeo = new THREE.BoxGeometry(1.2, 0.02, 0.08);
    const propellers: THREE.Mesh[] = [];

    [45, 135, 225, 315].forEach((deg) => {
      const rad = (deg * Math.PI) / 180;

      const arm = new THREE.Mesh(armGeometry, frameMaterial);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(Math.cos(rad), 0, Math.sin(rad));
      arm.rotation.y = -rad;
      droneGroup.add(arm);

      const motorPos = new THREE.Group();
      motorPos.position.set(Math.cos(rad) * 1.8, 0.1, Math.sin(rad) * 1.8);
      droneGroup.add(motorPos);

      const motor = new THREE.Mesh(motorGeo, frameMaterial);
      motorPos.add(motor);

      const prop = new THREE.Mesh(propGeo, primaryMaterial);
      prop.position.y = 0.15;
      motorPos.add(prop);
      propellers.push(prop);
    });

    // Geodesic protective cage
    const cageGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const cage = new THREE.Mesh(cageGeo, cageMaterial);
    droneGroup.add(cage);

    // Telemetry ring
    const ringGeo = new THREE.TorusGeometry(2.2, 0.01, 16, 100);
    const ring = new THREE.Mesh(ringGeo, primaryMaterial);
    ring.rotation.x = Math.PI / 2;
    droneGroup.add(ring);

    let time = 0;
    let frameId = 0;
    const mouse = { x: 0, y: 0 };
    const targetTilt = { x: 0, z: 0 };

    // Scoped to the graphic itself, not the whole window, so it doesn't
    // hijack pointer movement anywhere else on the landing page.
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetTilt.x = mouse.y * 0.25;
      targetTilt.z = -mouse.x * 0.25;
    };
    container.addEventListener("pointermove", handlePointerMove);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      time += 0.01;

      droneGroup.position.y = Math.sin(time * 2) * 0.1;
      propellers.forEach((p) => (p.rotation.y += 0.3));
      droneGroup.rotation.x = THREE.MathUtils.lerp(droneGroup.rotation.x, targetTilt.x + Math.sin(time) * 0.05, 0.05);
      droneGroup.rotation.z = THREE.MathUtils.lerp(droneGroup.rotation.z, targetTilt.z + Math.cos(time) * 0.05, 0.05);
      droneGroup.rotation.y += 0.004;

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      [coreGeometry, coreDetailGeo, armGeometry, motorGeo, propGeo, cageGeo, ringGeo].forEach((g) => g.dispose());
      [frameMaterial, primaryMaterial, cageMaterial].forEach((m) => m.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="pointer-events-none absolute inset-12 rounded-full bg-primary/20 blur-[80px]" />
      <div ref={containerRef} className="relative size-full" />
    </div>
  );
}