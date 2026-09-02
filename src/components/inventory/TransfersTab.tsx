"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { SiteTransferResult } from "@/domains/inventory/types";

export function TransfersTab() {
  const [sites, setSites] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SiteTransferResult | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ from_site:"", to_site:"", material:"", qty:"", remarks:"", batch_no:"" });

  useEffect(() => {
    Promise.all([inventoryApi.getSites(), inventoryApi.getMaterials(), inventoryApi.getStockLedger()])
      .then(([s, m, l]) => { setSites(s); setMaterials(m); setLedger(l); })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!form.from_site || !form.to_site || !form.material || !form.qty) { setError("All fields required"); return; }
    if (form.from_site === form.to_site) { setError("From and To site must be different"); return; }
    setSaving(true); setError(""); setResult(null);
    try {
      const r = await inventoryApi.createTransfer({ from_site: form.from_site, to_site: form.to_site, material: form.material, qty: parseFloat(form.qty), remarks: form.remarks, batch_no: form.batch_no });
      setResult(r);
      setForm({ from_site:"", to_site:"", material:"", qty:"", remarks:"", batch_no:"" });
      const l = await inventoryApi.getStockLedger();
      setLedger(l);
    } catch(e:any) { setError(e?.message || "Transfer failed"); }
    finally { setSaving(false); }
  };

  const transferLedger = ledger.filter(e => e.txn_type === "TRANSFER_OUT" || e.txn_type === "TRANSFER_IN");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><ArrowLeftRight className="w-6 h-6"/></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Inter-Site Stock Transfer</h1>
          <p className="text-xs text-zinc-400">Move materials between construction sites and godowns with full ledger audit trail</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold"><CheckCircle className="w-5 h-5"/>Transfer Completed Successfully</div>
          <p className="text-xs text-emerald-400">{result.qty} {result.unit} of <strong>{result.material}</strong> transferred from <strong>{result.from_site}</strong> → <strong>{result.to_site}</strong></p>
          <p className="text-[10px] text-zinc-500 font-mono">OUT Ledger: {result.out_ledger_id} | IN Ledger: {result.in_ledger_id}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Form */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <h2 className="font-bold text-white text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-amber-400"/>New Transfer</h2>
          {[
            { label:"From Site *", key:"from_site", type:"select", opts:sites },
            { label:"To Site *", key:"to_site", type:"select", opts:sites },
            { label:"Material *", key:"material", type:"select", opts:materials.map((m:any)=>({id:m.id,name:`[${m.item_code}] ${m.name}`,code:m.unit})) },
          ].map(f=>(
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-zinc-400 mb-1">{f.label}</label>
              <select value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500">
                <option value="">Select...</option>
                {f.opts.map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">Quantity *</label>
            <input type="number" min="0.001" step="0.001" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500" placeholder="0.000"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">Batch No.</label>
            <input value={form.batch_no} onChange={e=>setForm(p=>({...p,batch_no:e.target.value}))} className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500" placeholder="Optional"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-1">Remarks</label>
            <textarea value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} rows={2} className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"/>
          </div>
          <button onClick={submit} disabled={saving||loading} className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
            <ArrowLeftRight className="w-4 h-4"/>
            {saving ? "Processing Transfer..." : "Execute Transfer"}
          </button>
        </div>

        {/* Transfer History */}
        <div className="lg:col-span-2 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
          <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Transfer Ledger History — {transferLedger.length} Entries</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
                <tr>{["Type","Material","Site","Qty","Date","Remarks"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transferLedger.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-zinc-500">No transfers yet.</td></tr>
                : transferLedger.slice(0,50).map(e=>(
                  <tr key={e.id} className="hover:bg-zinc-900/30">
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.txn_type==="TRANSFER_OUT"?"bg-orange-500/10 text-orange-400":"bg-blue-500/10 text-blue-400"}`}>
                        {e.txn_type==="TRANSFER_OUT"?"OUT":"IN"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-200">{e.material_name}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{e.site_name}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-300 font-mono">{Number(e.qty).toLocaleString()} {e.material_unit}</td>
                    <td className="py-2.5 px-3 text-zinc-500 text-[10px]">{new Date(e.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate">{e.remarks||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
