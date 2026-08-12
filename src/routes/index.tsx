import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ShieldCheck, Gauge, Radio, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { formatClock, useMatchClock, useMockWebSocket } from "@/hooks/useMockWebSocket";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { LogoMark } from "@/components/LogoMark";

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
  const { state } = useMockWebSocket();
  const registeredClubs = state.teams.length;
  const matchesOfficiated = state.matches.reduce(
    (total, slot) => total + slot.events.filter((event) => event.type === "match_ended").length,
    0,
  );
  const activeTournaments = state.tournaments.filter((tournament) => tournament.status === "active").length;

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="size-9 shadow-lift" />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-foreground">DRONE SOCCER</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                League Control
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/tournaments"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              Matches
            </Link>
            <Link
              to="/about"
              className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground sm:block"
            >
              About
            </Link>
            <NotificationMenu />
            <AccountMenu />
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1fr_440px] lg:items-center lg:pt-24">
          <div>
            <span>
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
          <Stat value={String(registeredClubs)} label="Registered clubs" />
          <Stat value={String(matchesOfficiated)} label="Matches officiated" />
          <Stat value={String(activeTournaments)} label="Active tournaments" />
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



interface DroneConfig {
  armCount: number;
  primaryColor: THREE.Color;
  frameColor: THREE.Color;
  cageSize: number;
  glassRoughness: number;
  glassTransmission: number;
  coreType: "box" | "cylinder" | "box-wide" | "sphere";
  ringCount: number;
  armLength: number;
  propSize: number;
}

interface BuiltDrone {
  group: THREE.Group;
  propellers: THREE.Mesh[];
  config: DroneConfig;
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

function createDrone(config: DroneConfig): BuiltDrone {
  const droneGroup = new THREE.Group();
  const propellers: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const frameMaterial = new THREE.MeshPhongMaterial({ color: config.frameColor, specular: 0x555555, shininess: 80 });
  const primaryMaterial = new THREE.MeshPhongMaterial({
    color: config.primaryColor,
    emissive: config.primaryColor,
    emissiveIntensity: 0.55,
    shininess: 100,
  });
  materials.push(frameMaterial, primaryMaterial);

  // Core
  const coreGeo =
    config.coreType === "box"
      ? new THREE.BoxGeometry(0.8, 0.4, 0.8)
      : config.coreType === "cylinder"
        ? new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16)
        : config.coreType === "box-wide"
          ? new THREE.BoxGeometry(1.4, 0.5, 1.4)
          : new THREE.SphereGeometry(0.6, 16, 16);
  geometries.push(coreGeo);
  const core = new THREE.Mesh(coreGeo, frameMaterial);
  droneGroup.add(core);

  const coreDetailGeo = new THREE.BoxGeometry(0.4, 0.1, 0.4);
  geometries.push(coreDetailGeo);
  const coreDetail = new THREE.Mesh(coreDetailGeo, primaryMaterial);
  coreDetail.position.y = config.coreType === "box-wide" ? 0.3 : config.coreType === "sphere" ? 0.55 : 0.25;
  core.add(coreDetail);

  // Arms, motors, propellers
  const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, config.armLength, 8);
  const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
  const propGeo = new THREE.BoxGeometry(config.propSize, 0.02, 0.08);
  geometries.push(armGeometry, motorGeo, propGeo);

  for (let i = 0; i < config.armCount; i++) {
    const rad = (i * (360 / config.armCount) * Math.PI) / 180 + Math.PI / config.armCount;

    const arm = new THREE.Mesh(armGeometry, frameMaterial);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(Math.cos(rad) * (config.armLength / 2), 0, Math.sin(rad) * (config.armLength / 2));
    arm.rotation.y = -rad;
    droneGroup.add(arm);

    const motorPos = new THREE.Group();
    motorPos.position.set(Math.cos(rad) * (config.armLength - 0.2), 0.1, Math.sin(rad) * (config.armLength - 0.2));
    droneGroup.add(motorPos);

    const motor = new THREE.Mesh(motorGeo, frameMaterial);
    motorPos.add(motor);

    const prop = new THREE.Mesh(propGeo, primaryMaterial);
    prop.position.y = 0.15;
    motorPos.add(prop);
    propellers.push(prop);
  }

  // Glassmorphic geodesic cage
  const cageGeo = new THREE.IcosahedronGeometry(config.cageSize, 1);
  geometries.push(cageGeo);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: config.primaryColor,
    metalness: 0.1,
    roughness: config.glassRoughness,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    transmission: config.glassTransmission,
    opacity: 0.2,
    transparent: true,
    ior: 1.5,
    side: THREE.DoubleSide,
    thickness: 0.2,
    // Without an environment map, pure transmission renders almost
    // colorless glass — attenuationColor tints light as it passes through
    // the material itself, which is what actually makes the cage read as
    // "colored glass" rather than clear plastic.
    attenuationColor: config.primaryColor,
    attenuationDistance: 2.2,
  });
  materials.push(glassMaterial);
  droneGroup.add(new THREE.Mesh(cageGeo, glassMaterial));

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: config.primaryColor,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
  });
  materials.push(wireMaterial);
  const cageWire = new THREE.Mesh(cageGeo, wireMaterial);
  cageWire.scale.setScalar(1.001);
  droneGroup.add(cageWire);

  // Telemetry rings
  for (let i = 0; i < config.ringCount; i++) {
    const ringGeo = new THREE.TorusGeometry(config.cageSize + i * 0.2, 0.015, 16, 100);
    geometries.push(ringGeo);
    const ring = new THREE.Mesh(ringGeo, primaryMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 0.1 - 0.05;
    droneGroup.add(ring);
  }

  droneGroup.scale.setScalar(0.001);
  droneGroup.visible = false;

  return { group: droneGroup, propellers, config, disposables: { geometries, materials } };
}

