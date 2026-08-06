import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/* ────────────────────────────────────────────────────────────────────────
 * DroneArena — embeddable Zero-G drone physics showcase.
 *
 * This is the same simulation used elsewhere in the app, adapted to fill
 * whatever container you place it in (instead of the full viewport) so it
 * can be dropped into a card, a section, a sidebar, etc.
 *
 * Usage:
 *   <div className="relative h-[420px] w-full overflow-hidden rounded-xl">
 *     <DroneArena />
 *   </div>
 * ──────────────────────────────────────────────────────────────────────── */

// --- DRONE CONFIGURATIONS ---
const DRONES = {
  Job: {
    name: "Job",
    config: {
      armCount: 4,
      primaryColor: new THREE.Color(0x00e5ff), // Bright Cyan/Teal
      frameColor: new THREE.Color(0x333333),
      cageSize: 2.2,
      glassRoughness: 0.1,
      glassTransmission: 0.9,
      coreType: "box",
      ringCount: 1,
      armLength: 2.0,
      propSize: 1.2,
    },
    mass: 1.0,
    startPos: [-6, 3, 0],
    startVel: [8, -2, 0],
  },
  Dexter: {
    name: "Dexter",
    config: {
      armCount: 3,
      primaryColor: new THREE.Color(0xff2a2a), // Bright Red
      frameColor: new THREE.Color(0x222222),
      cageSize: 2.2,
      glassRoughness: 0.3,
      glassTransmission: 0.8,
      coreType: "cylinder",
      ringCount: 0,
      armLength: 2.0,
      propSize: 1.2,
    },
    mass: 1.0,
    startPos: [6, -2, 0],
    startVel: [-10, 4, 0],
  },
  Trevor: {
    name: "Trevor",
    config: {
      armCount: 6,
      primaryColor: new THREE.Color(0xffbb00), // Bright Amber
      frameColor: new THREE.Color(0x444444),
      cageSize: 2.2,
      glassRoughness: 0.2,
      glassTransmission: 0.85,
      coreType: "box-wide",
      ringCount: 2,
      armLength: 2.0,
      propSize: 1.2,
    },
    mass: 1.0,
    startPos: [0, -4, 0],
    startVel: [2, 5, 0],
  },
};

// Zero-G Box Dimensions (Wide X, Z restricted for 2.5D)
const BOX_WIDTH = 50;
const BOX_HEIGHT = 22;
const BOX_DEPTH = 4.5; // unchanged — keeps the 2.5D depth feel

type DroneArenaProps = {
  /** Show the RED/BLUE score readout in the top corner. Default: true */
  showScoreboard?: boolean;
  /** Show the small "drag to throw" hint in the bottom-left. Default: true */
  showHint?: boolean;
  className?: string;
};

