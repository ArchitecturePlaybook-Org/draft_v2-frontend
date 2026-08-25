"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  Building2,
  Layers,
  Globe,
  Star,
  Clock,
  Plus,
  MoreVertical,
  Bookmark,
  Zap,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";

type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type TemplateTab = "all" | "saved" | "org";

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  RESIDENTIAL: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: "🏠" },
  COMMERCIAL: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: "🏢" },
  INFRASTRUCTURE: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: "🛣️" },
  HEAVY_INFRA: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: "🌉" },
  INDUSTRIAL: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20", icon: "🏭" },
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= Math.round(rating)
                ? "text-[#D4AF37] fill-[#D4AF37]"
                : "text-surface-300"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold text-surface-500">
        {rating > 0 ? `${rating.toFixed(1)} (${count})` : "5.0 (1)"}
      </span>
    </div>
  );
}

function TemplateCard({
  template,
  onFavoriteToggle,
  onCopyLink,
}: {
  template: Template;
  onFavoriteToggle: (uid: string) => void;
  onCopyLink: (uid: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const categoryKey = (template.template_category || "RESIDENTIAL").toUpperCase();
  const catStyle = CATEGORY_COLORS[categoryKey] || {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/20",
    icon: "🏠",
  };

  const isPreset = template.uid.startsWith("preset-");
  const targetHref = isPreset
    ? `/dashboard/task-templates/presets/${template.uid.replace("preset-", "")}`
    : `/dashboard/templates/${template.uid}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group relative bg-surface-50/90 dark:bg-surface-900/90 border border-surface-200/90 dark:border-white/10 rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 hover:shadow-xl hover:shadow-[#D4AF37]/5 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Top Banner Section */}
      <div className="relative p-4 pb-3 bg-gradient-to-br from-surface-100/80 to-surface-200/50 border-b border-surface-200/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Category Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            <span>{catStyle.icon}</span>
            <span>{template.template_category || "Residential"}</span>
          </span>

          {/* Visibility / Type Pill */}
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Globe className="w-2.5 h-2.5" /> Public
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(template.uid);
              }}
              className="p-1 rounded-md hover:bg-surface-200 text-surface-400 hover:text-[#D4AF37] transition-colors"
              title="Bookmark blueprint"
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  template.is_favorite ? "text-[#D4AF37] fill-[#D4AF37]" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-black text-sm text-foreground leading-snug line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
          {template.title}
        </h3>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <p className="text-xs text-surface-500 font-medium leading-relaxed line-clamp-2">
          {template.description ||
            "Standard Architectural 1-Click QA/QC Matrix Blueprint with 6 stages."}
        </p>

        {/* Specs Stats Row */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-100/60 border border-surface-200/60 text-[11px] font-bold text-surface-600">
          <div className="flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span className="truncate">{template.task_count || 6} Stages</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{template.template_est_duration_days || 180} Days</span>
          </div>
        </div>

        {/* Rating & Author */}
        <div className="flex items-center justify-between pt-1 border-t border-surface-200/40 text-[11px]">
          <StarRating rating={template.avg_rating} count={template.rating_count} />
          <span className="text-surface-400 font-medium text-[10px] truncate max-w-[110px]">
            by {template.author_name || "Architecture Playbook"}
          </span>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="px-4 py-3 bg-surface-100/70 border-t border-surface-200/70 flex items-center justify-between gap-2">
        <Link
          href={targetHref}
          className="flex-1 h-8 px-3 bg-[#D4AF37] hover:bg-[#B3932F] text-black font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md"
        >
          <Zap className="w-3.5 h-3.5 fill-black" />
          <span>Deploy Blueprint</span>
        </Link>

        {/* 3-Dot Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-8 h-8 rounded-lg bg-surface-200/70 hover:bg-surface-300 text-surface-500 hover:text-foreground flex items-center justify-center transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 bottom-9 z-50 min-w-[170px] bg-surface-50 border border-surface-200 rounded-xl shadow-xl py-1 animate-in fade-in-0 zoom-in-95"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  router.push(targetHref);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-100 flex items-center gap-2"
              >
                <span>🔍</span> Preview Matrix
              </button>
              <button
                type="button"
                onClick={() => {
                  onCopyLink(template.uid);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-100 flex items-center gap-2"
              >
                <span>🔗</span> Copy Share Link
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push("/dashboard/projects");
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#D4AF37] hover:bg-surface-100 flex items-center gap-2"
              >
                <span>⚡</span> Instantiate Project
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function TemplatesLibraryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TemplateTab>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const categories = [
    { label: "Residential Building", value: "RESIDENTIAL" },
    { label: "Commercial Complex", value: "COMMERCIAL" },
    { label: "Roads & Highways", value: "INFRASTRUCTURE" },
    { label: "Bridge & Heavy Infra", value: "HEAVY_INFRA" },
    { label: "Industrial & Warehouse", value: "INDUSTRIAL" },
  ];

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { tab, sort };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (favoritesOnly) params.favorites_only = "true";

      const [res, presetsRes] = await Promise.allSettled([
        projectsApi.getTemplateLibrary(params),
        projectsApi.getProjectPresets(),
      ]);

      const projectTemplatesList: Template[] =
        res.status === "fulfilled"
          ? Array.isArray(res.value)
            ? res.value
            : res.value?.results ?? []
          : [];

      // Include active & public Project Presets (project-level blueprints)
      const publicProjectPresets: Template[] = [];
      if (presetsRes.status === "fulfilled") {
        const presets = Array.isArray(presetsRes.value) ? presetsRes.value : [];
        presets
          .filter((p: any) => p.is_public !== false && p.is_active !== false)
          .forEach((p: any) => {
            publicProjectPresets.push({
              uid: `preset-${p.id || p.slug}`,
              title: p.name,
              description:
                p.description ||
                "1-Click QA/QC Matrix Project Blueprint with 6 Standard Stages",
              template_status: "PUBLISHED" as const,
              template_visibility: "PUBLIC",
              template_category: p.category ? p.category.toUpperCase() : "RESIDENTIAL",
              template_tags: ["Project Blueprint", "1-Click Matrix"],
              template_building_type: p.category || "All",
              template_difficulty: "INTERMEDIATE",
              template_license: "Free",
              template_est_duration_days: 180,
              template_est_cost_min: null,
              template_est_cost_max: null,
              template_thumbnail: "",
              avg_rating: 5.0,
              rating_count: 1,
              task_count: 237,
              checklist_count: 6,
              author_name: "Architecture Playbook",
              share_token: null,
              is_favorite: false,
              use_count: 0,
              created_at: p.created_at || new Date().toISOString(),
            });
          });
      }

      // Filter project presets by search & category if provided
      let filteredPresets = publicProjectPresets;
      if (search) {
        filteredPresets = filteredPresets.filter(
          (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (categoryFilter) {
        filteredPresets = filteredPresets.filter(
          (p) => p.template_category.toUpperCase() === categoryFilter.toUpperCase()
        );
      }

      setTemplates([...projectTemplatesList, ...filteredPresets]);
    } catch {
      toast.error("Failed to load project templates.");
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

  const handleCopyLink = async (uid: string) => {
    try {
      const shareUrl = `${window.location.origin}/dashboard/templates/${uid}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Blueprint link copied to clipboard! 🔗");
    } catch {
      toast.error("Failed to generate share link.");
    }
  };

  const TABS: { key: TemplateTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All Project Blueprints", icon: <Building2 className="w-4 h-4" /> },
    { key: "saved", label: "Saved & Favorites", icon: <Star className="w-4 h-4 text-[#D4AF37]" /> },
    { key: "org", label: "Organization Standards", icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
  ];

  return (
    <div className="w-full max-w-full space-y-4">
      {/* ── Compact Hero Header ────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-5 py-3.5 rounded-xl bg-gradient-to-r from-surface-100 via-surface-50 to-surface-100 border border-surface-200 shadow-2xs">
        <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center text-base font-bold shrink-0">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-foreground tracking-tight">
                  Master Project Blueprints
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] font-black uppercase tracking-wider">
                  1-Click QA/QC Matrix
                </span>
              </div>
              <p className="text-[11px] text-surface-500 font-medium line-clamp-1">
                Standardized Architectural QA/QC Matrix Blueprints — pre-configured with 6 phases & IS/MORTH compliance checklists.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/task-templates"
              className="h-8 px-3 rounded-lg border border-surface-300 bg-surface-50 hover:bg-surface-200 text-foreground font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Manage Templates</span>
            </Link>
            <Link
              href="/dashboard/projects"
              className="h-8 px-3.5 bg-[#D4AF37] hover:bg-[#B3932F] text-black font-black text-xs rounded-lg transition-all flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Project</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tabs & Filter Bar ────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-200 pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-xl">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t.key
                    ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
                    : "text-surface-500 hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Items Counter */}
          <div className="flex items-center gap-2 text-xs font-bold text-surface-500">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>Showing {templates.length} active public blueprints</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search project blueprints by title or scope..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-surface-100 border border-surface-200 rounded-xl text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-[#D4AF37] cursor-pointer shrink-0"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-[#D4AF37] cursor-pointer shrink-0"
          >
            <option value="-created_at">Recently Added</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* ── Blueprints Cards Grid ────────────────────────────────────────────── */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-[#D4AF37] border-t-transparent animate-spin" />
            <span className="text-xs text-surface-500 font-bold">
              Loading active project blueprints…
            </span>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center bg-surface-50 border border-surface-200 rounded-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] mx-auto flex items-center justify-center text-3xl font-bold">
              🏢
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">No blueprints found</h3>
              <p className="text-xs text-surface-500 font-medium max-w-sm mx-auto mt-1">
                {search
                  ? `No active project blueprints match "${search}". Try clearing your search.`
                  : "All project blueprints will appear here once published."}
              </p>
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="h-8 px-4 bg-surface-200 text-foreground text-xs font-bold rounded-lg hover:bg-surface-300 transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((t) => (
              <TemplateCard
                key={t.uid}
                template={t}
                onFavoriteToggle={handleFavoriteToggle}
                onCopyLink={handleCopyLink}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
