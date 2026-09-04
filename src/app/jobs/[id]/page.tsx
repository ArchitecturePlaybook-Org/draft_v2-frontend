"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOpportunity,
  updateOpportunity,
  expressOpportunityInterest,
  fetchSentInquiries,
  OpportunityPosting,
  OpportunityInterest,
} from "@/domains/marketplace/api";
import { inventoryApi } from "@/domains/inventory/api";
import { projectsApi } from "@/domains/projects/api";
import { MasterMaterial, TaskMaterialRequirement } from "@/domains/inventory/types";
import { Project } from "@/types/projects";
import { OpportunityChatModal } from "@/components/marketplace/OpportunityChatModal";
import {
  MapPin,
  Briefcase,
  Calendar,
  ArrowLeft,
  MessageSquare,
  Box,
  Hammer,
  Clock,
  ShieldCheck,
  Building2,
  Tag,
  Edit3,
  X,
  Lock,
  CheckCircle2,
  Layers,
  Receipt,
  FileSpreadsheet,
  PackagePlus,
  Trash2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Spinner } from "@/components/ui/Spinner";
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

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const opportunityId = parseInt(params.id as string, 10);
  const { user } = useAuthStore();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMaterialSourceMode, setEditMaterialSourceMode] = useState<"catalog" | "project_bom" | "custom">("catalog");
  const [editProcurementItems, setEditProcurementItems] = useState<ProcurementItem[]>([]);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [editSelectedCatalogCategory, setEditSelectedCatalogCategory] = useState<string>("ALL");
  const [editSelectedMaterial, setEditSelectedMaterial] = useState<MasterMaterial | null>(null);
  const [editMaterialQty, setEditMaterialQty] = useState<number>(100);
  const [editMaterialUnit, setEditMaterialUnit] = useState<string>("BAG");
  const [editUnitRate, setEditUnitRate] = useState<number>(380);
  const [editCustomItemName, setCustomItemNameEdit] = useState("");
  const [editCustomCategory, setCustomCategoryEdit] = useState("RAW_MATERIAL");
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [editSelectedProjectUid, setEditSelectedProjectUid] = useState<string>("");
  const [editProjectRequirements, setEditProjectRequirements] = useState<TaskMaterialRequirement[]>([]);
  const [editLoadingBOM, setEditLoadingBOM] = useState(false);

  const [editFormData, setEditFormData] = useState({
    title: "",
    type: "MATERIAL_REQUIRED" as "MATERIAL_REQUIRED" | "SERVICE_REQUIRED",
    status: "OPEN" as "OPEN" | "NEGOTIATING" | "CLOSED",
    description: "",
    location: "",
    budget_range: "",
    tagsInput: "",
    is_public: true,
  });

  // Helper function to parse procurement items from description
  function parseProcurementItemsFromDescription(desc: string): ProcurementItem[] {
    if (!desc) return [];
    const items: ProcurementItem[] = [];
    const lines = desc.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*\d+\.\s*(.+?)\s*[—\-]\s*([\d,.]+)\s*([A-Za-z0-9_]+)\s*@\s*₹?([\d,.]+)\/[A-Za-z0-9_]+\s*(?:\(Est:\s*₹?([\d,.]+)\))?/i);
      if (match) {
        const name = match[1].trim();
        const qty = parseFloat(match[2].replace(/,/g, "")) || 1;
        const unit = match[3].trim().toUpperCase();
        const rate = parseFloat(match[4].replace(/,/g, "")) || 0;
        const total = qty * rate;
        items.push({
          id: `parsed-${Date.now()}-${Math.random()}`,
          name,
          category: "RAW_MATERIAL",
          quantity: qty,
          unit,
          rate,
          total,
          source: "Existing Posting",
        });
      }
    }
    return items;
  }

  // Load BOM requirements for edit modal when selected project changes
  useEffect(() => {
    if (editSelectedProjectUid && editMaterialSourceMode === "project_bom") {
      setEditLoadingBOM(true);
      inventoryApi.getTaskRequirements({ project: editSelectedProjectUid })
        .then((reqs) => {
          setEditProjectRequirements(reqs);
        })
        .catch(() => setEditProjectRequirements([]))
        .finally(() => setEditLoadingBOM(false));
    }
  }, [editSelectedProjectUid, editMaterialSourceMode]);

  // Re-sync edit form summary whenever editProcurementItems change
  const syncEditFormWithMaterials = (items: ProcurementItem[]) => {
    if (items.length === 0) return;
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
    const estBudget = grandTotal > 0 ? `₹${(grandTotal * 0.95).toLocaleString('en-IN', { maximumFractionDigits: 0 })} - ₹${(grandTotal * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : "";

    const itemNames = items.map((i) => i.name);
    const titleSummary = items.length === 1
      ? `Supply Requirement: ${items[0].name} (${items[0].quantity} ${items[0].unit})`
      : `Material Package: ${itemNames.slice(0, 2).join(", ")}${itemNames.length > 2 ? ` +${itemNames.length - 2} more` : ""} (${items.length} Items)`;

    const allTags = Array.from(
      new Set([
        ...items.map((i) => i.category),
        ...items.map((i) => i.unit),
        ...items.map((i) => i.name.split(" ")[0]),
        "BOQ",
      ])
    ).filter(Boolean);

    const itemsTable = items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.name} — ${item.quantity} ${item.unit} @ ₹${item.rate}/${item.unit} (Est: ₹${item.total.toLocaleString('en-IN')})`
      )
      .join("\n");

    setEditFormData((prev) => ({
      ...prev,
      title: prev.title.startsWith("Material Package:") || prev.title.startsWith("Supply Requirement:") ? titleSummary : prev.title,
      budget_range: estBudget,
      tagsInput: allTags.slice(0, 5).join(", "),
      description: `Bill of Materials / Package Items:\n${itemsTable}\n\nTotal Estimated Package Value: ₹${grandTotal.toLocaleString('en-IN')}\n\nDelivery Requirements:\n- Quality tested materials with factory test certificates.\n- Staggered site delivery schedule as per project milestones.`,
    }));
  };

  const handleAddCatalogItemEdit = () => {
    if (!editSelectedMaterial) {
      toast.error("Please select a material from the catalog");
      return;
    }
    const itemTotal = editMaterialQty * editUnitRate;
    const newItem: ProcurementItem = {
      id: `${editSelectedMaterial.id}-${Date.now()}`,
      name: editSelectedMaterial.name,
      category: editSelectedMaterial.category,
      quantity: editMaterialQty,
      unit: editMaterialUnit,
      rate: editUnitRate,
      total: itemTotal,
      source: "Master Catalog",
    };
    const updated = [...editProcurementItems, newItem];
    setEditProcurementItems(updated);
    syncEditFormWithMaterials(updated);
    toast.success(`Added ${editSelectedMaterial.name} to package`);
  };

  const handleAddBOMItemEdit = (req: TaskMaterialRequirement) => {
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
    const updated = [...editProcurementItems, newItem];
    setEditProcurementItems(updated);
    syncEditFormWithMaterials(updated);
    toast.success(`Added ${req.material_name} to package`);
  };

  const handleImportAllBOMItemsEdit = () => {
    if (editProjectRequirements.length === 0) {
      toast.error("No BOM requirements found to import");
      return;
    }
    const newItems: ProcurementItem[] = editProjectRequirements.map((req) => {
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
    const updated = [...editProcurementItems, ...newItems];
    setEditProcurementItems(updated);
    syncEditFormWithMaterials(updated);
    toast.success(`Imported ${newItems.length} BOM materials!`);
  };

  const handleAddCustomItemEdit = () => {
    if (!editCustomItemName.trim()) {
      toast.error("Please enter a custom material name");
      return;
    }
    const itemTotal = editMaterialQty * editUnitRate;
    const newItem: ProcurementItem = {
      id: `custom-${Date.now()}`,
      name: editCustomItemName.trim(),
      category: editCustomCategory,
      quantity: editMaterialQty,
      unit: editMaterialUnit,
      rate: editUnitRate,
      total: itemTotal,
      source: "Custom",
    };
    const updated = [...editProcurementItems, newItem];
    setEditProcurementItems(updated);
    syncEditFormWithMaterials(updated);
    setCustomItemNameEdit("");
    toast.success(`Added ${newItem.name}`);
  };

  const handleRemoveProcurementItemEdit = (id: string) => {
    const updated = editProcurementItems.filter((i) => i.id !== id);
    setEditProcurementItems(updated);
    syncEditFormWithMaterials(updated);
  };

  const editFilteredMasterMaterials = masterMaterials.filter((m) =>
    editSelectedCatalogCategory === "ALL" ? true : m.category === editSelectedCatalogCategory
  );

  const editGrandTotalCost = editProcurementItems.reduce((acc, curr) => acc + curr.total, 0);

  const [chatInterest, setChatInterest] = useState<OpportunityInterest | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: () => fetchOpportunity(opportunityId),
    enabled: !!opportunityId,
  });

  const { data: sentInquiriesData } = useQuery({
    queryKey: ["my-sent-interest", opportunityId],
    queryFn: () => fetchSentInquiries(),
    enabled: !!user,
  });

  const existingInterest = (sentInquiriesData?.results || []).find(
    (i) => i.opportunity === opportunityId
  );

  const expressInterestMutation = useMutation({
    mutationFn: () => expressOpportunityInterest(opportunityId),
    onSuccess: (data) => {
      toast.success("Interest expressed! Redirecting to chat...");
      router.push(`/dashboard/opportunities?tab=sent_inquiries&chat_inquiry_id=${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to express interest.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<OpportunityPosting>) => updateOpportunity(opportunityId, data),
    onSuccess: () => {
      toast.success("Posting updated successfully!");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update posting.");
    },
  });

  const handleOpenEdit = () => {
    if (!opportunity) return;
    const parsed = parseProcurementItemsFromDescription(opportunity.description || "");
    setEditProcurementItems(parsed);

    // Pre-load catalogs and projects
    inventoryApi.getMaterials().then(setMasterMaterials).catch(() => { });
    projectsApi.getProjects().then((projs) => {
      setUserProjects(projs);
      if (projs.length > 0 && !editSelectedProjectUid) {
        setEditSelectedProjectUid(projs[0].uid);
      }
    }).catch(() => { });

    setEditFormData({
      title: opportunity.title || "",
      type: opportunity.type || "MATERIAL_REQUIRED",
      status: opportunity.status || "OPEN",
      description: opportunity.description || "",
      location: opportunity.location || "",
      budget_range: opportunity.budget_range || "",
      tagsInput: (opportunity.tags || []).join(", "),
      is_public: opportunity.is_public ?? true,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = editFormData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    updateMutation.mutate({
      title: editFormData.title.trim(),
      type: editFormData.type,
      status: editFormData.status,
      description: editFormData.description.trim(),
      location: editFormData.location.trim(),
      budget_range: editFormData.budget_range.trim(),
      tags,
      is_public: editFormData.is_public,
    });
  };

  const handleApply = () => {
    if (!user) {
      router.push(`/login?redirect=/jobs/${opportunityId}`);
      return;
    }
    expressInterestMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 pt-28 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-surface-50 pt-28 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4 border border-surface-200">
          <Building2 className="w-8 h-8 text-surface-400" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-1">Opportunity Not Found</h2>
        <p className="text-xs sm:text-sm text-surface-500 font-medium max-w-sm mb-6">
          This project tender may have been closed, archived, or the link is invalid.
        </p>
        <Link
          href="/jobs"
          className="h-10 px-5 bg-accent text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Opportunities
        </Link>
      </div>
    );
  }

  const isMaterial = opportunity.type === "MATERIAL_REQUIRED";
  const isOwner = user && (user.id === opportunity.poster || (user as any).email === opportunity.poster_details?.email);

  return (
    <div className="min-h-screen bg-surface-50 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Architectural Grid Accent */}
      <div className="absolute inset-0 arch-grid opacity-[0.03] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">

        {/* Navigation Breadcrumb & Action Row */}
        <div className="flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-surface-500 hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Opportunities
          </Link>

          {isOwner && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="h-9 px-4 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-accent" /> Edit Posting
            </button>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-surface-100 border border-surface-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">

          {/* Top Row: Type badge, ID, Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-surface-200">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-surface-200 text-primary border border-surface-300">
                OPP-#{opportunity.id}
              </span>
              <span
                className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${isMaterial
                  ? "bg-blue-500/10 text-semantic-blue border-semantic-blue/30"
                  : "bg-emerald-500/10 text-semantic-green border-semantic-green/30"
                  }`}
              >
                {isMaterial ? <Box className="w-3.5 h-3.5" /> : <Hammer className="w-3.5 h-3.5" />}
                {isMaterial ? "Material Required" : "Service Required"}
              </span>
            </div>

            <span
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${opportunity.status === "OPEN"
                ? "bg-emerald-500/10 text-semantic-green border-semantic-green/30"
                : opportunity.status === "NEGOTIATING"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-surface-200 text-surface-400 border-surface-300"
                }`}
            >
              {opportunity.status}
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight leading-snug">
              {opportunity.title}
            </h1>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-200 flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5 text-surface-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Location</div>
                <div className="text-xs sm:text-sm font-bold text-primary truncate">{opportunity.location || "Remote / Unspecified"}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-200 flex items-center justify-center shrink-0">
                <Briefcase className="w-4.5 h-4.5 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Budget / Tender</div>
                <div className="text-xs sm:text-sm font-bold text-accent truncate">{opportunity.budget_range || "Negotiable"}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-200 flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5 text-surface-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Posted On</div>
                <div className="text-xs sm:text-sm font-bold text-primary truncate">
                  {new Date(opportunity.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {opportunity.tags && opportunity.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags:
              </span>
              {opportunity.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-200 text-surface-600 border border-surface-300/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2 pt-2 border-t border-surface-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-surface-400">Project Tender Specifications</h3>
            <div className="text-xs sm:text-sm text-primary/90 font-medium leading-relaxed whitespace-pre-wrap bg-surface-50 p-5 rounded-2xl border border-surface-200 font-mono text-[12px]">
              {opportunity.description || "No specific detailed description provided for this posting."}
            </div>
          </div>

          {/* Action CTA Bar */}
          <div className="border-t border-surface-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>Direct secure communication via verified in-platform messaging.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="w-full sm:w-auto h-11 px-8 bg-accent hover:opacity-90 text-background font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Edit Posting Details
                </button>
              ) : existingInterest ? (
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/dashboard/opportunities?tab=sent_inquiries&chat_inquiry_id=${existingInterest.id}`);
                  }}
                  className="w-full sm:w-auto h-11 px-8 bg-accent hover:opacity-90 text-background font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> Open Chat Thread with Poster
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={expressInterestMutation.isPending || opportunity.status !== "OPEN"}
                  className="w-full sm:w-auto h-11 px-8 bg-accent hover:opacity-90 text-background font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {expressInterestMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  {user ? "Express Interest & Chat" : "Login to Apply"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── EDIT POSTING MODAL: Spacious 2-Column Workstation Layout ── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in transition-opacity"
            onClick={() => setIsEditOpen(false)}
          />
          <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-surface-100 border border-surface-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200">

            {/* Header Strip */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-surface-200 bg-surface-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-primary tracking-tight">
                      Edit Opportunity Tender
                    </h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-surface-200 text-primary border border-surface-300">
                      OPP-#{opportunity.id}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${editFormData.status === "OPEN"
                        ? "bg-emerald-500/10 text-semantic-green border-semantic-green/30"
                        : editFormData.status === "NEGOTIATING"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : "bg-surface-200 text-surface-400 border-surface-300"
                        }`}
                    >
                      {editFormData.status}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 font-medium hidden sm:block">
                    Update procurement materials, project BOM items, tender status, budget parameters, and specifications.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="w-9 h-9 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-500 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form & 2-Column Workstation Body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── LEFT PANE: Opportunity Details & Scope ── */}
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                      Opportunity Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary transition-all"
                      placeholder="e.g. Supply Requirement: UltraTech Cement"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                        Tender Status
                      </label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                        className="w-full h-11 px-3 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer transition-all"
                      >
                        <option value="OPEN">OPEN (Accepting Bids)</option>
                        <option value="NEGOTIATING">NEGOTIATING (In Discussions)</option>
                        <option value="CLOSED">CLOSED (Fulfilled)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                        Estimated Budget (₹)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹40,000 - ₹50,000"
                        value={editFormData.budget_range}
                        onChange={(e) => setEditFormData({ ...editFormData, budget_range: e.target.value })}
                        className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-accent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                      Site Delivery Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Site #4, Electronic City Phase 1, Bangalore"
                      value={editFormData.location}
                      onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                      className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                      Tags (Comma Separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CEMENT, STRUCTURAL, REBAR, BOQ"
                      value={editFormData.tagsInput}
                      onChange={(e) => setEditFormData({ ...editFormData, tagsInput: e.target.value })}
                      className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs font-bold text-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                      Specifications & Delivery Requirements
                    </label>
                    <textarea
                      rows={6}
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs font-mono text-primary resize-none leading-relaxed transition-all"
                      placeholder="Detail technical specifications, quality standards, or delivery timelines..."
                    />
                  </div>
                </div>

                {/* ── RIGHT PANE: Multi-Material Package & BOQ Manager ── */}
                <div className="lg:col-span-7 space-y-4">
                  {editFormData.type === "MATERIAL_REQUIRED" ? (
                    <div className="p-5 rounded-2xl bg-surface-50 border border-surface-200 space-y-5">

                      {/* Sourcing Hub Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-200/80">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-accent" />
                          <span className="text-xs font-black uppercase tracking-wider text-primary">
                            Material Procurement Sourcing
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setEditMaterialSourceMode("catalog")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${editMaterialSourceMode === "catalog"
                              ? "bg-accent text-background font-black shadow-sm"
                              : "text-surface-500 hover:text-primary"
                              }`}
                          >
                            Master Catalog
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditMaterialSourceMode("project_bom")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${editMaterialSourceMode === "project_bom"
                              ? "bg-accent text-background font-black shadow-sm"
                              : "text-surface-500 hover:text-primary"
                              }`}
                          >
                            Project BOM Matrix
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditMaterialSourceMode("custom")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${editMaterialSourceMode === "custom"
                              ? "bg-accent text-background font-black shadow-sm"
                              : "text-surface-500 hover:text-primary"
                              }`}
                          >
                            Custom Item
                          </button>
                        </div>
                      </div>

                      {/* Source Mode 1: Master Catalog */}
                      {editMaterialSourceMode === "catalog" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Material Category
                              </label>
                              <select
                                value={editSelectedCatalogCategory}
                                onChange={(e) => setEditSelectedCatalogCategory(e.target.value)}
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

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Select Master Material
                              </label>
                              <select
                                value={editSelectedMaterial?.id || ""}
                                onChange={(e) => {
                                  const found = masterMaterials.find((m) => m.id === e.target.value);
                                  if (found) {
                                    setEditSelectedMaterial(found);
                                    setEditUnitRate(Number(found.standard_rate) || 380);
                                    setEditMaterialUnit(found.unit || "BAG");
                                  }
                                }}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
                              >
                                <option value="">-- Choose Material Item --</option>
                                {editFilteredMasterMaterials.map((mat) => (
                                  <option key={mat.id} value={mat.id}>
                                    {mat.name} ({mat.category} - {mat.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Required Qty
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editMaterialQty}
                                onChange={(e) => setEditMaterialQty(Number(e.target.value))}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Unit
                              </label>
                              <select
                                value={editMaterialUnit}
                                onChange={(e) => setEditMaterialUnit(e.target.value)}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              >
                                <option value="BAG">Bags (BAG)</option>
                                <option value="TON">Metric Tons (TON)</option>
                                <option value="KG">Kilograms (KG)</option>
                                <option value="M3">Cubic Meters (M3)</option>
                                <option value="M2">Square Meters (M2)</option>
                                <option value="CFT">Cubic Feet (CFT)</option>
                                <option value="NOS">Numbers / Units (NOS)</option>
                                <option value="LITER">Liters (LITER)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Est. Rate / Unit (₹)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={editUnitRate}
                                onChange={(e) => setEditUnitRate(Number(e.target.value))}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddCatalogItemEdit}
                              className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                            >
                              <PackagePlus className="w-3.5 h-3.5" /> Add Material to Package
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Source Mode 2: Project BOM Matrix */}
                      {editMaterialSourceMode === "project_bom" && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Source Project Workspace
                              </label>
                              <select
                                value={editSelectedProjectUid}
                                onChange={(e) => setEditSelectedProjectUid(e.target.value)}
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

                            {editProjectRequirements.length > 0 && (
                              <button
                                type="button"
                                onClick={handleImportAllBOMItemsEdit}
                                className="sm:mt-5 h-10 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0 transition-all"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" /> Import All ({editProjectRequirements.length} BOM Items)
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                              Available Planned BOM Matrix Materials ({editProjectRequirements.length} items)
                            </label>

                            {editLoadingBOM ? (
                              <div className="p-4 text-center text-xs text-surface-400 animate-pulse bg-surface-100 rounded-xl border border-surface-200">
                                Fetching planned BOM matrix materials...
                              </div>
                            ) : editProjectRequirements.length > 0 ? (
                              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                                {editProjectRequirements.map((req) => (
                                  <div
                                    key={req.id}
                                    className="p-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 flex items-center justify-between transition-all"
                                  >
                                    <div className="min-w-0 flex items-center gap-2">
                                      <Box className="w-3.5 h-3.5 text-accent shrink-0" />
                                      <div className="truncate">
                                        <div className="text-xs font-bold text-primary truncate">{req.material_name}</div>
                                        <div className="text-[10px] text-surface-400">
                                          Planned: {req.planned_qty} {req.material_unit} | Balance: {req.balance_remaining || req.planned_qty} {req.material_unit}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleAddBOMItemEdit(req)}
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

                      {/* Source Mode 3: Custom Item */}
                      {editMaterialSourceMode === "custom" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Custom Item Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Specialized Waterproofing Epoxy Primer"
                                value={editCustomItemName}
                                onChange={(e) => setCustomItemNameEdit(e.target.value)}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Category Tag
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Chemicals / Coating"
                                value={editCustomCategory}
                                onChange={(e) => setCustomCategoryEdit(e.target.value)}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Required Qty
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editMaterialQty}
                                onChange={(e) => setEditMaterialQty(Number(e.target.value))}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Unit
                              </label>
                              <select
                                value={editMaterialUnit}
                                onChange={(e) => setEditMaterialUnit(e.target.value)}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              >
                                <option value="BAG">Bags (BAG)</option>
                                <option value="TON">Metric Tons (TON)</option>
                                <option value="KG">Kilograms (KG)</option>
                                <option value="M3">Cubic Meters (M3)</option>
                                <option value="M2">Square Meters (M2)</option>
                                <option value="CFT">Cubic Feet (CFT)</option>
                                <option value="NOS">Numbers / Units (NOS)</option>
                                <option value="LITER">Liters (LITER)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                                Est. Rate / Unit (₹)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={editUnitRate}
                                onChange={(e) => setEditUnitRate(Number(e.target.value))}
                                className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddCustomItemEdit}
                              className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Custom Item
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Active BOQ Table */}
                      <div className="space-y-3 pt-3 border-t border-surface-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-accent" /> Active Materials Package ({editProcurementItems.length} Items)
                          </span>
                          <span className="text-xs font-black text-accent bg-accent/10 px-3 py-1 rounded-xl border border-accent/20">
                            Total Est. Cost: ₹{editGrandTotalCost.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {editProcurementItems.length > 0 ? (
                          <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100 max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-surface-200 text-[10px] uppercase font-bold text-surface-400 bg-surface-200/50 sticky top-0 bg-surface-100 z-10">
                                  <th className="py-2.5 px-3">#</th>
                                  <th className="py-2.5 px-3">Material Item</th>
                                  <th className="py-2.5 px-3">Quantity</th>
                                  <th className="py-2.5 px-3">Rate</th>
                                  <th className="py-2.5 px-3">Subtotal</th>
                                  <th className="py-2.5 px-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-200/60">
                                {editProcurementItems.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-surface-200/40">
                                    <td className="py-2 px-3 text-surface-400 font-bold">{idx + 1}</td>
                                    <td className="py-2 px-3 font-bold text-primary">
                                      {item.name}
                                      <span className="block text-[9px] font-normal text-surface-400 uppercase">{item.category}</span>
                                    </td>
                                    <td className="py-2 px-3 font-bold text-primary">
                                      {item.quantity} <span className="text-[10px] text-surface-400">{item.unit}</span>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-surface-500">₹{item.rate}</td>
                                    <td className="py-2 px-3 font-black text-accent">₹{item.total.toLocaleString('en-IN')}</td>
                                    <td className="py-2 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveProcurementItemEdit(item.id)}
                                        className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                        ) : (
                          <div className="p-6 text-center text-xs text-surface-400 bg-surface-100 rounded-2xl border border-surface-200 border-dashed">
                            No materials added to this package yet. Use Master Catalog or Project BOM above to add items.
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* Service Tender Info Box */
                    <div className="p-6 rounded-2xl bg-surface-50 border border-surface-200 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-semantic-green flex items-center justify-center">
                          <Hammer className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-primary">Service & Contractor Tender</h4>
                          <p className="text-[11px] text-surface-400">
                            Configure labor requirements, milestones, site execution schedules, and contractor specs on the left pane.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Sticky Action Footer */}
              <div className="flex items-center justify-between pt-5 border-t border-surface-200 shrink-0">
                <div className="flex items-center gap-2 text-xs text-surface-400 hidden sm:flex">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Changes reflect immediately on public marketplace & dashboard.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="h-11 px-6 bg-surface-200 hover:bg-surface-300 text-primary rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="h-11 px-8 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── Opportunity Live Chat Modal ── */}
      <OpportunityChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        opportunity={opportunity || null}
        interest={chatInterest || existingInterest || null}
      />

    </div>
  );
}
