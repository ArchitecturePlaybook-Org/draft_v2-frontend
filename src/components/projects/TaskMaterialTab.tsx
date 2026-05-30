import React, { useState, useEffect } from "react";
import { Task, BOQItem } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

interface TaskMaterialTabProps {
  task: Task;
  isMatrixTask: boolean;
  estimatedCost: number;
  burnCost: number;
  variance: number;
  isOverBudget: boolean;
  onRefreshTask: () => Promise<void>;
  isContractor: boolean;
  isAdmin: boolean;
  phaseId?: number; // pass this if available
}

export const TaskMaterialTab: React.FC<TaskMaterialTabProps> = ({
  task,
  isMatrixTask,
  estimatedCost,
  burnCost,
  variance,
  isOverBudget,
  onRefreshTask,
  isContractor,
  isAdmin,
  phaseId,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [totalCosts, setTotalCosts] = useState<Record<number, string>>({});
  const [receipts, setReceipts] = useState<Record<number, File>>({});
  
  // New Allocation State
  const [newAllocBoq, setNewAllocBoq] = useState("");
  const [newAllocQty, setNewAllocQty] = useState("");
  const [newAllocNotes, setNewAllocNotes] = useState("");
  const [newAllocDate, setNewAllocDate] = useState("");

  const handleLogConsumption = async (allocId: number | null, boqItemId: number) => {
    // We use boqItemId as the key in quantities and totalCosts if allocId is null
    const stateKey = allocId !== null ? allocId : `new_${boqItemId}`;
    const requestQty = parseFloat(quantities[stateKey as any] || "");
    const cost = parseFloat(totalCosts[stateKey as any] || "");
    
    if (isNaN(requestQty) || requestQty <= 0) {
      toast.error("Please enter a valid positive quantity.");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error("Please enter a valid total cost.");
      return;
    }

    setIsUpdating(true);
    try {
      await projectsApi.logMaterialConsumption(
        allocId, 
        requestQty,
        cost,
        receipts[stateKey as any] || null,
        task.uid,
        boqItemId
      );
      
      // Clear inputs on success
      setQuantities(prev => ({ ...prev, [stateKey]: "" }));
      setTotalCosts(prev => ({ ...prev, [stateKey]: "" }));
      setReceipts(prev => {
        const next = { ...prev };
        delete next[stateKey as any];
        return next;
      });
      
      await onRefreshTask();
      toast.success("Material consumption logged successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to log consumption.");
    } finally {
      setIsUpdating(false);
    }
  };

  const mergedItems = task.material_allocations || [];



  if (!isMatrixTask) {
    return (
      <div className="bg-white rounded-2xl border border-surface-200 p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-surface-400">Bill of Quantities is only available for field Matrix tasks.</p>
        <p className="text-xs text-surface-400 mt-2">Generic task budget is: ${Number(task.cost || 0).toLocaleString()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Estimated Cost", value: `$${estimatedCost.toLocaleString("en", { minimumFractionDigits: 2 })}`, color: "text-primary", bg: "bg-white" },
          { label: "Actual Burn", value: `$${burnCost.toLocaleString("en", { minimumFractionDigits: 2 })}`, color: "text-primary", bg: "bg-white" },
          {
            label: "Variance",
            value: `${variance >= 0 ? "+" : ""}$${Math.abs(variance).toLocaleString("en", { minimumFractionDigits: 2 })}`,
            color: isOverBudget ? "text-red-600" : "text-emerald-600",
            bg: isOverBudget ? "bg-red-50" : "bg-emerald-50",
          },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-2xl border border-surface-200 p-5 shadow-sm`}>
            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-2">{m.label}</p>
            <p className={`text-2xl font-black tabular-nums ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">THIS TASK'S ALLOCATED MATERIAL LEDGER</p>
          </div>
        
        {mergedItems.length > 0 ? (
          <div className="space-y-6">
            {mergedItems.map((alloc, index) => {
              const stateKey = alloc.id !== null ? alloc.id : `new_${alloc.boq_item}`;
              const maxQty = alloc.allocated_qty === "Auto (Evenly Divided)" ? Infinity : parseFloat(alloc.allocated_qty as any);
              const requestedQty = parseFloat(quantities[stateKey as any] ?? "0");
              const isOverLimit = maxQty !== Infinity && requestedQty > maxQty;

              return (
                <div key={stateKey} className="border border-surface-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Header / Info Section */}
                  <div className="p-5 border-b border-surface-100 bg-surface-50 flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-extrabold text-primary text-base">{alloc.boq_item_detail?.material_code}</h4>
                      <ul className="mt-2 space-y-1 text-sm text-surface-500 font-medium">
                        <li>• Dynamic Target for this Task: <strong className="text-primary">{alloc.allocated_qty}</strong></li>
                        {alloc.suggested_consumption_range && (
                          <li>• Suggested Range: <strong className="text-primary">{alloc.suggested_consumption_range.min.toFixed(2)} - {alloc.suggested_consumption_range.max.toFixed(2)}</strong> (+/- 20%)</li>
                        )}
                      </ul>
                    </div>
                    {alloc.is_logged ? (
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                        alloc.is_anomaly ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}>
                        {alloc.is_anomaly ? "🚨 Anomaly Flagged" : "✅ Logged"}
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border bg-surface-100 text-surface-600 border-surface-200">
                        ⏳ Pending Log
                      </span>
                    )}
                  </div>

                  {/* Log Consumption Section (Always visible to allow multiple line items) */}
                  <div className="p-5 space-y-4 border-b border-surface-100">
                    <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest flex items-center gap-2">
                      📝 Log Actual Consumption
                    </p>
                    
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-primary">Actual Quantity Consumed</label>
                          <input 
                            type="number"
                            value={quantities[stateKey as any] ?? ""}
                            placeholder="e.g. 25.5"
                            onChange={(e) => setQuantities({ ...quantities, [stateKey as any]: e.target.value })}
                            className="w-full h-10 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-primary">Total Cost ($)</label>
                          <input 
                            type="number"
                            value={totalCosts[stateKey as any] ?? ""}
                            placeholder="e.g. 500.00"
                            onChange={(e) => setTotalCosts({ ...totalCosts, [stateKey as any]: e.target.value })}
                            className="w-full h-10 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium bg-white"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-primary">Upload Receipt (Optional)</label>
                          <input 
                            type="file"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setReceipts({ ...receipts, [stateKey as any]: e.target.files[0] });
                              }
                            }}
                            className="w-full h-10 border border-surface-200 bg-white rounded-xl px-3 outline-none focus:border-accent text-sm font-medium py-2 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-surface-100 file:text-surface-700 hover:file:bg-surface-200"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => handleLogConsumption(alloc.id, alloc.boq_item)}
                          disabled={isUpdating}
                          className="w-full h-11 bg-primary text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          📝 Submit Usage Log
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Read-only History of logs */}
                  {alloc.logs && alloc.logs.length > 0 && (
                    <div className="p-5 bg-surface-50">
                      <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">Logged Usage History</p>
                      <div className="space-y-3">
                        {alloc.logs.map((log: any) => (
                          <div key={log.id} className="grid grid-cols-4 gap-4 text-sm font-medium text-surface-600 bg-white p-3 rounded-xl border border-surface-200 shadow-sm">
                            <div><span className="text-surface-400 block text-xs">Date</span> {new Date(log.created_at).toLocaleDateString()}</div>
                            <div><span className="text-surface-400 block text-xs">Qty Consumed</span> <strong className="text-primary">{log.consumed_qty}</strong></div>
                            <div><span className="text-surface-400 block text-xs">Cost</span> <strong className="text-emerald-600">${log.total_cost}</strong></div>
                            <div>
                              <span className="text-surface-400 block text-xs">Receipt</span>
                              {log.receipt ? (
                                <a href={log.receipt} target="_blank" rel="noreferrer" className="text-accent underline">View Proof</a>
                              ) : "None"}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-surface-200 flex justify-between items-center text-sm">
                        <span className="font-bold text-surface-500">Total Consumption:</span>
                        <div className="flex gap-6">
                          <span>Qty: <strong className={alloc.is_anomaly ? "text-red-600" : "text-primary"}>{alloc.actual_consumed_qty}</strong></span>
                          <span>Target: <strong className="text-surface-600">{alloc.allocated_qty}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-surface-50 rounded-xl border border-surface-100 mt-4">
            <p className="text-sm font-medium text-surface-400">No material apportionments found for this task.</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
