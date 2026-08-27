"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Plus, RefreshCw, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { StockAudit, AuditStatus } from "@/domains/inventory/types";

const STATUS_CONFIG: Record<AuditStatus, {label:string;color:string;bg:string}> = {
  OPEN:      {label:"Open",      color:"text-blue-400",    bg:"bg-blue-500/10"},
  REVIEW:    {label:"Review",    color:"text-amber-400",   bg:"bg-amber-500/10"},
  POSTED:    {label:"Posted",    color:"text-emerald-400", bg:"bg-emerald-500/10"},
  CANCELLED: {label:"Cancelled", color:"text-zinc-400",    bg:"bg-zinc-800"},
};

export default function AuditPage() {
  const [audits, setAudits] = useState<StockAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ site:"", audit_date: new Date().toISOString().split("T")[0], notes:"" });
  const [saving, setSaving] = useState(false);
  const [viewAudit, setViewAudit] = useState<StockAudit|null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [posting, setPosting] = useState<string|null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([inventoryApi.getStockAudits(), inventoryApi.getSites()]);
      setAudits(a); setSites(s);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setError("");
    try { await inventoryApi.createStockAudit(form); setShowModal(false); load(); }
    catch(e:any) { setError(e?.message||"Save failed"); }
    finally { setSaving(false); }
  };

  const postVariances = async (id: string) => {
    if (!confirm("Post all variances as ledger adjustments? This cannot be undone.")) return;
    setPosting(id);
    try { const updated = await inventoryApi.postAuditVariances(id); setAudits(prev=>prev.map(a=>a.id===id?updated:a)); }
    catch(e:any) { setError(e?.message||"Post failed"); }
    finally { setPosting(null); }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><ClipboardCheck className="w-6 h-6"/></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Physical Stock Audit</h1>
            <p className="text-xs text-zinc-400">Conduct physical inventory counts, verify variances, and post adjustments to the ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>setShowModal(true)} className="h-9 px-4 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer">
            <Plus className="w-4 h-4"/> New Audit
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["OPEN","REVIEW","POSTED","CANCELLED"] as AuditStatus[]).map(s=>{
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-xs text-zinc-500">{cfg.label}</p>
              <p className={`text-2xl font-black mt-1 ${cfg.color}`}>{audits.filter(a=>a.status===s).length}</p>
            </div>
          );
        })}
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-md">
        <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Audit Register — {audits.length} Sessions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
              <tr>{["Audit No.","Site","Date","Status","Items","Conducted By","Posted At","Actions"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? <tr><td colSpan={8} className="py-12 text-center text-zinc-500">Loading...</td></tr>
              : audits.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-zinc-500">No audits yet. Start your first physical count.</td></tr>
              : audits.map(a=>{
                const cfg = STATUS_CONFIG[a.status];
                return (
                  <tr key={a.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-400 font-bold">{a.audit_number}</td>
                    <td className="py-2.5 px-3 text-zinc-200">{a.site_name}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{a.audit_date}</td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">{a.items?.length||0}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{a.conducted_by_name||"—"}</td>
                    <td className="py-2.5 px-3 text-zinc-500 text-[10px]">{a.posted_at ? new Date(a.posted_at).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>setViewAudit(a)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400"><Eye className="w-3.5 h-3.5"/></button>
                        {(a.status==="OPEN"||a.status==="REVIEW") && (
                          <button onClick={()=>postVariances(a.id)} disabled={posting===a.id} className="px-2 py-1 rounded-lg text-[10px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black disabled:opacity-50 cursor-pointer">
                            {posting===a.id?"Posting...":"Post Variances"}
                          </button>
                        )}
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
              <h2 className="font-bold text-white text-sm">New Stock Audit Session</h2>
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
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Audit Date *</label>
                <input type="date" value={form.audit_date} onChange={e=>setForm((p:any)=>({...p,audit_date:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm((p:any)=>({...p,notes:e.target.value}))} rows={3} className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"/>
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3 justify-end">
              <button onClick={()=>setShowModal(false)} className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">Cancel</button>
              <button onClick={save} disabled={saving||!form.site} className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer">
                {saving?"Creating...":"Start Audit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
