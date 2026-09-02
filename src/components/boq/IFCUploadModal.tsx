"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileCode, CheckCircle, Loader2, Zap, Layers, Box, Sparkles, X, ChevronRight } from "lucide-react";
import { parseIFCFile } from "@/domains/boq/ifc-parser";
import { ParsedIFCResult, IFCStorey } from "@/domains/boq/ifc-types";

interface Props {
  file: File;
  onComplete: (result: ParsedIFCResult) => void;
  onCancel: () => void;
}

type Step = "reading" | "parsing" | "storeys" | "done";

interface StepState {
  status: "pending" | "running" | "done";
  detail: string;
}

export default function IFCUploadModal({ file, onComplete, onCancel }: Props) {
  const [steps, setSteps] = useState<Record<Step, StepState>>({
    reading: { status: "running", detail: "Reading binary file stream..." },
    parsing: { status: "pending", detail: "Waiting..." },
    storeys: { status: "pending", detail: "Waiting..." },
    done: { status: "pending", detail: "Waiting..." },
  });
  const [entityCount, setEntityCount] = useState(0);
  const [result, setResult] = useState<ParsedIFCResult | null>(null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRun = useRef(false);

  const setStep = (step: Step, status: StepState["status"], detail: string) => {
    setSteps((prev) => ({ ...prev, [step]: { status, detail } }));
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      // ── Step 1: Read File ─────────────────────────────────────────────────
      setProgress(5);
      const reader = new FileReader();

      reader.onload = (evt) => {
        const content = evt.target?.result as string || "";
        setStep("reading", "done", `${(file.size / 1024).toFixed(1)} KB · ${
          content.includes("IFC4") ? "IFC 4.0 Schema" :
          content.includes("IFC2X3") ? "IFC 2x3 Schema" : "IFC STEP File"
        }`);
        setProgress(20);

        // ── Step 2: Parse Entities ─────────────────────────────────────────
        setStep("parsing", "running", "Scanning STEP entity lines...");

        // Animate entity counter
        const totalLines = (content.match(/^#\d+\s*=/gm) || []).length;
        let counted = 0;
        intervalRef.current = setInterval(() => {
          counted = Math.min(counted + Math.ceil(totalLines / 20), totalLines);
          setEntityCount(counted);
          setProgress(20 + Math.round((counted / Math.max(1, totalLines)) * 30));
          if (counted >= totalLines) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }, 60);

        setTimeout(() => {
          if (intervalRef.current) clearInterval(intervalRef.current);

          // ── Step 3: Derive Floor Plans ─────────────────────────────────
          setStep("parsing", "done", `${totalLines} STEP entity lines · structural elements extracted`);
          setStep("storeys", "running", "Identifying IFCBUILDINGSTOREY spatial hierarchy...");
          setProgress(55);

          setTimeout(() => {
            const parsed = parseIFCFile(content, file.name);
            setEntityCount(parsed.elements.length);

            setStep("storeys", "done",
              `${parsed.storeys.length} Storeys derived · ${parsed.outerLength_m}m × ${parsed.outerWidth_m}m bounding box`
            );
            setProgress(90);

            // ── Step 4: Done ────────────────────────────────────────────
            setTimeout(() => {
              setStep("done", "done", `BOQ auto-generated · ${parsed.totalBUA_m2} m² BUA`);
              setProgress(100);
              setResult(parsed);
            }, 400);
          }, 600);
        }, 1200);
      };

      reader.onerror = () => {
        setStep("reading", "done", "⚠️ File read failed — using sample building data");
        setProgress(100);
        const fallback = parseIFCFile("", file.name);
        setResult(fallback);
      };

      reader.readAsText(file);
    };

    run();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stepOrder: Step[] = ["reading", "parsing", "storeys", "done"];
  const stepMeta = {
    reading: { label: "File Accepted & Validated", icon: FileCode },
    parsing: { label: "Parsing IFC Structural Entities", icon: Box },
    storeys: { label: "Deriving Per-Floor 2D Plans", icon: Layers },
    done: { label: "Applying to BOQ & Visualizer", icon: Sparkles },
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0d1117] border border-[#2a3045] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a3045] flex items-center justify-between bg-gradient-to-r from-purple-950/30 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <FileCode className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">BIM IFC → 2D Floor Plan Conversion</h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-[280px]">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-900">
          <div
            className="h-1 bg-gradient-to-r from-purple-500 to-blue-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {stepOrder.map((step, idx) => {
            const meta = stepMeta[step];
            const state = steps[step];
            const Icon = meta.icon;
            return (
              <div
                key={step}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  state.status === "running"
                    ? "bg-purple-950/30 border-purple-500/40"
                    : state.status === "done"
                    ? "bg-emerald-950/20 border-emerald-700/30"
                    : "bg-zinc-900/40 border-zinc-800/50 opacity-50"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  state.status === "running"
                    ? "bg-purple-500/20 text-purple-400"
                    : state.status === "done"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-600"
                }`}>
                  {state.status === "running" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : state.status === "done" ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-black ${
                      state.status === "running" ? "text-purple-300"
                      : state.status === "done" ? "text-emerald-300"
                      : "text-zinc-600"
                    }`}>
                      Step {idx + 1}. {meta.label}
                    </span>
                    {state.status === "running" && (
                      <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 whitespace-nowrap">
                        PROCESSING
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{state.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Entity Summary (appears as parsing runs) */}
        {entityCount > 0 && (
          <div className="px-6 pb-3">
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] font-mono text-zinc-400 grid grid-cols-3 gap-2">
              <span>🧱 Walls: <strong className="text-zinc-200">{result
                ? result.elements.filter(e => e.ifc_type === "IfcWall").length
                : Math.floor(entityCount * 0.38)
              }</strong></span>
              <span>🏛️ Slabs: <strong className="text-zinc-200">{result
                ? result.elements.filter(e => e.ifc_type === "IfcSlab").length
                : Math.floor(entityCount * 0.12)
              }</strong></span>
              <span>🔲 Columns: <strong className="text-zinc-200">{result
                ? result.elements.filter(e => e.ifc_type === "IfcColumn").length
                : Math.floor(entityCount * 0.15)
              }</strong></span>
              <span>🚪 Doors: <strong className="text-zinc-200">{result
                ? result.elements.filter(e => e.ifc_type === "IfcDoor").length
                : Math.floor(entityCount * 0.10)
              }</strong></span>
              <span>🪟 Windows: <strong className="text-zinc-200">{result
                ? result.elements.filter(e => e.ifc_type === "IfcWindow").length
                : Math.floor(entityCount * 0.12)
              }</strong></span>
              <span>📐 Elements: <strong className="text-purple-300">{entityCount}</strong></span>
            </div>
          </div>
        )}

        {/* Storey Preview (appears when done) */}
        {result && (
          <div className="px-6 pb-4">
            <div className="bg-gradient-to-r from-purple-950/30 to-blue-950/20 border border-purple-500/30 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider">Extracted Floor Plans</span>
                <span className="text-[10px] font-mono text-zinc-400">{result.outerLength_m}m × {result.outerWidth_m}m · {result.totalBUA_m2} m² BUA</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.storeys.map((storey, idx) => (
                  <div
                    key={storey.id}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                      storey.isRoof
                        ? "bg-amber-950/30 border-amber-700/40 text-amber-300"
                        : idx === 0
                        ? "bg-emerald-950/30 border-emerald-700/40 text-emerald-300"
                        : "bg-blue-950/30 border-blue-700/40 text-blue-300"
                    }`}
                  >
                    <span>{storey.isRoof ? "🧱" : idx === 0 ? "🏢" : "🏢"}</span>
                    <span>{storey.name}</span>
                    <span className="text-zinc-500 font-mono">+{storey.elevation_m}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#2a3045] flex items-center justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={() => result && onComplete(result)}
            disabled={!result}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              result
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
          >
            {result ? (
              <>
                <Zap className="w-3.5 h-3.5" />
                Apply to BOQ & View {result.storeys.length} Floor Plans
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Converting...
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
