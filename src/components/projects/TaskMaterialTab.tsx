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
  const [dates, setDates] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  
  // New Allocation State
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [newAllocBoq, setNewAllocBoq] = useState("");
  const [newAllocQty, setNewAllocQty] = useState("");
  const [newAllocNotes, setNewAllocNotes] = useState("");
  const [newAllocDate, setNewAllocDate] = useState("");

  useEffect(() => {
    projectsApi.getBOQItems().then(items => {
      // Filter BOQ items to only include global items (phase is null) or items matching the task's phase
      const filtered = items.filter(item => {
        if (!item.phase) return true;
        return item.phase === phaseId;
      });
      // If phaseId is provided, sort phase-specific items first
      const sorted = filtered.sort((a, b) => {
        if (a.phase === phaseId && b.phase !== phaseId) return -1;
        if (a.phase !== phaseId && b.phase === phaseId) return 1;
        return 0;
      });
      setBoqItems(sorted);
    }).catch(console.error);
  }, [phaseId]);

  const handleLinkMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllocBoq || !newAllocQty) return;
    setIsUpdating(true);
    try {
      await projectsApi.createMaterialAllocation({
        task: task.uid,
        boq_item: parseInt(newAllocBoq),
        allocated_qty: newAllocQty,
        req_status: "REQUISITIONED",
        notes: newAllocNotes,
        expected_on_site_by: newAllocDate || undefined
      });
      toast.success("Material allocated & requisitioned successfully.");
      setNewAllocBoq("");
      setNewAllocQty("");
      setNewAllocNotes("");
      setNewAllocDate("");
      await onRefreshTask();
    } catch (err: any) {
      toast.error(err.message || "Failed to link material.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTriggerBuySignal = async (allocId: number, maxAllocated: string | number) => {
    const requestQty = parseFloat(quantities[allocId] || maxAllocated.toString());
    const maxQty = parseFloat(maxAllocated.toString());
    
    if (isNaN(requestQty) || requestQty <= 0) {
      toast.error("Please enter a valid positive quantity.");
      return;
    }
    if (requestQty > maxQty) {
      toast.error("Cannot request more than the allocated quantity.");
      return;
    }

    setIsUpdating(true);
    try {
      await projectsApi.updateMaterialAllocationStatus(
        allocId, 
        "REQUISITIONED", 
        notes[allocId] || "", 
        dates[allocId] || ""
      );
      await onRefreshTask();
      toast.success("Buy Signal Triggered! Procurement notified.");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger buy signal.");
    } finally {
      setIsUpdating(false);
    }
  };

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
        {/* Link New Material Form */}
        <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
          <h4 className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-3">Link New Material</h4>
          <form onSubmit={handleLinkMaterial} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-primary mb-1">Select BOQ Item</label>
              <select 
                value={newAllocBoq}
                onChange={e => setNewAllocBoq(e.target.value)}
                className="w-full h-10 border border-surface-300 rounded-lg text-sm font-bold bg-white focus:border-accent outline-none px-3"
                required
              >
                <option value="">-- Select Material --</option>
                {boqItems.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.material_code} {b.phase === phaseId ? "(Matched Phase)" : b.phase ? `(Phase ${b.phase})` : "(Global)"} - Budget: {b.total_budgeted_qty}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs font-bold text-primary mb-1">Quantity</label>
              <input 
                type="number"
                min="0.1"
                step="0.1"
                required
                value={newAllocQty}
                onChange={e => setNewAllocQty(e.target.value)}
                className="w-full h-10 border border-surface-300 rounded-lg text-sm font-bold bg-white focus:border-accent outline-none px-3"
                placeholder="Qty"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-bold text-primary mb-1">Expected By</label>
              <input 
                type="date"
                value={newAllocDate}
                onChange={e => setNewAllocDate(e.target.value)}
                className="w-full h-10 border border-surface-300 rounded-lg text-sm font-bold bg-white focus:border-accent outline-none px-3"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-primary mb-1">Notes</label>
              <input 
                type="text"
                value={newAllocNotes}
                onChange={e => setNewAllocNotes(e.target.value)}
                className="w-full h-10 border border-surface-300 rounded-lg text-sm font-bold bg-white focus:border-accent outline-none px-3"
                placeholder="Optional notes"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="h-10 px-6 bg-accent text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-accent/90 disabled:opacity-50 whitespace-nowrap"
            >
              + Allocate
            </button>
          </form>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">THIS TASK'S ALLOCATED MATERIAL LEDGER</p>
          </div>
        
        {task.material_allocations && task.material_allocations.length > 0 ? (
          <div className="space-y-6">
            {task.material_allocations.map(alloc => {
              const maxQty = parseFloat(alloc.allocated_qty as any);
              const requestedQty = parseFloat(quantities[alloc.id] ?? alloc.allocated_qty.toString());
              const isOverLimit = requestedQty > maxQty;

              return (
                <div key={alloc.id} className="border border-surface-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Header / Info Section */}
                  <div className="p-5 border-b border-surface-100 bg-surface-50 flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-extrabold text-primary text-base">{alloc.boq_item_detail?.material_code}</h4>
                      <ul className="mt-2 space-y-1 text-sm text-surface-500 font-medium">
                        <li>• Target Qty for this Room: <strong className="text-primary">{alloc.allocated_qty}</strong></li>
                        <li>• Master BOQ Remaining: <strong className="text-primary">{alloc.boq_item_detail?.remaining_budget}</strong></li>
                      </ul>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                      alloc.req_status === "DRAFT" ? "bg-surface-100 text-surface-600 border-surface-200" :
                      alloc.req_status === "REQUISITIONED" ? "bg-amber-50 text-amber-600 border-amber-200" :
                      alloc.req_status === "ORDERED" ? "bg-blue-50 text-blue-600 border-blue-200" :
                      "bg-emerald-50 text-emerald-600 border-emerald-200"
                    }`}>
                      {alloc.req_status === "DRAFT" ? "⏳ AWAITING FIELD BUY SIGNAL" : 
                       alloc.req_status === "REQUISITIONED" ? "⏳ AWAITING PO" : alloc.req_status}
                    </span>
                  </div>

                  {/* Buy Signal Section */}
                  {alloc.req_status === "DRAFT" && (
                    <div className="p-5 space-y-4">
                      <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest flex items-center gap-2">
                        🛒 Trigger Partial Procurement (Buy Signal)
                      </p>
                      
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-primary">Requested Batch Qty</label>
                            <input 
                              type="number"
                              value={quantities[alloc.id] ?? alloc.allocated_qty}
                              onChange={(e) => setQuantities({ ...quantities, [alloc.id]: e.target.value })}
                              className={`w-full h-10 border rounded-xl px-3 outline-none focus:border-accent text-sm font-medium ${
                                isOverLimit ? "border-red-400 bg-red-50 text-red-600 focus:border-red-500" : "border-surface-200 bg-white"
                              }`}
                            />
                            {isOverLimit && (
                              <p className="text-xs font-bold text-red-500 mt-1">
                                ⚠️ Max allocation for this specific spatial zone is {alloc.allocated_qty}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-primary">Expected On Site By</label>
                            <input 
                              type="date"
                              value={dates[alloc.id] || alloc.expected_on_site_by || ""}
                              onChange={(e) => setDates({ ...dates, [alloc.id]: e.target.value })}
                              className="w-full h-10 border border-surface-200 bg-white rounded-xl px-3 outline-none focus:border-accent text-sm font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-primary">Notes</label>
                          <input 
                            type="text"
                            placeholder="e.g. Stack blocks near the North lift core area."
                            value={notes[alloc.id] || alloc.notes || ""}
                            onChange={(e) => setNotes({ ...notes, [alloc.id]: e.target.value })}
                            className="w-full h-10 border border-surface-200 bg-white rounded-xl px-3 outline-none focus:border-accent text-sm font-medium"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleTriggerBuySignal(alloc.id, alloc.allocated_qty as any)}
                            disabled={isUpdating || isOverLimit}
                            className="w-full h-11 bg-primary text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            📥 Trigger Buy Signal & Transmit to Procurement Ledger
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Read-only details if already requested */}
                  {alloc.req_status !== "DRAFT" && (
                    <div className="p-5 space-y-3 bg-surface-50 border-t border-surface-100">
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-surface-600">
                        <div><span className="text-surface-400">Expected:</span> {alloc.expected_on_site_by || "Not specified"}</div>
                        <div><span className="text-surface-400">Notes:</span> {alloc.notes || "None"}</div>
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
