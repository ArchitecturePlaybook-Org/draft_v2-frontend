"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  closeOpportunity,
  fetchReceivedInquiries,
  fetchSentInquiries,
  updateInquiryStatus,
  OpportunityPosting,
  OpportunityInterest,
} from "@/domains/marketplace/api";
import { inventoryApi } from "@/domains/inventory/api";
import { projectsApi } from "@/domains/projects/api";
import { MasterMaterial, TaskMaterialRequirement } from "@/domains/inventory/types";
import { Project } from "@/types/projects";
import { OpportunityChatModal } from "@/components/marketplace/OpportunityChatModal";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  LayoutGrid,
  List,
  Edit3,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Lock,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  Users,
  Award,
  Handshake,
  Mail,
  UserCheck,
  Star,
  Send,
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

export default function MyPostingsDashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<"postings" | "received_inquiries" | "sent_inquiries">("postings");
  const [selectedOpportunityForInquiries, setSelectedOpportunityForInquiries] = useState<OpportunityPosting | null>(null);
  const [activeChatInquiry, setActiveChatInquiry] = useState<OpportunityInterest | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [materialSourceMode, setMaterialSourceMode] = useState<"catalog" | "project_bom" | "custom">("catalog");
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

  // Form State for Creating
  const [formData, setFormData] = useState({
    title: "",
    type: "MATERIAL_REQUIRED" as "MATERIAL_REQUIRED" | "SERVICE_REQUIRED",
    description: "",
    location: "",
    budget_range: "",
    tagsInput: "",
  });

  // Edit Modal State
  const [editingPosting, setEditingPosting] = useState<OpportunityPosting | null>(null);
  const [editMaterialSourceMode, setEditMaterialSourceMode] = useState<"catalog" | "project_bom" | "custom">("catalog");
  const [editProcurementItems, setEditProcurementItems] = useState<ProcurementItem[]>([]);
  const [editSelectedCatalogCategory, setEditSelectedCatalogCategory] = useState<string>("ALL");
  const [editSelectedMaterial, setEditSelectedMaterial] = useState<MasterMaterial | null>(null);
  const [editMaterialQty, setEditMaterialQty] = useState<number>(100);
  const [editMaterialUnit, setEditMaterialUnit] = useState<string>("BAG");
  const [editUnitRate, setEditUnitRate] = useState<number>(380);
  const [editCustomItemName, setCustomItemNameEdit] = useState("");
  const [editCustomCategory, setCustomCategoryEdit] = useState("RAW_MATERIAL");
  const [editSelectedProjectUid, setEditSelectedProjectUid] = useState<string>("");
  const [editProjectRequirements, setEditProjectRequirements] = useState<TaskMaterialRequirement[]>([]);
  const [editLoadingBOM, setEditLoadingBOM] = useState(false);

  // View Materials Modal State
  const [selectedPostingForMaterials, setSelectedPostingForMaterials] = useState<OpportunityPosting | null>(null);

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

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query User's Postings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-opportunities", { search: debouncedSearch, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      fetchMyOpportunities({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      }),
  });

  // Query Received Inquiries (Proposals sent by contractors/suppliers for my postings)
  const {
    data: receivedInquiriesData,
    isLoading: isLoadingReceived,
    refetch: refetchReceived,
  } = useQuery({
    queryKey: [
      "received-inquiries",
      {
        search: debouncedSearch,
        status: statusFilter,
        opportunity_id: selectedOpportunityForInquiries?.id,
      },
    ],
    queryFn: () =>
      fetchReceivedInquiries({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        opportunity_id: selectedOpportunityForInquiries?.id,
      }),
  });

  // Query Sent Inquiries (Bids/Inquiries current user submitted to others)
  const { data: sentInquiriesData, isLoading: isLoadingSent } = useQuery({
    queryKey: ["sent-inquiries", { search: debouncedSearch, status: statusFilter }],
    queryFn: () =>
      fetchSentInquiries({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
  });

  const postings: OpportunityPosting[] = data?.results || [];
  const totalCount = data?.count ?? postings.length;

  const receivedInquiries: OpportunityInterest[] = receivedInquiriesData?.results || [];
  const sentInquiries: OpportunityInterest[] = sentInquiriesData?.results || [];

  // Handle URL Query Params for auto-opening chat or setting tab
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "postings" || tabParam === "received_inquiries" || tabParam === "sent_inquiries") {
      setActiveTab(tabParam);
    }

    const chatInquiryId = searchParams?.get("chat_inquiry_id");
    if (chatInquiryId) {
      const idStr = chatInquiryId.toString();
      const foundSent = sentInquiries.find(i => i.id.toString() === idStr);
      const foundReceived = receivedInquiries.find(i => i.id.toString() === idStr);
      if (foundSent) setActiveChatInquiry(foundSent);
      else if (foundReceived) setActiveChatInquiry(foundReceived);
    }
  }, [searchParams, sentInquiries, receivedInquiries]);

  // Load Master Materials and User Projects
  useEffect(() => {
    if (isCreateModalOpen) {
      inventoryApi.getMaterials().then(setMasterMaterials).catch(() => { });
      projectsApi.getProjects().then((projs) => {
        setUserProjects(projs);
        if (projs.length > 0 && !selectedProjectUid) {
          setSelectedProjectUid(projs[0].uid);
        }
      }).catch(() => { });
    }
  }, [isCreateModalOpen]);

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

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newPosting: Partial<OpportunityPosting>) => createOpportunity(newPosting),
    onSuccess: () => {
      toast.success("Opportunity posted successfully!");
      setIsCreateModalOpen(false);
      setFormData({
        title: "",
        type: "MATERIAL_REQUIRED",
        description: "",
        location: "",
        budget_range: "",
        tagsInput: "",
      });
      setProcurementItems([]);
      queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to post opportunity.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OpportunityPosting> }) =>
      updateOpportunity(id, data),
    onSuccess: () => {
      toast.success("Posting updated successfully!");
      setEditingPosting(null);
      queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update posting.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: () => {
      toast.success("Posting deleted.");
      queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete posting.");
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => closeOpportunity(id),
    onSuccess: () => {
      toast.success("Opportunity marked as closed.");
      queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to close opportunity.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ interestId, newStatus }: { interestId: number; newStatus: "INTERESTED" | "IN_TALKS" | "AWARDED" | "REJECTED" }) =>
      updateInquiryStatus(interestId, newStatus),
    onSuccess: (data) => {
      if (data.po_created) {
        toast.success(`Bid Awarded & Draft PO Created! (ID: ${data.po_id})`, { duration: 5000 });
      } else {
        toast.success("Inquiry status updated!");
      }
      queryClient.invalidateQueries({ queryKey: ["received-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["sent-inquiries"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update inquiry status.");
    },
  });

  const handleOpenEdit = (posting: OpportunityPosting) => {
    setEditingPosting(posting);
    const parsed = parseProcurementItemsFromDescription(posting.description || "");
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
      title: posting.title || "",
      type: posting.type || "MATERIAL_REQUIRED",
      status: posting.status || "OPEN",
      description: posting.description || "",
      location: posting.location || "",
      budget_range: posting.budget_range || "",
      tagsInput: (posting.tags || []).join(", "),
      is_public: posting.is_public ?? true,
    });
  };

  // Re-sync form summary whenever procurementItems change in Create Modal
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

  // Edit Material Helpers
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosting) return;

    const tags = editFormData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    updateMutation.mutate({
      id: editingPosting.id,
      data: {
        title: editFormData.title.trim(),
        type: editFormData.type,
        status: editFormData.status,
        description: editFormData.description.trim(),
        location: editFormData.location.trim(),
        budget_range: editFormData.budget_range.trim(),
        tags,
        is_public: editFormData.is_public,
      },
    });
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

  // Add Item Helpers
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
    toast.success(`Added ${selectedMaterial.name}`);
  };

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
    toast.success(`Added ${req.material_name}`);
  };

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
    toast.success(`Imported ${newItems.length} BOM materials!`);
  };

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
    toast.success(`Added ${newItem.name}`);
  };

  // KPIs
  const openCount = postings.filter((p) => p.status === "OPEN").length;
  const negotiatingCount = postings.filter((p) => p.status === "NEGOTIATING").length;
  const closedCount = postings.filter((p) => p.status === "CLOSED").length;
  const materialCount = postings.filter((p) => p.type === "MATERIAL_REQUIRED").length;

  const filteredMasterMaterials = masterMaterials.filter((m) =>
    selectedCatalogCategory === "ALL" ? true : m.category === selectedCatalogCategory
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">

      {/* ── Top Header & KPI Summary ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-100 border border-surface-200 text-accent text-[10px] font-black uppercase tracking-widest rounded-lg mb-2">
            <Sparkles className="w-3 h-3 text-accent" /> Marketplace & Tenders Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            My Opportunity Postings
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 font-medium">
            Manage your published material procurement packages, service tenders, and track vendor proposals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="h-10 px-4 rounded-xl border border-surface-200 bg-surface-100 hover:bg-surface-200 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent" /> Public Marketplace
          </Link>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-5 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-md shadow-accent/20 cursor-pointer transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Post Opportunity
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-100 border border-surface-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Total Postings</span>
            <div className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center text-primary">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary">{totalCount}</div>
          <div className="text-[10px] text-surface-500 font-medium">{materialCount} Material Packages</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-surface-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-semantic-green">Active (Open)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-semantic-green flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-semantic-green">{openCount}</div>
          <div className="text-[10px] text-surface-500 font-medium">Currently receiving bids</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-surface-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">In Negotiations</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">{negotiatingCount}</div>
          <div className="text-[10px] text-surface-500 font-medium">Under active review</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-surface-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Closed / Awarded</span>
            <div className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center text-surface-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-surface-400">{closedCount}</div>
          <div className="text-[10px] text-surface-500 font-medium">Completed procurement</div>
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-surface-100 border border-surface-200 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("postings");
              setSelectedOpportunityForInquiries(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === "postings"
                ? "bg-accent text-background shadow-sm"
                : "text-surface-400 hover:text-primary"
              }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Tenders ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("received_inquiries")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === "received_inquiries"
                ? "bg-accent text-background shadow-sm"
                : "text-surface-400 hover:text-primary"
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Received Inquiries ({receivedInquiries.length})</span>
            {receivedInquiries.filter((i) => i.status === "INTERESTED").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white animate-pulse">
                {receivedInquiries.filter((i) => i.status === "INTERESTED").length} New
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sent_inquiries")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === "sent_inquiries"
                ? "bg-accent text-background shadow-sm"
                : "text-surface-400 hover:text-primary"
              }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>My Sent Bids ({sentInquiries.length})</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: POSTINGS WORKSPACE ── */}
      {activeTab === "postings" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* ── Toolbar & Filters ── */}
          <div className="p-3 bg-surface-100 rounded-2xl border border-surface-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="Filter your postings by title, specifications, tags, or location..."
                className="w-full h-10 pl-10 pr-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-surface-400" />
            </div>

            <div className="flex flex-wrap w-full md:w-auto items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="NEGOTIATING">Negotiating</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="MATERIAL_REQUIRED">Material Packages</option>
                <option value="SERVICE_REQUIRED">Service Gigs</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-surface-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "table" ? "bg-accent text-background shadow-sm" : "text-surface-400 hover:text-primary"
                    }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-accent text-background shadow-sm" : "text-surface-400 hover:text-primary"
                    }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Content Area: Table vs Grid ── */}
          {isLoading ? (
            <div className="h-64 bg-surface-100 rounded-2xl border border-surface-200 animate-pulse flex items-center justify-center text-xs text-surface-400">
              Loading your postings...
            </div>
          ) : postings.length > 0 ? (
            viewMode === "table" ? (
              /* Table View */
              <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-200 text-[10px] uppercase font-black tracking-wider text-surface-400 bg-surface-200/50">
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Opportunity Title</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Budget Range</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Posted Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/60 font-medium">
                    {postings.map((opp) => {
                      const isMaterial = opp.type === "MATERIAL_REQUIRED";
                      const isOpen = opp.status === "OPEN";
                      const isNegotiating = opp.status === "NEGOTIATING";

                      return (
                        <tr key={opp.id} className="hover:bg-surface-200/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-surface-200 border border-surface-300 text-primary text-[9px] font-black uppercase tracking-widest rounded-md">
                              OPP-#{opp.id}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <Link href={`/jobs/${opp.id}`} className="font-bold text-primary hover:text-accent transition-colors block truncate">
                              {opp.title}
                            </Link>
                            <p className="text-[10px] text-surface-400 truncate max-w-xs">{opp.description}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 w-fit ${isMaterial
                                  ? "bg-blue-500/10 text-semantic-blue border-semantic-blue/30"
                                  : "bg-emerald-500/10 text-semantic-green border-semantic-green/30"
                                }`}
                            >
                              {isMaterial ? <Box className="w-2.5 h-2.5" /> : <Hammer className="w-2.5 h-2.5" />}
                              {isMaterial ? "Material" : "Service"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-surface-500 flex items-center gap-1 mt-1.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{opp.location || "Site Unspecified"}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-accent">
                            {opp.budget_range || "TBD"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${isOpen
                                  ? "bg-emerald-500/10 text-semantic-green border-emerald-500/30"
                                  : isNegotiating
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-surface-200 text-surface-400 border-surface-300"
                                }`}
                            >
                              {opp.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-surface-400 text-[11px]">
                            {new Date(opp.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/jobs/${opp.id}`}
                                className="p-1.5 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-surface-500 transition-colors"
                                title="View on Public Marketplace"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setSelectedPostingForMaterials(opp)}
                                className="p-1.5 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-surface-500 transition-colors cursor-pointer"
                                title="View Materials"
                              >
                                <Box className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(opp)}
                                className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-surface-500 hover:text-primary transition-colors cursor-pointer"
                                title="Edit Posting"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {isOpen && (
                                <button
                                  type="button"
                                  onClick={() => closeMutation.mutate(opp.id)}
                                  className="p-1.5 rounded-lg bg-surface-200 hover:bg-amber-500/20 text-surface-500 hover:text-amber-500 transition-colors cursor-pointer"
                                  title="Close Posting"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this posting?")) {
                                    deleteMutation.mutate(opp.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-surface-200 hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete Posting"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {postings.map((opp) => {
                  const isMaterial = opp.type === "MATERIAL_REQUIRED";
                  const isOpen = opp.status === "OPEN";
                  return (
                    <div
                      key={opp.id}
                      className="bg-surface-100 border border-surface-200 rounded-2xl p-5 hover:border-accent/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-surface-200 border border-surface-300 text-primary text-[9px] font-black uppercase tracking-widest rounded-md">
                            OPP-#{opp.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${isOpen
                                ? "bg-emerald-500/10 text-semantic-green border-emerald-500/30"
                                : "bg-surface-200 text-surface-400 border-surface-300"
                              }`}
                          >
                            {opp.status}
                          </span>
                        </div>

                        <Link href={`/jobs/${opp.id}`} className="block font-bold text-primary hover:text-accent transition-colors line-clamp-2">
                          {opp.title}
                        </Link>

                        <p className="text-xs text-surface-500 line-clamp-3 font-medium">
                          {opp.description}
                        </p>

                        {opp.tags && opp.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {opp.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-200 text-surface-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-surface-200 flex items-center justify-between">
                        <div className="text-xs font-bold text-accent">
                          {opp.budget_range || "Budget TBD"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/jobs/${opp.id}`}
                            className="p-1.5 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-surface-500 transition-colors"
                            title="View Public"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSelectedPostingForMaterials(opp)}
                            className="p-1.5 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-surface-500 transition-colors cursor-pointer"
                            title="View Materials"
                          >
                            <Box className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(opp)}
                            className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-surface-500 hover:text-primary transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete posting?")) deleteMutation.mutate(opp.id);
                            }}
                            className="p-1.5 rounded-lg bg-surface-200 hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Empty State */
            <div className="text-center py-20 bg-surface-100 rounded-3xl border border-surface-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-surface-200 rounded-2xl flex items-center justify-center mx-auto text-surface-400">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary">No Opportunities Found</h3>
                <p className="text-xs text-surface-500">
                  {search || statusFilter ? "Try adjusting your search filters." : "You haven't posted any opportunities or tenders yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Post Your First Opportunity
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: RECEIVED INQUIRIES & PROPOSALS WORKSPACE ── */}
      {activeTab === "received_inquiries" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Active Specific Opportunity Filter Banner */}
          {selectedOpportunityForInquiries && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-primary">
                  Showing inquiries for tender: <span className="text-accent font-black">"{selectedOpportunityForInquiries.title}"</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpportunityForInquiries(null)}
                className="px-3 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-bold text-primary border border-surface-200 cursor-pointer transition-all"
              >
                Show All Inquiries
              </button>
            </div>
          )}

          {/* Received Inquiries Content */}
          {isLoadingReceived ? (
            <div className="h-64 bg-surface-100 rounded-2xl border border-surface-200 animate-pulse flex items-center justify-center text-xs text-surface-400">
              Loading received contractor & supplier proposals...
            </div>
          ) : receivedInquiries.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-200 text-[10px] uppercase font-black tracking-wider text-surface-400 bg-surface-200/50">
                    <th className="py-3.5 px-4">Applicant / Contractor</th>
                    <th className="py-3.5 px-4">Target Tender Opportunity</th>
                    <th className="py-3.5 px-4">Date Received</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Negotiation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 font-medium">
                  {receivedInquiries.map((inquiry) => {
                    const applicant = inquiry.applicant_details;
                    const opp = inquiry.opportunity_details;
                    const isNew = inquiry.status === "INTERESTED";
                    const isInTalks = inquiry.status === "IN_TALKS";
                    const isAwarded = inquiry.status === "AWARDED";
                    const isRejected = inquiry.status === "REJECTED";

                    return (
                      <tr key={inquiry.id} className="hover:bg-surface-200/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent font-black text-xs shrink-0 uppercase">
                              {applicant?.first_name ? applicant.first_name[0] : applicant?.email?.[0] || "U"}
                            </div>
                            <div>
                              <div className="font-bold text-primary flex items-center gap-1.5">
                                {applicant?.first_name ? `${applicant.first_name} ${applicant.last_name || ""}` : applicant?.email || `Applicant #${inquiry.applicant}`}
                              </div>
                              <div className="text-[10px] text-surface-400 flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5 text-surface-400" />
                                {applicant?.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {opp ? (
                            <Link href={`/jobs/${opp.id}`} className="font-bold text-primary hover:text-accent transition-colors block truncate">
                              {opp.title}
                            </Link>
                          ) : (
                            <span className="font-bold text-primary">Opportunity #{inquiry.opportunity}</span>
                          )}
                          <div className="text-[10px] text-surface-400 flex items-center gap-2 mt-0.5">
                            {opp?.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {opp.location}
                              </span>
                            )}
                            {opp?.budget_range && <span className="font-bold text-accent">{opp.budget_range}</span>}
                            {opp && (
                              <button
                                type="button"
                                onClick={() => setSelectedPostingForMaterials(opp)}
                                className="text-accent hover:underline flex items-center gap-1 font-bold"
                              >
                                <Box className="w-2.5 h-2.5" /> View Materials
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-surface-400 text-[11px]">
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1 ${isNew
                                ? "bg-blue-500/10 text-semantic-blue border-semantic-blue/30"
                                : isInTalks
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  : isAwarded
                                    ? "bg-emerald-500/10 text-semantic-green border-emerald-500/30"
                                    : "bg-red-500/10 text-semantic-red border-red-500/30"
                              }`}
                          >
                            {isNew && <Sparkles className="w-2.5 h-2.5" />}
                            {isInTalks && <TrendingUp className="w-2.5 h-2.5" />}
                            {isAwarded && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {inquiry.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Chat Button */}
                            {inquiry.chat_channel && (
                              <button
                                type="button"
                                onClick={() => setActiveChatInquiry(inquiry)}
                                className="h-8 px-3 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-primary border border-surface-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Open Live Chat with Applicant"
                              >
                                <MessageSquare className="w-3 h-3" /> Chat
                              </button>
                            )}

                            {/* Status Workflow Actions */}
                            {isNew && (
                              <button
                                type="button"
                                onClick={() => updateStatusMutation.mutate({ interestId: inquiry.id, newStatus: "IN_TALKS" })}
                                className="h-8 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                              >
                                In Talks
                              </button>
                            )}

                            {!isAwarded && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Award this opportunity / tender to this contractor/supplier?")) {
                                    updateStatusMutation.mutate({ interestId: inquiry.id, newStatus: "AWARDED" });
                                  }
                                }}
                                className="h-8 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-semantic-green border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                title="Award Tender"
                              >
                                <Award className="w-3 h-3" /> Award
                              </button>
                            )}

                            {!isRejected && !isAwarded && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Decline this inquiry/bid?")) {
                                    updateStatusMutation.mutate({ interestId: inquiry.id, newStatus: "REJECTED" });
                                  }
                                }}
                                className="h-8 px-2.5 rounded-lg bg-surface-200 hover:bg-red-500/15 hover:text-semantic-red text-surface-400 border border-surface-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                                title="Decline Proposal"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 bg-surface-100 rounded-3xl border border-surface-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-surface-200 rounded-2xl flex items-center justify-center mx-auto text-surface-400">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary">No Inquiries Received Yet</h3>
                <p className="text-xs text-surface-500">
                  When contractors and suppliers submit bids or inquiries on your published tenders, they will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MY SENT BIDS / APPLICATIONS WORKSPACE ── */}
      {activeTab === "sent_inquiries" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {isLoadingSent ? (
            <div className="h-64 bg-surface-100 rounded-2xl border border-surface-200 animate-pulse flex items-center justify-center text-xs text-surface-400">
              Loading your submitted applications...
            </div>
          ) : sentInquiries.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-200 text-[10px] uppercase font-black tracking-wider text-surface-400 bg-surface-200/50">
                    <th className="py-3.5 px-4">Tender Opportunity</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Budget Range</th>
                    <th className="py-3.5 px-4">Date Applied</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 font-medium">
                  {sentInquiries.map((sent) => {
                    const opp = sent.opportunity_details;
                    return (
                      <tr key={sent.id} className="hover:bg-surface-200/40 transition-colors">
                        <td className="py-3.5 px-4 max-w-sm">
                          {opp ? (
                            <Link href={`/jobs/${opp.id}`} className="font-bold text-primary hover:text-accent transition-colors block truncate">
                              {opp.title}
                            </Link>
                          ) : (
                            <span className="font-bold text-primary">Opportunity #{sent.opportunity}</span>
                          )}
                          <p className="text-[10px] text-surface-400 truncate">{opp?.location || "Site Location"}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-surface-200 border border-surface-300 text-primary">
                            {opp?.type || "MATERIAL"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-accent">
                          {opp?.budget_range || "TBD"}
                        </td>
                        <td className="py-3.5 px-4 text-surface-400 text-[11px]">
                          {new Date(sent.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1 ${sent.status === "AWARDED"
                                ? "bg-emerald-500/10 text-semantic-green border-emerald-500/30"
                                : sent.status === "IN_TALKS"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  : sent.status === "REJECTED"
                                    ? "bg-red-500/10 text-semantic-red border-red-500/30"
                                    : "bg-blue-500/10 text-semantic-blue border-semantic-blue/30"
                              }`}
                          >
                            {sent.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sent.chat_channel && (
                              <button
                                type="button"
                                onClick={() => setActiveChatInquiry(sent)}
                                className="h-8 px-3 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-primary border border-surface-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" /> Chat with Poster
                              </button>
                            )}
                            {opp && (
                              <button
                                type="button"
                                onClick={() => setSelectedPostingForMaterials(opp)}
                                className="p-1.5 rounded-lg bg-surface-200 hover:bg-accent hover:text-background text-surface-500 transition-colors cursor-pointer"
                                title="View Materials"
                              >
                                <Box className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {opp && (
                              <Link
                                href={`/jobs/${opp.id}`}
                                className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-surface-500 transition-colors"
                                title="View Public Posting"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 bg-surface-100 rounded-3xl border border-surface-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-surface-200 rounded-2xl flex items-center justify-center mx-auto text-surface-400">
                <Handshake className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary">No Sent Applications</h3>
                <p className="text-xs text-surface-500">
                  You haven't submitted any bids or inquiries to public marketplace opportunities yet.
                </p>
              </div>
              <Link
                href="/jobs"
                className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider inline-flex items-center gap-2 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Browse Marketplace Tenders
              </Link>
            </div>
          )}
        </div>
      )}
      {editingPosting && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in transition-opacity"
            onClick={() => setEditingPosting(null)}
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
                      OPP-#{editingPosting.id}
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
                onClick={() => setEditingPosting(null)}
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
                    onClick={() => setEditingPosting(null)}
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

      {/* ── CREATE MODAL with Multi-Material BOM & Catalog Builder ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl bg-surface-100 border border-surface-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-primary">Post New Opportunity</h2>
                <p className="text-xs text-surface-500 font-medium">Build a multi-material procurement package from Inventory/BOM or create a service tender.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-400 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-2">Opportunity Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "MATERIAL_REQUIRED" })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${formData.type === "MATERIAL_REQUIRED"
                        ? "bg-accent/10 border-accent text-accent font-black shadow-sm"
                        : "bg-surface-50 border-surface-200 text-surface-500 hover:text-primary"
                      }`}
                  >
                    <Box className="w-4 h-4 text-semantic-blue" /> Material Procurement Package
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "SERVICE_REQUIRED" })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${formData.type === "SERVICE_REQUIRED"
                        ? "bg-accent/10 border-accent text-accent font-black shadow-sm"
                        : "bg-surface-50 border-surface-200 text-surface-500 hover:text-primary"
                      }`}
                  >
                    <Hammer className="w-4 h-4 text-semantic-green" /> Service / Labor Gig
                  </button>
                </div>
              </div>

              {formData.type === "MATERIAL_REQUIRED" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-surface-50 border border-surface-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-accent" /> Add Materials to Package
                    </span>
                    <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setMaterialSourceMode("catalog")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${materialSourceMode === "catalog"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                          }`}
                      >
                        Master Catalog
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialSourceMode("project_bom")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${materialSourceMode === "project_bom"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                          }`}
                      >
                        Project BOM Matrix
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialSourceMode("custom")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${materialSourceMode === "custom"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                          }`}
                      >
                        Custom Item
                      </button>
                    </div>
                  </div>

                  {materialSourceMode === "catalog" && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  {materialSourceMode === "project_bom" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Source Project Workspace</label>
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

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Available Planned BOM Matrix Materials ({projectRequirements.length} items)
                        </label>

                        {loadingBOM ? (
                          <div className="p-4 text-center text-xs text-surface-400 animate-pulse bg-surface-100 rounded-xl border border-surface-200">
                            Fetching planned BOM matrix materials...
                          </div>
                        ) : projectRequirements.length > 0 ? (
                          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                            {projectRequirements.map((req) => (
                              <div
                                key={req.id}
                                className="p-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 flex items-center justify-between transition-all"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <Box className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-primary truncate">{req.material_name}</div>
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

                  {/* Procurement Items BOQ Table */}
                  {procurementItems.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-surface-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-accent" /> Added Materials Package ({procurementItems.length} Items)
                        </span>
                        <span className="text-xs font-black text-accent bg-accent/10 px-3 py-1 rounded-xl border border-accent/20">
                          Total Est. Cost: ₹{procurementItems.reduce((acc, c) => acc + c.total, 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-surface-200 text-[10px] uppercase font-bold text-surface-400 bg-surface-200/50">
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">Material Item</th>
                              <th className="py-2 px-3">Quantity</th>
                              <th className="py-2 px-3">Rate</th>
                              <th className="py-2 px-3">Subtotal</th>
                              <th className="py-2 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-200/60">
                            {procurementItems.map((item, idx) => (
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
                                    onClick={() => setProcurementItems((prev) => prev.filter((i) => i.id !== item.id))}
                                    className="p-1 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Posting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Procurement Package: Cement & Steel Rebars for Project Site Alpha"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Site Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, KA (or Remote)"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Estimated Budget / Value</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹2,50,000 - ₹3,00,000"
                    value={formData.budget_range}
                    onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                    className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Cement, Structural, Urgent, Foundation"
                  value={formData.tagsInput}
                  onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                  className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-bold text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-surface-400 mb-1.5">Specifications & Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide details on required grade, quantity, delivery timelines, payment terms..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs sm:text-sm font-mono text-primary leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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

      {/* ── Opportunity Live Chat Modal ── */}
      <OpportunityChatModal
        isOpen={!!activeChatInquiry}
        onClose={() => setActiveChatInquiry(null)}
        opportunity={activeChatInquiry?.opportunity_details || null}
        interest={activeChatInquiry}
        onStatusUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["received-inquiries"] });
          queryClient.invalidateQueries({ queryKey: ["my-opportunities"] });
          queryClient.invalidateQueries({ queryKey: ["sent-inquiries"] });
        }}
      />

      {/* View Materials Modal */}
      {selectedPostingForMaterials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-2xl bg-surface-100 rounded-3xl border border-surface-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-surface-200 bg-surface-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-black">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-primary text-base">Required Materials</h3>
                  <p className="text-xs font-medium text-surface-500 truncate max-w-sm">
                    {selectedPostingForMaterials.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPostingForMaterials(null)}
                className="w-8 h-8 rounded-xl bg-surface-200 hover:bg-surface-300 text-primary font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto min-h-0 bg-surface-100/50">
              {(() => {
                const items = selectedPostingForMaterials.procurement_items?.length 
                  ? selectedPostingForMaterials.procurement_items 
                  : parseProcurementItemsFromDescription(selectedPostingForMaterials.description || "");
                
                if (items.length === 0) {
                  return (
                    <div className="space-y-4">
                      <div className="text-center py-10 bg-surface-50 rounded-xl border border-surface-200">
                        <div className="w-12 h-12 bg-surface-200 rounded-xl flex items-center justify-center mx-auto text-surface-400 mb-3">
                          <PackagePlus className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-primary">No Structured Materials Found</p>
                        <p className="text-xs text-surface-500 mt-1">This opportunity might be service-based or doesn't list exact BOM materials in the expected format.</p>
                      </div>
                      {selectedPostingForMaterials.description && (
                        <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Opportunity Description / Requirements</h4>
                          <div className="text-sm text-surface-600 whitespace-pre-wrap">
                            {selectedPostingForMaterials.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-surface-200 text-[10px] uppercase font-black tracking-wider text-surface-400 bg-surface-100/50">
                            <th className="py-2.5 px-3">Item Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Est. Rate</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-200/60 font-medium">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-100 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-primary">{item.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-surface-200 text-surface-600 border border-surface-300">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-primary">
                                {item.quantity} <span className="text-surface-400 font-medium">{item.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-surface-500">₹{item.rate.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-accent">₹{item.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-surface-100/50 border-t border-surface-200 font-bold">
                          <tr>
                            <td colSpan={4} className="py-3 px-3 text-right text-primary text-xs uppercase tracking-wider">Estimated Total Value:</td>
                            <td className="py-3 px-3 text-right text-accent text-sm">
                              ₹{items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPostingForMaterials(null)}
                className="h-9 px-5 rounded-xl bg-surface-200 hover:bg-surface-300 text-primary font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
