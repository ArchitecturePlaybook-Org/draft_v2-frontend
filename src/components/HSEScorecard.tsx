"use client";

import React, { useEffect, useState } from "react";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Plus, HardHat, Activity, FileWarning, Calendar } from "lucide-react";
import { toast } from "sonner";

interface HSEScorecardProps {
  projectId: string;
}

interface HSEStats {
  total_incidents: number;
  near_miss_count: number;
  osha_recordable: number;
  days_since_last_incident: number;
  recent_count: number;
  by_type: any[];
}

export default function HSEScorecard({ projectId }: HSEScorecardProps) {
  const [stats, setStats] = useState<HSEStats | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentType, setIncidentType] = useState("near_miss");
  const [severity, setSeverity] = useState("low");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [injuredPerson, setInjuredPerson] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [oshaRecordable, setOshaRecordable] = useState(false);

  const fetchScorecard = async () => {
    try {
      const res = await fetchFromBff<HSEStats>(`/api/v1/projects/projects/${projectId}/hse-scorecard/`);
      setStats(res);
    } catch (e) {
      console.error("Failed to fetch HSE stats", e);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetchFromBff<any[]>(`/api/v1/projects/safety-incidents/?project_uid=${projectId}`);
      // Handle pagination
      const data = Array.isArray(res) ? res : (res as any).results;
      setIncidents(data || []);
    } catch (e) {
      console.error("Failed to fetch safety incidents", e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchScorecard(), fetchIncidents()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fetch numeric project pk first or assume backend accepts UID. 
    // We can do a quick GET if needed, but fetchFromBff handles generic routes.
    // Let's assume the router uses PK, but our viewset `perform_create` doesn't set project automatically. 
    // Wait, the SafetyIncident model requires `project_id`. Let's assume we need numeric ID.
    // We will do a lookup.
    
    const loadId = toast.loading("Submitting incident...");
    try {
      const projRes = await fetchFromBff<any>(`/api/v1/projects/projects/${projectId}/`);
      
      const payload = {
        project: projRes.id,
        incident_date: incidentDate,
        incident_type: incidentType,
        severity: severity,
        description: description,
        location: location,
        injured_person: injuredPerson,
        corrective_action: correctiveAction,
        osha_recordable: oshaRecordable,
        is_closed: false
      };

      await fetchFromBff(`/api/v1/projects/safety-incidents/`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      toast.success("Incident reported successfully", { id: loadId });
      setIsModalOpen(false);
      
      // Reset form
      setIncidentDate(new Date().toISOString().split('T')[0]);
      setDescription("");
      setLocation("");
      setInjuredPerson("");
      setCorrectiveAction("");
      setOshaRecordable(false);
      
      loadData();
    } catch (err) {
      toast.error("Failed to report incident", { id: loadId });
    }
  };

  const getDaysColorClass = (days: number) => {
    if (days >= 30) return "text-success bg-success/10 border-success/20";
    if (days >= 10) return "text-warning bg-warning/10 border-warning/20";
    return "text-danger bg-danger/10 border-danger/20";
  };

  if (loading || !stats) {
    return <Card className="p-6 h-64 flex items-center justify-center animate-pulse bg-surface-50 border-surface-200"><HardHat className="w-8 h-8 text-surface-300" /></Card>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HardHat className="w-5 h-5 text-primary" />
            HSE Scorecard
          </h2>
          <p className="text-sm text-surface-500">Health, Safety, and Environment KPIs</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Report Incident
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between border-l-4 border-l-surface-400">
          <div className="flex items-center gap-2 text-surface-500 text-sm font-medium">
            <Activity className="w-4 h-4" /> Total Incidents
          </div>
          <div className="text-3xl font-bold mt-2">{stats.total_incidents}</div>
        </Card>
        
        <Card className="p-4 flex flex-col justify-between border-l-4 border-l-warning">
          <div className="flex items-center gap-2 text-surface-500 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 text-warning" /> Near Misses
          </div>
          <div className="text-3xl font-bold mt-2">{stats.near_miss_count}</div>
        </Card>
        
        <Card className="p-4 flex flex-col justify-between border-l-4 border-l-danger">
          <div className="flex items-center gap-2 text-surface-500 text-sm font-medium">
            <FileWarning className="w-4 h-4 text-danger" /> OSHA Recordable
          </div>
          <div className="text-3xl font-bold mt-2">{stats.osha_recordable}</div>
        </Card>
        
        <Card className={`p-4 flex flex-col justify-between border-2 ${getDaysColorClass(stats.days_since_last_incident)}`}>
          <div className="flex items-center gap-2 text-sm font-medium opacity-80">
            <Calendar className="w-4 h-4" /> Days Since Last
          </div>
          <div className="text-4xl font-black mt-1">
            {stats.days_since_last_incident === 999 ? "∞" : stats.days_since_last_incident}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
          <h3 className="font-bold text-surface-800">Recent Incidents Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-50/50 text-surface-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-center">OSHA</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                    No incidents reported yet. Safe environment!
                  </td>
                </tr>
              )}
              {incidents.slice(0, 5).map(inc => (
                <tr key={inc.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">{inc.incident_date}</td>
                  <td className="px-4 py-3 font-medium capitalize">{inc.incident_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inc.severity === 'fatal' || inc.severity === 'critical' ? 'danger' : inc.severity === 'major' ? 'warning' : 'secondary' as any}>
                      {inc.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{inc.location}</td>
                  <td className="px-4 py-3 text-center">
                    {inc.osha_recordable ? <Badge variant={"danger" as any}>Yes</Badge> : <span className="text-surface-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-surface-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
              <h3 className="font-bold text-lg">Report Safety Incident</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Date</label>
                  <input required type="date" className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Location</label>
                  <input required type="text" className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Scaffolding A" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Type</label>
                  <select required className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                    <option value="near_miss">Near Miss</option>
                    <option value="first_aid">First Aid</option>
                    <option value="medical_treatment">Medical Treatment</option>
                    <option value="lost_time">Lost Time</option>
                    <option value="fatality">Fatality</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Severity</label>
                  <select required className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                    <option value="fatal">Fatal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Description</label>
                <textarea required className="w-full min-h-[80px] p-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none resize-y" placeholder="What happened?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Injured Person (Optional)</label>
                <input type="text" className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Name or role" value={injuredPerson} onChange={(e) => setInjuredPerson(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Corrective Action (Optional)</label>
                <textarea className="w-full min-h-[60px] p-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-primary outline-none resize-y" placeholder="Steps taken to prevent recurrence" value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="osha" checked={oshaRecordable} onChange={(e) => setOshaRecordable(e.target.checked)} className="w-4 h-4 text-primary rounded border-surface-300 focus:ring-primary" />
                <label htmlFor="osha" className="text-sm font-medium text-surface-700">OSHA 300 Recordable</label>
              </div>

              <div className="border-t border-surface-200 pt-4 mt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Submit Report</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
