"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type TemplateTab = "mine" | "saved" | "org";

interface Template {
  uid: string;
  title: string;
  description: string;
  template_status: TemplateStatus;
  template_visibility: string;
  template_category: string;
  template_tags: string[];
  template_building_type: string;
  template_difficulty: string;
  template_license: string;
  template_est_duration_days: number | null;
  template_est_cost_min: string | null;
  template_est_cost_max: string | null;
  template_thumbnail: string;
  avg_rating: number;
  rating_count: number;
  task_count: number;
  checklist_count: number;
  author_name: string;
  share_token: string | null;
  is_favorite: boolean;
  use_count: number;
  created_at: string;
}

const STATUS_STYLES: Record<TemplateStatus, string> = {
  DRAFT: "bg-surface-200 text-surface-600 border-surface-300",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-amber-50 text-amber-700 border-amber-200",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  BEGINNER: "text-emerald-600",
  INTERMEDIATE: "text-accent",
  EXPERT: "text-red-500",
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? "text-accent" : "text-surface-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] font-bold text-surface-500">
        {rating > 0 ? `${rating.toFixed(1)} (${count})` : "No ratings"}
      </span>
    </div>
  );
}

function TemplateCard({
  template,
  onFavoriteToggle,
  onArchive,
  onCopyLink,
}: {
  template: Template;
  onFavoriteToggle: (uid: string) => void;
  onArchive: (uid: string) => void;
  onCopyLink: (uid: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group relative bg-surface-100/60 backdrop-blur-sm border border-surface-200/80 rounded-2xl overflow-hidden hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300"
    >
      {/* Thumbnail or Generated Banner */}
      <div className="relative h-32 bg-gradient-to-br from-surface-200 to-surface-300 overflow-hidden">
        {template.template_thumbnail ? (
          <img
            src={template.template_thumbnail}
            alt={template.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 arch-grid opacity-20" />
            <span className="text-4xl opacity-50">📋</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${STATUS_STYLES[template.template_status]}`}
          >
            {template.template_status}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle(template.uid);
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-accent/10"
        >
          <span className={template.is_favorite ? "text-accent" : "text-surface-400"}>
            {template.is_favorite ? "⭐" : "☆"}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-black text-sm text-foreground leading-tight line-clamp-2">
            {template.title}
          </h3>
          {/* 3-dot menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-200 text-surface-400 hover:text-foreground transition-colors"
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-8 z-50 min-w-[160px] bg-surface-50 border border-surface-200 rounded-xl shadow-xl py-1 animate-in fade-in-0 zoom-in-95"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {[
                  { label: "✏️ Edit", action: () => router.push(`/dashboard/templates/${template.uid}`) },
                  ...(template.template_status === "DRAFT"
                    ? [{ label: "🚀 Publish", action: () => router.push(`/dashboard/templates/${template.uid}?action=publish`) }]
                    : []),
                  { label: "🔗 Copy Link", action: () => onCopyLink(template.uid) },
                  { label: "📥 Use in New Project", action: () => router.push(`/dashboard/projects?template=${template.uid}`) },
                  { label: "🗄 Archive", action: () => onArchive(template.uid) },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-100 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta Pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.template_category && (
            <span className="px-2 py-0.5 bg-primary/8 text-primary text-[10px] font-bold rounded-md border border-primary/10">
              {template.template_category}
            </span>
          )}
          {template.template_difficulty && (
            <span className={`text-[10px] font-bold ${DIFFICULTY_STYLES[template.template_difficulty] || "text-surface-500"}`}>
              {template.template_difficulty}
            </span>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-[11px] text-surface-500 font-medium mb-3">
          <span>📌 {template.task_count} tasks</span>
          {template.template_est_duration_days && (
            <span>⏱ {template.template_est_duration_days}d</span>
          )}
          {template.use_count > 0 && (
            <span>🔁 Used {template.use_count}×</span>
          )}
        </div>

        <StarRating rating={template.avg_rating} count={template.rating_count} />
      </div>

      {/* Click overlay to navigate */}
      <Link
        href={`/dashboard/templates/${template.uid}`}
        className="absolute inset-0 z-10"
        tabIndex={-1}
        aria-label={`Open ${template.title}`}
      />
    </motion.div>
  );
}

export default function TemplatesLibraryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TemplateTab>("mine");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const categories = ["Residential", "Commercial", "Industrial", "Renovation", "Infrastructure", "Mixed-Use"];

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { tab, sort };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (favoritesOnly) params.favorites_only = "true";

      const res = await projectsApi.getTemplateLibrary(params);
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setTemplates(list);
    } catch {
      toast.error("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, [tab, search, categoryFilter, sort, favoritesOnly]);

  useEffect(() => {
    const debounce = setTimeout(fetchTemplates, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [fetchTemplates, search]);

  const handleFavoriteToggle = async (uid: string) => {
    try {
      const res = await projectsApi.toggleTemplateFavorite(uid);
      setTemplates((prev) =>
        prev.map((t) => (t.uid === uid ? { ...t, is_favorite: res.is_favorite } : t))
      );
    } catch {
      toast.error("Failed to update favorite.");
    }
  };

  const handleArchive = async (uid: string) => {
    try {
      await projectsApi.archiveTemplate(uid);
      toast.success("Template archived.");
      fetchTemplates();
    } catch {
      toast.error("Failed to archive template.");
    }
  };

  const handleCopyLink = async (uid: string) => {
    try {
      const res = await projectsApi.generateTemplateShareLink(uid);
      await navigator.clipboard.writeText(res.share_url);
      toast.success("Share link copied to clipboard! 🔗");
    } catch {
      toast.error("Failed to generate share link.");
    }
  };

  const TABS: { key: TemplateTab; label: string; emoji: string }[] = [
    { key: "mine", label: "My Templates", emoji: "📋" },
    { key: "saved", label: "Saved from Marketplace", emoji: "⭐" },
    { key: "org", label: "Organization", emoji: "🏢" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-surface-200/80 bg-surface-50/50 backdrop-blur-sm px-8 py-6 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Templates</h1>
            <p className="text-sm text-surface-500 font-medium mt-0.5">
              Reusable project blueprints — save once, deploy instantly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace?tab=templates"
              className="flex items-center gap-2 px-4 py-2.5 border border-surface-200 rounded-xl text-[13px] font-bold text-surface-600 hover:bg-surface-100 hover:text-foreground transition-colors"
            >
              🌐 Browse Marketplace
            </Link>
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background rounded-xl text-[13px] font-black hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              + Save a Project
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-100 rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-surface-500 hover:text-foreground"
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-surface-200/60 px-8 py-3 flex items-center gap-3 shrink-0 flex-wrap bg-background/50">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="-created_at">Recently Added</option>
          <option value="title">A → Z</option>
          <option value="created_at">Oldest First</option>
        </select>

        {/* Favorites Toggle */}
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
            favoritesOnly
              ? "bg-accent/10 text-accent border-accent/30"
              : "bg-surface-100 text-surface-500 border-surface-200 hover:text-foreground"
          }`}
        >
          ⭐ Favorites
        </button>

        <span className="ml-auto text-[11px] font-bold text-surface-400 uppercase tracking-widest">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-surface-200 border-t-accent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center text-3xl mb-4">
              📋
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">No templates yet</h3>
            <p className="text-sm text-surface-500 font-medium mb-6 max-w-xs">
              {tab === "mine"
                ? "Save any project as a template to reuse its structure instantly."
                : tab === "saved"
                ? "Browse the Marketplace and save templates you love."
                : "Your organization hasn't shared any templates yet."}
            </p>
            {tab === "mine" ? (
              <Link
                href="/dashboard/projects"
                className="px-6 py-3 bg-primary text-background rounded-xl text-sm font-black hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                Go to Projects →
              </Link>
            ) : (
              <Link
                href="/marketplace?tab=templates"
                className="px-6 py-3 bg-primary text-background rounded-xl text-sm font-black hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                Browse Marketplace →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {templates.map((t) => (
              <TemplateCard
                key={t.uid}
                template={t}
                onFavoriteToggle={handleFavoriteToggle}
                onArchive={handleArchive}
                onCopyLink={handleCopyLink}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
