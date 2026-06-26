"use client";
import React, { useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

interface MatrixOnboardingWizardProps {
  projectUid: string;
  onComplete: () => void;
}

export const MatrixOnboardingWizard: React.FC<MatrixOnboardingWizardProps> = ({ projectUid, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 1: Zones
  const [zoneInputType, setZoneInputType] = useState<"manual" | "ai">("manual");
  const [zones, setZones] = useState<{ name: string; zone_type: string }[]>([
    { name: "Apt 101", zone_type: "apartment" },
    { name: "Apt 102", zone_type: "apartment" }
  ]);
  const [newZoneName, setNewZoneName] = useState("");
  const [isParsingAI, setIsParsingAI] = useState(false);

  // Step 2: Phases
  const [phases, setPhases] = useState<{ name: string; sequence_order: number; color_hex: string }[]>([
    { name: "1. Structure", sequence_order: 1, color_hex: "#64748b" },
    { name: "2. MEP Rough-in", sequence_order: 2, color_hex: "#3b82f6" },
    { name: "3. Finishing", sequence_order: 3, color_hex: "#10b981" }
  ]);

  const handleAIParsing = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingAI(true);
    try {
      const res = await projectsApi.parseZonesFromDrawing(projectUid, file);
      if (res.zones && res.zones.length > 0) {
        setZones(res.zones);
        toast.success(`Extracted ${res.zones.length} zones successfully.`);
      } else {
        toast.warning("No zones found in the image.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse image.");
    } finally {
      setIsParsingAI(false);
    }
  };

  const addManualZone = () => {
    if (!newZoneName.trim()) return;
    setZones([...zones, { name: newZoneName.trim(), zone_type: "" }]);
    setNewZoneName("");
  };

  const removeZone = (index: number) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (zones.length === 0 || phases.length === 0) {
      toast.error("Please add at least one zone and one phase.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await projectsApi.generateWorkspace(projectUid, {
        zones: zones.map((z, i) => ({ ...z, order: i })),
        phases: phases,
      });
      toast.success(`Generated ${res.blocks} blocks and ${res.tasks} tasks!`);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-surface-100 rounded-3xl border border-surface-200 shadow-xl overflow-hidden max-w-3xl mx-auto my-12 animate-fade-in-up">
      {/* Header */}
      <div className="bg-accent text-background flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Matrix Generator</h2>
          <p className="text-sm text-surface-300 font-medium mt-1">Configure your spatial zones and milestone phases.</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
              step === s ? "bg-accent text-background" : step > s ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
            }`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="p-8">
        {/* STEP 1: ZONES */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-primary">Define Spatial Zones (X-Axis)</h3>
            
            <div className="flex bg-surface-100 p-1 rounded-xl w-fit">
              <button onClick={() => setZoneInputType("manual")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${zoneInputType === "manual" ? "bg-surface-100 shadow-sm text-primary" : "text-surface-500 hover:text-primary"}`}>Manual Entry</button>
              <button onClick={() => setZoneInputType("ai")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${zoneInputType === "ai" ? "bg-surface-100 shadow-sm text-accent" : "text-surface-500 hover:text-accent"}`}>
                <span className="text-lg leading-none mt-[-2px]">✨</span> AI Auto-Extract
              </button>
            </div>

            {zoneInputType === "ai" ? (
              <div className="border-2 border-dashed border-accent/30 bg-accent/5 rounded-2xl p-8 text-center mt-4">
                <div className="text-4xl mb-4">🤖</div>
                <h4 className="font-bold text-primary mb-2">Gemini Vision Extraction</h4>
                <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">Upload a floor plan image (PNG/JPG) and our AI will automatically detect and extract room names.</p>
                <label className={`inline-block h-12 px-6 bg-surface-100 border border-surface-200 text-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:border-accent hover:text-accent transition-all cursor-pointer leading-[46px] ${isParsingAI ? "opacity-50 pointer-events-none" : ""}`}>
                  {isParsingAI ? "Analyzing Image..." : "Upload Floor Plan"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAIParsing} disabled={isParsingAI} />
                </label>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {zones.map((z, i) => (
                  <div key={i} className="flex items-center gap-4 bg-surface-50 border border-surface-200 p-3 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-surface-200 text-surface-600 flex items-center justify-center font-black shrink-0 text-xs">
                      Z{i + 1}
                    </div>
                    <input
                      type="text"
                      value={z.name}
                      onChange={e => {
                        const newZones = [...zones];
                        newZones[i].name = e.target.value;
                        setZones(newZones);
                      }}
                      className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-primary"
                      placeholder="Zone name (e.g. Unit 101)"
                    />
                    <input
                      type="text"
                      value={z.zone_type}
                      onChange={e => {
                        const newZones = [...zones];
                        newZones[i].zone_type = e.target.value;
                        setZones(newZones);
                      }}
                      className="w-24 bg-surface-100 border border-surface-200 rounded-lg px-2 py-1.5 text-[10px] outline-none text-surface-500 uppercase tracking-widest font-black focus:border-accent transition-colors"
                      placeholder="Type"
                    />
                    <button 
                      onClick={() => removeZone(i)}
                      className="text-surface-300 hover:text-red-500 font-bold ml-1 px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    setZones([...zones, { name: `Zone ${zones.length + 1}`, zone_type: "" }]);
                  }}
                  className="w-full h-11 border-2 border-dashed border-surface-200 rounded-xl text-surface-500 font-bold text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg leading-none mt-[-2px]">+</span> Add Zone
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PHASES */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-primary">Define Milestone Phases (Y-Axis)</h3>
            <p className="text-sm text-surface-500">Phases dictate the chronological dependency lock. Tasks in Phase 2 remain locked until Phase 1 tasks are complete for a given zone.</p>
            
            <div className="space-y-3">
              {phases.map((p, i) => (
                <div key={i} className="flex items-center gap-4 bg-surface-50 border border-surface-200 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black shrink-0" style={{ backgroundColor: p.color_hex }}>
                    {p.sequence_order}
                  </div>
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => {
                      const newPhases = [...phases];
                      newPhases[i].name = e.target.value;
                      setPhases(newPhases);
                    }}
                    className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-primary"
                  />
                  <input
                    type="color"
                    value={p.color_hex}
                    onChange={e => {
                      const newPhases = [...phases];
                      newPhases[i].color_hex = e.target.value;
                      setPhases(newPhases);
                    }}
                    className="w-8 h-8 rounded shrink-0 cursor-pointer"
                  />
                  <button 
                    onClick={() => {
                      const newPhases = phases.filter((_, idx) => idx !== i).map((ph, idx) => ({ ...ph, sequence_order: idx + 1 }));
                      setPhases(newPhases);
                    }}
                    className="text-surface-300 hover:text-red-500 font-bold ml-1 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                setPhases([...phases, { 
                  name: `${phases.length + 1}. New Phase`, 
                  sequence_order: phases.length + 1, 
                  color_hex: "#94a3b8" 
                }]);
              }}
              className="w-full h-11 border-2 border-dashed border-surface-200 rounded-xl text-surface-500 font-bold text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg leading-none mt-[-2px]">+</span> Add Phase
            </button>
          </div>
        )}

        {/* STEP 3: PREVIEW & GENERATE */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in text-center">
            <h3 className="text-2xl font-black text-primary">Ready to Generate</h3>
            <p className="text-sm text-surface-500 max-w-md mx-auto">
              This will generate the master gate matrix grid for your project.
            </p>
            
            <div className="flex justify-center gap-8 py-6">
              <div className="text-center">
                <p className="text-4xl font-black text-accent">{zones.length}</p>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1">Spatial Zones</p>
              </div>
              <div className="text-center text-3xl font-light text-surface-300 mt-2">×</div>
              <div className="text-center">
                <p className="text-4xl font-black text-accent">{phases.length}</p>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1">Milestone Phases</p>
              </div>
              <div className="text-center text-3xl font-light text-surface-300 mt-2">=</div>
              <div className="text-center">
                <p className="text-4xl font-black text-emerald-500">{zones.length * phases.length}</p>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1">Matrix Blocks</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-8 py-5 border-t border-surface-100 bg-surface-50 flex items-center justify-between">
        <button 
          onClick={() => setStep(step - 1 as any)} 
          disabled={step === 1 || isGenerating}
          className="h-11 px-6 text-surface-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-surface-200 transition-colors disabled:opacity-0"
        >
          Back
        </button>
        
        {step < 3 ? (
          <button 
            onClick={() => setStep(step + 1 as any)} 
            disabled={(step === 1 && zones.length === 0) || (step === 2 && phases.length === 0)}
            className="h-11 px-8 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="h-11 px-8 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating Matrix...</>
            ) : "Generate Workspace"}
          </button>
        )}
      </div>
    </div>
  );
};
