import os

file_path = "src/components/projects/TaskExecutionModal.tsx"
content = """import React, { useState, useRef } from "react";
import { Task, ProjectAsset, TaskChecklistItem } from "@/types/projects";
import { usePermissions } from "@/hooks/use-permissions";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { FloorPlanGridViewer } from "./FloorPlanGridViewer";

interface TaskExecutionModalProps {
  task: Task;
  projectAssets: ProjectAsset[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

type TaskTab = "execution" | "boq" | "checklist" | "issues" | "drawing" | "comments";

export const TaskExecutionModal: React.FC<TaskExecutionModalProps> = ({ 
  task: initialTask, 
  projectAssets,
  onClose,
  onTaskUpdated
}) => {
  const { hasGlobalPermission, canEditProject } = usePermissions();
  const [task, setTask] = useState<Task>(initialTask);
  const [activeTab, setActiveTab] = useState<TaskTab>("execution");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);
  
  // Matrix specific state
  const [quantityDelta, setQuantityDelta] = useState("");
  const [newChecklistDesc, setNewChecklistDesc] = useState("");
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssueSeverity, setNewIssueSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const isMatrixTask = task.block !== null && task.block !== undefined;
  // TODO: Use true roles from auth context, using generic flags for now
  const isAdmin = true;
  const isContractor = false;
  const isQA = false;

  const refreshTask = async () => {
    try {
      const updated = await projectsApi.getTask(task.uid);
      setTask(updated);
      onTaskUpdated();
    } catch { /* silent */ }
  };

  const handleStatusChange = async (newStatus: string) => {
    const previousStatus = currentStatus;
    setCurrentStatus(newStatus as any);
    setIsUpdating(true);
    try {
      await projectsApi.updateTask(task.uid, { status: newStatus });
      await refreshTask();
    } catch (err) {
      console.error(err);
      setCurrentStatus(previousStatus);
      toast.error("Protocol failed: Could not synchronize status.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Matrix functions
  const handleLogProgress = async () => {
    const delta = parseFloat(quantityDelta);
    if (isNaN(delta) || delta <= 0) {
      toast.error("Enter a valid positive quantity.");
      return;
    }
    setIsUpdating(true);
    try {
      // Assuming a patch endpoint for progress
      const updated = await projectsApi.updateTask(task.uid, { 
        quantity_completed: (task.quantity_completed || 0) + delta 
      });
      setTask(updated);
      onTaskUpdated();
      setQuantityDelta("");
      toast.success(`+${delta} ${task.quantity_unit} logged successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to log progress.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleChecklist = async (item: TaskChecklistItem) => {
    try {
      await projectsApi.updateChecklistItem(item.id, !item.is_completed);
      await refreshTask();
    } catch (err: any) {
      toast.error(err.message || "Failed to update checklist.");
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistDesc.trim()) return;
    try {
      await projectsApi.createChecklistItem(task.uid, newChecklistDesc.trim(), (task.checklists || []).length);
      setNewChecklistDesc("");
      await refreshTask();
      toast.success("Checklist item added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add item.");
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !newIssueDesc.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setIsUpdating(true);
    try {
      const photoFile = photoRef.current?.files?.[0];
      await projectsApi.createTaskIssue({
        task: task.uid,
        title: newIssueTitle.trim(),
        description: newIssueDesc.trim(),
        severity: newIssueSeverity,
        photo_evidence: photoFile,
      });
      setNewIssueTitle("");
      setNewIssueDesc("");
      setNewIssueSeverity("MEDIUM");
      setShowIssueForm(false);
      await refreshTask();
      toast.success("Issue raised successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to raise issue.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      await projectsApi.resolveTaskIssue(issueId);
      await refreshTask();
      toast.success("Issue resolved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve issue.");
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/projects/1/tasks/${task.uid}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  // Matrix variables
  const checklists = task.checklists || [];
  const issues = task.issues || [];
  const uncheckedCount = checklists.filter((i: any) => !i.is_completed).length;
  const openIssueCount = issues.filter((i: any) => !i.is_resolved).length;
  
  const estimatedCost = parseFloat(task.estimated_cost as any) || 0;
  const burnCost = task.actual_burn_cost || 0;
  const variance = task.cost_variance || 0;
  const isOverBudget = variance < 0;

  const tabs: { id: TaskTab; label: string; hidden?: boolean }[] = [
    { id: "execution", label: isMatrixTask ? "Progress & Timeline" : "Execution Details" },
    { id: "checklist", label: "Checklists & QA" },
    { id: "issues", label: "Issue Tracker" },
    { id: "boq", label: "Cost & BoQ", hidden: isContractor },
    { id: "drawing", label: "BIM Context", hidden: !isMatrixTask },
    { id: "comments", label: "Communications" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in bg-surface-900/60 backdrop-blur-md overflow-hidden">
      <div className="bg-white w-full h-full md:w-[95%] md:h-[95%] md:rounded-3xl m-auto shadow-2xl flex flex-col relative overflow-hidden border border-surface-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-surface-200 bg-surface-50 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 relative overflow-hidden gap-6">
          <div className="absolute -top-20 -right-20 w-64 h-64 arch-grid opacity-5 pointer-events-none" />
          
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md border ${
                currentStatus === "Done" || currentStatus === "DONE" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                currentStatus === "In Progress" || currentStatus === "WIP" ? "bg-accent/10 text-accent border-accent/20" :
                currentStatus === "QA" ? "bg-amber-50 text-amber-600 border-amber-200" :
                "bg-surface-200 text-surface-600 border-surface-300"
              }`}>
                {currentStatus}
              </span>
              {task.trade && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white"
                  style={{ backgroundColor: task.trade.color_hex }}>
                  {task.trade.name}
                </span>
              )}
              {task.has_active_blocker && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                  🚨 Blocker
                </span>
              )}
              <span className="text-[10px] font-mono text-surface-400">ID: {task.uid}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight truncate" title={task.title}>{task.title}</h2>
          </div>

          <div className="relative z-10 flex items-center gap-4 shrink-0 flex-wrap">
            <div className="flex bg-surface-200/50 p-1 rounded-xl border border-surface-200">
              {["TODO", "WIP", "QA", "DONE"].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isUpdating}
                  className={`px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${
                    currentStatus === s ? "bg-white shadow-xl text-primary" : "text-surface-500 hover:text-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleCopyLink}
              className="h-11 px-6 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center gap-2 whitespace-nowrap"
            >
              🔗 Copy Link
            </button>
            <button onClick={onClose} className="w-11 h-11 rounded-xl bg-surface-200 text-surface-600 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold shadow-sm">
              ✕
            </button>
          </div>
        </div>

        {/* Layout: Main Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Tabs */}
            <div className="flex px-8 border-b border-surface-100 bg-white pt-2 shrink-0 overflow-x-auto">
              {tabs.filter(t => !t.hidden).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TaskTab)}
                  className={`px-6 py-4 font-bold text-[10px] tracking-widest uppercase transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-surface-400 hover:text-primary"
                  }`}
                >
                  {tab.label}
                  {tab.id === "checklist" && uncheckedCount > 0 && (
                    <span className="w-4 h-4 bg-amber-400 text-white text-[8px] font-black rounded-full flex items-center justify-center">{uncheckedCount}</span>
                  )}
                  {tab.id === "issues" && openIssueCount > 0 && (
                    <span className={`w-4 h-4 ${task.has_active_blocker ? "bg-red-500 animate-pulse" : "bg-amber-400"} text-white text-[8px] font-black rounded-full flex items-center justify-center`}>{openIssueCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-surface-50">
              
              {/* EXECUTION / PROGRESS TAB */}
              {activeTab === "execution" && (
                <div className="max-w-4xl space-y-8">
                  {/* If Matrix, show quantity progress */}
                  {isMatrixTask && (
                    <div className="bg-white rounded-2xl border border-surface-200 p-6 flex items-center gap-6 shadow-sm">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                          <circle
                            cx="40" cy="40" r="32" fill="none"
                            stroke={(task.progress_percent || 0) >= 100 ? "#10b981" : "#2563eb"}
                            strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - (task.progress_percent || 0) / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-black text-primary tabular-nums">{task.progress_percent || 0}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Quantity Progress</p>
                        <p className="text-2xl font-black text-primary tabular-nums">
                          {task.quantity_completed || 0}
                          <span className="text-sm font-bold text-surface-400 ml-1">/ {task.quantity_target ?? "—"} {task.quantity_unit}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* If Matrix & Admin/Contractor, show progress logger */}
                  {isMatrixTask && (isContractor || isAdmin) && (
                    <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
                      <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Log Field Progress</h4>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="0.01"
                            step="0.1"
                            value={quantityDelta}
                            onChange={e => setQuantityDelta(e.target.value)}
                            placeholder={`Quantity completed today...`}
                            className="w-full h-12 bg-surface-50 border border-surface-200 rounded-xl px-4 outline-none focus:border-accent font-bold text-primary text-sm transition-colors"
                          />
                          {task.quantity_unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-surface-400 uppercase">{task.quantity_unit}</span>
                          )}
                        </div>
                        <button
                          onClick={handleLogProgress}
                          disabled={isUpdating || !quantityDelta}
                          className="h-12 px-6 bg-accent text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary transition-all disabled:opacity-40 shrink-0"
                        >
                          {isUpdating ? "Saving..." : "Log"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard Directives & Timeline */}
                  <div>
                    <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Timeline & Directives</h3>
                    <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-sm space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Start Date</label>
                          <input 
                            type="date" 
                            value={task.start_date || ""} 
                            onChange={async (e) => {
                              await projectsApi.updateTask(task.uid, { start_date: e.target.value });
                              refreshTask();
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Due Date</label>
                          <input 
                            type="date" 
                            value={task.due_date || task.end_date || ""} 
                            onChange={async (e) => {
                              await projectsApi.updateTask(task.uid, { due_date: e.target.value });
                              refreshTask();
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Execution Directives</label>
                        <textarea
                          rows={4}
                          value={task.description || ""}
                          onChange={(e) => setTask({...task, description: e.target.value})}
                          onBlur={async () => {
                            await projectsApi.updateTask(task.uid, { description: task.description });
                            refreshTask();
                          }}
                          placeholder="Add architectural requirements..."
                          className="w-full p-4 bg-surface-50 border border-surface-200 rounded-2xl outline-none focus:border-accent font-medium text-sm text-primary resize-none transition-colors leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CHECKLISTS TAB */}
              {activeTab === "checklist" && (
                <div className="max-w-4xl space-y-4">
                  <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
                    {checklists.length === 0 ? (
                      <div className="p-8 text-center text-surface-400">
                        <p className="text-3xl mb-2">📋</p>
                        <p className="text-sm font-bold">No checklist items yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-100">
                        {checklists.map((item: any) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-4 p-4 hover:bg-surface-50 cursor-pointer transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={item.is_completed}
                              onChange={() => handleToggleChecklist(item)}
                              disabled={isContractor && task.status !== "WIP"}
                              className="w-5 h-5 mt-0.5 rounded border-surface-300 accent-accent shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold transition-colors ${item.is_completed ? "line-through text-surface-400" : "text-primary group-hover:text-accent"}`}>
                                {item.title || item.description}
                              </p>
                            </div>
                            {item.is_completed && (
                              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {(isAdmin || isQA) && (
                    <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newChecklistDesc}
                          onChange={e => setNewChecklistDesc(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddChecklistItem()}
                          placeholder="Add verification checkpoint..."
                          className="flex-1 h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium text-primary"
                        />
                        <button
                          onClick={handleAddChecklistItem}
                          disabled={!newChecklistDesc.trim()}
                          className="h-10 px-4 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-40"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ISSUES TAB */}
              {activeTab === "issues" && (
                <div className="max-w-4xl space-y-4">
                  {issues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm ${
                        issue.severity === "HIGH" && !issue.is_resolved
                          ? "border-red-300 bg-red-50/30"
                          : "border-surface-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              issue.severity === "HIGH" ? "bg-red-100 text-red-600" :
                              issue.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                              "bg-surface-100 text-surface-500"
                            }`}>
                              {issue.severity === "HIGH" ? "🚨 Blocker" : issue.severity}
                            </span>
                            {issue.is_resolved && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">✓ Resolved</span>
                            )}
                          </div>
                          <h5 className="font-bold text-sm text-primary">{issue.title}</h5>
                          <p className="text-xs text-surface-500 mt-1 leading-relaxed">{issue.description}</p>
                        </div>
                        {!issue.is_resolved && (isAdmin || isQA) && (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="shrink-0 h-8 px-3 bg-emerald-100 text-emerald-700 font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {issues.length === 0 && !showIssueForm && (
                    <div className="bg-white rounded-2xl border border-surface-200 p-10 text-center shadow-sm">
                      <p className="text-3xl mb-2">🟢</p>
                      <p className="text-sm font-bold text-surface-400">No issues reported</p>
                    </div>
                  )}

                  {showIssueForm ? (
                    <div className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4 shadow-sm">
                      <h4 className="text-sm font-bold text-primary">Report New Issue</h4>
                      <input
                        type="text"
                        value={newIssueTitle}
                        onChange={e => setNewIssueTitle(e.target.value)}
                        placeholder="Issue title..."
                        className="w-full h-11 bg-surface-50 border border-surface-200 rounded-xl px-4 outline-none focus:border-accent text-sm font-medium"
                      />
                      <textarea
                        value={newIssueDesc}
                        onChange={e => setNewIssueDesc(e.target.value)}
                        placeholder="Describe the issue in detail..."
                        rows={3}
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 outline-none focus:border-accent text-sm font-medium resize-none"
                      />
                      <div className="flex gap-3 items-center">
                        <select
                          value={newIssueSeverity}
                          onChange={e => setNewIssueSeverity(e.target.value as any)}
                          className="h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-bold text-primary flex-1"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High / Blocker</option>
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowIssueForm(false)} className="h-9 px-4 text-surface-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-100 transition-all">Cancel</button>
                        <button
                          onClick={handleCreateIssue}
                          disabled={isUpdating}
                          className="h-9 px-5 bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all disabled:opacity-40"
                        >
                          {isUpdating ? "Saving..." : "Raise Issue"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowIssueForm(true)}
                      className="w-full py-3 border-2 border-dashed border-surface-300 rounded-xl text-surface-500 font-bold text-xs uppercase tracking-widest hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      + Report Issue / Snag
                    </button>
                  )}
                </div>
              )}

              {/* BOQ TAB */}
              {activeTab === "boq" && (
                <div className="max-w-4xl space-y-4">
                  {isMatrixTask ? (
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
                      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
                        <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-3">Pricing Detail</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-surface-500 font-medium">Unit Rate</span>
                            <span className="font-bold text-primary">${parseFloat(task.unit_rate as any || '0').toFixed(2)} / {task.quantity_unit || "unit"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-surface-500 font-medium">Target Qty</span>
                            <span className="font-bold text-primary">{task.quantity_target ?? "—"} {task.quantity_unit}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-surface-500 font-medium">Completed Qty</span>
                            <span className="font-bold text-primary">{task.quantity_completed || 0} {task.quantity_unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-surface-200 p-8 text-center shadow-sm">
                      <p className="text-sm font-bold text-surface-400">Bill of Quantities is only available for field Matrix tasks.</p>
                      <p className="text-xs text-surface-400 mt-2">Generic task budget is: ${Number(task.cost || 0).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* COMMENTS / DRAWING TABS */}
              {activeTab === "comments" && (
                <div className="max-w-4xl bg-white rounded-2xl border border-surface-200 p-10 text-center shadow-sm">
                  <p className="text-3xl mb-2">💬</p>
                  <p className="text-sm font-bold text-surface-400">Communications feature coming soon.</p>
                </div>
              )}
              {activeTab === "drawing" && isMatrixTask && (
                <div className="max-w-4xl bg-white rounded-2xl border border-surface-200 p-10 text-center shadow-sm">
                  <p className="text-3xl mb-2">📐</p>
                  <p className="text-sm font-bold text-surface-400">BIM and Drawing Context View</p>
                  <p className="text-xs text-surface-400 mt-2">Web-IFC Viewer will be integrated here.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
