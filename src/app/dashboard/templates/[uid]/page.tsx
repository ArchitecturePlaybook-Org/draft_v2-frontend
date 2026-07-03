"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChecklistItem { title: string; order: number; }
interface TaskNode {
  uid: string; title: string; description: string; priority: string;
  checklists: ChecklistItem[]; subtasks: TaskNode[];
}
interface Rating { score: number; review: string; author_name: string; created_at: string; }
interface Template {
  uid: string; title: string; description: string;
  template_status: string; template_visibility: string;
  template_category: string; template_tags: string[];
  template_building_type: string; template_country: string;
  template_difficulty: string; template_license: string;
  template_est_duration_days: number | null;
  template_est_cost_min: string | null; template_est_cost_max: string | null;
  template_thumbnail: string; template_version: number;
  avg_rating: number; rating_count: number;
  task_count: number; checklist_count: number;
  author_name: string; share_token: string | null;
  share_token_expires_at: string | null;
  is_in_library: boolean; is_favorite: boolean; use_count: number;
  user_rating: number | null; created_at: string;
  tasks?: TaskNode[];
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:     "bg-surface-200 text-surface-600 border-surface-300",
    PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ARCHIVED:  "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-125"
        >
          <svg className={`w-6 h-6 ${star <= (hover || value) ? "text-accent" : "text-surface-300"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function TaskTreeNode({ task, depth = 0 }: { task: TaskNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  return (
    <div className={depth > 0 ? "ml-5 border-l-2 border-surface-200/50 pl-4 mt-1" : ""}>
      <div
        className="flex items-start gap-2.5 py-2.5 px-3 rounded-xl hover:bg-surface-100/60 transition-colors cursor-pointer group"
        onClick={() => task.subtasks.length > 0 && setOpen(!open)}
      >
        <div className="mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center">
          {task.subtasks.length > 0
            ? <span className={`text-[10px] font-black text-surface-400 transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
            : <div className="w-2 h-2 rounded-full bg-surface-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">{task.title}</span>
            {task.priority === "HIGH" && <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-50 text-red-600 border border-red-200 rounded uppercase">HIGH</span>}
            {task.checklists.length > 0 && <span className="text-[10px] text-surface-400 font-bold">✓ {task.checklists.length}</span>}
            {task.subtasks.length > 0 && <span className="text-[10px] text-surface-400 font-bold">↳ {task.subtasks.length}</span>}
          </div>
          {task.description && <p className="text-[11px] text-surface-400 mt-0.5 line-clamp-1">{task.description}</p>}
          {open && task.checklists.length > 0 && (
            <div className="mt-2 space-y-1">
              {task.checklists.map((cl, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded border-2 border-surface-300 shrink-0" />
                  <span className="text-[11px] text-surface-500">{cl.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {open && task.subtasks.map(sub => <TaskTreeNode key={sub.uid} task={sub} depth={depth + 1} />)}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const CATEGORIES = ["Residential", "Commercial", "Industrial", "Renovation", "Infrastructure", "Mixed-Use"];
const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "EXPERT"];
const VISIBILITIES = [
  { value: "PRIVATE",  label: "🔒 Private",         desc: "Only you can see it" },
  { value: "ORG",      label: "🏢 Organization",    desc: "Your team members" },
  { value: "UNLISTED", label: "🔗 Unlisted",        desc: "Anyone with the link" },
  { value: "PUBLIC",   label: "🌐 Public",          desc: "Listed in Templates Hub" },
];

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = params.uid as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "ratings" | "settings">("overview");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [publishVisibility, setPublishVisibility] = useState<"PUBLIC" | "ORG" | "UNLISTED">("PUBLIC");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Template>>({});

  const load = useCallback(async () => {
    try {
      const data = await projectsApi.getTemplateDetail(uid);
      // Normalize arrays that the API may omit
      setTemplate({
        ...data,
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        template_tags: Array.isArray(data.template_tags) ? data.template_tags : [],
      });
      setEditData({
        title: data.title,
        description: data.description,
        template_category: data.template_category,
        template_tags: data.template_tags,
        template_building_type: data.template_building_type,
        template_country: data.template_country,
        template_difficulty: data.template_difficulty,
        template_license: data.template_license,
        template_est_duration_days: data.template_est_duration_days,
        template_est_cost_min: data.template_est_cost_min,
        template_est_cost_max: data.template_est_cost_max,
        template_thumbnail: data.template_thumbnail,
        template_visibility: data.template_visibility,
      });
      if (data.user_rating) {
        setUserScore(data.user_rating);
      }
      if (data.share_token) {
        setShareUrl(`${window.location.origin}/share/template/${data.share_token}`);
      }
    } catch {
      toast.error("Template not found.");
      router.push("/dashboard/templates");
    } finally {
      setLoading(false);
    }
  }, [uid, router]);

  useEffect(() => { load(); }, [load]);

  // Auto-open publish panel if navigated here with ?action=publish
  useEffect(() => {
    if (searchParams.get("action") === "publish") setShowPublishPanel(true);
  }, [searchParams]);

  const loadRatings = useCallback(async () => {
    if (activeTab !== "ratings" || !template) return;
    setRatingsLoading(true);
    try {
      const res = await projectsApi.getTemplateRatings(uid);
      setRatings(Array.isArray(res) ? res : res?.results ?? []);
    } catch { /* silent */ }
    finally { setRatingsLoading(false); }
  }, [activeTab, uid, template]);

  useEffect(() => { loadRatings(); }, [loadRatings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await projectsApi.updateTemplate(uid, editData);
      setTemplate(updated);
      setEditMode(false);
      toast.success("Template saved.");
    } catch {
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const updated = await projectsApi.publishTemplate(uid, publishVisibility);
      setTemplate(updated);
      if (updated.share_token) {
        setShareUrl(`${window.location.origin}/share/template/${updated.share_token}`);
      }
      setShowPublishPanel(false);
      toast.success("🚀 Template published successfully!");
    } catch {
      toast.error("Failed to publish template.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this template? It will be hidden from your library and the Marketplace.")) return;
    try {
      await projectsApi.archiveTemplate(uid);
      toast.success("Template archived.");
      router.push("/dashboard/templates");
    } catch { toast.error("Failed to archive."); }
  };

  const handleCopyLink = async () => {
    try {
      const res = await projectsApi.generateTemplateShareLink(uid);
      setShareUrl(res.share_url);
      await navigator.clipboard.writeText(res.share_url);
      toast.success("Share link copied! 🔗");
    } catch { toast.error("Failed to generate link."); }
  };

  const handleRatingSubmit = async () => {
    if (!userScore) return toast.error("Please select a star rating.");
    setRatingSubmitting(true);
    try {
      await projectsApi.rateTemplate(uid, userScore, userReview);
      toast.success("Rating submitted. Thank you!");
      load();
    } catch { toast.error("Failed to submit rating."); }
    finally { setRatingSubmitting(false); }
  };

  const handleFavorite = async () => {
    try {
      const res = await projectsApi.toggleTemplateFavorite(uid);
      setTemplate((prev) => prev ? { ...prev, is_favorite: res.is_favorite } : prev);
      toast.success(res.is_favorite ? "Added to favorites ⭐" : "Removed from favorites");
    } catch { toast.error("Failed to update favorite."); }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!template) return null;

  const isDraft = template.template_status === "DRAFT";
  const isPublished = template.template_status === "PUBLISHED";

  const TABS = [
    { key: "overview" as const, label: "Overview" },
    { key: "tasks" as const, label: `Tasks (${template.task_count})` },
    { key: "ratings" as const, label: `Ratings (${template.rating_count})` },
    { key: "settings" as const, label: "Settings" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b border-surface-200/80 px-8 py-5 bg-surface-50/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/templates" className="text-surface-400 hover:text-foreground transition-colors text-sm font-bold">
            ← Templates
          </Link>
          <span className="text-surface-300">/</span>
          <span className="text-sm font-bold text-foreground truncate max-w-xs">{template.title}</span>
          <StatusBadge status={template.template_status} />
          {template.template_visibility !== "PRIVATE" && (
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border bg-primary/8 text-primary border-primary/10">
              {template.template_visibility}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">{template.title}</h1>
            <p className="text-[11px] text-surface-400 font-bold mt-0.5 uppercase tracking-widest">
              v{template.template_version} · {template.template_category || "Uncategorized"} · {template.author_name}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Favorite */}
            <button
              onClick={handleFavorite}
              className={`px-3.5 py-2 rounded-xl border text-sm font-bold transition-all ${
                template.is_favorite
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "border-surface-200 text-surface-500 hover:text-foreground hover:bg-surface-100"
              }`}
            >
              {template.is_favorite ? "⭐ Favorited" : "☆ Favorite"}
            </button>

            {/* Share Link */}
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl border border-surface-200 text-sm font-bold text-surface-500 hover:text-foreground hover:bg-surface-100 transition-all"
            >
              🔗 Copy Link
            </button>

            {/* Edit / Save */}
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-xl border border-surface-200 text-sm font-bold text-surface-500 hover:bg-surface-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary text-background text-sm font-black hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 rounded-xl border border-surface-200 text-sm font-bold text-surface-500 hover:text-foreground hover:bg-surface-100 transition-all"
              >
                ✏️ Edit
              </button>
            )}

            {/* Publish */}
            {isDraft && (
              <button
                onClick={() => setShowPublishPanel(true)}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-accent to-accent/90 text-background rounded-xl text-sm font-black hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,186,8,0.4)] transition-all"
              >
                🚀 Publish
              </button>
            )}

            {/* Archive */}
            {!template.template_status.includes("ARCHIVED") && (
              <button
                onClick={handleArchive}
                className="px-4 py-2 rounded-xl border border-red-200 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Share URL Banner ── */}
      {shareUrl && (
        <div className="border-b border-accent/20 bg-accent/5 px-8 py-2.5 flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-accent">🔗 Share URL:</span>
          <code className="text-xs text-surface-600 flex-1 truncate">{shareUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }}
            className="text-[11px] font-black text-accent hover:underline"
          >
            Copy
          </button>
        </div>
      )}

      {/* ── Publish Panel ── */}
      <AnimatePresence>
        {showPublishPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-surface-200/80 bg-surface-50/80 px-8 py-5 overflow-hidden shrink-0"
          >
            <h3 className="text-sm font-black text-foreground mb-3">Choose visibility before publishing:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {VISIBILITIES.filter(v => v.value !== "PRIVATE").map(v => (
                <button
                  key={v.value}
                  onClick={() => setPublishVisibility(v.value as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    publishVisibility === v.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-surface-200 hover:border-surface-300 text-surface-600"
                  }`}
                >
                  <div className="font-black text-sm">{v.label}</div>
                  <div className="text-[10px] font-medium mt-0.5 opacity-70">{v.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPublishPanel(false)} className="px-4 py-2 border border-surface-200 rounded-xl text-sm font-bold text-surface-500 hover:bg-surface-100 transition-all">
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="flex-1 max-w-xs py-2 bg-gradient-to-r from-accent to-accent/90 text-background rounded-xl text-sm font-black hover:shadow-[0_0_20px_rgba(255,186,8,0.3)] transition-all disabled:opacity-50"
              >
                {saving ? "Publishing..." : "🚀 Confirm & Publish"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab Bar ── */}
      <div className="border-b border-surface-200/60 px-8 flex items-center gap-1 shrink-0 bg-background/50">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3.5 text-[12px] font-bold border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-surface-400 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="max-w-3xl space-y-6">
            {editMode ? (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Title</label>
                  <input
                    type="text"
                    value={editData.title || ""}
                    onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                    className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-bold text-foreground focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Description</label>
                  <textarea
                    value={editData.description || ""}
                    onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-surface-100 border border-surface-200 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Category</label>
                    <select
                      value={editData.template_category || ""}
                      onChange={e => setEditData(p => ({ ...p, template_category: e.target.value }))}
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Difficulty</label>
                    <select
                      value={editData.template_difficulty || ""}
                      onChange={e => setEditData(p => ({ ...p, template_difficulty: e.target.value }))}
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select...</option>
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Building Type</label>
                    <input
                      type="text"
                      value={editData.template_building_type || ""}
                      onChange={e => setEditData(p => ({ ...p, template_building_type: e.target.value }))}
                      placeholder="e.g. Hospital, Office Tower"
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Country</label>
                    <input
                      type="text"
                      value={editData.template_country || ""}
                      onChange={e => setEditData(p => ({ ...p, template_country: e.target.value }))}
                      placeholder="e.g. United States"
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Est. Duration (days)</label>
                    <input
                      type="number"
                      value={editData.template_est_duration_days ?? ""}
                      onChange={e => setEditData(p => ({ ...p, template_est_duration_days: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Cost Range (min)</label>
                    <input
                      type="number"
                      value={editData.template_est_cost_min ?? ""}
                      onChange={e => setEditData(p => ({ ...p, template_est_cost_min: e.target.value || null }))}
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Cost Range (max)</label>
                    <input
                      type="number"
                      value={editData.template_est_cost_max ?? ""}
                      onChange={e => setEditData(p => ({ ...p, template_est_cost_max: e.target.value || null }))}
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Thumbnail URL</label>
                    <input
                      type="url"
                      value={editData.template_thumbnail || ""}
                      onChange={e => setEditData(p => ({ ...p, template_thumbnail: e.target.value }))}
                      placeholder="https://..."
                      className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                </div>
                {/* Tags */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={(editData.template_tags || []).join(", ")}
                    onChange={e => setEditData(p => ({
                      ...p,
                      template_tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                    }))}
                    placeholder="residential, standard, phase-1"
                    className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Tasks", value: template.task_count.toString(), emoji: "📌" },
                    { label: "Duration", value: template.template_est_duration_days ? `${template.template_est_duration_days}d` : "—", emoji: "⏱" },
                    {
                      label: "Cost Range",
                      value: template.template_est_cost_min
                        ? `$${Number(template.template_est_cost_min).toLocaleString()} – $${Number(template.template_est_cost_max).toLocaleString()}`
                        : "—",
                      emoji: "💰",
                    },
                    { label: "Rating", value: template.avg_rating > 0 ? `${template.avg_rating.toFixed(1)}/5 (${template.rating_count})` : "No ratings", emoji: "⭐" },
                  ].map(s => (
                    <div key={s.label} className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1">{s.emoji} {s.label}</p>
                      <p className="text-sm font-black text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {template.description && (
                  <div className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-2">Description</h3>
                    <p className="text-sm text-surface-600 font-medium leading-relaxed">{template.description}</p>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Category", template.template_category || "—"],
                    ["Building Type", template.template_building_type || "—"],
                    ["Difficulty", template.template_difficulty || "—"],
                    ["Country", template.template_country || "—"],
                    ["License", template.template_license || "—"],
                    ["Version", `v${template.template_version}`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-surface-50/80 border border-surface-200/60 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">{k}</p>
                      <p className="text-sm font-bold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                {template.template_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {template.template_tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-surface-100 border border-surface-200 rounded-lg text-[11px] font-bold text-surface-500 uppercase tracking-widest">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TASKS */}
        {activeTab === "tasks" && (
          <div className="max-w-3xl">
            <div className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-5">
                Project Structure — {template.task_count} Root Tasks
              </h2>
              {(template.tasks ?? []).length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-10">No tasks defined yet.</p>
              ) : (
                <div className="space-y-1">
                  {(template.tasks ?? []).map(task => <TaskTreeNode key={task.uid} task={task} depth={0} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RATINGS */}
        {activeTab === "ratings" && (
          <div className="max-w-2xl space-y-6">
            {/* Submit Rating */}
            {isPublished && (
              <div className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-6">
                <h3 className="text-sm font-black text-foreground mb-4">
                  {template.user_rating ? "Update Your Rating" : "Rate This Template"}
                </h3>
                <StarRating value={userScore} onChange={setUserScore} />
                <textarea
                  value={userReview}
                  onChange={e => setUserReview(e.target.value)}
                  placeholder="Write a short review (optional)..."
                  rows={3}
                  className="w-full mt-4 bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent transition-all resize-none"
                />
                <button
                  onClick={handleRatingSubmit}
                  disabled={ratingSubmitting || !userScore}
                  className="mt-3 px-6 py-2.5 bg-primary text-background rounded-xl text-sm font-black hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {ratingSubmitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            )}

            {/* Ratings List */}
            {ratingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
              </div>
            ) : ratings.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-8">No ratings yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {ratings.map((r, i) => (
                  <div key={i} className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} className={`w-4 h-4 ${s <= r.score ? "text-accent" : "text-surface-300"}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-foreground">{r.author_name}</span>
                      <span className="text-[10px] text-surface-400 font-medium ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.review && <p className="text-sm text-surface-600 font-medium">{r.review}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            {/* Visibility Setting */}
            <div className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">Visibility</h3>
              <div className="grid grid-cols-2 gap-3">
                {VISIBILITIES.map(v => (
                  <button
                    key={v.value}
                    onClick={async () => {
                      try {
                        const updated = await projectsApi.updateTemplate(uid, { template_visibility: v.value });
                        setTemplate(updated);
                        toast.success(`Visibility changed to ${v.value}`);
                      } catch { toast.error("Failed to update visibility."); }
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      template.template_visibility === v.value
                        ? "border-accent bg-accent/10"
                        : "border-surface-200 hover:border-surface-300"
                    }`}
                  >
                    <div className="text-sm font-black text-foreground">{v.label}</div>
                    <div className="text-[11px] text-surface-400 font-medium mt-0.5">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Share Link */}
            <div className="bg-surface-100/60 border border-surface-200/60 rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-2">Share Link</h3>
              <p className="text-xs text-surface-400 font-medium mb-4">
                Anyone with this link can view the template. Regenerating the link will invalidate the old one.
              </p>
              {shareUrl && (
                <div className="flex items-center gap-3 bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 mb-3">
                  <code className="text-xs text-surface-600 flex-1 truncate">{shareUrl}</code>
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }} className="text-[11px] font-black text-accent shrink-0">Copy</button>
                </div>
              )}
              <button
                onClick={handleCopyLink}
                className="px-5 py-2.5 bg-primary text-background rounded-xl text-sm font-black hover:bg-primary/90 transition-all"
              >
                {shareUrl ? "🔄 Regenerate Link" : "🔗 Generate Share Link"}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50/50 border border-red-200/60 rounded-2xl p-6">
              <h3 className="text-sm font-black text-red-600 mb-2">Danger Zone</h3>
              <p className="text-xs text-surface-500 font-medium mb-4">
                Archiving hides this template from your library and the Marketplace. It is not deleted.
              </p>
              <button
                onClick={handleArchive}
                className="px-5 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-black hover:bg-red-100 transition-all"
              >
                Archive Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
