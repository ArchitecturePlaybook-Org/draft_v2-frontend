import React, { useState } from "react";
import { Task, ProjectAsset } from "@/types/projects";
import { usePermissions } from "@/hooks/use-permissions";
import { projectsApi } from "@/domains/projects/api";
import { FloorPlanGridViewer } from "./FloorPlanGridViewer";

interface TaskExecutionModalProps {
  task: Task;
  projectAssets: ProjectAsset[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

type TaskTab = "execution" | "issues" | "boq" | "comments" | "manage_access";

export const TaskExecutionModal: React.FC<TaskExecutionModalProps> = ({ 
  task, 
  projectAssets,
  onClose,
  onTaskUpdated
}) => {
  const { hasGlobalPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TaskTab>("execution");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [surveyAsset, setSurveyAsset] = useState<ProjectAsset | null>(null);
  
  const isInternal = true; 

  // Sync with prop if it changes from outside
  React.useEffect(() => {
    setCurrentStatus(task.status);
  }, [task.status]);

  const handleStatusChange = async (newStatus: string) => {
    const previousStatus = currentStatus;
    setCurrentStatus(newStatus as any);
    setIsUpdating(true);
    try {
      await projectsApi.updateTask(task.uid, { status: newStatus });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      setCurrentStatus(previousStatus); // Rollback on failure
      alert("Protocol failed: Could not synchronize status with central registry.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = () => {
    // Generates a mock share link. In reality, we'd call an API to generate a unique token.
    const url = `${window.location.origin}/shared/task/${task.uid}`;
    navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in bg-surface-900/60 backdrop-blur-md overflow-hidden">
      <div className="bg-white w-full h-full md:w-[95%] md:h-[95%] md:rounded-3xl m-auto shadow-2xl flex flex-col relative overflow-hidden border border-surface-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-surface-200 bg-surface-50 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 relative overflow-hidden gap-6">
          <div className="absolute -top-20 -right-20 w-64 h-64 arch-grid opacity-5 pointer-events-none" />
          
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md border ${
                currentStatus === "Done" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                currentStatus === "In Progress" ? "bg-accent/10 text-accent border-accent/20" :
                "bg-surface-200 text-surface-600 border-surface-300"
              }`}>
                {currentStatus}
              </span>
              <span className="text-[10px] font-mono text-surface-400">ID: {task.uid}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight truncate" title={task.title}>{task.title}</h2>
          </div>

          <div className="relative z-10 flex items-center gap-4 shrink-0 flex-wrap">
            <div className="flex bg-surface-200/50 p-1 rounded-xl border border-surface-200">
              {["Pending", "In Progress", "Done"].map(s => (
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

        {/* Layout: Sidebar + Main Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Tabs */}
            <div className="flex px-8 border-b border-surface-100 bg-white pt-2 shrink-0">
              {[
                { id: "execution", label: "Execution & Checklists" },
                { id: "boq", label: "Bill of Quantities" },
                { id: "issues", label: "Issue Tracker" },
                { id: "comments", label: "Communications" },
                ...(isInternal ? [{ id: "manage_access", label: "Manage Access" }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TaskTab)}
                  className={`px-6 py-4 font-bold text-xs tracking-widest uppercase transition-colors border-b-2 ${
                    activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-surface-400 hover:text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-surface-50">
              {activeTab === "execution" && (
                <div className="max-w-4xl space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Task Directives & Timeline</h3>
                    <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-sm space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Start Date</label>
                          <input 
                            type="date" 
                            value={task.start_date || ""} 
                            onChange={async (e) => {
                              try {
                                await projectsApi.updateTask(task.uid, { start_date: e.target.value });
                                onTaskUpdated();
                              } catch(err) { alert("Failed to update start date"); }
                            }}
                            className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Target Completion</label>
                          <input 
                            type="date" 
                            value={task.end_date || ""} 
                            onChange={async (e) => {
                              try {
                                await projectsApi.updateTask(task.uid, { end_date: e.target.value });
                                onTaskUpdated();
                              } catch(err) { alert("Failed to update end date"); }
                            }}
                            className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-primary"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t border-surface-100">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-3 block">Directives</label>
                        <p className="text-surface-600 leading-relaxed font-medium">
                          {task.description || "No specific directives provided for this phase. Please coordinate with the lead architect."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Execution Checklist</h3>
                    <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm space-y-3">
                      {/* Mock Checklists for UI visualization */}
                      {["Verify structural integrity constraints", "Procure primary materials", "Complete safety inspection"].map((item, i) => (
                        <label key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 cursor-pointer transition-colors group">
                          <input type="checkbox" className="w-5 h-5 rounded border-surface-300 text-accent focus:ring-accent accent-accent" />
                          <span className="font-semibold text-sm text-primary group-hover:text-accent transition-colors">{item}</span>
                        </label>
                      ))}
                      <button className="w-full py-3 mt-2 border-2 border-dashed border-surface-200 rounded-xl text-surface-400 font-bold text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-colors">
                        + Add Checklist Item
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "boq" && (
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-100 text-[10px] uppercase tracking-widest text-surface-500">
                      <tr>
                        <th className="px-6 py-4 font-bold">Material / Service</th>
                        <th className="px-6 py-4 font-bold">Quantity</th>
                        <th className="px-6 py-4 font-bold">Unit Price</th>
                        <th className="px-6 py-4 font-bold">Total</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 font-medium">
                      <tr>
                        <td className="px-6 py-4 text-primary">High-Strength Concrete (C40)</td>
                        <td className="px-6 py-4 text-surface-600">150 <span className="text-surface-400 text-xs">m³</span></td>
                        <td className="px-6 py-4 text-surface-600">$120.00</td>
                        <td className="px-6 py-4 text-primary font-bold">$18,000.00</td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-surface-400 hover:text-red-500">✕</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-4 border-t border-surface-200 bg-surface-50">
                    <button className="px-6 py-2 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-accent transition-colors">
                      + Add Item
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "issues" && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-4">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-red-900 text-sm">Material Supply Delay</h4>
                      <p className="text-red-700 text-xs mt-1">The primary steel supplier reported a 3-day delay due to logistics issues.</p>
                      <span className="text-[9px] uppercase tracking-widest font-bold text-red-400 mt-3 block">Reported by External Contractor</span>
                    </div>
                  </div>
                  <button className="px-6 py-3 border-2 border-dashed border-surface-300 w-full rounded-xl text-surface-500 font-bold text-xs uppercase tracking-widest hover:border-red-400 hover:text-red-500 transition-colors">
                    Report New Blocker
                  </button>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="flex flex-col h-full bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                  <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-surface-200 shrink-0"></div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-primary">System Admin</span>
                          <span className="text-[10px] text-surface-400">2 hours ago</span>
                        </div>
                        <p className="text-sm text-surface-600 mt-1">Task initialized and assigned to contractor network.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-surface-100 bg-surface-50 flex gap-4">
                    <input type="text" placeholder="Write an update..." className="flex-1 h-12 px-4 rounded-xl border border-surface-200 outline-none focus:border-accent text-sm" />
                    <button className="h-12 px-6 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent transition-colors">Post</button>
                  </div>
                </div>
              )}

              {activeTab === "manage_access" && isInternal && (
                <div className="max-w-2xl bg-white rounded-2xl border border-surface-200 shadow-sm p-8">
                  <h3 className="text-lg font-bold text-primary mb-2 tracking-tight">External Collaborators</h3>
                  <p className="text-xs text-surface-500 mb-6">Manage external contractors who have requested access to this specific task via the share link.</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-surface-100 rounded-xl bg-surface-50">
                      <div>
                        <p className="font-bold text-sm text-primary">John Doe (Plumbing Co)</p>
                        <p className="text-xs text-surface-400">john.doe@external.com</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-widest rounded-md">Pending Request</span>
                        <button className="px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-md hover:bg-emerald-600">Approve</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Data Hub Context */}
          <div className="w-80 border-l border-surface-200 bg-white flex flex-col shrink-0 relative z-20">
            <div className="p-6 border-b border-surface-100">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Attached Assets</h3>
              <p className="text-xs text-surface-600 font-medium leading-relaxed">External users can only view assets explicitly pinned to this task.</p>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-surface-400 mb-3">Linked Floor Plans</h4>
                {task.asset_links?.map(link => {
                  const asset = link.latest_asset;
                  if (!asset || asset.category !== "2d_plan") return null;
                  return (
                    <div 
                      key={link.id} 
                      onClick={() => setSurveyAsset(asset)}
                      className="p-3 border border-surface-200 rounded-xl mb-2 hover:border-accent cursor-pointer group bg-surface-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">📐</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[10px] text-primary truncate">{asset.title}</p>
                          <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">V{asset.version_number} · Survey Grid</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-surface-400 mb-3">Other Deliverables</h4>
                {task.asset_links?.map(link => {
                  const asset = link.latest_asset;
                  if (!asset || asset.category === "2d_plan") return null;
                  return (
                    <div 
                      key={link.id} 
                      onClick={() => window.open(asset.file, "_blank")}
                      className="p-3 border border-surface-200 rounded-xl mb-2 hover:border-accent cursor-pointer group bg-surface-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                          {asset.category === '3d_model' ? '🏛️' : '📄'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[10px] text-primary truncate">{asset.title}</p>
                          <p className="text-[8px] font-bold text-surface-400 uppercase tracking-tighter">V{asset.version_number} · {asset.category}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Site Survey Grid Viewer */}
      {surveyAsset && (
        <FloorPlanGridViewer
          asset={surveyAsset}
          onClose={() => setSurveyAsset(null)}
          onRefresh={onTaskUpdated}
        />
      )}
    </div>
  );
};
