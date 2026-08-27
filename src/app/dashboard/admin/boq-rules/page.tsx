"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { boqApi } from "@/domains/boq/api";
import { 
  BOQTypologyDB, 
  DSRRateMasterDB, 
  BOQCalculationRuleDB 
} from "@/domains/boq/types";
import { toast } from "sonner";
import { 
  Calculator, 
  Database, 
  Layers, 
  Save, 
  RefreshCw, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  ArrowLeft,
  Search,
  DollarSign,
  Code,
  Building,
  Sliders,
  AlertTriangle
} from "lucide-react";

export default function SuperAdminBOQRulesPage() {
  const [activeTab, setActiveTab] = useState<"typologies" | "rules" | "rates">("typologies");
  const [typologies, setTypologies] = useState<BOQTypologyDB[]>([]);
  const [rates, setRates] = useState<DSRRateMasterDB[]>([]);
  const [rules, setRules] = useState<BOQCalculationRuleDB[]>([]);
  const [selectedTypology, setSelectedTypology] = useState<string>("g1_residential");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active Edit States
  const [editingRate, setEditingRate] = useState<DSRRateMasterDB | null>(null);
  const [isCreatingRate, setIsCreatingRate] = useState(false);
  const [newRate, setNewRate] = useState<Partial<DSRRateMasterDB>>({
    item_code: "",
    description: "",
    unit: "m3",
    rate: 0,
    stage: "earthwork",
    is_code_ref: "",
    state_multiplier: 1.0,
    is_active: true,
  });

  const [editingRule, setEditingRule] = useState<BOQCalculationRuleDB | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<BOQCalculationRuleDB>>({
    typology: "g1_residential",
    item: 0,
    stage: "earthwork",
    quantity_formula: "perimeter * 0.9 * excavation_depth",
    deduction_formula: "",
    condition_expression: "",
    coefficient: 1.0,
    waste_margin_percent: 0,
    deductions_note_template: "",
    is_active: true,
  });

  // Structure Type Create / Edit / Clone States
  const [editingTypology, setEditingTypology] = useState<BOQTypologyDB | null>(null);
  const [isCreatingTypology, setIsCreatingTypology] = useState(false);
  const [cloneSourceSlug, setCloneSourceSlug] = useState<string>("");
  const [newTypology, setNewTypology] = useState<{
    name: string;
    slug: string;
    category: BOQTypologyDB["category"];
    description: string;
    icon: string;
    outer_length: number;
    outer_width: number;
    floor_height: number;
    num_floors: number;
    outer_wall_thickness_mm: number;
    inner_wall_length: number;
    inner_wall_thickness_mm: number;
    clone_from_slug?: string;
  }>({
    name: "",
    slug: "",
    category: "building",
    description: "",
    icon: "Building",
    outer_length: 15,
    outer_width: 10,
    floor_height: 3.0,
    num_floors: 1,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 25,
    inner_wall_thickness_mm: 115,
    clone_from_slug: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tData, rData, rulesData] = await Promise.all([
        boqApi.adminGetTypologies(),
        boqApi.adminGetRates(),
        boqApi.adminGetRules(),
      ]);
      setTypologies(tData);
      setRates(rData);
      setRules(rulesData);
      if (tData.length > 0 && (!selectedTypology || !tData.some(t => t.slug === selectedTypology))) {
        setSelectedTypology(tData[0].slug);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load BOQ rules from database. Ensure you are logged in as Super Admin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Structure Type Handlers ───────────────────────────────────────────────

  const handleCreateTypology = async () => {
    if (!newTypology.name.trim()) {
      toast.error("Please enter a structure type name.");
      return;
    }
    setIsSaving(true);
    try {
      if (newTypology.clone_from_slug) {
        // Clone existing structure with all rules
        await boqApi.adminCloneTypology(newTypology.clone_from_slug, {
          name: newTypology.name,
          slug: newTypology.slug || undefined,
        });
        toast.success(`Created & cloned rules into "${newTypology.name}" successfully.`);
      } else {
        // Create new structure type in DB
        await boqApi.adminCreateTypology({
          name: newTypology.name,
          slug: newTypology.slug || undefined,
          category: newTypology.category,
          description: newTypology.description,
          icon: newTypology.icon,
          default_parameters: {
            outer_length: Number(newTypology.outer_length),
            outer_width: Number(newTypology.outer_width),
            floor_height: Number(newTypology.floor_height),
            num_floors: Number(newTypology.num_floors),
            outer_wall_thickness_mm: Number(newTypology.outer_wall_thickness_mm),
            inner_wall_length: Number(newTypology.inner_wall_length),
            inner_wall_thickness_mm: Number(newTypology.inner_wall_thickness_mm),
          },
          is_active: true,
        });
        toast.success(`Structure type "${newTypology.name}" created successfully in database.`);
      }
      setIsCreatingTypology(false);
      setNewTypology({
        name: "",
        slug: "",
        category: "building",
        description: "",
        icon: "Building",
        outer_length: 15,
        outer_width: 10,
        floor_height: 3.0,
        num_floors: 1,
        outer_wall_thickness_mm: 230,
        inner_wall_length: 25,
        inner_wall_thickness_mm: 115,
        clone_from_slug: "",
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create structure type.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTypology = async () => {
    if (!editingTypology) return;
    setIsSaving(true);
    try {
      await boqApi.adminUpdateTypology(editingTypology.slug, {
        name: editingTypology.name,
        category: editingTypology.category,
        description: editingTypology.description,
        icon: editingTypology.icon,
        is_active: editingTypology.is_active,
        default_parameters: editingTypology.default_parameters,
      });
      toast.success(`Structure type "${editingTypology.name}" updated successfully.`);
      setEditingTypology(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update structure type.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTypology = async (slug: string, name: string) => {
    if (!confirm(`Are you sure you want to delete structure type "${name}"? All associated rules will be removed.`)) {
      return;
    }
    setIsSaving(true);
    try {
      await boqApi.adminDeleteTypology(slug);
      toast.success(`Structure type "${name}" deleted.`);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete structure type.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Calculation Rule Handlers ─────────────────────────────────────────────

  const handleSaveRule = async () => {
    if (!editingRule) return;
    setIsSaving(true);
    try {
      if (editingRule.id) {
        await boqApi.adminUpdateRule(editingRule.id, {
          quantity_formula: editingRule.quantity_formula,
          deduction_formula: editingRule.deduction_formula,
          condition_expression: editingRule.condition_expression,
          coefficient: Number(editingRule.coefficient),
          waste_margin_percent: Number(editingRule.waste_margin_percent),
          deductions_note_template: editingRule.deductions_note_template,
          is_active: editingRule.is_active,
        });
        toast.success("Calculation formula rule updated successfully.");
      }
      setEditingRule(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save rule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.item || !newRule.quantity_formula) {
      toast.error("Please select a DSR item and enter a quantity formula.");
      return;
    }
    setIsSaving(true);
    try {
      await boqApi.adminCreateRule({
        ...newRule,
        typology: selectedTypology,
        coefficient: Number(newRule.coefficient) || 1.0,
        waste_margin_percent: Number(newRule.waste_margin_percent) || 0,
      });
      toast.success("New calculation rule added successfully.");
      setIsCreatingRule(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create calculation rule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this calculation rule?")) return;
    try {
      await boqApi.adminDeleteRule(id);
      toast.success("Calculation rule deleted.");
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete rule.");
    }
  };

  // ── Rate Handlers ─────────────────────────────────────────────────────────

  const handleSaveRate = async () => {
    if (!editingRate) return;
    setIsSaving(true);
    try {
      await boqApi.adminUpdateRate(editingRate.item_code, {
        rate: Number(editingRate.rate),
        state_multiplier: Number(editingRate.state_multiplier),
        description: editingRate.description,
        is_code_ref: editingRate.is_code_ref,
        is_active: editingRate.is_active,
      });
      toast.success(`Rate for ${editingRate.item_code} updated successfully.`);
      setEditingRate(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save rate.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRate = async () => {
    if (!newRate.item_code || !newRate.description || !newRate.rate) {
      toast.error("Please fill in item code, description, and base rate.");
      return;
    }
    setIsSaving(true);
    try {
      await boqApi.adminCreateRate({
        ...newRate,
        rate: Number(newRate.rate),
        state_multiplier: Number(newRate.state_multiplier) || 1.0,
      });
      toast.success(`Rate item "${newRate.item_code}" created successfully.`);
      setIsCreatingRate(false);
      setNewRate({
        item_code: "",
        description: "",
        unit: "m3",
        rate: 0,
        stage: "earthwork",
        is_code_ref: "",
        state_multiplier: 1.0,
        is_active: true,
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create rate.");
    } finally {
      setIsSaving(false);
    }
  };

  const rulesList = Array.isArray(rules) ? rules : [];
  const ratesList = Array.isArray(rates) ? rates : [];
  const typologiesList = Array.isArray(typologies) ? typologies : [];

  const filteredRules = rulesList.filter(r => {
    const matchesTypology = !selectedTypology || r.typology === selectedTypology;
    const matchesSearch = !searchQuery || 
      (r.item_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.stage || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.quantity_formula || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTypology && matchesSearch;
  });

  const filteredRates = ratesList.filter(r => {
    if (!searchQuery) return true;
    return (
      r.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.stage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-foreground p-6 space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/dashboard/tools/boq-builder"
              className="text-xs font-bold text-surface-400 hover:text-accent flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to BOQ Builder
            </Link>
            <span className="text-surface-400">/</span>
            <span className="text-xs font-bold text-accent uppercase tracking-wider">Super Admin Management</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-accent" />
            <span>BOQ Dynamic Structure & Calculation Engine</span>
          </h1>
          <p className="text-xs text-surface-500 max-w-2xl mt-1 leading-relaxed">
            Create and customize Structure Types, configure dynamic quantity formulas, and maintain the CPWD DSR Rate Master.
            All changes are stored in the database and immediately power the live BOQ calculation engine.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8.5 px-3.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-xs font-bold hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-accent" : ""}`} />
            <span>Reload DB</span>
          </button>
        </div>
      </div>

      {/* ── TABS NAVIGATION & ACTIONS ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-surface-200/70 dark:bg-surface-900 p-1 rounded-xl border border-surface-300/80 dark:border-surface-800">
          <button
            type="button"
            onClick={() => setActiveTab("typologies")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "typologies"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Structure Types ({typologiesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "rules"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Calculation Rules & Formulas ({rulesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rates")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "rates"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>CPWD DSR Rates ({ratesList.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Button depending on tab */}
          {activeTab === "typologies" && (
            <button
              type="button"
              onClick={() => setIsCreatingTypology(true)}
              className="h-8.5 px-3.5 rounded-lg bg-accent text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Structure Type</span>
            </button>
          )}

          {activeTab === "rules" && (
            <button
              type="button"
              onClick={() => {
                setNewRule({ ...newRule, typology: selectedTypology });
                setIsCreatingRule(true);
              }}
              className="h-8.5 px-3.5 rounded-lg bg-accent text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Calculation Rule</span>
            </button>
          )}

          {activeTab === "rates" && (
            <button
              type="button"
              onClick={() => setIsCreatingRate(true)}
              className="h-8.5 px-3.5 rounded-lg bg-accent text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add DSR Item</span>
            </button>
          )}

          {/* Search filter */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search items, formulas, codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700/80 rounded-lg pl-8.5 pr-3 text-xs outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* ── TAB 1: STRUCTURE TYPES (DYNAMIC CRUD) ───────────────────────────── */}
      {activeTab === "typologies" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {typologiesList.map((t) => (
            <div key={t.slug} className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-100/90 dark:bg-surface-900 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                    {t.category_display || t.category}
                  </span>
                  <span className="text-[10px] font-mono text-surface-400">
                    {t.slug}
                  </span>
                </div>
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Building className="w-4 h-4 text-accent" />
                  <span>{t.name}</span>
                </h3>
                <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">
                  {t.description || "No description provided."}
                </p>
                {t.default_parameters && (
                  <div className="bg-surface-50 dark:bg-surface-950 p-2 rounded-xl text-[10px] font-mono text-surface-400 border border-surface-200 dark:border-surface-800">
                    Default: {t.default_parameters.outer_length || 0}m × {t.default_parameters.outer_width || 0}m · {t.default_parameters.num_floors || 1} Floor(s) · {t.default_parameters.floor_height || 3}m height
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTypology(t.slug);
                    setActiveTab("rules");
                  }}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{t.rule_count || 0} Rules</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTypology({
                        ...newTypology,
                        name: `Copy of ${t.name}`,
                        category: t.category,
                        clone_from_slug: t.slug,
                      });
                      setIsCreatingTypology(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-accent transition-colors cursor-pointer"
                    title="Clone structure type with all rules"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTypology(t)}
                    className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-accent transition-colors cursor-pointer"
                    title="Edit structure type details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTypology(t.slug, t.name)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete structure type"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 2: CALCULATION RULES & FORMULAS ──────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {/* Structure Type Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <span className="text-[10px] font-black uppercase text-surface-400 shrink-0">Structure:</span>
            {typologiesList.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setSelectedTypology(t.slug)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTypology === t.slug
                    ? "bg-accent/20 border border-accent text-accent font-black shadow-2xs"
                    : "bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-800 text-surface-400 hover:text-foreground"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Rules Table */}
          <div className="bg-surface-100/80 dark:bg-surface-900 rounded-2xl border border-surface-200/80 dark:border-surface-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-200/50 dark:bg-surface-850 text-surface-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Quantity Formula</th>
                  <th className="py-2.5 px-3">Deduction / Condition</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-center">Coeff</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800 font-medium">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-surface-200/30 dark:hover:bg-surface-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-accent">
                      {rule.item_code}
                    </td>
                    <td className="py-2.5 px-3 text-surface-400 max-w-[200px] truncate" title={rule.item_description}>
                      {rule.item_description}
                    </td>
                    <td className="py-2.5 px-3 font-bold uppercase text-[9px] text-surface-400">
                      {rule.stage}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-400">
                      {rule.quantity_formula}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-surface-400">
                      {rule.deduction_formula ? (
                        <span className="text-amber-400">-({rule.deduction_formula})</span>
                      ) : rule.condition_expression ? (
                        <span className="text-purple-400">if {rule.condition_expression}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      ₹{rule.item_rate?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {rule.coefficient}
                    </td>
                    <td className="py-2.5 px-3 text-center flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingRule(rule)}
                        className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-accent transition-colors cursor-pointer"
                        title="Edit formula or coefficient"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => rule.id && handleDeleteRule(rule.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete rule"
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

      {/* ── TAB 3: CPWD DSR RATES ────────────────────────────────────────────── */}
      {activeTab === "rates" && (
        <div className="bg-surface-100/80 dark:bg-surface-900 rounded-2xl border border-surface-200/80 dark:border-surface-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-200/50 dark:bg-surface-850 text-surface-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 text-right">Base Rate (₹)</th>
                <th className="py-2.5 px-3 text-center">State Multiplier</th>
                <th className="py-2.5 px-3">IS Code Ref</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-800 font-medium">
              {filteredRates.map((rate) => (
                <tr key={rate.item_code} className="hover:bg-surface-200/30 dark:hover:bg-surface-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-black text-accent">
                    {rate.item_code}
                  </td>
                  <td className="py-2.5 px-3 text-foreground max-w-[280px]">
                    {rate.description}
                  </td>
                  <td className="py-2.5 px-3 font-bold uppercase text-[9px] text-surface-400">
                    {rate.stage}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-surface-400">
                    {rate.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                    ₹{Number(rate.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {rate.state_multiplier}
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-surface-400 font-mono">
                    {rate.is_code_ref || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      rate.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400"
                    }`}>
                      {rate.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setEditingRate(rate)}
                      className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-accent transition-colors cursor-pointer"
                      title="Edit rate or multiplier"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE STRUCTURE TYPE MODAL ─────────────────────────────────────── */}
      {isCreatingTypology && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                <span>Create New Structure Type</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingTypology(false)}
                className="text-surface-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Structure Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Commercial PEB Warehouse"
                    value={newTypology.name}
                    onChange={(e) => setNewTypology({ ...newTypology, name: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Category</label>
                  <select
                    value={newTypology.category}
                    onChange={(e) => setNewTypology({ ...newTypology, category: e.target.value as any })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    <option value="building">Building & Residential</option>
                    <option value="commercial">Commercial & Retail</option>
                    <option value="industrial">Industrial & Warehouse</option>
                    <option value="infrastructure">Infrastructure & Roads</option>
                    <option value="wall">Boundary & Retaining Walls</option>
                    <option value="sanitation">Sanitation & Drainage</option>
                    <option value="interior">Interiors & Finishes</option>
                    <option value="custom">Custom Structure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">Clone Rules From Template (Optional)</label>
                <select
                  value={newTypology.clone_from_slug || ""}
                  onChange={(e) => setNewTypology({ ...newTypology, clone_from_slug: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-accent font-bold outline-none focus:border-accent"
                >
                  <option value="">-- None (Start with empty calculation rules) --</option>
                  {typologiesList.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      Clone all {t.rule_count || 0} rules from {t.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-surface-500 mt-1 block">
                  Selecting an existing structure will copy all formula rules, quantities, and rates automatically into the new structure type!
                </span>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">Description</label>
                <textarea
                  placeholder="Engineering purpose, IS codes, and measurement scope..."
                  value={newTypology.description}
                  onChange={(e) => setNewTypology({ ...newTypology, description: e.target.value })}
                  rows={2}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 border-t border-surface-200 dark:border-surface-800">
                <span className="font-bold text-accent text-[11px] uppercase tracking-wider mb-2 block">
                  Default Dimension Parameters
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-surface-400">Outer Length (m)</label>
                    <input
                      type="number"
                      value={newTypology.outer_length}
                      onChange={(e) => setNewTypology({ ...newTypology, outer_length: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg p-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400">Outer Width (m)</label>
                    <input
                      type="number"
                      value={newTypology.outer_width}
                      onChange={(e) => setNewTypology({ ...newTypology, outer_width: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg p-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400">Floor Height (m)</label>
                    <input
                      type="number"
                      value={newTypology.floor_height}
                      onChange={(e) => setNewTypology({ ...newTypology, floor_height: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg p-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setIsCreatingTypology(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-surface-400 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTypology}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Creating..." : "Save Structure to DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE CALCULATION RULE MODAL ──────────────────────────────────── */}
      {isCreatingRule && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Code className="w-4 h-4 text-accent" />
                <span>Add Calculation Rule for {typologiesList.find(t => t.slug === selectedTypology)?.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingRule(false)}
                className="text-surface-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-surface-400 font-bold mb-1">Select DSR Schedule Item *</label>
                <select
                  value={newRule.item}
                  onChange={(e) => {
                    const selectedItem = ratesList.find(r => r.id === Number(e.target.value));
                    setNewRule({
                      ...newRule,
                      item: Number(e.target.value),
                      stage: selectedItem?.stage || newRule.stage,
                    });
                  }}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value={0}>-- Select DSR Item --</option>
                  {ratesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.item_code}] {r.description} — ₹{r.rate}/{r.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">Quantity Formula (Mathematical Expression) *</label>
                <input
                  type="text"
                  placeholder="e.g. perimeter * outer_wall_t * wall_height"
                  value={newRule.quantity_formula}
                  onChange={(e) => setNewRule({ ...newRule, quantity_formula: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 font-mono text-xs text-emerald-400 outline-none focus:border-accent"
                />
                <span className="text-[10px] text-surface-500 mt-1 block">
                  Available parameters: perimeter, floor_area, total_bua, outer_wall_t, inner_wall_t, wall_height, num_columns, excavation_depth
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Coefficient Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRule.coefficient}
                    onChange={(e) => setNewRule({ ...newRule, coefficient: parseFloat(e.target.value) || 1.0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Wastage Margin %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRule.waste_margin_percent}
                    onChange={(e) => setNewRule({ ...newRule, waste_margin_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setIsCreatingRule(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-surface-400 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRule}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Add Rule to DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RATE MODAL ─────────────────────────────────────────────────── */}
      {editingRate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-accent" />
                <span>Edit DSR Item: {editingRate.item_code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRate(null)}
                className="text-surface-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-surface-400 font-bold mb-1">Description</label>
                <textarea
                  value={editingRate.description}
                  onChange={(e) => setEditingRate({ ...editingRate, description: e.target.value })}
                  rows={3}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Rate in INR (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRate.rate}
                    onChange={(e) => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">State Multiplier</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingRate.state_multiplier}
                    onChange={(e) => setEditingRate({ ...editingRate, state_multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">IS / IRC Code Clause Ref</label>
                <input
                  type="text"
                  value={editingRate.is_code_ref || ""}
                  onChange={(e) => setEditingRate({ ...editingRate, is_code_ref: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setEditingRate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-surface-400 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRate}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save to DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RULE MODAL ─────────────────────────────────────────────────── */}
      {editingRule && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-100 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Code className="w-4 h-4 text-accent" />
                <span>Edit Calculation Formula: {editingRule.item_code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-surface-400 hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-surface-400 font-bold mb-1">Quantity Formula (Mathematical Expression)</label>
                <input
                  type="text"
                  value={editingRule.quantity_formula}
                  onChange={(e) => setEditingRule({ ...editingRule, quantity_formula: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 font-mono text-xs text-emerald-400 outline-none focus:border-accent"
                />
                <span className="text-[10px] text-surface-400 mt-1 block">
                  Available vars: perimeter, floor_area, total_bua, outer_wall_t, inner_wall_t, wall_height, num_columns, excavation_depth
                </span>
              </div>

              <div>
                <label className="block text-surface-400 font-bold mb-1">Deduction Formula (Optional)</label>
                <input
                  type="text"
                  value={editingRule.deduction_formula || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, deduction_formula: e.target.value })}
                  placeholder="e.g. (outer_door_count * outer_door_size) * outer_wall_t"
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 font-mono text-xs text-amber-400 outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-400 font-bold mb-1">Coefficient Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRule.coefficient}
                    onChange={(e) => setEditingRule({ ...editingRule, coefficient: parseFloat(e.target.value) || 1.0 })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-surface-400 font-bold mb-1">Condition Expression</label>
                  <input
                    type="text"
                    value={editingRule.condition_expression || ""}
                    onChange={(e) => setEditingRule({ ...editingRule, condition_expression: e.target.value })}
                    placeholder="e.g. soil_type == 'hard'"
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl p-2 font-mono text-xs text-purple-400 outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-surface-400 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Rule to DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
