"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Warehouse,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  MapPin,
  User,
  Building,
  CheckCircle,
  XCircle,
  RefreshCw,
  Boxes,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { projectsApi } from "@/domains/projects/api";
import { Site } from "@/domains/inventory/types";
import { Project } from "@/types/projects";
import { ViewSiteInventoryModal } from "@/components/inventory/ViewSiteInventoryModal";
import { toast } from "sonner";

export function SitesTab() {
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState<{
    name: string;
    code: string;
    location: string;
    project: string | number;
    is_active: boolean;
  }>({
    name: "",
    code: "",
    location: "",
    project: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [selectedSiteForInventory, setSelectedSiteForInventory] = useState<Site | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [siteList, projectList] = await Promise.all([
        inventoryApi.getSites({ search }),
        projectsApi.getProjects(),
      ]);
      setSites(siteList);
      setProjects(projectList);
    } catch (err: any) {
      console.error("Failed to load sites & projects", err);
      setError("Failed to load inventory sites.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingSite(null);
    setForm({
      name: "",
      code: `YARD-${sites.length + 1}`,
      location: "",
      project: projects.length > 0 ? projects[0].id : "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (s: Site) => {
    setEditingSite(s);
    setForm({
      name: s.name || "",
      code: s.code || "",
      location: s.location || "",
      project: s.project || (s as any).project_id || "",
      is_active: s.is_active ?? true,
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error("Site Name and Site Code are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: Partial<Site> = {
        name: form.name,
        code: form.code,
        location: form.location,
        project: form.project ? Number(form.project) : undefined,
        is_active: form.is_active,
      };

      if (editingSite) {
        await inventoryApi.updateSite(editingSite.id, payload);
        toast.success(`Site Yard ${form.name} updated successfully!`);
      } else {
        await inventoryApi.createSite(payload);
        toast.success(`Site Yard ${form.name} created and allocated!`);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      console.error("Save site failed", err);
      toast.error(err?.data?.detail || err?.message || "Failed to save site yard.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSite = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete site yard "${name}"?`)) return;
    try {
      await inventoryApi.deleteSite(id);
      toast.success(`Site Yard ${name} deleted.`);
      loadData();
    } catch (err) {
      toast.error("Failed to delete site yard.");
    }
  };

  const filteredSites = sites.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Site Yards & Central Godowns Master
            </h1>
            <p className="text-xs text-zinc-400">
              Manage construction site storage yards, project allocations, and live material stock balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search site name, code, project..."
              className="h-9 pl-9 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-64"
            />
          </div>
          <button
            onClick={loadData}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="h-9 px-4 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Site Yard
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Summary Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Total Storage Yards</span>
          <p className="text-2xl font-extrabold text-zinc-100">{sites.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Active Yards</span>
          <p className="text-2xl font-extrabold text-emerald-400">{sites.filter((s) => s.is_active).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Allocated Projects</span>
          <p className="text-2xl font-extrabold text-amber-400">{sites.filter((s) => s.project || s.project_name).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Inventory Tracking</span>
          <p className="text-2xl font-extrabold text-purple-400">Live Double-Entry</p>
        </div>
      </div>

      {/* Site Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-zinc-500 font-medium">
            Loading storage site yards...
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
            No site storage yards found. Click <span className="text-amber-400 font-bold">+ Add Site Yard</span> to create one.
          </div>
        ) : (
          filteredSites.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-4 group shadow-md"
            >
              {/* Card Title Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                    {s.name}
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-400 mt-0.5">
                    [{s.code}]
                  </div>
                </div>
                {s.is_active ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> ACTIVE YARD
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                    <XCircle className="w-3 h-3" /> INACTIVE
                  </span>
                )}
              </div>

              {/* Metadata Attributes */}
              <div className="space-y-2 text-xs text-zinc-400 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Building className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold">
                    {s.project_name ? `Project: ${s.project_name}` : "Unallocated Central Warehouse"}
                  </span>
                </div>

                {s.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{s.location}</span>
                  </div>
                )}

                {s.manager_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>Manager: {s.manager_name}</span>
                  </div>
                )}
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setSelectedSiteForInventory(s)}
                  className="flex-1 h-8 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  Inspect Inventory
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="h-8 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
                  title="Edit Site Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteSite(s.id, s.name)}
                  className="h-8 w-8 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition-colors"
                  title="Delete Site Yard"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Site Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-base">
                {editingSite ? "Edit Storage Site Yard" : "Add New Site Yard / Godown"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Site Yard Name *
                </label>
                <input
                  required
                  placeholder="e.g. West Coast Regional Yard #2"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Site Code *
                </label>
                <input
                  required
                  placeholder="e.g. YARD-WEST-02"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Allocated Construction Project
                </label>
                <select
                  value={form.project}
                  onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Central Logistics Warehouse (Unallocated)</option>
                  {projects.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      [{(pr as any).code || pr.uid || "PRJ"}] {pr.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Location Address / Site Coordinates
                </label>
                <input
                  placeholder="e.g. Plot 42, Heavy Industrial Zone, Sector 4"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="site-active"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="site-active" className="text-xs font-semibold text-zinc-200">
                  Active Operational Site Yard
                </label>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingSite ? "Update Site Yard" : "Create Site Yard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Site Inventory Balances Modal */}
      {selectedSiteForInventory && (
        <ViewSiteInventoryModal
          isOpen={!!selectedSiteForInventory}
          onClose={() => setSelectedSiteForInventory(null)}
          site={selectedSiteForInventory}
        />
      )}
    </div>
  );
}
