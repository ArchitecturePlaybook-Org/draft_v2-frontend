import React, { useState, useEffect } from "react";
import { NCR } from "@/types/quality";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { projectsApi } from "@/domains/projects/api";

interface NCRManagerProps {
  projectUid: string;
}

export default function NCRManager({ projectUid }: NCRManagerProps) {
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<NCR["severity"]>("minor");
  
  // Detail Modal State
  const [selectedNcr, setSelectedNcr] = useState<NCR | null>(null);

  useEffect(() => {
    fetchNcrs();
  }, [projectUid]);

  const fetchNcrs = async () => {
    try {
      const data = await projectsApi.getNcrs(projectUid);
      setNcrs(data);
    } catch (error) {
      toast.error("Failed to fetch NCRs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const projRes = await projectsApi.getProjectDetails(projectUid);
      if (!projRes || !projRes.id) throw new Error("Could not find project ID");
      
      await projectsApi.createNcr({
        project: projRes.id,
        title,
        description,
        severity,
      });
      toast.success("NCR created successfully");
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setSeverity("minor");
      fetchNcrs();
    } catch (error) {
      toast.error("Failed to create NCR");
    }
  };

  const handleUpdateStatus = async (ncrId: number, status: NCR["status"]) => {
    try {
      await projectsApi.updateNcrStatus(ncrId, status);
      toast.success("Status updated");
      if (selectedNcr) {
        setSelectedNcr({ ...selectedNcr, status });
      }
      fetchNcrs();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getSeverityBadge = (sev: NCR["severity"]) => {
    switch (sev) {
      case "minor": return <Badge variant="secondary">Minor</Badge>;
      case "major": return <Badge variant="warning">Major</Badge>;
      case "critical": return <Badge variant="danger">Critical</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: NCR["status"]) => {
    switch (status) {
      case "open": return <Badge variant="danger">Open</Badge>;
      case "in_review": return <Badge variant="warning">In Review</Badge>;
      case "closed": return <Badge variant="success">Closed</Badge>;
      case "verified": return <Badge variant="success">Verified</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-surface-500 animate-pulse">Loading NCRs...</div>;
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Non-Conformance Reports</h2>
          <p className="text-sm text-surface-500 mt-1">Track and resolve significant quality issues.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-accent text-background px-4 py-2 rounded-lg font-medium hover:opacity-90/90 transition-colors shadow-sm"
        >
          + Raise NCR
        </button>
      </div>

      {ncrs.length === 0 ? (
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-surface-900 mb-1">No NCRs found</h3>
          <p className="text-surface-500">The project currently has no non-conformance reports.</p>
        </div>
      ) : (
        <div className="bg-surface-100 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-50 border-b border-surface-200 text-surface-500">
              <tr>
                <th className="px-6 py-4 font-medium">NCR Number</th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Severity</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Raised By</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {ncrs.map((ncr) => (
                <tr 
                  key={ncr.id} 
                  className="hover:bg-surface-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedNcr(ncr)}
                >
                  <td className="px-6 py-4 font-mono font-medium text-surface-900">{ncr.ncr_number}</td>
                  <td className="px-6 py-4 font-medium text-surface-900">{ncr.title}</td>
                  <td className="px-6 py-4">{getSeverityBadge(ncr.severity)}</td>
                  <td className="px-6 py-4">{getStatusBadge(ncr.status)}</td>
                  <td className="px-6 py-4">{ncr.raised_by?.name || "Unknown"}</td>
                  <td className="px-6 py-4 text-surface-500">
                    {new Date(ncr.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNcr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-100 rounded-2xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh] border border-surface-200 p-8 relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-surface-900">
                    {selectedNcr.title}
                  </h3>
                  {getStatusBadge(selectedNcr.status)}
                  {getSeverityBadge(selectedNcr.severity)}
                </div>
                <p className="text-surface-500 font-mono">{selectedNcr.ncr_number}</p>
              </div>
              <button onClick={() => setSelectedNcr(null)} className="text-surface-400 hover:text-surface-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-surface-900 mb-2 uppercase tracking-wider">Description</h4>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 text-surface-700 whitespace-pre-wrap">
                  {selectedNcr.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                  <h4 className="text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Raised By</h4>
                  <p className="font-medium text-surface-900">{selectedNcr.raised_by?.name || "Unknown"}</p>
                </div>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                  <h4 className="text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Date Raised</h4>
                  <p className="font-medium text-surface-900">{new Date(selectedNcr.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedNcr.root_cause && (
                <div>
                  <h4 className="text-sm font-semibold text-surface-900 mb-2 uppercase tracking-wider">Root Cause</h4>
                  <div className="bg-red-50 text-red-900 p-4 rounded-xl border border-red-100 whitespace-pre-wrap">
                    {selectedNcr.root_cause}
                  </div>
                </div>
              )}

              {selectedNcr.corrective_action && (
                <div>
                  <h4 className="text-sm font-semibold text-surface-900 mb-2 uppercase tracking-wider">Corrective Action</h4>
                  <div className="bg-green-50 text-green-900 p-4 rounded-xl border border-green-100 whitespace-pre-wrap">
                    {selectedNcr.corrective_action}
                  </div>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-surface-200 flex justify-end gap-3">
                {selectedNcr.status === "open" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedNcr.id, "in_review")}
                    className="bg-warning text-white px-6 py-2 rounded-lg font-medium hover:bg-warning/90 transition-colors shadow-sm"
                  >
                    Move to Review
                  </button>
                )}
                {selectedNcr.status === "in_review" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedNcr.id, "closed")}
                    className="bg-success text-white px-6 py-2 rounded-lg font-medium hover:bg-success/90 transition-colors shadow-sm"
                  >
                    Close NCR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-100 rounded-2xl shadow-xl w-full max-w-lg border border-surface-200 p-8">
            <h3 className="text-xl font-bold text-surface-900 mb-6">
              Raise Non-Conformance Report
            </h3>
            
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="E.g., Incorrect concrete mix poured in Sector A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  placeholder="Provide detailed information about the non-conformance..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-lg font-medium text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-accent text-background px-6 py-2 rounded-lg font-medium hover:opacity-90/90 transition-colors shadow-sm"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
