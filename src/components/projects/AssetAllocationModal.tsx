"use client";
import React, { useState, useEffect } from "react";
import { ProjectAsset, SpatialZone, MilestonePhase } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { MapPin, Layers, Check, X, Building2, Flag } from "lucide-react";

interface AssetAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: ProjectAsset | null;
  projectUid: string;
  onSuccess?: () => void;
}

export const AssetAllocationModal: React.FC<AssetAllocationModalProps> = ({
  isOpen,
  onClose,
  asset,
  projectUid,
  onSuccess,
}) => {
  const [zones, setZones] = useState<SpatialZone[]>([]);
  const [phases, setPhases] = useState<MilestonePhase[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && projectUid) {
      setLoading(true);
      projectsApi
        .getMatrix(projectUid)
        .then((data) => {
          setZones(data?.zones || []);
          setPhases(data?.phases || []);
        })
        .catch((err) => {
          console.error("Failed to fetch matrix zones and phases", err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, projectUid]);

  useEffect(() => {
    if (asset) {
      const initialZoneIds = (asset.zones || []).map((z) => z.id);
      const initialPhaseIds = (asset.phases || []).map((p) => p.id);
      setSelectedZoneIds(initialZoneIds);
      setSelectedPhaseIds(initialPhaseIds);
    } else {
      setSelectedZoneIds([]);
      setSelectedPhaseIds([]);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const toggleZone = (zoneId: number) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const togglePhase = (phaseId: number) => {
    setSelectedPhaseIds((prev) =>
      prev.includes(phaseId) ? prev.filter((id) => id !== phaseId) : [...prev, phaseId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await projectsApi.allocateProjectAsset(asset.id, {
        zone_ids: selectedZoneIds,
        phase_ids: selectedPhaseIds,
      });
      toast.success("Asset allocation updated successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update asset allocation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-surface-100/50 dark:bg-surface-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground tracking-tight">
                Allocate Asset to Zone & Phase
              </h3>
              <p className="text-xs text-text-secondary font-medium truncate max-w-xs sm:max-w-sm">
                {asset.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-text-secondary">Loading Spatial Zones & Phases...</p>
            </div>
          ) : (
            <>
              {/* Spatial Zones Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-accent" />
                    <span>Spatial Zones</span>
                    <span className="text-[10px] text-text-secondary font-normal">
                      ({selectedZoneIds.length} selected)
                    </span>
                  </label>
                  {zones.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedZoneIds(
                          selectedZoneIds.length === zones.length ? [] : zones.map((z) => z.id)
                        )
                      }
                      className="text-[10px] font-bold text-accent hover:underline"
                    >
                      {selectedZoneIds.length === zones.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {zones.length === 0 ? (
                  <p className="text-xs text-text-secondary italic bg-surface-100 dark:bg-surface-800 p-3 rounded-xl">
                    No Spatial Zones defined for this project yet. You can create zones in the Construction Matrix.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {zones.map((zone) => {
                      const isSelected = selectedZoneIds.includes(zone.id);
                      return (
                        <button
                          type="button"
                          key={zone.id}
                          onClick={() => toggleZone(zone.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-accent/10 border-accent text-accent shadow-xs"
                              : "bg-surface-100/50 dark:bg-surface-800/50 border-surface-200/60 dark:border-surface-700/60 text-foreground hover:bg-surface-200/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-accent" : "text-surface-400"}`} />
                            <span className="text-xs font-bold truncate">{zone.name}</span>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-accent text-background flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Milestone Phases Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Flag className="w-4 h-4 text-purple-500" />
                    <span>Milestone Phases</span>
                    <span className="text-[10px] text-text-secondary font-normal">
                      ({selectedPhaseIds.length} selected)
                    </span>
                  </label>
                  {phases.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPhaseIds(
                          selectedPhaseIds.length === phases.length ? [] : phases.map((p) => p.id)
                        )
                      }
                      className="text-[10px] font-bold text-accent hover:underline"
                    >
                      {selectedPhaseIds.length === phases.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {phases.length === 0 ? (
                  <p className="text-xs text-text-secondary italic bg-surface-100 dark:bg-surface-800 p-3 rounded-xl">
                    No Milestone Phases defined for this project yet. You can create phases in the Construction Matrix.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phases.map((phase) => {
                      const isSelected = selectedPhaseIds.includes(phase.id);
                      return (
                        <button
                          type="button"
                          key={phase.id}
                          onClick={() => togglePhase(phase.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 shadow-xs"
                              : "bg-surface-100/50 dark:bg-surface-800/50 border-surface-200/60 dark:border-surface-700/60 text-foreground hover:bg-surface-200/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: phase.color_hex || "#8b5cf6" }}
                            />
                            <span className="text-xs font-bold truncate">{phase.name}</span>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-800/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-foreground rounded-xl transition-colors"
          >
            Cancel / Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Allocation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
