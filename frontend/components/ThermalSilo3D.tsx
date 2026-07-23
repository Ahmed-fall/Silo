"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Text, Bounds, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ThermalZone } from "./ThermalSiloMap";

// Blender-authored model (see .agents/CLAUDE.md for the authoring contract).
// Structure (verified against the delivered file, not assumed):
//   zone_top / zone_upper / zone_lower / zone_bottom — 4 separate mesh
//     objects, each with its own material (mat_zone_*), Y-stacked in exact
//     24/26/26/24% proportions, node transforms are identity (geometry
//     vertices ARE world-space coordinates, no offset to account for).
//   anchor_top/upper/lower/bottom — exist but carry NO transform at all, so
//     all 4 collapse to world origin. Unusable for label placement as-is;
//     labels are positioned from each zone mesh's own bounding box instead.
//   silo_scan_ring_* (5, at zone boundaries) — static glowing boundary
//     rings already authored into the model (mat_scan_border, cyan
//     emissive). Left as-is; a separate animated sweep ring is layered on
//     top for the moving "live scan" effect.
//   Zone/roof/hopper materials are semi-transparent "glass tank" style
//     (alpha ~0.12) by design — recoloring keeps some transparency rather
//     than going fully opaque, to preserve that look.
const MODEL_PATH = "/models/silo_model.glb";
useGLTF.preload(MODEL_PATH);

const ZONE_KEYS = ["top", "upper", "lower", "bottom"] as const;

// Mirrors ThermalSiloMap's tempTheme() thresholds exactly.
function zoneHex(t: number): string {
  if (t <= 23) return "#2563eb"; // Safe
  if (t <= 27) return "#0d9488"; // Normal
  if (t <= 32) return "#b45309"; // Caution
  return "#be123c";              // Critical
}

interface Layout {
  radius: number;
  zoneMidY: Record<string, number>;
}

function SiloModel({ zones }: { zones: ThermalZone[] }) {
  const gltf = useGLTF(MODEL_PATH);
  const clonedRef = useRef<Set<string>>(new Set());
  const sweepRef = useRef<THREE.Mesh>(null);

  // Derive ground level, radius, and each zone's vertical center directly
  // from the loaded geometry — not hardcoded, so a future model swap (a
  // revised Blender export) doesn't silently break placement math.
  const layout: Layout = useMemo(() => {
    const zoneMidY: Record<string, number> = {};
    let radius = 1;
    for (const key of ZONE_KEYS) {
      const mesh = gltf.nodes[`zone_${key}`] as THREE.Mesh | undefined;
      if (!mesh?.geometry) continue;
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      zoneMidY[key] = (bb.min.y + bb.max.y) / 2;
      radius = Math.max(radius, bb.max.x, -bb.min.x, bb.max.z, -bb.min.z);
    }
    return { radius, zoneMidY };
  }, [gltf]);

  // Clone each zone's material once (defensive — even though Blender
  // exported one material per zone already, this guarantees recoloring one
  // zone can never bleed into another regardless of how the asset changes).
  useEffect(() => {
    for (const key of ZONE_KEYS) {
      if (clonedRef.current.has(key)) continue;
      const mesh = gltf.nodes[`zone_${key}`] as THREE.Mesh | undefined;
      if (!mesh || Array.isArray(mesh.material)) continue;
      mesh.material = mesh.material.clone();
      clonedRef.current.add(key);
    }
  }, [gltf]);

  // Recolor per zone whenever live temperatures change.
  useEffect(() => {
    for (const zone of zones) {
      const key = zone.label.toLowerCase();
      const mesh = gltf.nodes[`zone_${key}`] as THREE.Mesh | undefined;
      if (!mesh || Array.isArray(mesh.material)) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const hex = zoneHex(zone.temp);
      mat.color.set(hex);
      mat.emissive.set(hex);
      mat.emissiveIntensity = 0.85;
      mat.opacity = 0.55; // keep the model's glass-tank look, just less faint than the authored 0.12
      mat.transparent = true;
      mat.needsUpdate = true;
    }
  }, [gltf, zones]);

  // Animated sweep — layered on top of the model's own static boundary
  // rings, for a "live scan" motion cue (continuity with the procedural
  // version's ScannerSweep).
  const span = useMemo(() => {
    const ys = Object.values(layout.zoneMidY);
    if (ys.length === 0) return { min: 0, max: 1 };
    const mesh0 = gltf.nodes["zone_bottom"] as THREE.Mesh | undefined;
    const meshN = gltf.nodes["zone_top"] as THREE.Mesh | undefined;
    mesh0?.geometry?.computeBoundingBox();
    meshN?.geometry?.computeBoundingBox();
    return {
      min: mesh0?.geometry.boundingBox?.min.y ?? Math.min(...ys),
      max: meshN?.geometry.boundingBox?.max.y ?? Math.max(...ys),
    };
  }, [gltf, layout]);

  useFrame(({ clock }) => {
    if (!sweepRef.current) return;
    const t = (Math.sin(clock.elapsedTime * 0.6) + 1) / 2;
    sweepRef.current.position.y = span.min + t * (span.max - span.min);
  });

  return (
    <group>
      <primitive object={gltf.scene} />

      {zones.map((zone) => {
        const key = zone.label.toLowerCase();
        const midY = layout.zoneMidY[key];
        if (midY === undefined) return null;
        const hex = zoneHex(zone.temp);
        return (
          <group key={zone.label} position={[layout.radius + 0.6, midY, 0]}>
            <Text fontSize={0.32} color={hex} anchorX="left" anchorY="middle">
              {`${zone.temp}°C`}
            </Text>
            <Text position={[0, -0.4, 0]} fontSize={0.2} color="#8a7a63" anchorX="left" anchorY="middle">
              {zone.label.toUpperCase()}
            </Text>
          </group>
        );
      })}

      <mesh ref={sweepRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[layout.radius * 0.2, layout.radius + 0.08, 48]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Ground level (~0) and radius (~2.225) measured directly from the delivered
// model. Kept as a sibling of <Bounds>, not nested inside it — a shadow
// catcher plane inside Bounds' subtree would get included in its
// auto-framing box-fit and throw off the camera distance.
const GROUND_Y = 0;
const GROUND_SCALE = 14;

export default function ThermalSilo3D({ zones }: { zones: ThermalZone[] }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [9, 5, 10], fov: 36 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 9, 6]} intensity={1.2} castShadow />
      <directionalLight position={[-6, 2, -5]} intensity={0.3} color="#a5c9ff" />
      <pointLight position={[0, 1, 6]} intensity={0.3} color="#40E0D0" />

      <Bounds fit clip observe margin={1.35}>
        <SiloModel zones={zones} />
      </Bounds>

      <ContactShadows position={[0, GROUND_Y, 0]} opacity={0.3} blur={2.6} scale={GROUND_SCALE} far={4} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.15}
        autoRotate
        autoRotateSpeed={1.0}
      />
    </Canvas>
  );
}
