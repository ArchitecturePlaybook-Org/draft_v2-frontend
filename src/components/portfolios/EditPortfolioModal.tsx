"use client";

import React, { useState, useEffect } from "react";
import { portfoliosApi, PortfolioItem } from "@/domains/portfolios/api";
import { toast } from "sonner";

interface EditPortfolioModalProps {
  isOpen: boolean;
  item: PortfolioItem | null;
  onClose: () => void;
  onSuccess: (updatedItem: PortfolioItem) => void;
}

export function EditPortfolioModal({
  isOpen,
  item,
  onClose,
  onSuccess,
}: EditPortfolioModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Architectural Masterplan");
  const [projectDate, setProjectDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
      setCategory(item.category || "Architectural Masterplan");
      setProjectDate(item.project_date ? item.project_date.split("T")[0] : "");
      setIsPublic(item.is_public ?? true);
      setPreviewUrl(item.image || null);
      setSelectedFile(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Portfolio item title is required.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      if (projectDate) formData.append("project_date", projectDate);
      formData.append("is_public", isPublic ? "true" : "false");
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const updatedItem = await portfoliosApi.updatePortfolioItem(item.id, formData);
      toast.success("Portfolio item updated successfully!");
      onSuccess(updatedItem);
      onClose();
    } catch (err: any) {
      console.error("[EditPortfolioModal] Error:", err);
      toast.error(err?.message || "Failed to update portfolio item.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 pb-6 px-3 sm:px-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-lg max-h-[calc(100vh-6rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-200 dark:border-white/10 flex justify-between items-center bg-surface-100/60 dark:bg-surface-800/40 shrink-0">
          <div>
            <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
              <span>✏️ Edit Portfolio Item</span>
            </h3>
            <p className="text-[10px] text-surface-400 font-medium">
              Update project details, renderings & architectural specifications
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 flex items-center justify-center font-bold text-xs hover:bg-surface-300 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-0">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Project Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                placeholder="e.g. Skyline Eco-Tower Masterplan"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                >
                  <option value="Architectural Masterplan">Architectural Masterplan</option>
                  <option value="Commercial IT Park">Commercial IT Park</option>
                  <option value="Residential Villa">Residential Villa</option>
                  <option value="3D BIM Model">3D BIM Model</option>
                  <option value="Interior Design">Interior Design</option>
                  <option value="Structural Engineering">Structural Engineering</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Completion Date</label>
                <input
                  type="date"
                  value={projectDate}
                  onChange={(e) => setProjectDate(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Update Thumbnail / Rendering (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-surface-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent/10 file:text-accent hover:file:bg-accent/20"
              />
              {previewUrl && (
                <div className="aspect-[16/9] w-full mt-2 rounded-lg overflow-hidden border border-surface-200 dark:border-white/10 bg-black">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Architectural Description & Specs</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary resize-none"
                placeholder="Describe project details, building parameters, and BIM specs..."
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg border border-surface-200/60 dark:border-white/5">
              <div>
                <h4 className="text-xs font-bold text-primary">Public Visibility</h4>
                <p className="text-[9px] text-surface-400">Make discoverable in public directory</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${
                  isPublic ? 'bg-accent' : 'bg-surface-300 dark:bg-surface-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ${
                    isPublic ? 'translate-x-1.5' : '-translate-x-1.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-3 border-t border-surface-200 dark:border-white/10 shrink-0 bg-surface-100/60 dark:bg-surface-800/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-200 dark:bg-surface-800 text-primary font-bold text-xs rounded-lg hover:bg-surface-300 transition-all uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg disabled:opacity-50 shadow-sm"
            >
              {isLoading ? "Saving Changes..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
