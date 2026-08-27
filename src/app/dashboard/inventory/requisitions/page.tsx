"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Search, CheckCircle, XCircle, Clock, RefreshCw, Eye, ChevronDown } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { MaterialRequisition, RequisitionStatus } from "@/domains/inventory/types";

const STATUS_CONFIG: Record<RequisitionStatus, { label: string; color: string; bg: string }> = {
  DRAFT:     { label:"Draft",       color:"text-zinc-400",   bg:"bg-zinc-800" },
  SUBMITTED: { label:"Submitted",   color:"text-blue-400",   bg:"bg-blue-500/10" },
  APPROVED:  { label:"Approved",    color:"text-emerald-400",bg:"bg-emerald-500/10" },
  REJECTED:  { label:"Rejected",    color:"text-red-400",    bg:"bg-red-500/10" },
  PO_RAISED: { label:"PO Raised",   color:"text-purple-400", bg:"bg-purple-500/10" },
  FULFILLED: { label:"Fulfilled",   color:"text-cyan-400",   bg:"bg-cyan-500/10" },
};

const PRIORITY_COLOR: Record<string,string> = { LOW:"text-zinc-400", NORMAL:"text-blue-400", HIGH:"text-amber-400", URGENT:"text-red-400" };

export default function RequisitionsPage() {
  const [reqs, setReqs] = useState<MaterialRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ site:"", purpose:"", priority:"NORMAL", required_by_date:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [viewReq, setViewReq] = useState<MaterialRequisition | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        inventoryApi.getRequisitions(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        inventoryApi.getSites(),
      ]);
      setReqs(r); setSites(s);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setError("");
    try { await inventoryApi.createRequisition(form); setShowModal(false); load(); }
    catch(e:any) { setError(e?.message||"Save failed"); }
    finally { setSaving(false); }
  };

  const doAction = async (id: string, action: "submit"|"approve"|"reject") => {
    setActionLoading(id+action);
    try {
      if (action==="submit") await inventoryApi.submitRequisition(id);
      else if (action==="approve") await inventoryApi.approveRequisition(id);
      else await inventoryApi.rejectRequisition(id, "Rejected by approver");
      load();
    } catch(e:any) { setError(e?.message||"Action failed"); }
    finally { setActionLoading(null); }
  };

  const filtered = reqs.filter(r => !search || r.mrn_number.toLowerCase().includes(search.toLowerCase()) || r.site_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><ClipboardList className="w-6 h-6"/></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Material Requisitions (MRN)</h1>
            <p className="text-xs text-zinc-400">Raise, approve, and track material indent notes before purchase orders</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search MRN..." className="h-9 pl-9 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-48"/>
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>setShowModal(true)} className="h-9 px-4 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer">
            <Plus className="w-4 h-4"/> New MRN
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["DRAFT","SUBMITTED","APPROVED","REJECTED"] as RequisitionStatus[]).map(s=>{
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className={`p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer ${statusFilter===s?"border-amber-500":""}`} onClick={()=>setStatusFilter(s===statusFilter?"ALL":s)}>
              <p className="text-xs text-zinc-500">{cfg.label}</p>
              <p className={`text-2xl font-black mt-1 ${cfg.color}`}>{reqs.filter(r=>r.status===s).length}</p>
            </div>
          );
        })}
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-md">
        <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Material Requisition Register — {filtered.length} Records</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
              <tr>{["MRN No.","Site","Priority","Purpose","Status","Required By","Items","Actions"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? <tr><td colSpan={8} className="py-12 text-center text-zinc-500">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-zinc-500">No requisitions found.</td></tr>
              : filtered.map(r=>{
                const cfg = STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-400 font-bold">{r.mrn_number}</td>
                    <td className="py-2.5 px-3 text-zinc-200">{r.site_name}</td>
                    <td className="py-2.5 px-3"><span className={`font-bold text-[10px] ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span></td>
                    <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate">{r.purpose||"—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{r.required_by_date||"—"}</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">{r.total_items}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>setViewReq(r)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400"><Eye className="w-3.5 h-3.5"/></button>
                        {r.status==="DRAFT" && <button onClick={()=>doAction(r.id,"submit")} disabled={actionLoading===r.id+"submit"} className="px-2 py-1 rounded-lg text-[10px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black disabled:opacity-50">Submit</button>}
                        {r.status==="SUBMITTED" && <>
                          <button onClick={()=>doAction(r.id,"approve")} disabled={!!actionLoading} className="px-2 py-1 rounded-lg text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50">Approve</button>
                          <button onClick={()=>doAction(r.id,"reject")} disabled={!!actionLoading} className="px-2 py-1 rounded-lg text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50">Reject</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">New Material Requisition</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Site *</label>
                <select value={form.site} onChange={e=>setForm((p:any)=>({...p,site:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500">
                  <option value="">Select site...</option>
                  {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Priority</label>
                <select value={form.priority} onChange={e=>setForm((p:any)=>({...p,priority:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500">
                  {["LOW","NORMAL","HIGH","URGENT"].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Required By Date</label>
                <input type="date" value={form.required_by_date} onChange={e=>setForm((p:any)=>({...p,required_by_date:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Purpose / Notes</label>
                <textarea value={form.purpose} onChange={e=>setForm((p:any)=>({...p,purpose:e.target.value}))} rows={3} className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"/>
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3 justify-end">
              <button onClick={()=>setShowModal(false)} className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">Cancel</button>
              <button onClick={save} disabled={saving||!form.site} className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer">
                {saving?"Creating...":"Create MRN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