/* ── Signature hero graphic: four 3D drone-soccer craft (a light rig, a
   racer, a heavy lifter, a stealth octocopter) that cycle through a shared
   glassmorphic cage every few seconds. Colors are hue variants generated
   from the app's own primary token, not a hardcoded palette. ── */
function CagedDrone() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Literal palette matching the reference build exactly (teal / red /
    // orange / purple), rather than colors derived from the app's theme —
    // each rig also keeps its own frame tone from the source.
    const droneConfigs: DroneConfig[] = [
      {
        // Aero Classic
        armCount: 4,
        primaryColor: new THREE.Color(0x0099a4),
        frameColor: new THREE.Color(0x222222),
        cageSize: 2.5,
        glassRoughness: 0.1,
        glassTransmission: 0.9,
        coreType: "box",
        ringCount: 1,
        armLength: 2,
        propSize: 1.2,
      },
      {
        // Speedster RX
        armCount: 4,
        primaryColor: new THREE.Color(0xff3333),
        frameColor: new THREE.Color(0x111111),
        cageSize: 2.2,
        glassRoughness: 0.4,
        glassTransmission: 0.8,
        coreType: "cylinder",
        ringCount: 0,
        armLength: 1.6,
        propSize: 1,
      },
      {
        // Goliath Lifter
        armCount: 6,
        primaryColor: new THREE.Color(0xffaa00),
        frameColor: new THREE.Color(0x333333),
        cageSize: 3.2,
        glassRoughness: 0.2,
        glassTransmission: 0.85,
        coreType: "box-wide",
        ringCount: 2,
        armLength: 2.4,
        propSize: 1.4,
      },
      {
        // Night Owl Stealth
        armCount: 8,
        primaryColor: new THREE.Color(0xaa33ff),
        frameColor: new THREE.Color(0x050505),
        cageSize: 3,
        glassRoughness: 0.05,
        glassTransmission: 0.95,
        coreType: "sphere",
        ringCount: 3,
        armLength: 2.8,
        propSize: 0.9,
      },
    ];
    const firstPrimary = droneConfigs[0]?.primaryColor ?? new THREE.Color(0x0099a4);

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    // Deliberately no scene.fog here: the original snippet used it to blend
    // toward a near-black full-screen background, but on this page's light
    // `bg-surface` a fog-to-white pass desaturates the whole drone before it
    // ever reaches camera-near — visible color disappears almost entirely.
    const scene = new THREE.Scene();

    // Pulled back and widened slightly versus the source (z: 6) since the
    // largest rig here (Goliath Lifter, cageSize 3.2) needs more headroom in
    // this fixed 460px hero box than it did in the original's full viewport.
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 8.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directLight.position.set(5, 10, 5);
    scene.add(directLight);
    const pointLight = new THREE.PointLight(firstPrimary, 3, 15);
    pointLight.position.set(-2, 3, 2);
    scene.add(pointLight);

    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    const allDrones = droneConfigs.map((config) => {
      const drone = createDrone(config);
      masterGroup.add(drone.group);
      return drone;
    });
    const firstDrone = allDrones[0];
    if (firstDrone) firstDrone.group.visible = true;

    let activeIndex = 0;
    const cycleDurationMs = 7000;
    let cycleTimer = 0;
    let time = 0;
    let frameId = 0;
    const mouse = { x: 0, y: 0 };
    const targetTilt = { x: 0, z: 0 };
    const targetLightColor = allDrones[0]?.config.primaryColor.clone() ?? firstPrimary.clone();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetTilt.x = mouse.y * 0.3;
      targetTilt.z = -mouse.x * 0.3;
    };
    container.addEventListener("pointermove", handlePointerMove);

    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      time += delta;
      cycleTimer += delta * 1000;

      if (cycleTimer >= cycleDurationMs) {
        cycleTimer = 0;
        activeIndex = (activeIndex + 1) % allDrones.length;
        const next = allDrones[activeIndex];
        if (next) targetLightColor.copy(next.config.primaryColor);
      }

      allDrones.forEach((drone, index) => {
        const spinSpeed = index === activeIndex ? 0.4 : 0.05;
        drone.propellers.forEach((p) => (p.rotation.y += spinSpeed));

        if (index === activeIndex) {
          drone.group.visible = true;
          drone.group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
        } else {
          drone.group.scale.lerp(new THREE.Vector3(0.001, 0.001, 0.001), 0.1);
          if (drone.group.scale.x < 0.01) drone.group.visible = false;
        }
      });

      pointLight.color.lerp(targetLightColor, 0.05);

      masterGroup.position.y = Math.sin(time * 2) * 0.15;
      masterGroup.rotation.y += 0.003;
      masterGroup.rotation.x = THREE.MathUtils.lerp(masterGroup.rotation.x, targetTilt.x + Math.sin(time) * 0.05, 0.05);
      masterGroup.rotation.z = THREE.MathUtils.lerp(masterGroup.rotation.z, targetTilt.z + Math.cos(time) * 0.05, 0.05);

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
      allDrones.forEach((drone) => {
        drone.disposables.geometries.forEach((g) => g.dispose());
        drone.disposables.materials.forEach((m) => m.dispose());
      });
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
