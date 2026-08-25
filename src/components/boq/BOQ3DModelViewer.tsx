
"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { BOQParameters } from "@/domains/boq/types";
import { Layers, Eye, RefreshCw, Box, Compass, Sparkles, Sliders } from "lucide-react";

interface Props {
  params: BOQParameters;
}

type DisplayMode = "full" | "structure" | "ghost";

// ─────────────────────────────────────────────────────────────────────────────
// Procedural Building 3D Mesh Group
// ─────────────────────────────────────────────────────────────────────────────
function ProceduralBuildingMesh({
  params,
  explode = 0,
  mode = "full",
}: {
  params: BOQParameters;
  explode: number;
  mode: DisplayMode;
}) {
  const {
    outer_length: length = 12,
    outer_width: width = 9,
    floor_height: floorHeight = 3.0,
    num_floors: numFloors = 2,
    outer_wall_thickness_mm: outerWallMm = 230,
    inner_wall_thickness_mm: innerWallMm = 115,
    plinth_height: plinthHeight = 0.6,
    excavation_depth: excavationDepth = 1.5,
  } = params;

  const wallThk = (outerWallMm || 230) / 1000;
  const innerWallThk = (innerWallMm || 115) / 1000;

  // Grid bay calculations (columns spaced <= 4m)
  const xBays = Math.max(2, Math.round(length / 4.0));
  const zBays = Math.max(2, Math.round(width / 4.0));
  const colSize = 0.35; // 350x350 mm RCC columns
  const beamSize = 0.25; // 250x350 mm beams
  const slabThk = 0.15; // 150 mm floor slab
  const parapetH = 1.0; // 1.0 m parapet
  const footingW = 1.4; // 1.4x1.4 m isolated footing
  const footingH = 0.45;
  const pccH = 0.1;

  // Materials based on display mode
  const materials = useMemo(() => {
    const isGhost = mode === "ghost";
    const isStruct = mode === "structure";

    return {
      concrete: new THREE.MeshStandardMaterial({
        color: isStruct ? "#38bdf8" : "#94a3b8",
        roughness: 0.5,
        metalness: 0.1,
        transparent: isGhost,
        opacity: isGhost ? 0.35 : 1,
        wireframe: false,
      }),
      footing: new THREE.MeshStandardMaterial({
        color: isStruct ? "#0284c7" : "#64748b",
        roughness: 0.7,
        transparent: isGhost,
        opacity: isGhost ? 0.4 : 1,
      }),
      pcc: new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        roughness: 0.9,
        transparent: isGhost,
        opacity: isGhost ? 0.25 : 0.85,
      }),
      brick: new THREE.MeshStandardMaterial({
        color: "#e07a5f",
        roughness: 0.75,
        transparent: isGhost,
        opacity: isGhost ? 0.2 : 0.95,
      }),
      innerBrick: new THREE.MeshStandardMaterial({
        color: "#f4a261",
        roughness: 0.8,
        transparent: isGhost,
        opacity: isGhost ? 0.2 : 0.9,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#38bdf8",
        transmission: 0.85,
        opacity: 0.5,
        transparent: true,
        roughness: 0.1,
        ior: 1.5,
      }),
      door: new THREE.MeshStandardMaterial({
        color: "#b45309",
        roughness: 0.4,
        transparent: isGhost,
        opacity: isGhost ? 0.3 : 1,
      }),
      stair: new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        roughness: 0.6,
        transparent: isGhost,
        opacity: isGhost ? 0.3 : 1,
      }),
    };
  }, [mode]);

  // Column grid coordinate array
  const columnCoords = useMemo(() => {
    const coords = [];
    const halfL = length / 2;
    const halfW = width / 2;
    for (let i = 0; i <= xBays; i++) {
      for (let j = 0; j <= zBays; j++) {
        const x = -halfL + i * (length / xBays);
        const z = -halfW + j * (width / zBays);
        coords.push({ x, z });
      }
    }
    return coords;
  }, [length, width, xBays, zBays]);

  // Explode vertical shift constants
  const foundationOffset = -explode * 1.8;
  const plinthOffset = 0;
  const getFloorOffset = (fIndex: number) => fIndex * explode * 2.2;
  const roofOffset = numFloors * explode * 2.2;

  const showWalls = mode !== "structure";

  return (
    <group position={[0, 0, 0]}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. SUBSTRUCTURE: PCC Beds, Footings & Column Pedestals */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <group position={[0, foundationOffset, 0]}>
        {columnCoords.map((col, idx) => (
          <group key={idx} position={[col.x, -excavationDepth, col.z]}>
            {/* PCC 1:4:8 Bed */}
            <mesh position={[0, pccH / 2, 0]} material={materials.pcc}>
              <boxGeometry args={[footingW + 0.2, pccH, footingW + 0.2]} />
            </mesh>

            {/* Trapezoidal / Stepped Isolated RCC Footing */}
            <mesh position={[0, pccH + footingH / 2, 0]} material={materials.footing}>
              <boxGeometry args={[footingW, footingH, footingW]} />
            </mesh>

            {/* Sub-grade Column Pedestal up to Ground Datum */}
            <mesh
              position={[0, pccH + footingH + (excavationDepth - pccH - footingH) / 2, 0]}
              material={materials.concrete}
            >
              <boxGeometry args={[colSize, excavationDepth - pccH - footingH, colSize]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. PLINTH LEVEL: Plinth Beam Ring & Earth Retaining Floor Slab */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <group position={[0, plinthOffset, 0]}>
        {/* Plinth Tie Beams along perimeter */}
        <mesh position={[0, plinthHeight - beamSize / 2, -width / 2 + wallThk / 2]} material={materials.concrete}>
          <boxGeometry args={[length, beamSize, wallThk]} />
        </mesh>
        <mesh position={[0, plinthHeight - beamSize / 2, width / 2 - wallThk / 2]} material={materials.concrete}>
          <boxGeometry args={[length, beamSize, wallThk]} />
        </mesh>
        <mesh position={[-length / 2 + wallThk / 2, plinthHeight - beamSize / 2, 0]} material={materials.concrete}>
          <boxGeometry args={[wallThk, beamSize, width - wallThk * 2]} />
        </mesh>
        <mesh position={[length / 2 - wallThk / 2, plinthHeight - beamSize / 2, 0]} material={materials.concrete}>
          <boxGeometry args={[wallThk, beamSize, width - wallThk * 2]} />
        </mesh>

        {/* Ground Floor Plinth Slab */}
        <mesh position={[0, plinthHeight - 0.05, 0]} material={materials.concrete}>
          <boxGeometry args={[length - wallThk, 0.1, width - wallThk]} />
        </mesh>
      </group>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. STOREYS: Columns, Walls, Openings, Slabs & Stairs per Floor */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {Array.from({ length: numFloors }).map((_, fIdx) => {
        const floorBaseY = plinthHeight + fIdx * floorHeight + getFloorOffset(fIdx);
        const halfL = length / 2;
        const halfW = width / 2;

        return (
          <group key={fIdx} position={[0, floorBaseY, 0]}>
            {/* Columns for this floor */}
            {columnCoords.map((col, cIdx) => (
              <mesh
                key={cIdx}
                position={[col.x, floorHeight / 2, col.z]}
                material={materials.concrete}
              >
                <boxGeometry args={[colSize, floorHeight, colSize]} />
              </mesh>
            ))}

            {/* Floor Perimeter Beams at ceiling */}
            <mesh position={[0, floorHeight - beamSize / 2, -halfW + wallThk / 2]} material={materials.concrete}>
              <boxGeometry args={[length, beamSize, wallThk]} />
            </mesh>
            <mesh position={[0, floorHeight - beamSize / 2, halfW - wallThk / 2]} material={materials.concrete}>
              <boxGeometry args={[length, beamSize, wallThk]} />
            </mesh>
            <mesh position={[-halfL + wallThk / 2, floorHeight - beamSize / 2, 0]} material={materials.concrete}>
              <boxGeometry args={[wallThk, beamSize, width - wallThk * 2]} />
            </mesh>
            <mesh position={[halfL - wallThk / 2, floorHeight - beamSize / 2, 0]} material={materials.concrete}>
              <boxGeometry args={[wallThk, beamSize, width - wallThk * 2]} />
            </mesh>

            {/* RCC Suspended Ceiling / Floor Slab */}
            <mesh position={[0, floorHeight + slabThk / 2, 0]} material={materials.concrete}>
              <boxGeometry args={[length + 0.2, slabThk, width + 0.2]} />
            </mesh>

            {/* ── Architectural Masonry Walls (when showWalls is true) ── */}
            {showWalls && (
              <group>
                {/* Back Wall */}
                <mesh position={[0, (floorHeight - beamSize) / 2, -halfW + wallThk / 2]} material={materials.brick}>
                  <boxGeometry args={[length - wallThk * 2, floorHeight - beamSize, wallThk]} />
                </mesh>

                {/* Left Wall */}
                <mesh position={[-halfL + wallThk / 2, (floorHeight - beamSize) / 2, 0]} material={materials.brick}>
                  <boxGeometry args={[wallThk, floorHeight - beamSize, width - wallThk * 2]} />
                </mesh>

                {/* Right Wall (with window cutout) */}
                <mesh position={[halfL - wallThk / 2, (floorHeight - beamSize) * 0.25, 0]} material={materials.brick}>
                  <boxGeometry args={[wallThk, (floorHeight - beamSize) * 0.5, width - wallThk * 2]} />
                </mesh>
                {/* Glass window pane on right wall */}
                <mesh position={[halfL - wallThk / 2, (floorHeight - beamSize) * 0.65, 0]} material={materials.glass}>
                  <boxGeometry args={[wallThk * 0.4, (floorHeight - beamSize) * 0.4, width * 0.35]} />
                </mesh>

                {/* Front Wall (Divided for Door & Front Window) */}
                <mesh position={[-halfL * 0.5, (floorHeight - beamSize) / 2, halfW - wallThk / 2]} material={materials.brick}>
                  <boxGeometry args={[length * 0.45, floorHeight - beamSize, wallThk]} />
                </mesh>
                <mesh position={[halfL * 0.55, (floorHeight - beamSize) * 0.2, halfW - wallThk / 2]} material={materials.brick}>
                  <boxGeometry args={[length * 0.35, (floorHeight - beamSize) * 0.4, wallThk]} />
                </mesh>
                {/* Front Window Glass */}
                <mesh position={[halfL * 0.55, (floorHeight - beamSize) * 0.65, halfW - wallThk / 2]} material={materials.glass}>
                  <boxGeometry args={[length * 0.35, (floorHeight - beamSize) * 0.4, wallThk * 0.4]} />
                </mesh>
                {/* Main Door / French Door */}
                <mesh position={[0, (floorHeight - beamSize) * 0.4, halfW - wallThk / 2]} material={materials.door}>
                  <boxGeometry args={[1.1, (floorHeight - beamSize) * 0.8, wallThk * 0.8]} />
                </mesh>

                {/* ── Internal Partition Wall (115 mm) ── */}
                <mesh position={[0, (floorHeight - beamSize) / 2, -halfW * 0.1]} material={materials.innerBrick}>
                  <boxGeometry args={[innerWallThk, floorHeight - beamSize, width * 0.55]} />
                </mesh>
              </group>
            )}

            {/* ── 3D Dog-Leg Staircase Flight ── */}
            <group position={[halfL * 0.55, 0, -halfW * 0.35]}>
              {Array.from({ length: 10 }).map((_, stepIdx) => {
                const stepH = floorHeight / 10;
                const stepD = 0.28;
                return (
                  <mesh
                    key={stepIdx}
                    position={[0, stepIdx * stepH + stepH / 2, stepIdx * stepD]}
                    material={materials.stair}
                  >
                    <boxGeometry args={[1.0, stepH, stepD]} />
                  </mesh>
                );
              })}
            </group>
          </group>
        );
      })}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. ROOF & PARAPET WALL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showWalls && (
        <group position={[0, plinthHeight + numFloors * floorHeight + roofOffset, 0]}>
          {/* Parapet along front & back */}
          <mesh position={[0, parapetH / 2, -width / 2 + wallThk / 2]} material={materials.brick}>
            <boxGeometry args={[length + 0.2, parapetH, wallThk]} />
          </mesh>
          <mesh position={[0, parapetH / 2, width / 2 - wallThk / 2]} material={materials.brick}>
            <boxGeometry args={[length + 0.2, parapetH, wallThk]} />
          </mesh>
          {/* Parapet along left & right */}
          <mesh position={[-length / 2 + wallThk / 2, parapetH / 2, 0]} material={materials.brick}>
            <boxGeometry args={[wallThk, parapetH, width - wallThk * 2]} />
          </mesh>
          <mesh position={[length / 2 - wallThk / 2, parapetH / 2, 0]} material={materials.brick}>
            <boxGeometry args={[wallThk, parapetH, width - wallThk * 2]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera Control Helper Component
// ─────────────────────────────────────────────────────────────────────────────
function CameraPresetController({ preset }: { preset: string }) {
  const { camera } = useThree();

  React.useEffect(() => {
    if (preset === "iso") {
      camera.position.set(18, 14, 18);
      camera.lookAt(0, 2, 0);
    } else if (preset === "top") {
      camera.position.set(0, 28, 0.1);
      camera.lookAt(0, 0, 0);
    } else if (preset === "front") {
      camera.position.set(0, 4, 24);
      camera.lookAt(0, 3, 0);
    } else if (preset === "side") {
      camera.position.set(24, 4, 0);
      camera.lookAt(0, 3, 0);
    }
  }, [preset, camera]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export Component: BOQ3DModelViewer
// ─────────────────────────────────────────────────────────────────────────────
export default function BOQ3DModelViewer({ params }: Props) {
  const [explode, setExplode] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [cameraPreset, setCameraPreset] = useState<string>("iso");
  const [isRotating, setIsRotating] = useState<boolean>(true);

  return (
    <div className="w-full bg-surface-card border border-surface-300 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* ── Top Bar Controls ── */}
      <div className="p-3 bg-surface-100/90 backdrop-blur-md border-b border-surface-300 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-accent/15 text-accent flex items-center justify-center text-xs font-black">
            🏛️
          </span>
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>3D Axonometric BIM Model</span>
              <span className="px-1.5 py-0.2 rounded bg-accent/15 text-accent border border-accent/25 text-[8.5px] font-black">
                WebGL 3D
              </span>
            </h3>
          </div>
        </div>

        {/* Display Mode Switcher */}
        <div className="flex items-center gap-1 bg-surface-200/60 p-0.5 rounded-lg border border-surface-300">
          <button
            type="button"
            onClick={() => setDisplayMode("full")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${displayMode === "full"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            Full Model
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("structure")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${displayMode === "structure"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            Structure Only
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("ghost")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${displayMode === "ghost"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            X-Ray Ghost
          </button>
        </div>
      </div>

      {/* ── Camera Angles & Explode Controls Toolbar ── */}
      <div className="px-3.5 py-2 bg-surface-50 border-b border-surface-200 flex items-center justify-between text-[10px] text-surface-600 font-bold flex-wrap gap-3">
        {/* Camera Preset Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-surface-400">Camera:</span>
          {(["iso", "top", "front", "side"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCameraPreset(preset)}
              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border cursor-pointer transition-all ${cameraPreset === preset
                  ? "bg-surface-200 border-accent text-accent"
                  : "bg-surface-100 border-surface-300 text-surface-600 hover:text-foreground"
                }`}
            >
              {preset === "iso" ? "Isometric" : preset === "top" ? "Top CAD" : preset === "front" ? "Front" : "Side"}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${isRotating
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : "bg-surface-100 text-surface-500 border-surface-300"
              }`}
            title="Toggle Auto-Rotation"
          >
            {isRotating ? "Auto-Rotate ON" : "Auto-Rotate OFF"}
          </button>
        </div>

        {/* Exploded View Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-accent flex items-center gap-1">
            <Sliders className="w-3 h-3" />
            <span>Explode Storeys:</span>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={explode}
            onChange={(e) => setExplode(parseFloat(e.target.value))}
            className="w-24 accent-accent cursor-pointer h-1.5 bg-surface-200 rounded-lg"
          />
          <span className="font-mono text-[9px] text-foreground w-7 text-right">
            {(explode * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* ── WebGL 3D Canvas ── */}
      <div className="w-full h-[360px] bg-slate-950 relative overflow-hidden">
        <Canvas
          shadows
          camera={{ position: [18, 14, 18], fov: 42 }}
          style={{ width: "100%", height: "100%" }}
        >
          <CameraPresetController preset={cameraPreset} />

          {/* Studio Lighting */}
          <ambientLight intensity={0.75} />
          <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
          <directionalLight position={[-15, 20, -15]} intensity={0.5} />
          <pointLight position={[0, 10, 0]} intensity={0.4} />

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            autoRotate={isRotating}
            autoRotateSpeed={0.8}
            maxPolarAngle={Math.PI / 2 + 0.05} // Don't flip below ground
            minDistance={6}
            maxDistance={50}
          />

          <Center>
            <ProceduralBuildingMesh params={params} explode={explode} mode={displayMode} />
          </Center>

          {/* Subdued Ground Grid */}
          <Grid
            position={[0, -((params.excavation_depth || 1.5) + 0.1), 0]}
            args={[40, 40]}
            cellColor="#334155"
            sectionColor="#475569"
            fadeDistance={30}
            fadeStrength={1.5}
          />
        </Canvas>

        {/* Quick Instructions Overlay */}
        <div className="absolute bottom-2.5 left-3 text-[9px] font-bold text-slate-400 pointer-events-none bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800 backdrop-blur-xs flex items-center gap-2">
          <span>🖱️ Left Click: Orbit</span>
          <span>·</span>
          <span>Right Click: Pan</span>
          <span>·</span>
          <span>Scroll: Zoom</span>
        </div>
      </div>
    </div>
  );
}
