"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPublicOpportunities,
  createOpportunity,
  OpportunityPosting,
} from "@/domains/marketplace/api";
import { inventoryApi } from "@/domains/inventory/api";
import { projectsApi } from "@/domains/projects/api";
import { MasterMaterial, TaskMaterialRequirement } from "@/domains/inventory/types";
import { Project } from "@/types/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  Search,
  MapPin,
  Briefcase,
  ArrowRight,
  Hammer,
  Clock,
  Box,
  Building2,
  Filter,
  Sparkles,
  Plus,
  X,
  Layers,
  CheckCircle2,
  FolderGit2,
  Database,
  Calculator,
  ChevronRight,
  Trash2,
  Receipt,
  FileSpreadsheet,
  PackagePlus,
} from "lucide-react";
import { toast } from "sonner";

interface ProcurementItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  source?: string;
}

export default function OpportunitiesMarketplacePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortFilter, setSortFilter] = useState<string>("-created_at");

  // Post Opportunity Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialSourceMode, setMaterialSourceMode] = useState<"catalog" | "project_bom" | "custom">("catalog");
  
  // Multi-Material Procurement List State
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);

  // Master Catalog State
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>("ALL");
  const [selectedMaterial, setSelectedMaterial] = useState<MasterMaterial | null>(null);
  const [materialQty, setMaterialQty] = useState<number>(100);
  const [materialUnit, setMaterialUnit] = useState<string>("BAG");
  const [unitRate, setUnitRate] = useState<number>(380);

  // Custom Item State
  const [customItemName, setCustomItemName] = useState("");
  const [customCategory, setCustomCategory] = useState("RAW_MATERIAL");

  // Project BOM State
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [selectedProjectUid, setSelectedProjectUid] = useState<string>("");
  const [projectRequirements, setProjectRequirements] = useState<TaskMaterialRequirement[]>([]);
  const [loadingBOM, setLoadingBOM] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    type: "MATERIAL_REQUIRED" as "MATERIAL_REQUIRED" | "SERVICE_REQUIRED",
    description: "",
    location: "",
    budget_range: "",
    tagsInput: "",
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", { search: debouncedSearch, typeFilter, sortFilter }],
    queryFn: () =>
      fetchPublicOpportunities({
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        sort: sortFilter || undefined,
      }),
  });

  const opportunities: OpportunityPosting[] = data?.results || [];
  const totalCount = data?.count ?? opportunities.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  // Load Master Materials and User Projects when modal opens
  useEffect(() => {
    if (isModalOpen) {
      inventoryApi.getMaterials().then(setMasterMaterials).catch(() => {});
      projectsApi.getProjects().then((projs) => {
        setUserProjects(projs);
        if (projs.length > 0 && !selectedProjectUid) {
          setSelectedProjectUid(projs[0].uid);
        }
      }).catch(() => {});
    }
  }, [isModalOpen]);

  // Load BOM requirements when project selection changes
  useEffect(() => {
    if (selectedProjectUid && materialSourceMode === "project_bom") {
      setLoadingBOM(true);
      inventoryApi.getTaskRequirements({ project: selectedProjectUid })
        .then((reqs) => {
          setProjectRequirements(reqs);
        })
        .catch(() => setProjectRequirements([]))
        .finally(() => setLoadingBOM(false));
    }
  }, [selectedProjectUid, materialSourceMode]);

  // Re-sync form summary whenever procurementItems change
  useEffect(() => {
    if (formData.type === "MATERIAL_REQUIRED" && procurementItems.length > 0) {
      const grandTotal = procurementItems.reduce((sum, item) => sum + item.total, 0);
      const estBudget = grandTotal > 0 ? `₹${(grandTotal * 0.95).toLocaleString('en-IN', { maximumFractionDigits: 0 })} - ₹${(grandTotal * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : "";
      
      const itemNames = procurementItems.map((i) => i.name);
      const titleSummary = procurementItems.length === 1
        ? `Supply Requirement: ${procurementItems[0].name} (${procurementItems[0].quantity} ${procurementItems[0].unit})`
        : `Material Package: ${itemNames.slice(0, 2).join(", ")}${itemNames.length > 2 ? ` +${itemNames.length - 2} more` : ""} (${procurementItems.length} Items)`;

      const allTags = Array.from(
        new Set([
          ...procurementItems.map((i) => i.category),
          ...procurementItems.map((i) => i.unit),
          ...procurementItems.map((i) => i.name.split(" ")[0]),
          "BOQ",
        ])
      ).filter(Boolean);

      const itemsTable = procurementItems
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.name} — ${item.quantity} ${item.unit} @ ₹${item.rate}/${item.unit} (Est: ₹${item.total.toLocaleString('en-IN')})`
        )
        .join("\n");

      setFormData((prev) => ({
        ...prev,
        title: titleSummary,
        budget_range: estBudget,
        tagsInput: allTags.slice(0, 5).join(", "),
        description: `Bill of Materials / Package Items:\n${itemsTable}\n\nTotal Estimated Package Value: ₹${grandTotal.toLocaleString('en-IN')}\n\nDelivery Requirements:\n- Quality tested materials with factory test certificates.\n- Staggered site delivery schedule as per project milestones.`,
      }));
    }
  }, [procurementItems, formData.type]);

  // Add item from Master Catalog
  const handleAddCatalogItem = () => {
    if (!selectedMaterial) {
      toast.error("Please select a material from the catalog");
      return;
    }
    const itemTotal = materialQty * unitRate;
    const newItem: ProcurementItem = {
      id: `${selectedMaterial.id}-${Date.now()}`,
      name: selectedMaterial.name,
      category: selectedMaterial.category,
      quantity: materialQty,
      unit: materialUnit,
      rate: unitRate,
      total: itemTotal,
      source: "Master Catalog",
    };
    setProcurementItems((prev) => [...prev, newItem]);
    toast.success(`Added ${selectedMaterial.name} to package`);
  };

  // Add individual BOM Requirement
  const handleAddBOMItem = (req: TaskMaterialRequirement) => {
    const qty = req.balance_remaining > 0 ? req.balance_remaining : req.planned_qty || 100;
    const rate = req.standard_rate || 350;
    const itemTotal = qty * rate;

    const newItem: ProcurementItem = {
      id: `bom-${req.id}-${Date.now()}`,
      name: req.material_name,
      category: "PROJECT_BOM",
      quantity: qty,
      unit: req.material_unit || "BAG",
      rate: rate,
      total: itemTotal,
      source: "Project BOM",
    };
    setProcurementItems((prev) => [...prev, newItem]);
    toast.success(`Added ${req.material_name} to package`);
  };

  // Bulk import all project BOM items
  const handleImportAllBOMItems = () => {
    if (projectRequirements.length === 0) {
      toast.error("No BOM requirements found to import");
      return;
    }
    const newItems: ProcurementItem[] = projectRequirements.map((req) => {
      const qty = req.balance_remaining > 0 ? req.balance_remaining : req.planned_qty || 100;
      const rate = req.standard_rate || 350;
      return {
        id: `bom-${req.id}-${Date.now()}-${Math.random()}`,
        name: req.material_name,
        category: "PROJECT_BOM",
        quantity: qty,
        unit: req.material_unit || "BAG",
        rate: rate,
        total: qty * rate,
        source: "Project BOM",
      };
    });
    setProcurementItems((prev) => [...prev, ...newItems]);
    toast.success(`Imported ${newItems.length} BOM materials from project!`);
  };

  // Add Custom Item
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      toast.error("Please enter a custom material name");
      return;
    }
    const itemTotal = materialQty * unitRate;
    const newItem: ProcurementItem = {
      id: `custom-${Date.now()}`,
      name: customItemName.trim(),
      category: customCategory,
      quantity: materialQty,
      unit: materialUnit,
      rate: unitRate,
      total: itemTotal,
      source: "Custom",
    };
    setProcurementItems((prev) => [...prev, newItem]);
    setCustomItemName("");
    toast.success(`Added ${newItem.name} to package`);
  };

  const handleRemoveProcurementItem = (id: string) => {
    setProcurementItems((prev) => prev.filter((item) => item.id !== id));
  };

  const createMutation = useMutation({
    mutationFn: (newPosting: Partial<OpportunityPosting>) => createOpportunity(newPosting),
    onSuccess: () => {
      toast.success("Opportunity posted successfully!");
      setIsModalOpen(false);
      setFormData({
        title: "",
        type: "MATERIAL_REQUIRED",
        description: "",
        location: "",
        budget_range: "",
        tagsInput: "",
      });
      setProcurementItems([]);
      setSelectedMaterial(null);
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to post opportunity. Please check all fields.");
    },
  });

  const handleOpenPostModal = () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/jobs");
      return;
    }
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a title for your posting");
      return;
    }

    const tags = formData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createMutation.mutate({
      title: formData.title.trim(),
      type: formData.type,
      description: formData.description.trim(),
      location: formData.location.trim(),
      budget_range: formData.budget_range.trim(),
      tags,
      is_public: true,
    });
  };

  const filteredMasterMaterials = masterMaterials.filter((m) =>
    selectedCatalogCategory === "ALL" ? true : m.category === selectedCatalogCategory
  );

  const grandTotalCost = procurementItems.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="min-h-screen bg-surface-50 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Architectural Grid Accent */}
      <div className="absolute inset-0 arch-grid opacity-[0.03] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in slide-in-from-bottom-4 duration-700">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-100 border border-surface-200 text-accent text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
              <Sparkles className="w-3 h-3 text-accent" /> Construction & Project Tenders
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary tracking-tight leading-tight">
              Discover Active <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent italic">Project Opportunities</span>
            </h1>
            <p className="text-sm sm:text-base text-surface-500 leading-relaxed font-medium">
              Browse verified architectural requirements, supply critical materials, and bid on high-value engineering contracts across verified firm projects.
            </p>
          </div>

          {/* Post Opportunity CTA Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleOpenPostModal}
              className="h-11 px-6 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-md shadow-accent/20 cursor-pointer transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Post Opportunity
            </button>
          </div>
        </div>

        {/* Search & Filter Controls Toolbar */}
        <div className="bg-surface-100/90 backdrop-blur-2xl p-4 rounded-2xl border border-surface-200 shadow-md flex flex-col md:flex-row gap-3 items-center">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="Search opportunities, materials, roles, or locations..."
              className="w-full h-11 pl-11 pr-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent/40 text-xs sm:text-sm font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-surface-400" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-surface-400 hover:text-primary text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </form>

          <div className="flex flex-wrap w-full md:w-auto gap-2 items-center">
            {/* Category Dropdown */}
            <select
              className="h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary uppercase tracking-wider cursor-pointer outline-none focus:border-accent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Categories ({totalCount})</option>
              <option value="MATERIAL_REQUIRED">Material Supplies</option>
              <option value="SERVICE_REQUIRED">Service & Labor Gigs</option>
            </select>

            {/* Sort Dropdown */}
            <select
              className="h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary uppercase tracking-wider cursor-pointer outline-none focus:border-accent"
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
            >
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
            </select>

            {/* Reset Filter Button if active */}
            {(typeFilter || search) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("");
                }}
                className="h-11 px-4 bg-surface-200 hover:bg-surface-300 text-primary rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Toggle Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setTypeFilter("")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === ""
                ? "bg-accent text-background font-black shadow-sm"
                : "bg-surface-100 text-surface-500 hover:text-primary hover:bg-surface-200 border border-surface-200"
            }`}
          >
            All Postings ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("MATERIAL_REQUIRED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              typeFilter === "MATERIAL_REQUIRED"
                ? "bg-accent text-background font-black shadow-sm"
                : "bg-surface-100 text-surface-500 hover:text-primary hover:bg-surface-200 border border-surface-200"
            }`}
          >
            <Box className="w-3.5 h-3.5 text-semantic-blue" /> Material Requests
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("SERVICE_REQUIRED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              typeFilter === "SERVICE_REQUIRED"
                ? "bg-accent text-background font-black shadow-sm"
                : "bg-surface-100 text-surface-500 hover:text-primary hover:bg-surface-200 border border-surface-200"
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-semantic-green" /> Service & Labor
          </button>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-64 bg-surface-100 rounded-3xl border border-surface-200 animate-pulse"
              />
            ))}
          </div>
        ) : opportunities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {opportunities.map((opp) => {
              const isMaterial = opp.type === "MATERIAL_REQUIRED";
              return (
                <div
                  key={opp.id}
                  className="group bg-surface-100 border border-surface-200 rounded-3xl overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(255,186,8,0.2)] hover:border-accent/40 transition-all duration-500 flex flex-col hover:-translate-y-1 p-5.5 justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Code, Category, and Timestamp */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="px-2 py-0.5 bg-surface-200 border border-surface-300 text-primary text-[9px] font-black uppercase tracking-widest rounded-md">
                          OPP-#{opp.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${
                            isMaterial
                              ? "bg-blue-500/10 text-semantic-blue border-semantic-blue/30"
                              : "bg-emerald-500/10 text-semantic-green border-semantic-green/30"
                          }`}
                        >
                          {isMaterial ? <Box className="w-2.5 h-2.5" /> : <Hammer className="w-2.5 h-2.5" />}
                          {isMaterial ? "Material" : "Service"}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-surface-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(opp.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <Link href={`/jobs/${opp.id}`} className="block group-hover:text-accent transition-colors">
                      <h3 className="text-base sm:text-lg font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                        {opp.title}
                      </h3>
                    </Link>

                    {/* Description */}
                    <p className="text-surface-500 text-xs sm:text-sm leading-relaxed line-clamp-2 font-medium">
                      {opp.description || "No specific detailed description provided."}
                    </p>

                    {/* Tags */}
                    {opp.tags && opp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {opp.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-200 text-surface-600 border border-surface-300/60"
                          >
                            {tag}
                          </span>
                        ))}
                        {opp.tags.length > 3 && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-200 text-surface-400">
                            +{opp.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="pt-4 mt-4 border-t border-surface-200 flex items-center justify-between gap-2">
                    <div className="flex items-center text-xs font-semibold text-surface-400 truncate min-w-0">
                      <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 text-surface-400" />
                      <span className="truncate">{opp.location || "Remote / Unspecified"}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opp.budget_range && (
                        <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20 font-black text-[10px] truncate">
                          {opp.budget_range}
                        </span>
                      )}
                      <Link
                        href={`/jobs/${opp.id}`}
                        className="w-7 h-7 rounded-xl bg-surface-200 flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-background transition-all"
                        title="View Opportunity"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24 bg-surface-100 rounded-3xl border border-surface-200 shadow-sm">
            <div className="w-16 h-16 bg-surface-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-surface-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">No Opportunities Found</h3>
            <p className="text-surface-500 text-xs sm:text-sm max-w-md mx-auto mb-6">
              We couldn&apos;t find any project postings matching your filters. Try resetting your search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
              }}
              className="h-10 px-6 bg-accent text-background rounded-xl font-bold uppercase text-xs tracking-wider hover:opacity-90 transition-all shadow-sm cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}

      </div>

      {/* ── Post Opportunity Modal with Multi-Material BOQ & BOM Matrix Integration ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-3xl bg-surface-100 border border-surface-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-primary">Post New Opportunity</h2>
                <p className="text-xs text-surface-500 font-medium">Build a multi-material procurement package from Inventory/BOM or create a service tender.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-400 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-2">Opportunity Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "MATERIAL_REQUIRED" })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formData.type === "MATERIAL_REQUIRED"
                        ? "bg-accent/10 border-accent text-accent font-black shadow-sm"
                        : "bg-surface-50 border-surface-200 text-surface-500 hover:text-primary"
                    }`}
                  >
                    <Box className="w-4 h-4 text-semantic-blue" /> Material Procurement Package
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "SERVICE_REQUIRED" })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formData.type === "SERVICE_REQUIRED"
                        ? "bg-accent/10 border-accent text-accent font-black shadow-sm"
                        : "bg-surface-50 border-surface-200 text-surface-500 hover:text-primary"
                    }`}
                  >
                    <Hammer className="w-4 h-4 text-semantic-green" /> Service / Labor Gig
                  </button>
                </div>
              </div>

              {/* MATERIAL REQUIRED: Multi-Material Procurement Builder */}
              {formData.type === "MATERIAL_REQUIRED" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-surface-50 border border-surface-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-accent" /> Add Materials to Procurement Package
                    </span>
                    <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setMaterialSourceMode("catalog")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          materialSourceMode === "catalog"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                        }`}
                      >
                        Master Catalog
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialSourceMode("project_bom")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          materialSourceMode === "project_bom"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                        }`}
                      >
                        Project BOM Matrix
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialSourceMode("custom")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          materialSourceMode === "custom"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                        }`}
                      >
                        Custom Item
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Master Material Catalog Selection */}
                  {materialSourceMode === "catalog" && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Category Filter */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Material Category</label>
                          <select
                            value={selectedCatalogCategory}
                            onChange={(e) => setSelectedCatalogCategory(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="ALL">All Categories ({masterMaterials.length})</option>
                            <option value="CEMENT">Cement & Binder</option>
                            <option value="STRUCTURAL">Structural & Rebar Steel</option>
                            <option value="SAND_AGGREGATE">Sand & Aggregates</option>
                            <option value="MASONRY">Bricks & Masonry Blocks</option>
                            <option value="FINISHING">Finishing (Paints, Tiles, Wood)</option>
                            <option value="MEP">MEP (Electrical & Plumbing)</option>
                            <option value="WATERPROOFING">Waterproofing Chemicals</option>
                          </select>
                        </div>

                        {/* Master Material Selector */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Select Master Material</label>
                          <select
                            value={selectedMaterial?.id || ""}
                            onChange={(e) => {
                              const found = masterMaterials.find((m) => m.id === e.target.value);
                              if (found) {
                                setSelectedMaterial(found);
                                setUnitRate(Number(found.standard_rate) || 380);
                                setMaterialUnit(found.unit || "BAG");
                              }
                            }}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="">-- Choose Material Item --</option>
                            {filteredMasterMaterials.map((mat) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name} ({mat.category} - {mat.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Quantity & Unit Rate Estimator */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Required Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={materialQty}
                            onChange={(e) => setMaterialQty(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Unit</label>
                          <select
                            value={materialUnit}
                            onChange={(e) => setMaterialUnit(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          >
                            <option value="BAG">Bags (BAG)</option>
                            <option value="TON">Metric Tons (TON)</option>
                            <option value="M3">Cubic Meters (M3)</option>
                            <option value="M2">Square Meters (M2)</option>
                            <option value="CFT">Cubic Feet (CFT)</option>
                            <option value="NOS">Numbers / Units (NOS)</option>
                            <option value="BUNDLE">Bundles (BUNDLE)</option>
                            <option value="LITER">Liters (LITER)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Est. Rate / Unit (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={unitRate}
                            onChange={(e) => setUnitRate(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddCatalogItem}
                          className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <PackagePlus className="w-3.5 h-3.5" /> Add Material to Package
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Project BOM Matrix Import */}
                  {materialSourceMode === "project_bom" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Source Project Workspace
                          </label>
                          <select
                            value={selectedProjectUid}
                            onChange={(e) => setSelectedProjectUid(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="">-- Choose Project Workspace --</option>
                            {userProjects.map((p) => (
                              <option key={p.uid} value={p.uid}>
                                {p.title} ({p.project_code || p.uid.substring(0, 8)})
                              </option>
                            ))}
                          </select>
                        </div>

                        {projectRequirements.length > 0 && (
                          <button
                            type="button"
                            onClick={handleImportAllBOMItems}
                            className="sm:mt-5 h-10 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Import All ({projectRequirements.length} BOM Items)
                          </button>
                        )}
                      </div>

                      {/* Project BOM Matrix Items List */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Available Planned BOM Matrix Materials ({projectRequirements.length} items)
                        </label>

                        {loadingBOM ? (
                          <div className="p-4 text-center text-xs text-surface-400 animate-pulse bg-surface-100 rounded-xl border border-surface-200">
                            Fetching planned BOM matrix materials from project...
                          </div>
                        ) : projectRequirements.length > 0 ? (
                          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                            {projectRequirements.map((req) => (
                              <div
                                key={req.id}
                                className="p-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 flex items-center justify-between transition-all group"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <Box className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-primary truncate">
                                      {req.material_name}
                                    </div>
                                    <div className="text-[10px] text-surface-400">
                                      Planned: {req.planned_qty} {req.material_unit} | Balance Needed: {req.balance_remaining || req.planned_qty} {req.material_unit}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddBOMItem(req)}
                                  className="text-[10px] font-bold text-accent px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent hover:text-background transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Add Item
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-surface-400 bg-surface-100 rounded-xl border border-surface-200">
                            No planned BOM requirements found for this project.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Custom Item */}
                  {materialSourceMode === "custom" && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Custom Item Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Specialized Waterproofing Epoxy Primer"
                            value={customItemName}
                            onChange={(e) => setCustomItemName(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Category Tag</label>
                          <input
                            type="text"
                            placeholder="e.g. Chemicals / Coating"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Required Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={materialQty}
                            onChange={(e) => setMaterialQty(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Unit</label>
                          <select
                            value={materialUnit}
                            onChange={(e) => setMaterialUnit(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          >
                            <option value="BAG">Bags (BAG)</option>
                            <option value="TON">Metric Tons (TON)</option>
                            <option value="M3">Cubic Meters (M3)</option>
                            <option value="M2">Square Meters (M2)</option>
                            <option value="CFT">Cubic Feet (CFT)</option>
                            <option value="NOS">Numbers / Units (NOS)</option>
                            <option value="LITER">Liters (LITER)</option>
                            <option value="ROLL">Rolls (ROLL)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Est. Rate / Unit (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={unitRate}
                            onChange={(e) => setUnitRate(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Custom Item
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── LIVE PROCUREMENT PACKAGE ITEMS TABLE ── */}
                  {procurementItems.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-surface-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-accent" /> Added Materials Package ({procurementItems.length} Items)
                        </span>
                        <span className="text-xs font-black text-accent bg-accent/10 px-3 py-1 rounded-xl border border-accent/20">
                          Total Est. Cost: ₹{grandTotalCost.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-surface-200 text-[10px] uppercase font-bold text-surface-400 bg-surface-200/50">
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Material Item</th>
                              <th className="py-2.5 px-3">Quantity</th>
                              <th className="py-2.5 px-3">Rate</th>
                              <th className="py-2.5 px-3">Subtotal</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-200/60">
                            {procurementItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-surface-200/40">
                                <td className="py-2.5 px-3 text-surface-400 font-bold">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-bold text-primary">
                                  {item.name}
                                  <span className="block text-[9px] font-normal text-surface-400 uppercase">{item.category}</span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-primary">
                                  {item.quantity} <span className="text-[10px] text-surface-400">{item.unit}</span>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-surface-500">₹{item.rate}</td>
                                <td className="py-2.5 px-3 font-black text-accent">₹{item.total.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProcurementItem(item.id)}
                                    className="p-1 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Posting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Procurement Package: Cement, Rebars & Sand for Project Site Alpha"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
                />
              </div>

              {/* Location & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Site Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, KA (or Remote)"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Estimated Budget / Value</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹2,50,000 - ₹3,00,000"
                    value={formData.budget_range}
                    onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                    className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Cement, Structural, Urgent, Foundation"
                  value={formData.tagsInput}
                  onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                  className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Specifications & Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide details on required grade, quantity, delivery timelines, payment terms, or certifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-medium text-primary placeholder:font-normal placeholder:text-surface-400 leading-relaxed resize-none font-mono text-[11px]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-5 bg-surface-200 hover:bg-surface-300 text-primary rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="h-10 px-6 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider shadow-md shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? "Publishing..." : "Publish Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
