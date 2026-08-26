"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { authApi } from "@/domains/auth/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Search,
  Trash2,
  Edit3,
  ShieldAlert,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Tag,
  FolderTree,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface SpecializationItem {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  category_id?: number | null;
  tasks_count?: number;
  created_at?: string | null;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  specializations_count?: number;
  created_at?: string | null;
}

type ActiveTab = "specializations" | "categories";

export default function AdminSpecializationsPage() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const router = useRouter();

  const isSuperAdmin =
    isAdmin ||
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    user?.email === "superadmin@ap.com" ||
    (user as any)?.role === "SUPERADMIN" ||
    (user as any)?.role === "ADMIN" ||
    (typeof user?.role === "object" && ((user?.role as any)?.name === "SUPERADMIN" || (user?.role as any)?.name === "ADMIN"));

  const [activeTab, setActiveTab] = useState<ActiveTab>("specializations");
  const [specializations, setSpecializations] = useState<SpecializationItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Specialization Modal State
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecializationItem | null>(null);
  const [specForm, setSpecForm] = useState({ name: "", category_id: "" });
  const [savingSpec, setSavingSpec] = useState(false);

  // Category Modal State
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [savingCat, setSavingCat] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [specsData, catsData] = await Promise.all([
        authApi.getSpecializations(),
        authApi.getCategories(),
      ]);
      setSpecializations(specsData || []);
      setCategories(catsData || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load taxonomy data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specForm.name.trim()) {
      toast.error("Specialization name is required");
      return;
    }
    setSavingSpec(true);
    try {
      const catIdNum = specForm.category_id ? parseInt(specForm.category_id, 10) : undefined;
      await authApi.createSpecialization(specForm.name.trim(), catIdNum);
      toast.success(editingSpec ? "Specialization updated!" : "Specialization created!");
      setShowSpecModal(false);
      setSpecForm({ name: "", category_id: "" });
      setEditingSpec(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save specialization");
    } finally {
      setSavingSpec(false);
    }
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSavingCat(true);
    try {
      await authApi.createCategory(catForm.name.trim(), catForm.description.trim());
      toast.success(editingCat ? "Category updated!" : "Category created successfully!");
      setShowCatModal(false);
      setCatForm({ name: "", description: "" });
      setEditingCat(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save category");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteSpec = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete specialization "${name}"?`)) return;
    setDeletingId(id);
    try {
      await authApi.deleteSpecialization(id);
      toast.success(`Specialization "${name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete specialization");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCat = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    setDeletingId(id);
    try {
      await authApi.deleteCategory(id);
      toast.success(`Category "${name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSpecs = specializations.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCats = categories.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentList = activeTab === "specializations" ? filteredSpecs : filteredCats;
  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const paginatedList = currentList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-surface-400">Authenticating Super Admin…</span>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 my-12 glass-card bg-surface-100/50 border border-surface-300 rounded-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto text-2xl">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-foreground">Access Restricted</h2>
        <p className="text-xs text-surface-500 max-w-md mx-auto">
          Taxonomy & Specialization Management is restricted to System Super Administrators alone.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="h-9 px-5 bg-accent text-background font-bold text-xs rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Header Bar */}
      <div className="space-y-3 bg-surface-50 border border-surface-200 p-4 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-sm font-bold">
                🏷️
              </span>
              Taxonomy & Specializations Control Hub
            </h1>
            <p className="text-[11px] text-surface-500 font-medium mt-0.5">
              Super Admin Management: Classifications & Onboarding Specializations ({categories.length} Categories, {specializations.length} Specializations).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === "specializations" ? (
              <button
                onClick={() => {
                  setEditingSpec(null);
                  setSpecForm({ name: "", category_id: "" });
                  setShowSpecModal(true);
                }}
                className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Specialization</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingCat(null);
                  setCatForm({ name: "", description: "" });
                  setShowCatModal(true);
                }}
                className="h-8 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-surface-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab("specializations"); setCurrentPage(1); }}
              className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "specializations"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-surface-100 hover:bg-surface-200 text-surface-600"
                }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Specializations ({specializations.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("categories"); setCurrentPage(1); }}
              className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "categories"
                  ? "bg-blue-500 text-white shadow-xs"
                  : "bg-surface-100 hover:bg-surface-200 text-surface-600"
                }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Taxonomy Categories ({categories.length})</span>
            </button>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-amber-500 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border border-surface-300 bg-surface-50 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-xs text-surface-500 font-bold">Loading taxonomy dataset…</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">{activeTab === "specializations" ? "🏷️" : "📁"}</div>
            <p className="text-xs font-bold text-foreground">No {activeTab} found.</p>
            <p className="text-[10px] text-surface-500">
              {searchQuery ? "Try adjusting your search query." : `Click 'New ${activeTab === "specializations" ? "Specialization" : "Category"}' above to create.`}
            </p>
          </div>
        ) : (
          <>
            {activeTab === "specializations" ? (
              <>
                {/* Specializations Table Header */}
                <div className="hidden sm:grid sm:grid-cols-[60px_1.5fr_1.2fr_1.2fr_100px_90px] gap-2 px-4 py-2 bg-surface-100 border-b border-surface-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">ID</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Specialization Name</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Parent Category</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Slug Identifier</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Tasks Tagged</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600 text-right">Actions</span>
                </div>

                {/* Body */}
                <div className="divide-y divide-surface-200">
                  {(paginatedList as SpecializationItem[]).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:px-4 sm:py-2.5 grid grid-cols-1 sm:grid-cols-[60px_1.5fr_1.2fr_1.2fr_100px_90px] gap-2 items-center hover:bg-surface-100/60 transition-colors"
                    >
                      <span className="text-xs font-mono text-surface-400 font-bold">#{item.id}</span>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-foreground">{item.name}</span>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          📁 {item.category || "Uncategorized"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-surface-500 truncate">{item.slug}</span>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-surface-200 text-surface-600 border border-surface-300">
                          {item.tasks_count ?? 0} tasks
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingSpec(item);
                            setSpecForm({
                              name: item.name,
                              category_id: item.category_id ? String(item.category_id) : "",
                            });
                            setShowSpecModal(true);
                          }}
                          className="p-1 rounded-md hover:bg-surface-200 text-surface-500 hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteSpec(item.id, item.name)}
                          className="p-1 rounded-md hover:bg-red-500/15 text-surface-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Categories Table Header */}
                <div className="hidden sm:grid sm:grid-cols-[60px_1.5fr_2fr_1.2fr_120px_90px] gap-2 px-4 py-2 bg-surface-100 border-b border-surface-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">ID</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Category Name</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Description & Scope</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Slug</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Specializations</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-surface-600 text-right">Actions</span>
                </div>

                {/* Body */}
                <div className="divide-y divide-surface-200">
                  {(paginatedList as CategoryItem[]).map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 sm:px-4 sm:py-2.5 grid grid-cols-1 sm:grid-cols-[60px_1.5fr_2fr_1.2fr_120px_90px] gap-2 items-center hover:bg-surface-100/60 transition-colors"
                    >
                      <span className="text-xs font-mono text-surface-400 font-bold">#{cat.id}</span>
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-foreground">{cat.name}</span>
                      </div>
                      <span className="text-[11px] text-surface-500 font-medium line-clamp-1">
                        {cat.description || "—"}
                      </span>
                      <span className="text-[11px] font-mono text-surface-500 truncate">{cat.slug}</span>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {cat.specializations_count ?? 0} specializations
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCat(cat);
                            setCatForm({ name: cat.name, description: cat.description || "" });
                            setShowCatModal(true);
                          }}
                          className="p-1 rounded-md hover:bg-surface-200 text-surface-500 hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={deletingId === cat.id}
                          onClick={() => handleDeleteCat(cat.id, cat.name)}
                          className="p-1 rounded-md hover:bg-red-500/15 text-surface-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-t border-surface-200">
                <span className="text-[10px] text-surface-500 font-medium">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, currentList.length)} of {currentList.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-surface-200 text-surface-500 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-bold text-surface-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md hover:bg-surface-200 text-surface-500 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Create/Edit Specialization */}
      <AnimatePresence>
        {showSpecModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-md bg-surface-50 border border-surface-300 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-foreground">
                    {editingSpec ? "Edit Specialization" : "Create Specialization"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSpecModal(false)}
                  className="w-6 h-6 rounded bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSpec} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                    Specialization Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Planning or Interior Architecture"
                    value={specForm.name}
                    onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                    Parent Category
                  </label>
                  <select
                    value={specForm.category_id}
                    onChange={(e) => setSpecForm({ ...specForm, category_id: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">Uncategorized / General</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-200">
                  <button
                    type="button"
                    onClick={() => setShowSpecModal(false)}
                    className="h-8 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSpec}
                    className="h-8 px-5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    {savingSpec ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {savingSpec ? "Saving..." : "Save Specialization"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Create/Edit Category */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-md bg-surface-50 border border-surface-300 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-black text-foreground">
                    {editingCat ? "Edit Category" : "Create Taxonomy Category"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCatModal(false)}
                  className="w-6 h-6 rounded bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCat} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                    Category Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Planning, Architecture, Hospitality"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-blue-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                    Description & Scope
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief scope description of specializations under this category."
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="w-full p-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-blue-500 transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-200">
                  <button
                    type="button"
                    onClick={() => setShowCatModal(false)}
                    className="h-8 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCat}
                    className="h-8 px-5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    {savingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {savingCat ? "Saving..." : "Save Category"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
