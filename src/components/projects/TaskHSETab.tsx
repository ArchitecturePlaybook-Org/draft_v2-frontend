import React, { useState, useEffect } from "react";
import { Task } from "@/types/projects";
import { useRouter } from "next/navigation";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface TaskHSETabProps {
  task: Task;
  projectUid: string;
}

export const TaskHSETab: React.FC<TaskHSETabProps> = ({ task, projectUid }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Form State
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [incidentType, setIncidentType] = useState("near_miss");
  const [severity, setSeverity] = useState("low");
  const [description, setDescription] = useState("");
  const [oshaRecordable, setOshaRecordable] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetchFromBff<any[]>(`/api/v1/projects/safety-incidents/?project_uid=${projectUid}`);
      const data = Array.isArray(res) ? res : (res as any).results || [];
      // Filter for incidents that have this task's UID in the description
      const taskIncidents = data.filter((inc: any) => inc.description && inc.description.includes(`[Task: ${task.uid}]`));
      setIncidents(taskIncidents);
    } catch (e) {
      console.error("Failed to fetch task incidents", e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [projectUid, task.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    setLoading(true);
    const loadId = toast.loading("Submitting incident...");
    try {
      const projRes = await fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/`);

      const payload = {
        project: projRes.id,
        incident_date: incidentDate,
        incident_type: incidentType,
        severity: severity,
        description: `[Task: ${task.uid}] ${description}`,
        location: task.zone_name || "",
        osha_recordable: oshaRecordable,
        is_closed: false,
      };

      await fetchFromBff(`/api/v1/projects/safety-incidents/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Incident reported successfully", { id: loadId });
      
      // Reset form
      setDescription("");
      setSeverity("low");
      setIncidentType("near_miss");
      setOshaRecordable(false);
      
      fetchIncidents();
    } catch (err) {
      toast.error("Failed to report incident", { id: loadId });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    router.push(`/dashboard/projects/${projectUid}?tab=site_ops`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Form Card */}
      <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="text-xl">🛡️</span> Report Safety Incident
            </h3>
            <p className="text-[10px] text-surface-500 text-surface-400 font-bold uppercase tracking-widest mt-1">
              Context: Task {task.uid}
            </p>
          </div>
          <button
            onClick={handleNavigate}
            className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
          >
            Open Full Register ↗
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase tracking-widest mb-1">Date</label>
              <input
                required
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent outline-none font-medium"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase tracking-widest mb-1">Type</label>
              <select
                required
                className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent outline-none font-bold text-primary"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
              >
                <option value="near_miss">Near Miss</option>
                <option value="first_aid">First Aid</option>
                <option value="medical_treatment">Medical Treatment</option>
                <option value="lost_time">Lost Time</option>
                <option value="fatality">Fatality</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase tracking-widest mb-1">Severity</label>
              <select
                required
                className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent outline-none font-bold text-primary"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
                <option value="fatal">Fatal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase tracking-widest mb-1">Description</label>
            <textarea
              required
              className="w-full min-h-[80px] p-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent outline-none resize-y font-medium placeholder:text-surface-300"
              placeholder="What happened during this task?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="osha"
                checked={oshaRecordable}
                onChange={(e) => setOshaRecordable(e.target.checked)}
                className="w-4 h-4 text-accent rounded border-surface-300 focus:ring-accent"
              />
              <label htmlFor="osha" className="text-xs font-bold text-surface-700 uppercase tracking-widest">
                OSHA Recordable
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
            >
              {loading ? "Submitting..." : "Submit Incident"}
            </button>
          </div>
        </form>
      </div>

      {/* Task-Specific Incidents List */}
      <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-surface-200 bg-surface-50">
            <h3 className="font-bold text-surface-700 text-sm uppercase tracking-widest">Incidents Logged on this Task</h3>
         </div>
         <div className="p-0">
           {incidents.length === 0 ? (
             <div className="p-8 text-center text-surface-400 text-sm font-medium">
               No safety incidents recorded for this task.
             </div>
           ) : (
             <div className="divide-y divide-surface-100">
               {incidents.map((inc, i) => (
                 <div key={inc.id || i} className="p-4 hover:bg-surface-50 transition-colors">
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-xs font-bold text-surface-500 text-surface-400">{inc.incident_date}</span>
                     <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        inc.severity === 'fatal' || inc.severity === 'critical' ? 'bg-red-100 text-red-600' : 
                        inc.severity === 'major' ? 'bg-orange-100 text-orange-600' : 'bg-surface-100 text-surface-600 text-surface-300'
                     }`}>
                       {inc.severity}
                     </span>
                   </div>
                   <p className="text-sm font-medium text-primary mt-1">{inc.description.replace(`[Task: ${task.uid}] `, '')}</p>
                   <div className="flex gap-2 mt-2">
                     <span className="text-[10px] bg-surface-100 text-surface-500 text-surface-400 px-2 py-0.5 rounded uppercase font-bold">{inc.incident_type.replace('_', ' ')}</span>
                     {inc.osha_recordable && <span className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded uppercase font-bold">OSHA</span>}
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    </div>
  );
};
