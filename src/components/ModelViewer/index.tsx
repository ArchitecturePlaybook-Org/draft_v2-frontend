"use client";

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Environment, Html, useProgress } from '@react-three/drei';
import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react';
import GlbModel from './GlbModel';
import ObjModel from './ObjModel';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(1)} % loaded</Html>;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackUrl: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ModelViewer ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-slate-900 text-white rounded-xl border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl">
            📦
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">3D Model Display Restricted</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              Unable to stream 3D mesh directly inside browser canvas.
            </p>
          </div>
          <button
            onClick={() => window.open(this.props.fallbackUrl, "_blank")}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            ↗ Download / Open Model File
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface ModelViewerProps {
  url: string;
  format: 'glb' | 'gltf' | 'obj' | 'sh3d';
}

function getModelProxyUrl(url: string) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/v1/proxy-asset?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getModelFormat(url: string, formatProp?: string): 'glb' | 'gltf' | 'obj' | 'sh3d' {
  const cleanUrl = (url || "").split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".obj") || url.toLowerCase().includes(".obj")) return "obj";
  if (cleanUrl.endsWith(".sh3d") || url.toLowerCase().includes(".sh3d")) return "sh3d";
  if (formatProp) {
    const f = formatProp.toLowerCase();
    if (f === 'obj' || f === 'sh3d' || f === 'glb' || f === 'gltf') {
      return f as any;
    }
  }
  return "glb";
}

import dynamic from 'next/dynamic';

const BimViewer = dynamic(() => import('@/components/bim/BimViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950 text-white p-6 rounded-2xl">
      <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
      <p className="text-xs font-bold tracking-wide">Loading OpenBIM 3D Engine…</p>
    </div>
  ),
});

export default function ModelViewer({ url, format }: ModelViewerProps) {
  const actualFormat = getModelFormat(url, format);
  const isObj = actualFormat === 'obj';
  const isSh3d = actualFormat === 'sh3d';
  const modelUrl = getModelProxyUrl(url);

  if (isSh3d) {
    const resolvedModelUrl = resolveAssetFileUrl(modelUrl);

    return (
      <div className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
        <iframe 
          src={`/sh3d/SweetHome3DJSViewer.html?file=${encodeURIComponent(resolvedModelUrl)}`} 
          className="w-full h-full border-0" 
          title="Sweet Home 3D Viewer"
        />
        <div className="absolute bottom-4 right-4 flex justify-between text-xs text-slate-500 pointer-events-none">
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm uppercase font-semibold">
            {actualFormat}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ModelErrorBoundary fallbackUrl={url}>
      <BimViewer url={url} fileName={url.split("/").pop()} />
    </ModelErrorBoundary>
  );
}
