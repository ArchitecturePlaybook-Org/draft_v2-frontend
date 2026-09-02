"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Box,
  Layers,
  CheckCircle2,
  Trash2,
  Receipt,
  PackagePlus,
  Plus,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { createOpportunity, OpportunityPosting } from "@/domains/marketplace/api";
import { inventoryApi } from "@/domains/inventory/api";
import { MasterMaterial } from "@/domains/inventory/types";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface DirectPostItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

interface DirectPostOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialLocation?: string;
  initialItems?: Array<{
    name: string;
    category?: string;
    quantity: number;
    unit: string;
    rate?: number;
  }>;
  sourceContext?: string;
  projectUid?: string;
}

export const DirectPostOpportunityModal: React.FC<DirectPostOpportunityModalProps> = ({
  isOpen,
  onClose,
  initialTitle = "",
  initialLocation = "",
  initialItems = [],
  sourceContext = "",
  projectUid,
}) => {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [location, setLocation] = useState(initialLocation);
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"OPEN" | "NEGOTIATING">("OPEN");
  const [budgetRange, setBudgetRange] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPosting, setCreatedPosting] = useState<OpportunityPosting | null>(null);

  // Material Package Items state
  const [items, setItems] = useState<DirectPostItem[]>([]);
  const [sourceMode, setSourceMode] = useState<"catalog" | "custom">("catalog");

  // Catalog Sourcing
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>("ALL");
  const [selectedMaterial, setSelectedMaterial] = useState<MasterMaterial | null>(null);
  const [matQty, setMatQty] = useState<number>(100);
  const [matUnit, setMatUnit] = useState<string>("BAG");
  const [unitRate, setUnitRate] = useState<number>(380);

  // Custom Item
  const [customItemName, setCustomItemName] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  // Load master catalog materials
  useEffect(() => {
    if (isOpen) {
      inventoryApi.getMaterials().then(setMasterMaterials).catch(() => {});
    }
  }, [isOpen]);

  // Sync initial items when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || (sourceContext ? `Procurement Tender: ${sourceContext}` : "Supply Requirement Package"));
      setLocation(initialLocation);
      setCreatedPosting(null);

      const parsedItems: DirectPostItem[] = initialItems.map((item, idx) => {
        const rate = item.rate || 380;
        const qty = item.quantity || 1;
        return {
          id: `item-${Date.now()}-${idx}`,
          name: item.name,
          category: item.category || "GENERAL",
          quantity: qty,
          unit: item.unit || "BAG",
          rate,
          total: qty * rate,
        };
      });

      setItems(parsedItems);

      // Auto-extract tags
      const catTags = Array.from(new Set(parsedItems.map((i) => i.category).filter(Boolean)));
      const defaultTags = ["BOM", "PROCUREMENT", "TENDER", ...catTags].join(", ");
      setTagsInput(defaultTags);
    }
  }, [isOpen, initialTitle, initialLocation, initialItems, sourceContext]);

  // Auto-sync budget and description notes whenever items change
  useEffect(() => {
    if (!isOpen) return;
    const total = items.reduce((acc, curr) => acc + curr.total, 0);

    if (total > 0) {
      const minBudget = Math.round(total * 0.95);
      const maxBudget = Math.round(total * 1.05);
      setBudgetRange(`₹${minBudget.toLocaleString("en-IN")} - ₹${maxBudget.toLocaleString("en-IN")}`);
    }

    if (items.length > 0) {
      const boqList = items
        .map((it, idx) => `${idx + 1}. ${it.name} — ${it.quantity} ${it.unit} @ ₹${it.rate}/${it.unit} (Est: ₹${it.total.toLocaleString("en-IN")})`)
        .join("\n");

      const generatedDesc = `Bill of Materials / Package Items:\n${boqList}\n\nTotal Estimated Package Value: ₹${total.toLocaleString("en-IN")}\n\n${sourceContext ? `Source Context: ${sourceContext}\n` : ""}Delivery Requirements:\n- Quality tested materials with factory test certificates.\n- Staggered site delivery schedule as per project milestones.`;
      setDescription(generatedDesc);
    }
  }, [items, isOpen, sourceContext]);

  const grandTotalCost = items.reduce((acc, curr) => acc + curr.total, 0);

  const filteredMasterMaterials = masterMaterials.filter((m) => {
    if (selectedCatalogCategory === "ALL") return true;
    return m.category === selectedCatalogCategory;
  });

  const handleAddCatalogItem = () => {
    if (!selectedMaterial) {
      toast.error("Please select a master material");
      return;
    }
    const total = matQty * unitRate;
    const newItem: DirectPostItem = {
      id: `cat-${Date.now()}`,
      name: selectedMaterial.name,
      category: selectedMaterial.category || "GENERAL",
      quantity: matQty,
      unit: matUnit,
      rate: unitRate,
      total,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedMaterial(null);
    toast.success(`Added ${newItem.name} to tender package`);
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      toast.error("Please enter a custom material item name");
      return;
    }
    const total = matQty * unitRate;
    const newItem: DirectPostItem = {
      id: `cust-${Date.now()}`,
      name: customItemName.trim(),
      category: customCategory.trim() || "CUSTOM",
      quantity: matQty,
      unit: matUnit,
      rate: unitRate,
      total,
    };
    setItems((prev) => [...prev, newItem]);
    setCustomItemName("");
    setCustomCategory("");
    toast.success(`Added ${newItem.name} to tender package`);
  };

  const handleUpdateItem = (id: string, updates: Partial<DirectPostItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        const qty = Number(updated.quantity) || 0;
        const rate = Number(updated.rate) || 0;
        updated.total = qty * rate;
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Tender title is required");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);
    try {
      const payload = {
        type: "MATERIAL_REQUIRED" as const,
        title: title.trim(),
        description: description.trim(),
        budget_range: budgetRange.trim(),
        location: location.trim(),
        tags: tags.length > 0 ? tags : ["BOM", "PROCUREMENT"],
        status: status,
      };

      const created = await createOpportunity(payload);
      setCreatedPosting(created);
      toast.success("Opportunity Tender published successfully to the marketplace!");
    } catch (err: any) {
      console.error("Failed to post opportunity", err);
      toast.error(err?.message || "Failed to post opportunity to marketplace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-surface-100 border border-surface-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Strip */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-surface-200 bg-surface-50/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-primary tracking-tight">
                  Direct Post Material Opportunity Tender
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                  BOM Direct Sourcing
                </span>
              </div>
              <p className="text-xs text-surface-500 font-medium hidden sm:block">
                {sourceContext ? `Sourced from ${sourceContext}` : "Instantly tender out planned materials directly to verified suppliers & vendors."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-500 hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If successfully posted, show success banner */}
        {createdPosting ? (
          <div className="p-8 sm:p-12 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-semantic-green flex items-center justify-center border border-semantic-green/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-black text-primary">Tender Published to Marketplace!</h3>
              <p className="text-xs text-surface-500">
                Opportunity <strong className="text-accent">OPP-#{createdPosting.id}</strong> has been created and is now visible to material suppliers and vendors for quoting.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/jobs/${createdPosting.id}`}
                target="_blank"
                className="h-11 px-6 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-accent/20 transition-all"
              >
                <ExternalLink className="w-4 h-4" /> View Public Listing
              </Link>
              <Link
                href="/dashboard/opportunities"
                className="h-11 px-6 bg-surface-200 hover:bg-surface-300 text-primary rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-2 transition-all"
              >
                <Building2 className="w-4 h-4" /> Manage My Postings
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-6 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-surface-500 hover:text-primary rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form & 2-Column Workstation Body */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full h-11 px-3 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer transition-all"
                    >
                      <option value="OPEN">OPEN (Accepting Bids)</option>
                      <option value="NEGOTIATING">NEGOTIATING (In Discussions)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                      Estimated Budget (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹40,000 - ₹50,000"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
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
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
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
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs font-bold text-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-surface-400 mb-1.5">
                    Specifications & Delivery Requirements
                  </label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-xs font-mono text-primary resize-none leading-relaxed transition-all"
                    placeholder="Detail technical specifications, quality standards, or delivery timelines..."
                  />
                </div>
              </div>

              {/* ── RIGHT PANE: Multi-Material Package & BOQ Manager ── */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-surface-50 border border-surface-200 space-y-5">
                  
                  {/* Sourcing Hub Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-200/80">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" />
                      <span className="text-xs font-black uppercase tracking-wider text-primary">
                        Procurement Package Materials ({items.length} Items)
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSourceMode("catalog")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          sourceMode === "catalog"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                        }`}
                      >
                        Master Catalog
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceMode("custom")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          sourceMode === "custom"
                            ? "bg-accent text-background font-black shadow-sm"
                            : "text-surface-500 hover:text-primary"
                        }`}
                      >
                        Custom Item
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Catalog */}
                  {sourceMode === "catalog" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Material Category
                          </label>
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
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Select Master Material
                          </label>
                          <select
                            value={selectedMaterial?.id || ""}
                            onChange={(e) => {
                              const found = masterMaterials.find((m) => m.id === e.target.value);
                              if (found) {
                                setSelectedMaterial(found);
                                setUnitRate(Number(found.standard_rate) || 380);
                                setMatUnit(found.unit || "BAG");
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
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Required Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={matQty}
                            onChange={(e) => setMatQty(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Unit
                          </label>
                          <select
                            value={matUnit}
                            onChange={(e) => setMatUnit(e.target.value)}
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
                          className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                        >
                          <PackagePlus className="w-3.5 h-3.5" /> Add Material to Package
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Custom */}
                  {sourceMode === "custom" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Custom Item Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Specialized Waterproofing Epoxy Primer"
                            value={customItemName}
                            onChange={(e) => setCustomItemName(e.target.value)}
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
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
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
                            value={matQty}
                            onChange={(e) => setMatQty(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                            Unit
                          </label>
                          <select
                            value={matUnit}
                            onChange={(e) => setMatUnit(e.target.value)}
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
                        <Receipt className="w-4 h-4 text-accent" /> Active Materials Package ({items.length} Items)
                      </span>
                      <span className="text-xs font-black text-accent bg-accent/10 px-3 py-1 rounded-xl border border-accent/20">
                        Total Est. Value: ₹{grandTotalCost.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {items.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-100 max-h-72 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-surface-200 text-[10px] uppercase font-bold text-surface-400 bg-surface-200/50 sticky top-0 bg-surface-100 z-10">
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Material Item</th>
                              <th className="py-2.5 px-3">Quantity</th>
                              <th className="py-2.5 px-3">Unit</th>
                              <th className="py-2.5 px-3">Rate (₹)</th>
                              <th className="py-2.5 px-3">Subtotal</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-200/60">
                            {items.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-surface-200/40 transition-colors">
                                <td className="py-2 px-3 text-surface-400 font-bold">{idx + 1}</td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                    className="w-full h-8 px-2 bg-surface-50 border border-surface-200 hover:border-surface-300 focus:border-accent rounded-lg text-xs font-bold text-primary outline-none transition-all"
                                  />
                                  <span className="block text-[9px] font-medium text-surface-400 uppercase mt-0.5 px-1">{item.category}</span>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                                    className="w-20 h-8 px-2 bg-surface-50 border border-surface-200 hover:border-surface-300 focus:border-accent rounded-lg text-xs font-bold text-primary outline-none transition-all"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={item.unit}
                                    onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                                    className="h-8 px-2 bg-surface-50 border border-surface-200 hover:border-surface-300 focus:border-accent rounded-lg text-[11px] font-bold text-primary outline-none transition-all cursor-pointer"
                                  >
                                    <option value="BAG">BAG</option>
                                    <option value="TON">TON</option>
                                    <option value="KG">KG</option>
                                    <option value="M3">M3</option>
                                    <option value="M2">M2</option>
                                    <option value="CFT">CFT</option>
                                    <option value="NOS">NOS</option>
                                    <option value="LITER">LITER</option>
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1">
                                    <span className="text-surface-400 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.rate}
                                      onChange={(e) => handleUpdateItem(item.id, { rate: Number(e.target.value) })}
                                      className="w-20 h-8 px-2 bg-surface-50 border border-surface-200 hover:border-surface-300 focus:border-accent rounded-lg text-xs font-bold text-primary outline-none transition-all"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-black text-accent whitespace-nowrap">
                                  ₹{item.total.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Remove item from tender"
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
                        No materials attached to this tender yet. Add items above.
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-surface-200 shrink-0">
              <div className="flex items-center gap-2 text-xs text-surface-400 hidden sm:flex">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Publishes directly to Architecture Playbook Marketplace.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-6 bg-surface-200 hover:bg-surface-300 text-primary rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="h-11 px-8 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? "Publishing Tender..." : "Publish Tender to Marketplace"}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
