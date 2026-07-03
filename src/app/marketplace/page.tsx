"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchPublicTemplates, type TemplateAsset } from "@/domains/marketplace/api";

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  "All", "Residential", "Commercial", "Hospitality", "Healthcare",
  "Education", "Industrial", "Infrastructure", "Mixed-Use", "Masterplan",
];

const DIFFICULTIES = [
  { value: "", label: "Any Level" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "EXPERT", label: "Expert" },
];

const SORTS = [
  { value: "-created_at", label: "Newest First" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "trending", label: "Trending" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-50 text-green-700 border-green-200",
  INTERMEDIATE: "bg-amber-50 text-amber-700 border-amber-200",
  EXPERT: "bg-red-50 text-red-600 border-red-200",
};

// ─── Template Card ──────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star} className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? "text-amber-400" : "text-surface-200"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-surface-400 font-medium">
        {rating > 0 ? rating.toFixed(1) : "—"}
        {count > 0 && <span className="ml-1">({count})</span>}
      </span>
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateAsset }) {
  return (
    <Link
      href={template.share_token ? `/marketplace/t/${template.share_token}` : `/marketplace/${template.uid}`}
      className="bg-surface-card border border-surface-200 rounded-2xl overflow-hidden group hover:shadow-xl hover:border-accent/30 transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-surface-100 to-surface-200 shrink-0">
        {template.template_thumbnail ? (
          <img
            src={template.template_thumbnail}
            alt={template.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {template.template_category && (
            <span className="bg-surface-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-primary shadow-sm">
              {template.template_category}
            </span>
          )}
          {template.template_difficulty && (
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${DIFFICULTY_COLORS[template.template_difficulty] || 'bg-surface-50 text-surface-500 border-surface-200'}`}>
              {template.template_difficulty.charAt(0) + template.template_difficulty.slice(1).toLowerCase()}
            </span>
          )}
        </div>
        {/* In Library badge */}
        {template.is_in_library && (
          <div className="absolute top-3 right-3">
            <span className="bg-accent text-primary text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest">In Library</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="text-base font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
            {template.title}
          </h3>
          {template.description && (
            <p className="text-xs text-surface-500 mt-1.5 line-clamp-2 leading-relaxed">{template.description}</p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {template.template_building_type && (
            <span className="text-[10px] font-bold text-surface-400 bg-surface-50 border border-surface-100 px-2 py-1 rounded-md uppercase tracking-wider">
              {template.template_building_type}
            </span>
          )}
          {template.template_est_duration_days && (
            <span className="text-[10px] font-medium text-surface-400">
              ~{template.template_est_duration_days}d
            </span>
          )}
        </div>

        {/* Tags */}
        {template.template_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.template_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] font-medium text-accent bg-accent/8 px-2 py-0.5 rounded-md">{tag}</span>
            ))}
            {template.template_tags.length > 3 && (
              <span className="text-[10px] text-surface-400">+{template.template_tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center overflow-hidden text-[10px] font-bold text-surface-500">
              {template.author_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-surface-500 truncate max-w-[100px]">{template.author_name}</span>
          </div>
          <StarRating rating={template.avg_rating} count={template.rating_count} />
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TemplateSkeleton() {
  return (
    <div className="bg-surface-card border border-surface-200 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-surface-100" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-surface-200 rounded w-3/4" />
        <div className="h-3 bg-surface-100 rounded w-full" />
        <div className="h-3 bg-surface-100 rounded w-2/3" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 bg-surface-100 rounded-md w-16" />
          <div className="h-5 bg-surface-100 rounded-md w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TemplatesHubPage() {
  const [templates, setTemplates] = useState<TemplateAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("-created_at");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPublicTemplates({
        search: search || undefined,
        category: category !== "All" ? category : undefined,
        difficulty: difficulty || undefined,
        sort,
      });
      setTemplates(res.results || []);
      setTotal(res.count || 0);
    } catch {
      setTemplates([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, difficulty, sort]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Hero */}
      <div className="bg-primary text-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="text-accent text-xs font-bold uppercase tracking-widest mb-4">Templates Hub</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6">
              Architecture Workflows,<br />
              <span className="text-accent">Built by Professionals.</span>
            </h1>
            <p className="text-surface-300 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
              Download battle-tested project templates created by the Architecture Playbook community. Save months of setup time.
            </p>

            {/* Search */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[280px] flex gap-3">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
                  placeholder="Search templates, categories, building types..."
                  className="flex-1 px-5 py-3.5 rounded-xl bg-surface-card/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
                <button
                  onClick={() => setSearch(searchInput)}
                  className="px-6 py-3.5 rounded-xl bg-accent text-primary font-bold hover:opacity-90 transition-opacity text-sm shrink-0"
                >
                  Search
                </button>
              </div>
              <Link
                href="/marketplace/dashboard"
                className="px-6 py-3.5 rounded-xl bg-surface-card/10 border border-white/20 text-white font-bold hover:bg-surface-card/20 transition-colors text-sm shrink-0 whitespace-nowrap"
              >
                🎨 Creator Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex gap-8">

        {/* Sidebar */}
        <div className="hidden lg:flex flex-col w-56 shrink-0 gap-8">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-4">Category</h4>
            <div className="flex flex-col gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${category === cat ? 'bg-primary text-background' : 'text-surface-600 hover:bg-surface-100 hover:text-primary'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-4">Difficulty</h4>
            <div className="flex flex-col gap-1">
              {DIFFICULTIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDifficulty(value)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${difficulty === value ? 'bg-primary text-background' : 'text-surface-600 hover:bg-surface-100 hover:text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Share Your Work</p>
            <p className="text-sm font-medium text-white/80 mb-4 leading-relaxed">Publish your templates and help the AEC community.</p>
            <Link href="/marketplace/dashboard" className="block w-full text-center bg-accent text-primary text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              Become a Creator
            </Link>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-primary">
              {loading ? "Loading..." : `${total} Template${total !== 1 ? "s" : ""}`}
              {category !== "All" && <span className="text-accent ml-2">in {category}</span>}
            </h2>
            <div className="flex items-center gap-3">
              {(search || category !== "All" || difficulty) && (
                <button
                  onClick={() => { setSearch(""); setSearchInput(""); setCategory("All"); setDifficulty(""); }}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  Clear filters
                </button>
              )}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-surface-card border border-surface-200 rounded-lg text-sm font-medium text-surface-600 px-3 py-2 focus:outline-none focus:border-accent"
              >
                {SORTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <TemplateSkeleton key={i} />)}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-24 bg-surface-card border border-surface-200 rounded-2xl">
              <p className="text-6xl mb-5">📐</p>
              <h3 className="text-2xl font-bold text-primary mb-3">No Templates Found</h3>
              <p className="text-surface-500 mb-8 max-w-sm mx-auto">
                {search ? `No results for "${search}". Try different keywords or clear filters.` : "Be the first to publish a template in this category!"}
              </p>
              <Link href="/marketplace/dashboard" className="px-8 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block text-sm">
                Publish Your Template
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {templates.map((t) => <TemplateCard key={t.uid} template={t} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
