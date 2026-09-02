"use client";

import React, { useState, useEffect } from "react";
import { X, Layers, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Project } from "@/types/projects";
import { MasterMaterial } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { projectsApi } from "@/domains/projects/api";

interface ProjectMaterialPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSaved?: (updatedProject: Project) => void;
}

const CATEGORY_DEFINITIONS = [
  { key: "brick", label: "🧱 Masonry Units (Bricks / AAC Blocks)", category: "MASONRY", hint: "BRK" },
  { key: "cement", label: "🏗️ Mortar & Structural Cement", category: "CEMENT", hint: "CEM" },
  { key: "sand", label: "🏖️ Fine River / M-Sand", category: "SAND_AGGREGATE", hint: "SND" },
  { key: "aggregate", label: "🪨 Coarse Aggregates (10/20mm)", category: "SAND_AGGREGATE", hint: "AGG" },
  { key: "steel", label: "🔩 TMT Rebar Steel Rods", category: "STRUCTURAL", hint: "STL" },
  { key: "tile", label: "🔲 Floor Tiles & Finishing", category: "FINISHING", hint: "TILE" },
  { key: "paint", label: "🎨 Wall Paints & Emulsion", category: "FINISHING", hint: "PNT" },
  { key: "adhesive", label: "🧪 Block Joint Mortar / Tile Adhesive", category: "CONSUMABLE", hint: "ADHESIVE" },
];

export const ProjectMaterialPreferencesModal: React.FC<ProjectMaterialPreferencesModalProps> = ({
  isOpen,
  onClose,
  project,
  onSaved,
}) => {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setPreferences(project.material_preferences || {});
      loadMaterials();
    }
  }, [isOpen, project]);

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const data = await inventoryApi.getMaterials();
      setMaterials(data);

      // Auto-populate defaults for empty preference slots
      setPreferences((prev) => {
        const next = { ...(project.material_preferences || {}), ...prev };
        let changed = false;
        CATEGORY_DEFINITIONS.forEach((cat) => {
          if (!next[cat.key]) {
            const match = data.find(
              (m) =>
                m.category === cat.category ||
                (cat.hint && m.item_code.includes(cat.hint)) ||
                m.name.toLowerCase().includes(cat.key.toLowerCase())
            ) || data[0];
            if (match) {
              next[cat.key] = match.id;
              changed = true;
            }
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to load materials catalog", err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleSelectChange = (key: string, materialId: string) => {
    setPreferences((prev) => ({ ...prev, [key]: materialId }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await projectsApi.updateProject(project.uid, {
        material_preferences: preferences,
      });
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to save project material preferences", err);
      alert(err?.message || "Failed to update project material preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Project Material Preferences
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {project.project_code || project.title}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Set default master catalog materials for this project. Linked tasks will automatically fill these preferences.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {loadingMaterials ? (
            <div className="py-16 text-center text-zinc-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Loading Master Materials Catalog...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {CATEGORY_DEFINITIONS.map((cat) => {
                const selectedId = preferences[cat.key] || "";
                const selectedMat = materials.find((m) => m.id === selectedId);

                return (
                  <div
                    key={cat.key}
                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-200">{cat.label}</span>
                      {selectedMat && (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ₹{Number(selectedMat.standard_rate || 0).toFixed(2)} / {selectedMat.unit || "unit"}
                        </span>
                      )}
                    </div>

                    <select
                      value={selectedId}
                      onChange={(e) => handleSelectChange(cat.key, e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 font-medium focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.item_code}] {m.name} ({m.unit}) — ₹{Number(m.standard_rate || 0).toFixed(2)}/{m.unit || "unit"}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Task calculators in this project will auto-default to these choices (can be overridden per task).</span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loadingMaterials}
              className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? "Saving Preferences..." : "Save Project Material Preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
