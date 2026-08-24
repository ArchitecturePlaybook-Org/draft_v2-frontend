import React, { useState, useEffect } from "react";
import { authApi } from "@/domains/auth/api";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { useProjectStore } from "@/store/project-store";

interface ProjectSettingsModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, onClose }) => {

  const [formData, setFormData] = useState({
    title: project.title || "",
    description: project.description || "",
    project_code: project.project_code || "",
    kind: project.kind || "",
    location: project.location || "",
    client_name: project.client_name || "",
    client_phone: project.client_phone || "",
    client_email: project.client_email || "",
    unit_system: project.unit_system || "metric",
    specialization_ids: project.specializations?.map((s: any) => typeof s === 'number' ? s : s.id) || [] as number[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specializations, setSpecializations] = useState<any[]>([]);

  useEffect(() => {
    authApi.getSpecializations().then(setSpecializations).catch(() => {});
  }, []);
  const [error, setError] = useState("");
  const fetchProject = useProjectStore((state) => state.fetchProject);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await projectsApi.updateProject(project.uid, formData);
      await fetchProject(project.uid);
      onClose();
    } catch (err) {
      const error = err as { message?: string };
      console.error("Failed to update project settings", error);
      setError(error.message || "Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface-100 rounded-xl border border-surface-200 shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50/50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span>⚙️</span> Project Settings
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Update core details for {project.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-200 rounded-md text-text-tertiary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 bg-semantic-red/10 border border-semantic-red/20 text-semantic-red rounded-lg text-sm">
              {error}
            </div>
          )}

          <form id="project-settings-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Project Title <span className="text-semantic-red">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="e.g. Skyline Tower"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Project Code
                </label>
                <input
                  type="text"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="e.g. PRJ-2024-01"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Property Kind
                </label>
                <input
                  type="text"
                  name="kind"
                  value={formData.kind}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="e.g. Commercial, Residential"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="e.g. 123 Architecture Blvd"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all resize-none custom-scrollbar"
                  placeholder="Brief description of the project..."
                />
              </div>

              <div className="col-span-2">
                <div className="h-px bg-surface-200 my-2" />
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span>👤</span> Client Details
                </h3>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Client Phone
                </label>
                <input
                  type="tel"
                  name="client_phone"
                  value={formData.client_phone}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  name="client_email"
                  value={formData.client_email}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                  placeholder="client@acme.com"
                />
              </div>
              
              <div className="col-span-2">
                <div className="h-px bg-surface-200 my-2" />
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Unit System
                </label>
                <select
                  name="unit_system"
                  value={formData.unit_system}
                  onChange={handleChange}
                  className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                >
                  <option value="metric">Metric (meters, cm, kg)</option>
                  <option value="imperial">Imperial (feet, inches, lbs)</option>
                </select>
              </div>

              <div className="col-span-2 space-y-2">
                <div className="h-px bg-surface-200 my-2" />
                <label className="block text-xs font-bold text-text-secondary">
                  Project Specializations (Multi-Select)
                </label>
                <div className="flex flex-wrap gap-2">
                  {specializations.map((spec) => {
                    const isSelected = formData.specialization_ids.includes(spec.id);
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              specialization_ids: formData.specialization_ids.filter((id: number) => id !== spec.id),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              specialization_ids: [...formData.specialization_ids, spec.id],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                            : "bg-surface-50 border-surface-200 text-text-secondary hover:bg-surface-200 hover:text-text-primary"
                        }`}
                      >
                        {isSelected ? "✓ " : ""}{spec.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-surface-200 bg-surface-50/50 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="project-settings-form"
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#D4AF37] hover:bg-[#B3932F] text-black text-sm font-bold rounded-md transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
