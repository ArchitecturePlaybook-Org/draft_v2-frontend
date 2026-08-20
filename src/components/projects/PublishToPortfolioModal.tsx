"use client";

import React, { useState } from "react";
import { portfoliosApi } from "@/domains/portfolios/api";
import { toast } from "sonner";
import Link from "next/link";

interface PublishToPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  projectTitle: string;
  onSuccess?: (newItem: any) => void;
}

export function PublishToPortfolioModal({
  isOpen,
  onClose,
  projectUid,
  projectTitle,
  onSuccess,
}: PublishToPortfolioModalProps) {
  const [title, setTitle] = useState(projectTitle || "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Architectural Masterplan");
  const [projectDate, setProjectDate] = useState(new Date().toISOString().split("T")[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publishedItem, setPublishedItem] = useState<any | null>(null);

  if (!isOpen) return null;

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
    if (!selectedFile) {
      toast.error("Please upload a thumbnail or 3D rendering for your portfolio showcase.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("project_date", projectDate);
      formData.append("is_public", isPublic ? "true" : "false");
      formData.append("image", selectedFile);

      const newItem = await portfoliosApi.addPortfolioItem(formData);
      setPublishedItem(newItem);
      toast.success("Project published to public portfolio!");
      onSuccess?.(newItem);
    } catch (err: any) {
      console.error("[PublishToPortfolio] Failed:", err);
      toast.error(err?.message || "Failed to publish project to portfolio.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-200 dark:border-white/10 flex justify-between items-center bg-surface-100/60 dark:bg-surface-800/40">
          <div>
            <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
              <span>🚀 Publish Project to Portfolio</span>
            </h3>
            <p className="text-[10px] text-surface-400 font-medium">
              Showcase this project on your public profile & global directory
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

        {publishedItem ? (
          /* Success Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full mx-auto flex items-center justify-center text-2xl border border-emerald-500/20">
              ✓
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-primary">Published Successfully!</h4>
              <p className="text-xs text-surface-400">
                Your project <strong className="text-primary">{publishedItem.title}</strong> is now live on your portfolio.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="w-full h-9 bg-surface-200 dark:bg-surface-800 text-primary font-bold uppercase text-[10px] tracking-wider rounded-lg hover:bg-surface-300 transition-all"
              >
                Close
              </button>
              <Link
                href={`/portfolio/${publishedItem.id}`}
                onClick={onClose}
                className="w-full h-9 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider rounded-lg flex items-center justify-center gap-1 hover:opacity-90 transition-all shadow-sm"
              >
                View Live Portfolio →
              </Link>
            </div>
          </div>
        ) : (
          /* Publish Form */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Portfolio Title *</label>
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
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Cover Rendering / Thumbnail *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
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
                placeholder="Detail the scope of work, structural specs, parametric facades, and BIM parameters..."
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg border border-surface-200/60 dark:border-white/5">
              <div>
                <h4 className="text-xs font-bold text-primary">Public Visibility</h4>
                <p className="text-[9px] text-surface-400">Make this project discoverable in the public directory</p>
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-9 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
              >
                {isLoading ? "Publishing Project..." : "🚀 Confirm & Publish to Portfolio"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