export default function DroneArena({
  showScoreboard = true,
  showHint = true,
  className = "",
}: DroneArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const scoreRedRef = useRef<HTMLSpanElement>(null);
  const scoreBlueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- Scene Setup ---
    // No scene.background and no fog: leaves the canvas fully transparent
    // (the renderer's alpha:true does the rest) so the page behind it shows
    // through instead of a solid panel.
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 54);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directLight.position.set(10, 20, 10);
    scene.add(directLight);

    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // --- Memory Management ---
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    function regGeo<T extends THREE.BufferGeometry>(g: T): T {
      geometries.push(g);
      return g;
    }
    function regMat<T extends THREE.Material>(m: T): T {
      materials.push(m);
      return m;
    }

    // --- Bounding Box Visualization ---
    const boxGeo = regGeo(new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH));
    const edges = regGeo(new THREE.EdgesGeometry(boxGeo));
    const boxMat = regMat(new THREE.LineBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.3 }));
    const boundingBoxLine = new THREE.LineSegments(edges, boxMat);
    masterGroup.add(boundingBoxLine);

    const gridHelperBottom = new THREE.GridHelper(BOX_WIDTH, 13, 0x4f46e5, 0x4f46e5);
    gridHelperBottom.position.y = -BOX_HEIGHT / 2;
    gridHelperBottom.scale.z = BOX_DEPTH / BOX_WIDTH;
    (gridHelperBottom.material as THREE.Material & { opacity: number; transparent: boolean }).opacity = 0.15;
    (gridHelperBottom.material as THREE.Material).transparent = true;
    masterGroup.add(gridHelperBottom);

    const gridHelperTop = new THREE.GridHelper(BOX_WIDTH, 13, 0x4f46e5, 0x4f46e5);
    gridHelperTop.position.y = BOX_HEIGHT / 2;
    gridHelperTop.scale.z = BOX_DEPTH / BOX_WIDTH;
    (gridHelperTop.material as THREE.Material & { opacity: number; transparent: boolean }).opacity = 0.05;
    (gridHelperTop.material as THREE.Material).transparent = true;
    masterGroup.add(gridHelperTop);

    // --- Drone Soccer Goals ---
    const GOAL_RADIUS = 3.5;
    const GOAL_THICKNESS = 0.4;

    const goalsData = [
      { name: "RED", pos: new THREE.Vector3(-15, 0, 0), color: 0xff3333, score: 0, mesh: null as THREE.Mesh | null, cooldown: 0 },
      { name: "BLUE", pos: new THREE.Vector3(15, 0, 0), color: 0x3388ff, score: 0, mesh: null as THREE.Mesh | null, cooldown: 0 },
    ];

    goalsData.forEach((g) => {
      const geo = regGeo(new THREE.TorusGeometry(GOAL_RADIUS, GOAL_THICKNESS, 16, 64));
      const mat = regMat(
        new THREE.MeshPhongMaterial({
          color: g.color,
          emissive: g.color,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.9,
        })
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = Math.PI / 2;
      mesh.position.copy(g.pos);
      masterGroup.add(mesh);
      g.mesh = mesh;

      const goalLight = new THREE.PointLight(g.color, 2, 10);
      mesh.add(goalLight);
    });

    // --- Collision Shockwave Effects Pool ---
    const collisionEffects: { mesh: THREE.Mesh; active: boolean; life: number; scaleFactor?: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const ringGeo = regGeo(new THREE.TorusGeometry(1, 0.05, 16, 32));
      const ringMat = regMat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      masterGroup.add(ring);
      collisionEffects.push({ mesh: ring, active: false, life: 0 });
    }

    function triggerCollisionEffect(position: THREE.Vector3, color: THREE.Color, scaleFactor = 3) {
      const effect = collisionEffects.find((e) => !e.active);
      if (effect) {
        effect.mesh.position.copy(position);
        (effect.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
        effect.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        effect.mesh.scale.set(1, 1, 1);
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        effect.active = true;
        effect.life = 1.0;
        effect.scaleFactor = scaleFactor;
      }
    }

    // --- Drone Factory Function ---
    function createDrone(config: (typeof DRONES)[keyof typeof DRONES]["config"], key: string) {
      const droneGroup = new THREE.Group();
      const propellers: THREE.Group[] = [];

      const frameMaterial = regMat(new THREE.MeshPhongMaterial({ color: config.frameColor, specular: 0x888888, shininess: 90 }));
      const primaryMaterial = regMat(
        new THREE.MeshPhongMaterial({
          color: config.primaryColor,
          emissive: config.primaryColor,
          emissiveIntensity: 0.8,
          shininess: 100,
        })
      );

      const internalLight = new THREE.PointLight(config.primaryColor, 5, 8);
      droneGroup.add(internalLight);

      let coreGeo: THREE.BufferGeometry;
      if (config.coreType === "box") coreGeo = regGeo(new THREE.BoxGeometry(0.8, 0.4, 0.8));
      else if (config.coreType === "cylinder") coreGeo = regGeo(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16));
      else if (config.coreType === "box-wide") coreGeo = regGeo(new THREE.BoxGeometry(1.4, 0.5, 1.4));
      else coreGeo = regGeo(new THREE.SphereGeometry(0.6, 16, 16));

      const core = new THREE.Mesh(coreGeo, frameMaterial);
      droneGroup.add(core);

      const coreDetailGeo = regGeo(new THREE.BoxGeometry(0.4, 0.1, 0.4));
      const coreDetail = new THREE.Mesh(coreDetailGeo, primaryMaterial);
      coreDetail.position.y = config.coreType === "box-wide" ? 0.3 : config.coreType === "sphere" ? 0.55 : 0.25;
      core.add(coreDetail);

      const armGeometry = regGeo(new THREE.CylinderGeometry(0.04, 0.04, config.armLength, 8));
      const motorGeo = regGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16));

      const propGroup = new THREE.Group();
      if (config.armCount === 3) {
        const bladeGeo = regGeo(new THREE.BoxGeometry(config.propSize / 2, 0.02, 0.06));
        for (let j = 0; j < 3; j++) {
          const blade = new THREE.Mesh(bladeGeo, primaryMaterial);
          blade.geometry = blade.geometry.clone();
          blade.geometry.translate(config.propSize / 4, 0, 0);
          blade.rotation.y = (j * Math.PI * 2) / 3;
          propGroup.add(blade);
        }
      } else {
        const propGeo = regGeo(new THREE.BoxGeometry(config.propSize, 0.02, 0.08));
        const prop = new THREE.Mesh(propGeo, primaryMaterial);
        propGroup.add(prop);
      }

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

        const instanceProp = propGroup.clone();
        instanceProp.position.y = 0.15;
        motorPos.add(instanceProp);
        propellers.push(instanceProp);
      }

      const cageGeo = regGeo(new THREE.IcosahedronGeometry(config.cageSize, 1));
      const glassMaterial = regMat(
        new THREE.MeshPhysicalMaterial({
          color: config.primaryColor,
          metalness: 0.05,
          roughness: config.glassRoughness,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          transmission: config.glassTransmission,
          opacity: 0.25,
          transparent: true,
          ior: 1.2,
          side: THREE.DoubleSide,
          thickness: 0.2,
          attenuationColor: config.primaryColor,
          attenuationDistance: 2.2,
        })
      );
      droneGroup.add(new THREE.Mesh(cageGeo, glassMaterial));

      const wireMaterial = regMat(new THREE.MeshBasicMaterial({ color: config.primaryColor, transparent: true, opacity: 0.3, wireframe: true }));
      const cageWire = new THREE.Mesh(cageGeo, wireMaterial);
      cageWire.scale.setScalar(1.001);
      droneGroup.add(cageWire);

      for (let i = 0; i < config.ringCount; i++) {
        const ringGeo = regGeo(new THREE.TorusGeometry(config.cageSize + i * 0.2, 0.015, 16, 100));
        const ring = new THREE.Mesh(ringGeo, primaryMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = i * 0.1 - 0.05;
        droneGroup.add(ring);
      }

      const hitboxGeo = regGeo(new THREE.SphereGeometry(config.cageSize, 16, 16));
      const hitboxMat = regMat(new THREE.MeshBasicMaterial({ visible: false }));
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitbox.userData = { isDroneHitbox: true, droneKey: key };
      droneGroup.add(hitbox);

      return { group: droneGroup, propellers, hitbox };
    }

    // --- Build The Drone System ---
    const droneSystem: Record<
      string,
      ReturnType<typeof createDrone> &
        (typeof DRONES)[keyof typeof DRONES] & { velocity: THREE.Vector3; isDragging: boolean; radius: number }
    > = {} as any;
    const hitboxes: THREE.Mesh[] = [];

    Object.entries(DRONES).forEach(([key, data]) => {
      const droneData = createDrone(data.config, key);
      droneData.group.position.set(...(data.startPos as [number, number, number]));
      masterGroup.add(droneData.group);

      droneSystem[key] = {
        ...droneData,
        ...data,
        velocity: new THREE.Vector3(...(data.startVel as [number, number, number])),
        isDragging: false,
        radius: data.config.cageSize,
      } as any;

      hitboxes.push(droneData.hitbox);
    });

    // --- Drag Interaction State ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let draggedDroneKey: string | null = null;
    const dragPlane = new THREE.Plane();
    const planeIntersect = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    const previousDragPosition = new THREE.Vector3();

    const onPointerDown = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(hitboxes);

      if (intersects.length > 0) {
        const hitInfo = intersects[0];
        draggedDroneKey = (hitInfo.object.userData as { droneKey: string }).droneKey;
        const drone = droneSystem[draggedDroneKey];

        drone.isDragging = true;
        drone.velocity.set(0, 0, 0);

        dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        raycaster.ray.intersectPlane(dragPlane, planeIntersect);
        dragOffset.copy(drone.group.position).sub(planeIntersect);
        previousDragPosition.copy(drone.group.position);

        container.style.cursor = "grabbing";
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (draggedDroneKey) {
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
          const drone = droneSystem[draggedDroneKey];
          previousDragPosition.copy(drone.group.position);

          drone.group.position.copy(planeIntersect.add(dragOffset));

          drone.group.position.clamp(
            new THREE.Vector3(-BOX_WIDTH / 2 + drone.radius, -BOX_HEIGHT / 2 + drone.radius, -BOX_DEPTH / 2 + drone.radius),
            new THREE.Vector3(BOX_WIDTH / 2 - drone.radius, BOX_HEIGHT / 2 - drone.radius, BOX_DEPTH / 2 - drone.radius)
          );
        }
      } else {
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(hitboxes);
        container.style.cursor = intersects.length > 0 ? "grab" : "default";
      }
    };

    const onPointerUp = () => {
      if (draggedDroneKey) {
        const drone = droneSystem[draggedDroneKey];
        drone.isDragging = false;

        const throwVelocity = new THREE.Vector3().subVectors(drone.group.position, previousDragPosition).multiplyScalar(45);
        if (throwVelocity.length() > 35) throwVelocity.normalize().multiplyScalar(35);
        drone.velocity.copy(throwVelocity);

        draggedDroneKey = null;
        container.style.cursor = "grab";
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const clock = new THREE.Clock();
    let time = 0;
    let currentWidth = width;
    let currentHeight = height;

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      time += delta;

      const droneKeys = Object.keys(droneSystem);

      goalsData.forEach((goal) => {
        if (goal.cooldown > 0) goal.cooldown -= delta;

        if (goal.mesh) {
          if (goal.cooldown > 0) {
            goal.mesh.scale.setScalar(1 + (goal.cooldown / 2) * 0.15);
            (goal.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.4 + (goal.cooldown / 2) * 2;
          } else {
            goal.mesh.scale.setScalar(1);
            (goal.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.4;
          }
        }

        droneKeys.forEach((key) => {
          const drone = droneSystem[key];

          const dx = drone.group.position.x - goal.pos.x;

          if (Math.abs(dx) < drone.radius + GOAL_THICKNESS) {
            const dy = drone.group.position.y - goal.pos.y;
            const dz = drone.group.position.z - goal.pos.z;
            const distYZ = Math.hypot(dy, dz);

            const tubeDist = Math.abs(distYZ - GOAL_RADIUS);

            if (tubeDist < drone.radius + GOAL_THICKNESS) {
              const angle = Math.atan2(dz, dy);
              const tubeCenterY = goal.pos.y + Math.cos(angle) * GOAL_RADIUS;
              const tubeCenterZ = goal.pos.z + Math.sin(angle) * GOAL_RADIUS;

              const normal = new THREE.Vector3(dx, drone.group.position.y - tubeCenterY, drone.group.position.z - tubeCenterZ).normalize();

              const overlap = drone.radius + GOAL_THICKNESS - tubeDist;
              if (!drone.isDragging) drone.group.position.add(normal.clone().multiplyScalar(overlap));

              const bounce = normal.clone().multiplyScalar(drone.velocity.dot(normal) * -1.5);
              if (!drone.isDragging) drone.velocity.add(bounce);
            }
          }

          if (goal.cooldown <= 0) {
            const distToCenter = drone.group.position.distanceTo(goal.pos);
            if (distToCenter < GOAL_RADIUS - drone.radius * 0.5) {
              goal.score += 1;
              goal.cooldown = 2.0;

              const scoreRef = goal.name === "RED" ? scoreRedRef : scoreBlueRef;
              if (scoreRef.current) {
                scoreRef.current.innerText = String(goal.score);
                scoreRef.current.classList.add("scale-150");
                setTimeout(() => scoreRef.current?.classList.remove("scale-150"), 300);
              }

              triggerCollisionEffect(goal.pos, new THREE.Color(goal.color), 8);
            }
          }
        });
      });

      droneKeys.forEach((key, index) => {
        const drone = droneSystem[key];
        drone.propellers.forEach((p) => (p.rotation.y += 0.5));

        if (drone.isDragging) {
          drone.group.rotation.x = THREE.MathUtils.lerp(drone.group.rotation.x, 0, 0.1);
          drone.group.rotation.z = THREE.MathUtils.lerp(drone.group.rotation.z, 0, 0.1);
          return;
        }

        drone.velocity.multiplyScalar(1 - 0.5 * delta);
        drone.velocity.y += Math.sin(time * 3 + index) * delta * 1.5;

        drone.group.position.addScaledVector(drone.velocity, delta);

        const targetPitch = drone.velocity.z * 0.08;
        const targetRoll = -drone.velocity.x * 0.08;
        const maxTilt = Math.PI / 3;
        drone.group.rotation.x = THREE.MathUtils.lerp(drone.group.rotation.x, Math.max(-maxTilt, Math.min(maxTilt, targetPitch)), 0.1);
        drone.group.rotation.z = THREE.MathUtils.lerp(drone.group.rotation.z, Math.max(-maxTilt, Math.min(maxTilt, targetRoll)), 0.1);

        const r = drone.radius;
        const bounceRestitution = -0.8;

        if (drone.group.position.x > BOX_WIDTH / 2 - r) {
          drone.group.position.x = BOX_WIDTH / 2 - r;
          drone.velocity.x *= bounceRestitution;
        } else if (drone.group.position.x < -BOX_WIDTH / 2 + r) {
          drone.group.position.x = -BOX_WIDTH / 2 + r;
          drone.velocity.x *= bounceRestitution;
        }

        if (drone.group.position.y > BOX_HEIGHT / 2 - r) {
          drone.group.position.y = BOX_HEIGHT / 2 - r;
          drone.velocity.y *= bounceRestitution;
        } else if (drone.group.position.y < -BOX_HEIGHT / 2 + r) {
          drone.group.position.y = -BOX_HEIGHT / 2 + r;
          drone.velocity.y *= bounceRestitution;
        }

        if (drone.group.position.z > BOX_DEPTH / 2 - r) {
          drone.group.position.z = BOX_DEPTH / 2 - r;
          drone.velocity.z *= bounceRestitution;
        } else if (drone.group.position.z < -BOX_DEPTH / 2 + r) {
          drone.group.position.z = -BOX_DEPTH / 2 + r;
          drone.velocity.z *= bounceRestitution;
        }
      });

      for (let i = 0; i < droneKeys.length; i++) {
        for (let j = i + 1; j < droneKeys.length; j++) {
          const d1 = droneSystem[droneKeys[i]];
          const d2 = droneSystem[droneKeys[j]];

          const distSq = d1.group.position.distanceToSquared(d2.group.position);
          const radSum = d1.radius + d2.radius;

          if (distSq < radSum * radSum) {
            const dist = Math.sqrt(distSq);
            const normal = new THREE.Vector3().subVectors(d2.group.position, d1.group.position).normalize();

            const overlap = radSum - dist;
            const totalMass = d1.mass + d2.mass;
            const m1Ratio = d2.mass / totalMass;
            const m2Ratio = d1.mass / totalMass;

            if (!d1.isDragging) d1.group.position.sub(normal.clone().multiplyScalar(overlap * m1Ratio));
            if (!d2.isDragging) d2.group.position.add(normal.clone().multiplyScalar(overlap * m2Ratio));

            const relVel = new THREE.Vector3().subVectors(d1.velocity, d2.velocity);
            const speed = relVel.dot(normal);

            if (speed > 0) {
              const restitution = 0.9;
              const impulse = ((2 * speed) / totalMass) * restitution;
              if (!d1.isDragging) d1.velocity.sub(normal.clone().multiplyScalar(impulse * d2.mass));
              if (!d2.isDragging) d2.velocity.add(normal.clone().multiplyScalar(impulse * d1.mass));
            }

            const midpoint = new THREE.Vector3().addVectors(d1.group.position, d2.group.position).multiplyScalar(0.5);
            const blendedColor = d1.config.primaryColor.clone().lerp(d2.config.primaryColor, 0.5);
            triggerCollisionEffect(midpoint, blendedColor, 3);
          }
        }
      }

      collisionEffects.forEach((effect) => {
        if (effect.active) {
          effect.life -= delta;
          if (effect.life <= 0) {
            effect.active = false;
            (effect.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
          } else {
            const progress = 1.0 - effect.life;
            effect.mesh.scale.setScalar(1 + progress * (effect.scaleFactor ?? 3));
            (effect.mesh.material as THREE.MeshBasicMaterial).opacity = effect.life;
          }
        }
      });

      droneKeys.forEach((key) => {
        const drone = droneSystem[key];
        const labelDiv = labelsRef.current[key];
        if (labelDiv) {
          const vector = new THREE.Vector3();
          drone.group.getWorldPosition(vector);
          vector.y += drone.config.cageSize * 0.8;

          vector.project(camera);
          if (vector.z > 1) {
            labelDiv.style.opacity = "0";
          } else {
            const x = (vector.x * 0.5 + 0.5) * currentWidth;
            const y = (vector.y * -0.5 + 0.5) * currentHeight;

            labelDiv.style.left = `${x}px`;
            labelDiv.style.top = `${y}px`;
            labelDiv.style.transform = "translate(-50%, -50%)";
            labelDiv.style.opacity = "1";
            labelDiv.style.border = drone.isDragging ? "1px solid #fff" : "1px solid rgba(255,255,255,0.2)";
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      currentWidth = w;
      currentHeight = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className={`relative h-full w-full overflow-hidden font-sans touch-none select-none ${className}`}>

      {showScoreboard && (
        <div className="absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-6 font-mono text-2xl font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          <span ref={scoreRedRef} className="text-red-500 transition-transform duration-100 ease-out">
            0
          </span>
          <span className="text-slate-600 text-base">-</span>
          <span ref={scoreBlueRef} className="text-blue-500 transition-transform duration-100 ease-out">
            0
          </span>
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0 z-10 outline-none" />

      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        {Object.keys(DRONES).map((key) => (
          <div
            key={key}
            ref={(el) => {
              labelsRef.current[key] = el;
            }}
            className="absolute rounded-full border border-white/20 bg-slate-900/90 px-3 py-1 text-[11px] font-mono font-bold tracking-widest text-white shadow-xl backdrop-blur-md transition-opacity duration-75"
            style={{ opacity: 0, willChange: "top, left" }}
          >
            {key.toUpperCase()}
          </div>
        ))}
      </div>

      {showHint && (
        <div className="pointer-events-none absolute bottom-3 left-4 z-30 text-[11px] text-slate-400">
          Drag a drone and let go to throw it
        </div>
      )}
    </div>
  );
}