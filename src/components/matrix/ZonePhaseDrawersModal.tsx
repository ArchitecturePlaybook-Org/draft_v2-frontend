"use client";
import React, { useEffect, useState } from "react";
import { ProjectAsset, SpatialZone, MilestonePhase } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { X, Layers, ExternalLink, Box, FileText, MapPin, Flag } from "lucide-react";

interface ZonePhaseDrawersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  zone?: SpatialZone | null;
  phase?: MilestonePhase | null;
}

export const ZonePhaseDrawersModal: React.FC<ZonePhaseDrawersModalProps> = ({
  isOpen,
  onClose,
  projectUid,
  zone,
  phase,
}) => {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && (zone || phase)) {
      setLoading(true);
      // Fetch assets filtered by zone_id or phase_id from BFF
      const params: any = {};
      if (zone) params.zone_id = zone.id;
      if (phase) params.phase_id = phase.id;

      projectsApi
        .getProjectAssets(projectUid)
        .then((allAssets: ProjectAsset[]) => {
          // Filter locally as well for double assurance
          const filtered = (allAssets || []).filter((asset: ProjectAsset) => {
            if (zone) {
              const hasZone = (asset.zones || []).some((z: any) => z.id === zone.id);
              if (hasZone) return true;
            }
            if (phase) {
              const hasPhase = (asset.phases || []).some((p: any) => p.id === phase.id);
              if (hasPhase) return true;
            }
            return false;
          });
          setAssets(filtered);
        })
        .catch((err: any) => {
          console.error("Failed to load allocated drawings", err);
          setAssets([]);
        })
        .finally(() => setLoading(false));

    }
  }, [isOpen, projectUid, zone, phase]);

  if (!isOpen || (!zone && !phase)) return null;

  const title = zone
    ? `Allocated Drawings & Models — Spatial Zone: ${zone.name}`
    : `Allocated Drawings & Models — Milestone Phase: ${phase?.name}`;

  const handleOpenAsset = (asset: ProjectAsset) => {
    if (asset.category === "3d_model") {
      window.open(`/dashboard/projects/${projectUid}/bim-viewer?assetId=${asset.id}`, "_blank");
    } else if (asset.category === "sh3d") {
      window.open(`/dashboard/projects/${projectUid}/editor?assetId=${asset.canonical_uid}`, "_blank");
    } else if (asset.category === "sketch") {
      window.open(`/dashboard/projects/${projectUid}/sketch?assetId=${asset.id}`, "_blank");
    } else {
      window.open(asset.file, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-surface-100/50 dark:bg-surface-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              {zone ? <MapPin className="w-5 h-5" /> : <Flag className="w-5 h-5 text-purple-500" />}
            </div>
            <div>
              <h3 className="text-base font-black text-foreground tracking-tight">{title}</h3>
              <p className="text-xs text-text-secondary font-medium">
                Showing all 2D floor plans & 3D models assigned to this location/phase
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-text-secondary">Loading allocated drawings & models...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-200/50 dark:bg-surface-800/50 flex items-center justify-center text-2xl">
                📐
              </div>
              <h4 className="text-sm font-bold text-foreground">No Drawings or Models Allocated</h4>
              <p className="text-xs text-text-secondary max-w-sm">
                No 2D floor plans or 3D construction models have been assigned to this{" "}
                {zone ? "Spatial Zone" : "Milestone Phase"} yet. You can allocate assets in Data Hub.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-800/40 hover:border-accent/50 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {asset.thumbnail ? (
                        <img src={asset.thumbnail} alt={asset.title} className="w-full h-full object-cover" />
                      ) : asset.category === "3d_model" || asset.category === "sh3d" ? (
                        <Box className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-accent transition-colors">
                        {asset.title}
                      </h4>
                      <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mt-0.5">
                        {asset.category.replace("_", " ")} • v{asset.version_number}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleOpenAsset(asset)}
                    className="w-full py-2 bg-accent/10 hover:bg-accent text-accent hover:text-background font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Drawing / Model</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
