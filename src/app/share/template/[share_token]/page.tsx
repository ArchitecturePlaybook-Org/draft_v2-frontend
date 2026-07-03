"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

interface ChecklistItem {
  title: string;
  order: number;
}

interface TaskNode {
  uid: string;
  title: string;
  description: string;
  priority: string;
  checklists: ChecklistItem[];
  subtasks: TaskNode[];
}

interface PublicTemplate {
  uid: string;
  title: string;
  description: string;
  template_category: string;
  template_tags: string[];
  template_building_type: string;
  template_difficulty: string;
  template_license: string;
  template_est_duration_days: number | null;
  template_est_cost_min: string | null;
  template_est_cost_max: string | null;
  avg_rating: number;
  rating_count: number;
  task_count: number;
  author_name: string;
  is_in_library?: boolean;
  tasks: TaskNode[];
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-50 text-red-600 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-600 border-amber-200",
  LOW: "bg-surface-100 text-surface-500 border-surface-200",
};

function TaskTreeNode({ task, depth = 0 }: { task: TaskNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = task.subtasks.length > 0;

  return (
    <div className={`${depth > 0 ? "ml-6 border-l-2 border-surface-200/60 pl-4" : ""}`}>
      <div
        className="group flex items-start gap-3 py-3 px-4 rounded-xl hover:bg-surface-100/60 transition-colors cursor-pointer"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand Toggle */}
        <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center">
          {hasChildren ? (
            <span className={`text-surface-400 transition-transform text-xs font-bold ${expanded ? "rotate-90" : ""}`}>
              ▶
            </span>
          ) : (
            <div className="w-2 h-2 rounded-full bg-surface-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">{task.title}</span>
            {task.priority && task.priority !== "MEDIUM" && (
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM}`}>
                {task.priority}
              </span>
            )}
            {task.checklists.length > 0 && (
              <span className="text-[10px] font-bold text-surface-400">
                ✓ {task.checklists.length}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="text-[10px] font-bold text-surface-400">
                ↳ {task.subtasks.length} subtask{task.subtasks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-surface-500 mt-0.5 font-medium line-clamp-1">{task.description}</p>
          )}
          {/* Checklists */}
          {expanded && task.checklists.length > 0 && (
            <div className="mt-2 space-y-1">
              {task.checklists.map((cl, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-surface-300 flex-shrink-0" />
                  <span className="text-[11px] font-medium text-surface-500">{cl.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {expanded && task.subtasks.length > 0 && (
        <div className="mt-1">
          {task.subtasks.map((sub) => (
            <TaskTreeNode key={sub.uid} task={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? "text-accent" : "text-surface-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-bold text-surface-500">
        {rating > 0 ? `${rating.toFixed(1)} · ${count} rating${count !== 1 ? "s" : ""}` : "No ratings yet"}
      </span>
    </div>
  );
}

export default function PublicTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const shareToken = params.share_token as string;

  const [template, setTemplate] = useState<PublicTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) {
      projectsApi
        .getPublicTemplate(shareToken)
        .then((data) => setTemplate(data))
        .catch((err) => {
          if (err.status === 410) setError("This share link has expired.");
          else if (err.status === 403) setError("This template is private.");
          else setError("Template not found.");
        })
        .finally(() => setLoading(false));
    }
  }, [shareToken]);

  const handleSaveToLibrary = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/share/template/${shareToken}`);
      return;
    }
    setSaving(true);
    try {
      const res = await projectsApi.savePublicTemplateToLibrary(shareToken);
      toast.success(
        <div className="flex items-center gap-3">
          <span>✅ "{res.template_title}" saved to your library!</span>
          <button
            onClick={() => router.push("/dashboard/templates")}
            className="font-bold text-accent underline"
          >
            View Library →
          </button>
        </div>
      );
      setTemplate((prev) => prev ? { ...prev, is_in_library: true } : prev);
    } catch {
      toast.error("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />
        <div className="bg-surface-100/50 backdrop-blur-3xl p-10 rounded-3xl shadow-2xl shadow-primary/10 text-center max-w-md w-full border border-surface-200/50 relative z-10">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-2xl font-black text-primary mb-2">Template Unavailable</h2>
          <p className="text-sm text-surface-500 font-medium mb-8">{error || "This template link is invalid or has been removed."}</p>
          <Link
            href="/marketplace?tab=templates"
            className="inline-block px-6 py-3 bg-primary text-background rounded-xl font-black text-sm"
          >
            Browse Marketplace →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 relative overflow-x-hidden">
      <div className="absolute inset-0 arch-grid opacity-5 pointer-events-none fixed" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-accent/4 rounded-full blur-[120px] pointer-events-none fixed" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-100/80 backdrop-blur-xl border-b border-surface-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 200 200" className="w-8 h-8 text-primary">
            <polygon points="50,0 0,200 100,200" fill="currentColor" />
            <polygon points="100,0 100,100 200,50" fill="currentColor" />
          </svg>
          <span className="text-sm font-black text-primary tracking-tight">Architecture Playbook</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
            Template Preview
          </span>
          {isAuthenticated ? (
            <Link
              href="/dashboard/templates"
              className="text-[12px] font-bold text-surface-500 hover:text-foreground transition-colors"
            >
              My Library →
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[12px] font-bold text-surface-500 hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8 relative z-10">
        {/* Hero */}
        <div className="bg-surface-100/60 backdrop-blur-xl border border-surface-200/60 rounded-3xl p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                {template.template_category && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/10">
                    {template.template_category}
                  </span>
                )}
                {template.template_building_type && (
                  <span className="px-3 py-1 bg-surface-200 text-surface-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {template.template_building_type}
                  </span>
                )}
                {template.template_difficulty && (
                  <span className="px-3 py-1 bg-accent/10 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest border border-accent/20">
                    {template.template_difficulty}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-primary tracking-tight leading-tight mb-2">
                {template.title}
              </h1>
              <p className="text-sm text-surface-500 font-medium">
                by <span className="text-foreground font-bold">{template.author_name}</span>
              </p>
            </div>

            {/* Save CTA */}
            <button
              onClick={handleSaveToLibrary}
              disabled={saving || template.is_in_library}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg disabled:opacity-70 ${
                template.is_in_library
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-gradient-to-r from-accent to-accent/90 text-background hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,186,8,0.4)]"
              }`}
            >
              {template.is_in_library ? (
                <><span>✅</span> In Your Library</>
              ) : saving ? (
                <><div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><span>📥</span> Save to My Library</>
              )}
            </button>
          </div>

          {/* Description */}
          {template.description && (
            <p className="text-sm text-surface-600 font-medium leading-relaxed mb-6">
              {template.description}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Tasks", value: template.task_count.toString(), emoji: "📌" },
              { label: "Est. Duration", value: template.template_est_duration_days ? `${template.template_est_duration_days} days` : "—", emoji: "⏱" },
              {
                label: "Est. Cost Range",
                value: template.template_est_cost_min && template.template_est_cost_max
                  ? `$${Number(template.template_est_cost_min).toLocaleString()} – $${Number(template.template_est_cost_max).toLocaleString()}`
                  : "—",
                emoji: "💰"
              },
              { label: "License", value: template.template_license || "Private", emoji: "📜" },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-50/80 rounded-xl p-3 border border-surface-200/60">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-surface-400 mb-1">{stat.emoji} {stat.label}</p>
                <p className="text-sm font-black text-foreground truncate">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Rating */}
          <div className="mt-5 pt-5 border-t border-surface-200/60">
            <StarDisplay rating={template.avg_rating} count={template.rating_count} />
          </div>
        </div>

        {/* Task Tree */}
        <div className="bg-surface-100/60 backdrop-blur-xl border border-surface-200/60 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">
            Project Structure — {template.task_count} Tasks
          </h2>
          {template.tasks.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No tasks in this template.</p>
          ) : (
            <div className="space-y-1">
              {template.tasks.map((task) => (
                <TaskTreeNode key={task.uid} task={task} depth={0} />
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        {template.template_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {template.template_tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-surface-100 border border-surface-200 rounded-lg text-[11px] font-bold text-surface-500 uppercase tracking-widest"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-3xl p-8 text-center">
          <h3 className="text-xl font-black text-foreground mb-2">
            Ready to use this blueprint?
          </h3>
          <p className="text-sm text-surface-500 font-medium mb-6">
            Save it to your library and apply it when creating your next project — in seconds.
          </p>
          <button
            onClick={handleSaveToLibrary}
            disabled={saving || template.is_in_library}
            className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-lg ${
              template.is_in_library
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-gradient-to-r from-accent to-accent/90 text-background hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,186,8,0.4)]"
            }`}
          >
            {template.is_in_library ? "✅ Already in Your Library" : "📥 Save to My Library — Free"}
          </button>
          {!isAuthenticated && (
            <p className="text-[11px] text-surface-400 font-medium mt-3">
              You'll be asked to sign in or create a free account.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
            Shared via <span className="text-accent">Architecture Playbook</span> Templates
          </p>
        </div>
      </main>
    </div>
  );
}
