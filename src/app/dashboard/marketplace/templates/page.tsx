"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

interface MarketplaceTemplate {
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
  share_token: string | null;
  is_in_library: boolean;
}

const CATEGORIES = ["All", "Residential", "Commercial", "Industrial", "Renovation", "Infrastructure", "Mixed-Use"];
const DIFFICULTIES = ["All", "BEGINNER", "INTERMEDIATE", "EXPERT"];
const SORTS = [
  { value: "-avg_rating",   label: "Top Rated" },
  { value: "-created_at",   label: "Newest" },
  { value: "-task_count",   label: "Most Tasks" },
  { value: "-rating_count", label: "Most Reviews" },
];

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map(s => (
          <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-accent" : "text-surface-300"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] font-bold text-surface-400">
        {rating > 0 ? `${rating.toFixed(1)} (${count})` : "No ratings"}
      </span>
    </div>
  );
}

function TemplateCard({ t, onSave }: { t: MarketplaceTemplate; onSave: (uid: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(t.is_in_library);

  return (
    <div className="group bg-surface-100/50 backdrop-blur-sm border border-surface-200/60 rounded-2xl p-6 flex flex-col gap-4 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {t.template_category && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary/8 text-primary border border-primary/10 rounded-md">
                {t.template_category}
              </span>
            )}
            {t.template_difficulty && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-surface-200 text-surface-500 rounded-md">
                {t.template_difficulty}
              </span>
            )}
          </div>
          <h3 className="font-black text-sm text-foreground leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {t.title}
          </h3>
          <p className="text-[11px] text-surface-400 font-medium mt-0.5">by {t.author_name}</p>
        </div>
        <div className="text-2xl shrink-0">📋</div>
      </div>

      {/* Description */}
      {t.description && (
        <p className="text-xs text-surface-500 font-medium leading-relaxed line-clamp-2">{t.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold text-surface-400">📌 {t.task_count} tasks</span>
        {t.template_est_duration_days && (
          <span className="text-[11px] font-bold text-surface-400">⏱ {t.template_est_duration_days}d</span>
        )}
        {t.template_building_type && (
          <span className="text-[11px] font-bold text-surface-400">🏗 {t.template_building_type}</span>
        )}
      </div>

      <StarRow rating={t.avg_rating} count={t.rating_count} />

      {/* Tags */}
      {t.template_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.template_tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 text-[9px] font-bold text-surface-400 bg-surface-100 border border-surface-200 rounded-md uppercase tracking-wider">
              #{tag}
            </span>
          ))}
          {t.template_tags.length > 3 && (
            <span className="px-2 py-0.5 text-[9px] font-bold text-surface-400">+{t.template_tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-surface-200/60 mt-auto">
        {t.share_token && (
          <Link
            href={`/share/template/${t.share_token}`}
            target="_blank"
            className="flex-1 text-center py-2 rounded-xl border border-surface-200 text-xs font-bold text-surface-500 hover:text-foreground hover:bg-surface-100 transition-all"
          >
            Preview
          </Link>
        )}
        <button
          disabled={saving || saved}
          onClick={async () => {
            setSaving(true);
            await onSave(t.uid);
            setSaved(true);
            setSaving(false);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
            saved
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-gradient-to-r from-accent to-accent/90 text-background hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(255,186,8,0.35)]"
          }`}
        >
          {saving ? "Saving..." : saved ? "✅ Saved" : "📥 Save"}
        </button>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [sort, setSort] = useState("-avg_rating");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetch = useCallback(async (reset = true) => {
    if (reset) { setLoading(true); setPage(1); }
    else setLoadingMore(true);
    try {
      const params: Record<string, string> = { sort };
      if (search) params.search = search;
      if (category !== "All") params.category = category;
      if (difficulty !== "All") params.difficulty = difficulty;
      params.page = String(reset ? 1 : page + 1);

      const res = await projectsApi.getTemplatesHubTemplates(params);
      const list = Array.isArray(res) ? res : res?.results ?? [];
      const next = !Array.isArray(res) && !!res?.next;
      if (reset) setTemplates(list);
      else setTemplates(prev => [...prev, ...list]);
      setHasMore(next);
      if (!reset) setPage(p => p + 1);
    } catch { /* silent */ }
    finally { setLoading(false); setLoadingMore(false); }

  }, [search, category, difficulty, sort, page]);

  useEffect(() => { fetch(true); }, [search, category, difficulty, sort]);

  const handleSave = async (uid: string) => {
    // Find share_token for this template
    const t = templates.find(t => t.uid === uid);
    if (!t?.share_token) {
      toast.error("No share link available.");
      return;
    }
    try {
      const res = await projectsApi.savePublicTemplateToLibrary(t.share_token);
      toast.success(
        <div className="flex items-center gap-3">
          <span>📋 Saved to library!</span>
          <button onClick={() => router.push("/dashboard/templates")} className="font-bold text-accent underline">
            View Library →
          </button>
        </div>
      );
    } catch {
      toast.error("Failed to save template.");
    }
  };

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-surface-200/60 px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-accent/10 text-accent border border-accent/20 rounded-lg">
              Community Marketplace
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">Template Library</h1>
          <p className="text-sm text-surface-500 font-medium max-w-lg">
            Browse community-curated project blueprints. Save any template to your library and apply it instantly when starting a new project.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 bg-surface-100 border border-surface-200 rounded-xl pl-9 pr-4 text-sm text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent transition-all"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-10 bg-surface-100 border border-surface-200 rounded-xl px-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Difficulty */}
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="h-10 bg-surface-100 border border-surface-200 rounded-xl px-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d === "All" ? "All Levels" : d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="h-10 bg-surface-100 border border-surface-200 rounded-xl px-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-surface-400 font-medium">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="text-lg font-black text-foreground mb-2">No templates found</h3>
            <p className="text-sm text-surface-400 font-medium mb-6">
              Try adjusting your filters or be the first to publish one!
            </p>
            <Link
              href="/dashboard/templates"
              className="inline-block px-6 py-3 bg-primary text-background rounded-xl font-black text-sm hover:bg-primary/90 transition-all"
            >
              Create a Template →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-5">
              {templates.length} template{templates.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map(t => (
                <TemplateCard key={t.uid} t={t} onSave={handleSave} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetch(false)}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-surface-100 border border-surface-200 rounded-xl text-sm font-bold text-surface-600 hover:bg-surface-200 transition-all disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
