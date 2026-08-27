"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Warehouse, Plus, Search, Edit2, Trash2, Eye, MapPin, User, Building, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name:"", code:"", location:"", is_active:true });
  const [saving, setSaving] = useState(false);
  const [viewSite, setViewSite] = useState<any>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setSites(await inventoryApi.getSites({ search })); }
    catch { setError("Failed to load sites"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name:"", code:"", location:"", is_active:true }); setShowModal(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({...s}); setShowModal(true); };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (editing) await inventoryApi.updateSite(editing.id, form);
      else await inventoryApi.createSite(form);
      setShowModal(false); load();
    } catch(e: any) { setError(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this site?")) return;
    try { await inventoryApi.deleteSite(id); load(); }
    catch { setError("Delete failed"); }
  };

  const filtered = sites.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><Warehouse className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Site & Godown Master</h1>
            <p className="text-xs text-zinc-400">Construction sites, warehouses, storage yards & central godowns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search sites..." className="h-9 pl-9 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-52" />
          </div>
          <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openCreate} className="h-9 px-4 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Site
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label:"Total Sites", value:sites.length, color:"text-zinc-200" },
          { label:"Active Sites", value:sites.filter(s=>s.is_active).length, color:"text-amber-400" },
          { label:"Inactive", value:sites.filter(s=>!s.is_active).length, color:"text-red-400" },
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 py-12 text-center text-zinc-500">Loading sites...</div>
        : filtered.length === 0 ? <div className="col-span-3 py-12 text-center text-zinc-500">No sites found. Add your first site/godown.</div>
        : filtered.map(s=>(
          <div key={s.id} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-4 group">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">{s.name}</div>
                <div className="font-mono text-[11px] text-amber-400 mt-0.5">{s.code}</div>
              </div>
              {s.is_active
                ? <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold"><CheckCircle className="w-3 h-3"/>Active</span>
                : <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold"><XCircle className="w-3 h-3"/>Inactive</span>}
            </div>
            <div className="space-y-2 text-xs text-zinc-400">
              {s.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-zinc-600"/>{s.location}</div>}
              {s.manager_name && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-zinc-600"/>{s.manager_name}</div>}
              {s.project_name && <div className="flex items-center gap-2"><Building className="w-3.5 h-3.5 text-zinc-600"/>{s.project_name}</div>}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button onClick={()=>setViewSite(s)} className="flex-1 h-8 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors"><Eye className="w-3.5 h-3.5"/>View</button>
              <button onClick={()=>openEdit(s)} className="flex-1 h-8 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors"><Edit2 className="w-3.5 h-3.5"/>Edit</button>
              <button onClick={()=>del(s.id)} className="h-8 w-8 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">{editing ? "Edit Site" : "Add New Site / Godown"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
              {[
                {label:"Site Name *",key:"name"},
                {label:"Site Code *",key:"code"},
                {label:"Location / Address",key:"location"},
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">{f.label}</label>
                  <input value={form[f.key]||""} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))}
                    className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500" />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="site-active" checked={form.is_active||false} onChange={e=>setForm((p:any)=>({...p,is_active:e.target.checked}))} className="rounded border-zinc-600 bg-zinc-900 text-amber-500" />
                <label htmlFor="site-active" className="text-xs text-zinc-300">Active Site</label>
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3 justify-end">
              <button onClick={()=>setShowModal(false)} className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">Cancel</button>
              <button onClick={save} disabled={saving} className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer">
                {saving?"Saving...":editing?"Update Site":"Create Site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
