"use client";

import React, { useState, useEffect } from "react";
import { AdminTenantDetail, adminApi } from "@/domains/admin/api";
import { X, Save, ShieldAlert, Trash2, HardDrive, Users, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { COMPACT_UI } from "@/theme/ui-tokens";

interface TenantDetailDrawerProps {
  tenantId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function TenantDetailDrawer({ tenantId, isOpen, onClose }: TenantDetailDrawerProps) {
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Quota Overrides
  const [maxSeats, setMaxSeats] = useState<string>("");
  const [maxProjects, setMaxProjects] = useState<string>("");
  const [maxStorage, setMaxStorage] = useState<string>("");

  useEffect(() => {
    if (isOpen && tenantId) {
      loadTenant(tenantId);
    } else {
      setTenant(null);
    }
  }, [isOpen, tenantId]);

  const loadTenant = async (id: number) => {
    setIsLoading(true);
    try {
      const data = await adminApi.getTenant(id);
      setTenant(data);
      setMaxSeats(data.metadata?.max_seats_override?.toString() || "");
      setMaxProjects(data.metadata?.max_projects_override?.toString() || "");
      setMaxStorage(data.metadata?.max_storage_gb_override?.toString() || "");
    } catch (e) {
      toast.error("Failed to load workspace details.");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuotas = async () => {
    if (!tenant) return;
    setIsSaving(true);
    try {
      const newMetadata = { ...tenant.metadata };
      
      if (maxSeats.trim() !== "") newMetadata.max_seats_override = parseInt(maxSeats, 10);
      else delete newMetadata.max_seats_override;

      if (maxProjects.trim() !== "") newMetadata.max_projects_override = parseInt(maxProjects, 10);
      else delete newMetadata.max_projects_override;

      if (maxStorage.trim() !== "") newMetadata.max_storage_gb_override = parseInt(maxStorage, 10);
      else delete newMetadata.max_storage_gb_override;

      await adminApi.updateTenant(tenant.id, { metadata: newMetadata });
      toast.success("Quotas updated successfully.");
      onClose();
    } catch (e) {
      toast.error("Failed to update quotas.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to soft delete workspace "${tenant.name}"? Users will immediately lose access.`
    );
    if (!confirmDelete) return;

    try {
      await adminApi.updateTenant(tenant.id, { is_deleted: true });
      toast.success("Workspace deleted successfully.");
      onClose();
    } catch (e) {
      toast.error("Failed to delete workspace.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-surface-50 dark:bg-surface-900 shadow-2xl border-l border-surface-200 dark:border-surface-800 flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200/80 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-950/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-black text-primary uppercase tracking-widest">Workspace Quotas</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading || !tenant ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 bg-surface-200/60 dark:bg-surface-800/40 rounded-lg w-3/4" />
              <div className="h-32 bg-surface-200/60 dark:bg-surface-800/40 rounded-lg w-full" />
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-100/30 dark:bg-surface-950/30">
                <div className="w-12 h-12 rounded-xl bg-surface-200/50 dark:bg-surface-800 flex items-center justify-center text-primary font-black uppercase text-xl shadow-2xs border border-surface-200 dark:border-surface-700">
                  {tenant.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-base font-black text-primary leading-tight">{tenant.name}</h3>
                  <p className="text-xs text-surface-400 font-semibold mt-0.5">{tenant.email || "No email"}</p>
                </div>
              </div>

              {/* Current Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-surface-100/50 dark:bg-surface-900/50 rounded-lg border border-surface-200/50 dark:border-surface-800 text-center">
                  <Users className="w-3.5 h-3.5 text-accent mx-auto mb-1 opacity-80" />
                  <span className="block text-sm font-black text-primary">{tenant.users_count}</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-surface-400">Users</span>
                </div>
                <div className="p-3 bg-surface-100/50 dark:bg-surface-900/50 rounded-lg border border-surface-200/50 dark:border-surface-800 text-center">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1 opacity-80" />
                  <span className="block text-sm font-black text-primary">{tenant.projects_count}</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-surface-400">Projects</span>
                </div>
                <div className="p-3 bg-surface-100/50 dark:bg-surface-900/50 rounded-lg border border-surface-200/50 dark:border-surface-800 text-center">
                  <HardDrive className="w-3.5 h-3.5 text-purple-500 mx-auto mb-1 opacity-80" />
                  <span className="block text-sm font-black text-primary">{tenant.storage_used_gb} GB</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-surface-400">Storage</span>
                </div>
              </div>

              {/* Quota Overrides Form */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest font-black text-surface-400 border-b border-surface-200 dark:border-surface-800 pb-2">Manual Quota Overrides</h4>
                <p className="text-xs text-surface-400 leading-relaxed font-medium">
                  Set limits here to override the default quotas provided by the <strong>{tenant.plan_name}</strong> plan. Leave blank to inherit plan defaults.
                </p>

                <div className="grid gap-4">
                  <div>
                    <label className={COMPACT_UI.label}>Max Seats Override</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={maxSeats}
                      onChange={(e) => setMaxSeats(e.target.value)}
                      className={COMPACT_UI.input}
                    />
                  </div>
                  <div>
                    <label className={COMPACT_UI.label}>Max Projects Override</label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={maxProjects}
                      onChange={(e) => setMaxProjects(e.target.value)}
                      className={COMPACT_UI.input}
                    />
                  </div>
                  <div>
                    <label className={COMPACT_UI.label}>Max Storage Override (GB)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={maxStorage}
                      onChange={(e) => setMaxStorage(e.target.value)}
                      className={COMPACT_UI.input}
                    />
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-6 mt-6 border-t border-rose-500/20">
                <h4 className="text-[10px] uppercase tracking-widest font-black text-rose-500 mb-3">Danger Zone</h4>
                <button
                  onClick={handleDelete}
                  className="w-full py-2.5 px-4 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Soft Delete Workspace
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-950/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-primary text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveQuotas}
            disabled={isSaving || !tenant}
            className="flex-[2] py-2 px-4 rounded-lg bg-accent hover:bg-accent/90 text-background text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Overrides"}
          </button>
        </div>

      </div>
    </>
  );
}
