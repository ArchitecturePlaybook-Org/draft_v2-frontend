"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchMyTemplates, publishTemplate, type TemplateAsset } from "@/domains/marketplace/api";

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     bg: "bg-surface-100", text: "text-surface-500", border: "border-surface-200" },
  PUBLISHED: { label: "Published", bg: "bg-green-50",    text: "text-green-700",   border: "border-green-200" },
  ARCHIVED:  { label: "Archived",  bg: "bg-surface-50",  text: "text-surface-400", border: "border-surface-200" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "text-green-600", INTERMEDIATE: "text-amber-600", EXPERT: "text-red-600",
};

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) {
  return (
    <div className="bg-surface-card border border-surface-200 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-black text-primary mb-1">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-surface-400">{label}</p>
      {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function CreatorDashboardPage() {
  const [templates, setTemplates] = useState<TemplateAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetchMyTemplates()
      .then((data) => setTemplates(data.filter((t) => t.template_status !== undefined)))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePublish = async (uid: string) => {
    setPublishing(uid);
    try {
      const updated = await publishTemplate(uid, "PUBLIC");
      setTemplates((prev) => prev.map((t) => t.uid === uid ? { ...t, template_status: "PUBLISHED", template_visibility: "PUBLIC" } : t));
    } finally {
      setPublishing(null);
    }
  };

  const myTemplates = templates.filter((t) => t.template_status);
  const stats = {
    total: myTemplates.length,
    published: myTemplates.filter((t) => t.template_status === "PUBLISHED").length,
    totalRatings: myTemplates.reduce((sum, t) => sum + t.rating_count, 0),
    avgRating: myTemplates.filter((t) => t.avg_rating > 0).length > 0
      ? (myTemplates.reduce((sum, t) => sum + t.avg_rating, 0) / myTemplates.filter((t) => t.avg_rating > 0).length).toFixed(1)
      : "—",
  };

  const filtered = activeTab === "published"
    ? myTemplates.filter((t) => t.template_status === "PUBLISHED")
    : activeTab === "draft"
      ? myTemplates.filter((t) => t.template_status === "DRAFT")
      : myTemplates;

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
          <div>
            <Link href="/marketplace" className="text-sm text-surface-500 hover:text-primary mb-2 block transition-colors">← Templates Hub</Link>
            <h1 className="text-3xl font-black text-primary tracking-tight">Creator Dashboard</h1>
            <p className="text-surface-500 mt-1">Publish your templates and track their impact.</p>
          </div>
          <Link
            href="/dashboard/templates"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Template
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon="📐" label="My Templates" value={stats.total} />
          <StatCard icon="🌍" label="Published" value={stats.published} sub="visible to everyone" />
          <StatCard icon="⭐" label="Avg Rating" value={stats.avgRating} />
          <StatCard icon="💬" label="Total Reviews" value={stats.totalRatings} />
        </div>

        {/* How to publish banner */}
        {stats.published === 0 && !loading && (
          <div className="bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20 rounded-2xl p-6 mb-8 flex items-start gap-5">
            <div className="text-3xl">🚀</div>
            <div>
              <h3 className="font-bold text-primary text-lg mb-1">Ready to share your work?</h3>
              <p className="text-surface-600 text-sm leading-relaxed mb-3">
                To publish a template, first create a project and save it as a template from the Project dashboard.
                Once saved, it will appear below and you can publish it to the Templates Hub.
              </p>
              <Link href="/dashboard/templates" className="text-sm font-bold text-accent hover:underline">
                Go to My Templates →
              </Link>
            </div>
          </div>
        )}

        {/* Template Table */}
        <div>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-surface-100 p-1 rounded-xl w-fit">
            {([["all", "All"], ["published", "Published"], ["draft", "Drafts"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setActiveTab(val)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === val ? 'bg-surface-card text-primary shadow-sm' : 'text-surface-500 hover:text-primary'}`}
              >
                {label}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === val ? 'bg-primary/10 text-primary' : 'bg-surface-200 text-surface-400'}`}>
                  {val === "all" ? myTemplates.length : val === "published" ? stats.published : myTemplates.length - stats.published}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="bg-surface-card border border-surface-200 rounded-2xl h-24" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-surface-card border border-surface-200 rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">📂</p>
              <h3 className="text-xl font-bold text-primary mb-2">No templates yet</h3>
              <p className="text-surface-500 mb-6 text-sm">Save a project as a template to see it here.</p>
              <Link href="/dashboard/templates" className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block text-sm">
                Go to My Templates
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const cfg = STATUS_CONFIG[t.template_status] || STATUS_CONFIG.DRAFT;
                return (
                  <div key={t.uid} className="bg-surface-card border border-surface-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Thumbnail */}
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-surface-100 shrink-0 border border-surface-200">
                      {t.template_thumbnail
                        ? <img src={t.template_thumbnail} alt={t.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-surface-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          </div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-1">
                        <h3 className="font-bold text-primary text-base truncate">{t.title}</h3>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-400">
                        {t.template_category && <span>{t.template_category}</span>}
                        {t.template_difficulty && (
                          <span className={`font-medium ${DIFFICULTY_COLORS[t.template_difficulty] || ''}`}>
                            {t.template_difficulty.charAt(0) + t.template_difficulty.slice(1).toLowerCase()}
                          </span>
                        )}
                        <span>{t.task_count} tasks</span>
                        {t.avg_rating > 0 && <span>⭐ {t.avg_rating.toFixed(1)} ({t.rating_count})</span>}
                        <span>v{t.template_version}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {t.template_status === "DRAFT" && (
                        <button
                          onClick={() => handlePublish(t.uid)}
                          disabled={publishing === t.uid}
                          className="px-4 py-2 bg-accent/10 text-accent text-xs font-bold rounded-lg hover:bg-accent hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {publishing === t.uid ? "Publishing..." : "Publish"}
                        </button>
                      )}
                      {t.template_status === "PUBLISHED" && (
                        <Link
                          href={`/marketplace/${t.uid}`}
                          className="px-4 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors"
                        >
                          View Live
                        </Link>
                      )}
                      <Link
                        href={`/marketplace/dashboard/${t.uid}`}
                        className="px-4 py-2 bg-surface-100 text-surface-600 text-xs font-bold rounded-lg hover:bg-surface-200 transition-colors"
                      >
                        Stats
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
