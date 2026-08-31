"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTurnkeyStore } from "@/store/turnkey-store";
import { useEstimationStore } from "@/store/estimation-store";
import { TakeoffCanvas } from "@/components/estimation/TakeoffCanvas";
import { 
  Upload, 
  FileText, 
  Ruler, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Layers,
  Image as ImageIcon 
} from "lucide-react";

// ─── High-Res Architectural Demo Floor Plans ──────────────────────────────────
const DEMO_PLANS = [
  {
    id: "villa-2bhk",
    name: "Modern 2BHK Villa (1,350 sq.ft)",
    desc: "Independent G+1 villa with living, dining, master suite, kitchen & terrace",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
    dim: "12m × 9m",
    presetScale: 0.0125, // ~80 px/meter
  },
  {
    id: "apartment-3bhk",
    name: "Luxury 3BHK Apartment (1,850 sq.ft)",
    desc: "Spacious multi-family flat with 3 baths, modular kitchen & 2 balconies",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80",
    dim: "16m × 11m",
    presetScale: 0.0095,
  },
  {
    id: "compact-residence",
    name: "Compact Urban Residence (950 sq.ft)",
    desc: "Single-storey budget home optimized for 30×40 ft plot layout",
    url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1400&q=80",
    dim: "10m × 8m",
    presetScale: 0.014,
  },
];

export function Stage1CalibrationView() {
  const { 
    imageUrl, 
    setImageUrl, 
    setCalibration, 
    calibrationDone, 
    pixelToMeterScale,
    calibrationUnit,
    goNext 
  } = useTurnkeyStore();

  const { 
    pixelToMeterScale: estScale, 
    displayScaleUnit: estUnit, 
    setActiveTool,
    setCalibrationScale 
  } = useEstimationStore();

  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-activate calibration tool when canvas mounts
  useEffect(() => {
    if (imageUrl) {
      setActiveTool("calibrate");
    }
  }, [imageUrl, setActiveTool]);

  // Sync estimation-store calibration into turnkey-store when calibrated
  useEffect(() => {
    if (estScale && estScale > 0 && estScale !== 1 && imageUrl) {
      setCalibration(estScale, estUnit || "m", imageUrl);
    }
  }, [estScale, estUnit, imageUrl, setCalibration]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setImageUrl(url);
      setSelectedDemo(null);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Quick preset calibration for demo plans
  const handleQuickCalibrateDemo = (demo: typeof DEMO_PLANS[0]) => {
    setImageUrl(demo.url);
    setSelectedDemo(demo.id);
    setCalibrationScale(demo.presetScale, "m");
    setCalibration(demo.presetScale, "m", demo.url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-50/50 dark:bg-surface-900/30 overflow-hidden relative">
      {!imageUrl ? (
        // ── Empty State: Pick or Upload Floor Plan ──────────────────────────
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-3xl w-full space-y-6">
            
            {/* Header Banner */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-black tracking-wider uppercase">
                <Sparkles size={13} /> Step 1: Upload Architectural Plan
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Load Your Floor Plan Drawing
              </h1>
              <p className="text-sm text-surface-500 max-w-lg mx-auto">
                Upload your AutoCAD export, scanned 2D plan, or select a pre-loaded architectural sample to generate a fully turnkey estimate.
              </p>
            </div>

            {/* Upload Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-surface-300 dark:border-white/20 hover:border-accent dark:hover:border-accent bg-surface-card rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-lg"
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <h3 className="text-base font-black text-foreground mb-1">
                Click to upload floor plan image
              </h3>
              <p className="text-xs text-surface-400 max-w-sm mx-auto">
                Supports PNG, JPG, WebP, or SVG drawings. High-resolution drawings recommended.
              </p>
            </div>

            {/* Architectural Sample Plans */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px bg-surface-200 dark:bg-white/10 flex-1"></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-surface-400">
                  Or test with sample plans
                </span>
                <div className="h-px bg-surface-200 dark:bg-white/10 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEMO_PLANS.map((demo) => (
                  <div
                    key={demo.id}
                    onClick={() => handleQuickCalibrateDemo(demo)}
                    className="p-4 rounded-2xl bg-surface-card border border-surface-200 dark:border-white/10 hover:border-accent hover:shadow-md cursor-pointer transition-all flex flex-col justify-between text-left group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">🏡</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                          {demo.dim}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-foreground group-hover:text-accent transition-colors mb-1">
                        {demo.name}
                      </h4>
                      <p className="text-[11px] text-surface-400 line-clamp-2 leading-relaxed">
                        {demo.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-surface-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-accent">
                      <span>Use this plan</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        // ── Active Canvas: Calibrate Scale ───────────────────────────────────
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* Top Instruction Banner */}
          <div className="px-4 py-2 bg-accent/10 border-b border-accent/20 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-accent text-background flex items-center justify-center font-black text-xs shrink-0">
                1
              </div>
              <p className="text-xs font-semibold text-foreground">
                <span className="font-black text-accent">Calibration Mode:</span> Click two points along any known dimension (e.g. wall length or door opening), then enter the distance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setImageUrl("")}
                className="px-2.5 py-1 text-xs font-bold text-surface-500 hover:text-foreground hover:bg-surface-200/50 dark:hover:bg-surface-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Change Image
              </button>

              {calibrationDone && (
                <button
                  onClick={goNext}
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer animate-pulse hover:animate-none"
                >
                  <span>Scale Locked ({pixelToMeterScale.toFixed(4)} m/px)</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-1 relative min-h-0">
            <TakeoffCanvas 
              imageUrl={imageUrl} 
              allowedTools={['select', 'calibrate']}
              hideMaterials={true}
              hideThickness={true}
            />
          </div>

          {/* Bottom Floating Scale Status Card */}
          {calibrationDone && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-surface-card/95 dark:bg-surface-900/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl rounded-2xl p-3 px-5 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  Drawing Scale Calibrated
                </h4>
                <p className="text-[11px] text-surface-400 font-mono">
                  1 pixel = {(pixelToMeterScale).toFixed(4)} {calibrationUnit} (Exact physical conversion active)
                </p>
              </div>
              <button
                onClick={goNext}
                className="ml-2 px-4 py-2 bg-accent text-background font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-accent/25 hover:scale-105 transition-all cursor-pointer shrink-0"
              >
                <span>Proceed to Step 2</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
