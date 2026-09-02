"use client";
import React, { useState, useEffect } from "react";
import { BarChart3, TrendingDown, DollarSign, FileText, Calendar, Download, RefreshCw } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";

type ReportTab = "variance" | "consumption" | "cost" | "po";

export function ReportsTab() {
  const [activeTab, setActiveTab] = useState<ReportTab>("variance");
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      inventoryApi.getMaterialIssues ? inventoryApi.getMaterialIssues() : Promise.resolve([]),
      inventoryApi.getTaskRequirements ? inventoryApi.getTaskRequirements() : Promise.resolve([]),
      inventoryApi.getPurchaseOrders(),
      inventoryApi.getStockLedger(),
    ]).then(([iss,req,po,led])=>{ setIssues(iss); setRequirements(req); setPos(po); setLedger(led); })
      .finally(()=>setLoading(false));
  }, []);

  const TABS = [
    { id:"variance" as ReportTab, label:"Planned vs. Actual", icon:<TrendingDown className="w-4 h-4"/>, color:"text-red-400" },
    { id:"consumption" as ReportTab, label:"Consumption Report", icon:<BarChart3 className="w-4 h-4"/>, color:"text-blue-400" },
    { id:"cost" as ReportTab, label:"Cost vs. Budget", icon:<DollarSign className="w-4 h-4"/>, color:"text-emerald-400" },
    { id:"po" as ReportTab, label:"PO Register", icon:<FileText className="w-4 h-4"/>, color:"text-purple-400" },
  ];

  // Variance: requirements vs issued
  const varianceData = requirements.filter((r:any)=>r.material_name).map((r:any)=>({
    material: r.material_name,
    unit: r.material_unit,
    planned: Number(r.planned_qty||0),
    issued: Number(r.issued_qty||0),
    consumed: Number(r.consumed_qty||0),
    variance: Number(r.planned_qty||0) - Number(r.issued_qty||0),
    pct: r.fulfillment_percentage,
  }));

  // Consumption: ledger OUT entries in date range
  const consumptionData: Record<string,{material:string;unit:string;total:number;cost:number}> = {};
  ledger.filter((e:any)=>e.txn_type==="OUT"&&e.created_at>=dateFrom&&e.created_at<=dateTo+"T23:59:59").forEach((e:any)=>{
    if (!consumptionData[e.material_id]) consumptionData[e.material_id] = { material:e.material_name, unit:e.material_unit, total:0, cost:0 };
    consumptionData[e.material_id].total += Number(e.qty||0);
    consumptionData[e.material_id].cost += Number(e.total_value||0);
  });
  const consumption = Object.values(consumptionData).sort((a,b)=>b.cost-a.cost);

  const totalSpent = ledger.filter((e:any)=>e.txn_type==="IN").reduce((s:number,e:any)=>s+Number(e.total_value||0),0);
  const poApproved = pos.filter((p:any)=>["APPROVED","ISSUED","FULFILLED"].includes(p.status));
  const poValue = pos.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0);

  const printPO = (po: any) => {
    const w = window.open("","_blank");
    if (!w) return;
    w.document.write(`<html><head><title>PO ${po.po_number}</title><style>body{font-family:sans-serif;padding:32px;color:#111}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}@media print{button{display:none}}</style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:24px">
        <div><h1>PURCHASE ORDER</h1><h2 style="color:#666">${po.po_number}</h2></div>
        <div style="text-align:right;font-size:14px"><strong>Status:</strong> ${po.status}<br/><strong>Date:</strong> ${new Date(po.created_at).toLocaleDateString("en-IN")}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;font-size:14px">
        <div><strong>Vendor:</strong><br/>${po.vendor_name||"—"}</div>
        <div><strong>Delivery Site:</strong><br/>${po.site_name||"—"}</div>
      </div>
      <table><thead><tr><th>#</th><th>Material</th><th>Unit</th><th>Qty</th><th>Rate</th><th>GST%</th><th>Total</th></tr></thead>
      <tbody>${(po.items||[]).map((item:any,i:number)=>`<tr><td>${i+1}</td><td>${item.material_name}</td><td>${item.material_unit}</td><td>${item.qty}</td><td>₹${Number(item.rate).toFixed(2)}</td><td>${item.tax_percent}%</td><td>₹${Number(item.total_amount).toLocaleString("en-IN")}</td></tr>`).join("")}</tbody>
      </table>
      <div style="margin-top:24px;text-align:right;font-size:16px">
        <div>Subtotal: ₹${Number(po.subtotal_amount||0).toLocaleString("en-IN")}</div>
        <div>GST: ₹${Number(po.tax_amount||0).toLocaleString("en-IN")}</div>
        <div style="font-size:20px;font-weight:bold">Total: ₹${Number(po.total_amount||0).toLocaleString("en-IN")}</div>
      </div>
      <div style="margin-top:32px;font-size:12px;color:#666">${po.terms_and_conditions||""}</div>
      <button onclick="window.print()" style="margin-top:24px;padding:8px 20px;background:#333;color:white;border:none;border-radius:4px;cursor:pointer">🖨 Print / Save PDF</button>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><BarChart3 className="w-6 h-6"/></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Inventory Reports Hub</h1>
          <p className="text-xs text-zinc-400">Variance analysis, consumption trends, cost tracking, and PO exports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-fit">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab===t.id?"bg-zinc-800 text-white shadow-sm":"text-zinc-500 hover:text-zinc-300"}`}>
            <span className={activeTab===t.id?t.color:""}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:"Total Material Spend",value:`₹${totalSpent.toLocaleString("en-IN",{maximumFractionDigits:0})}`,color:"text-amber-400"},
          {label:"PO Value (All)",value:`₹${poValue.toLocaleString("en-IN",{maximumFractionDigits:0})}`,color:"text-purple-400"},
          {label:"Total Issues",value:issues.length,color:"text-blue-400"},
          {label:"Ledger Entries",value:ledger.length,color:"text-zinc-200"},
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "variance" && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
          <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Planned vs. Actual Variance — {varianceData.length} Materials</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
                <tr>{["Material","Unit","Planned Qty","Issued Qty","Consumed","Variance","Fulfillment %"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {varianceData.length===0 ? <tr><td colSpan={7} className="py-12 text-center text-zinc-500">No task requirement data found.</td></tr>
                : varianceData.map((r,i)=>(
                  <tr key={i} className="hover:bg-zinc-900/30">
                    <td className="py-2.5 px-3 text-zinc-200 font-medium">{r.material}</td>
                    <td className="py-2.5 px-3 text-zinc-500">{r.unit}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">{r.planned.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-300">{r.issued.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-orange-300">{r.consumed.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={r.variance>0?"text-emerald-400":r.variance<0?"text-red-400":"text-zinc-400"}>
                        {r.variance>0?"+":""}{r.variance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${Number(r.pct)>=100?"bg-emerald-500":Number(r.pct)>=60?"bg-amber-500":"bg-red-500"}`} style={{width:`${Math.min(Number(r.pct),100)}%`}}/>
                        </div>
                        <span className={`font-bold ${Number(r.pct)>=100?"text-emerald-400":Number(r.pct)>=60?"text-amber-400":"text-red-400"}`}>{Number(r.pct).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "consumption" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-zinc-500"/>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="h-8 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"/>
            <span className="text-zinc-500 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="h-8 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"/>
          </div>
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
            <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Material Consumption — {consumption.length} Materials in Period</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
                  <tr>{["Material","Unit","Total Consumed","Total Cost (₹)"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {consumption.length===0 ? <tr><td colSpan={4} className="py-12 text-center text-zinc-500">No consumption in selected period.</td></tr>
                  : consumption.map((c,i)=>(
                    <tr key={i} className="hover:bg-zinc-900/30">
                      <td className="py-2.5 px-3 text-zinc-200 font-medium">{c.material}</td>
                      <td className="py-2.5 px-3 text-zinc-500">{c.unit}</td>
                      <td className="py-2.5 px-3 font-mono text-orange-300 font-bold">{c.total.toFixed(3)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">₹{c.cost.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cost" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {label:"Total Material Receipt Value",value:`₹${ledger.filter((e:any)=>e.txn_type==="IN").reduce((s:number,e:any)=>s+Number(e.total_value||0),0).toLocaleString("en-IN",{maximumFractionDigits:0})}`,color:"text-emerald-400",sub:"Total value of materials received via GRN"},
              {label:"Total Material Issue Value",value:`₹${ledger.filter((e:any)=>e.txn_type==="OUT").reduce((s:number,e:any)=>s+Number(e.total_value||0),0).toLocaleString("en-IN",{maximumFractionDigits:0})}`,color:"text-red-400",sub:"Value of materials issued from store"},
              {label:"Total PO Value",value:`₹${poValue.toLocaleString("en-IN",{maximumFractionDigits:0})}`,color:"text-purple-400",sub:"Across all purchase orders"},
            ].map(c=>(
              <div key={c.label} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-500">{c.label}</p>
                <p className={`text-2xl font-black mt-2 ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
            <p className="font-bold text-zinc-200 mb-1">Cost Tracking Notes</p>
            <p>Full budget vs. actual cost comparison requires project budget data to be linked to material requirements. Set planned budgets on Task Material Requirements to enable full variance reporting.</p>
          </div>
        </div>
      )}

      {activeTab === "po" && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
          <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-200">Purchase Order Register — {pos.length} POs</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
                <tr>{["PO Number","Vendor","Site","Status","Total (₹)","Date","Actions"].map(h=><th key={h} className="py-2.5 px-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {pos.length===0 ? <tr><td colSpan={7} className="py-12 text-center text-zinc-500">No purchase orders found.</td></tr>
                : pos.map(po=>(
                  <tr key={po.id} className="hover:bg-zinc-900/30">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-purple-400 font-bold">{po.po_number}</td>
                    <td className="py-2.5 px-3 text-zinc-200">{po.vendor_name}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{po.site_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${po.status==="FULFILLED"?"bg-emerald-500/10 text-emerald-400":po.status==="CANCELLED"?"bg-red-500/10 text-red-400":"bg-blue-500/10 text-blue-400"}`}>{po.status}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">₹{Number(po.total_amount||0).toLocaleString("en-IN")}</td>
                    <td className="py-2.5 px-3 text-zinc-500 text-[10px]">{new Date(po.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={()=>printPO(po)} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors">
                        <Download className="w-3 h-3"/>PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
