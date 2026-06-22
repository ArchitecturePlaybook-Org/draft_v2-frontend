"use client";

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Environment, Html, useProgress } from '@react-three/drei';
import { Suspense } from 'react';
import GlbModel from './GlbModel';
import ObjModel from './ObjModel';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(1)} % loaded</Html>;
}

export interface ModelViewerProps {
  url: string;
  format: 'glb' | 'gltf' | 'obj' | 'sh3d';
}

export default function ModelViewer({ url, format }: ModelViewerProps) {
  const isGlb = format === 'glb' || format === 'gltf';
  const isSh3d = format === 'sh3d';

  if (isSh3d) {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
        <iframe 
          src={`/sh3d/SweetHome3DJSViewer.html?file=${encodeURIComponent(url)}`} 
          className="w-full h-full border-0" 
          title="Sweet Home 3D Viewer"
        />
        <div className="absolute bottom-4 right-4 flex justify-between text-xs text-slate-500 pointer-events-none">
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm uppercase font-semibold">
            {format}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={<Loader />}>
          {/* Added strong lighting to brighten the models */}
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 10, 10]} intensity={2} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={1} />
          <directionalLight position={[0, -10, 0]} intensity={0.5} />
          <Stage environment={null} intensity={1}>
            {isGlb ? (
              <GlbModel url={url} />
            ) : (
              <ObjModel url={url} />
            )}
          </Stage>
        </Suspense>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={1.5} />
      </Canvas>
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-slate-500 pointer-events-none">
        <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
          Drag to rotate, scroll to zoom
        </div>
        <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm uppercase font-semibold">
          {format}
        </div>
      </div>
    </div>
  );
}
