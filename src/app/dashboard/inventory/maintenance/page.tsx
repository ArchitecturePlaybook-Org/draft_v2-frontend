"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, RefreshCw, AlertTriangle, Zap, Calendar, DollarSign } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { EquipmentMaintenanceLog, ServiceType } from "@/domains/inventory/types";

const SERVICE_TYPE_CONFIG: Record<ServiceType, {label:string;color:string;icon:React.ReactNode}> = {
  SCHEDULED:   {label:"Scheduled",   color:"text-blue-400",   icon:<Calendar className="w-3.5 h-3.5"/>},
  BREAKDOWN:   {label:"Breakdown",   color:"text-red-400",    icon:<Zap className="w-3.5 h-3.5"/>},
  CALIBRATION: {label:"Calibration", color:"text-amber-400",  icon:<Wrench className="w-3.5 h-3.5"/>},
  INSPECTION:  {label:"Inspection",  color:"text-teal-400",   icon:<AlertTriangle className="w-3.5 h-3.5"/>},
  OVERHAUL:    {label:"Overhaul",    color:"text-purple-400", icon:<Wrench className="w-3.5 h-3.5"/>},
};

export default function MaintenancePage() {
  const [logs, setLogs] = useState<EquipmentMaintenanceLog[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [form, setForm] = useState<any>({ equipment:"", service_type:"SCHEDULED", service_date: new Date().toISOString().split("T")[0], service_by:"", service_cost:"", parts_replaced:"", downtime_days:0, description:"", next_service_due:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, e] = await Promise.all([inventoryApi.getMaintenanceLogs(), inventoryApi.getEquipment()]);
      setLogs(l); setEquipment(e);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setError("");
    try { await inventoryApi.createMaintenanceLog({ ...form, service_cost: parseFloat(form.service_cost)||0 }); setShowModal(false); load(); }
    catch(e:any) { setError(e?.message||"Save failed"); }
    finally { setSaving(false); }
  };

  const del = async (id:string) => {
    if (!confirm("Delete this maintenance record?")) return;
    try { await inventoryApi.deleteMaintenanceLog(id); load(); }
    catch { setError("Delete failed"); }
  };

  const totalCost = logs.reduce((s,l)=>s+Number(l.service_cost||0),0);
  const totalDowntime = logs.reduce((s,l)=>s+Number(l.downtime_days||0),0);
  const filtered = typeFilter === "ALL" ? logs : logs.filter(l=>l.service_type===typeFilter);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><Wrench className="w-6 h-6"/></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Equipment Maintenance Log</h1>
            <p className="text-xs text-zinc-400">Service history, breakdown records, and maintenance cost tracking for all equipment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Types</option>
            {Object.entries(SERVICE_TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>setShowModal(true)} className="h-9 px-4 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer">
            <Plus className="w-4 h-4"/> Log Service
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:"Total Records",  value:logs.length,                 color:"text-zinc-200"},
          {label:"Breakdowns",     value:logs.filter(l=>l.service_type==="BREAKDOWN").length, color:"text-red-400"},
          {label:"Total Cost",     value:`₹${totalCost.toLocaleString("en-IN")}`,    color:"text-amber-400"},
          {label:"Total Downtime", value:`${totalDowntime}d`,         color:"text-orange-400"},
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-md">
        <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Service History — {filtered.length} Records</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
              <tr>{["Equipment","Service Type","Date","Next Due","Service By","Cost","Downtime","Parts","Actions"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? <tr><td colSpan={9} className="py-12 text-center text-zinc-500">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-zinc-500">No maintenance records. Log your first service.</td></tr>
              : filtered.map(l=>{
                const cfg = SERVICE_TYPE_CONFIG[l.service_type];
                return (
                  <tr key={l.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-white">{l.equipment_name}</div>
                      <div className="font-mono text-[10px] text-zinc-500">{l.equipment_code}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`flex items-center gap-1.5 font-bold text-[10px] ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{l.service_date}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{l.next_service_due||"—"}</td>
                    <td className="py-2.5 px-3 text-zinc-300">{l.service_by||"—"}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">₹{Number(l.service_cost||0).toLocaleString("en-IN")}</td>
                    <td className="py-2.5 px-3 text-orange-300 font-bold">{l.downtime_days}d</td>
                    <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate">{l.parts_replaced||"—"}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={()=>del(l.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 text-[10px] transition-colors">Delete</button>
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">Log Maintenance / Service</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Equipment *</label>
                  <select value={form.equipment} onChange={e=>setForm((p:any)=>({...p,equipment:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500">
                    <option value="">Select equipment...</option>
                    {equipment.map(e=><option key={e.id} value={e.id}>[{e.equipment_code}] {e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Service Type *</label>
                  <select value={form.service_type} onChange={e=>setForm((p:any)=>({...p,service_type:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500">
                    {Object.entries(SERVICE_TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Service Date *</label>
                  <input type="date" value={form.service_date} onChange={e=>setForm((p:any)=>({...p,service_date:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Next Service Due</label>
                  <input type="date" value={form.next_service_due} onChange={e=>setForm((p:any)=>({...p,next_service_due:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Service Cost (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.service_cost} onChange={e=>setForm((p:any)=>({...p,service_cost:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Downtime (Days)</label>
                  <input type="number" min="0" value={form.downtime_days} onChange={e=>setForm((p:any)=>({...p,downtime_days:parseInt(e.target.value)||0}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Service Centre / Engineer</label>
                  <input value={form.service_by} onChange={e=>setForm((p:any)=>({...p,service_by:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500" placeholder="e.g. XYZ Service Centre"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Parts Replaced</label>
                  <input value={form.parts_replaced} onChange={e=>setForm((p:any)=>({...p,parts_replaced:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500" placeholder="e.g. Oil filter, hydraulic seals"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Description / Notes</label>
                  <textarea value={form.description} onChange={e=>setForm((p:any)=>({...p,description:e.target.value}))} rows={3} className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"/>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3 justify-end">
              <button onClick={()=>setShowModal(false)} className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">Cancel</button>
              <button onClick={save} disabled={saving||!form.equipment} className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer">
                {saving?"Saving...":"Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
