"use client";

import React, { useState, useEffect } from "react";
import { X, Award, AlertCircle, Save, Globe, Phone, Mail, User, ShieldCheck } from "lucide-react";
import { MaterialBrandMaster, BrandQualityTier, MaterialCategory } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (brand: MaterialBrandMaster) => void;
  brandToEdit?: MaterialBrandMaster | null;
}

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: "CEMENT", label: "Cement & Binders" },
  { value: "SAND_AGGREGATE", label: "Sand & Aggregates" },
  { value: "STRUCTURAL", label: "Structural Steel & Rebar" },
  { value: "MASONRY", label: "Masonry (Bricks & Blocks)" },
  { value: "FINISHING", label: "Finishing (Tiles, Paints, Putty)" },
  { value: "WATERPROOFING", label: "Waterproofing & Chemicals" },
  { value: "MEP", label: "MEP (Pipes, Cables, Conduits)" },
  { value: "SAFETY", label: "Safety Equipment & PPE" },
  { value: "TOOLS", label: "Tools, Hardware & Formwork" },
  { value: "CONSUMABLE", label: "General Consumables" },
];

export const BrandFormModal: React.FC<BrandFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  brandToEdit,
}) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [originCountry, setOriginCountry] = useState("India");
  const [website, setWebsite] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [qualityTier, setQualityTier] = useState<BrandQualityTier>("PREMIUM");
  const [primaryCategory, setPrimaryCategory] = useState<string>("CEMENT");
  const [isApproved, setIsApproved] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(brandToEdit);

  useEffect(() => {
    if (brandToEdit) {
      setCode(brandToEdit.code || "");
      setName(brandToEdit.name || "");
      setOriginCountry(brandToEdit.origin_country || "India");
      setWebsite(brandToEdit.website || "");
      setContactPerson(brandToEdit.contact_person || "");
      setContactEmail(brandToEdit.contact_email || "");
      setContactPhone(brandToEdit.contact_phone || "");
      setQualityTier(brandToEdit.quality_tier || "PREMIUM");
      setPrimaryCategory(brandToEdit.primary_category || "CEMENT");
      setIsApproved(brandToEdit.is_approved !== false);
      setIsActive(brandToEdit.is_active !== false);
      setNotes(brandToEdit.notes || "");
    } else {
      setCode("");
      setName("");
      setOriginCountry("India");
      setWebsite("");
      setContactPerson("");
      setContactEmail("");
      setContactPhone("");
      setQualityTier("PREMIUM");
      setPrimaryCategory("CEMENT");
      setIsApproved(true);
      setIsActive(true);
      setNotes("");
    }
    setError(null);
  }, [brandToEdit, isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !code) {
      const generated = "BRD-" + val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      setCode(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Brand Name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Brand Code is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<MaterialBrandMaster> = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      origin_country: originCountry.trim(),
      website: website.trim(),
      contact_person: contactPerson.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
      quality_tier: qualityTier,
      primary_category: primaryCategory,
      is_approved: isApproved,
      is_active: isActive,
      notes: notes.trim(),
    };

    try {
      let result: MaterialBrandMaster;
      if (isEditing && brandToEdit) {
        result = await inventoryApi.updateBrand(brandToEdit.id, payload);
      } else {
        result = await inventoryApi.createBrand(payload);
      }
      onSaved(result);
      onClose();
    } catch (err: any) {
      console.error("Failed to save brand", err);
      setError(err?.message || "Failed to save brand. Ensure brand code is unique.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isEditing ? `Edit Brand: ${brandToEdit?.name}` : "Register Approved Brand / Manufacturer"}
              </h2>
              <p className="text-xs text-zinc-400">
                Define approved manufacturer brand specifications, quality tiers, and institutional contacts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Brand / Manufacturer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. UltraTech Cement, Tata Tiscon"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Brand Code (Unique) *</label>
              <input
                type="text"
                required
                placeholder="e.g. BRD-ULTRA, BRD-TATA"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Primary Material Category</label>
              <select
                value={primaryCategory}
                onChange={(e) => setPrimaryCategory(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Specification Quality Tier</label>
              <select
                value={qualityTier}
                onChange={(e) => setQualityTier(e.target.value as BrandQualityTier)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="PREMIUM">⭐ Premium Tier (Top Spec / Architectural Grade)</option>
                <option value="STANDARD">🔹 Standard Tier (Commercial Grade)</option>
                <option value="ECONOMY">🔸 Economy Tier (Budget Spec)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Origin Country</label>
              <input
                type="text"
                placeholder="e.g. India, Germany, Japan"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Official Website</label>
              <input
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <span className="text-zinc-300 font-semibold block text-[11px]">Institutional & Technical Contacts</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 text-[10px] mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Vipin Sharma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="spec@brand.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] mb-1">Toll-Free / Phone</label>
                <input
                  type="text"
                  placeholder="+91 1800..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Specification & Standards Compliance Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. IS 12269 certified, approved for seismic zones IV & V, GreenPro certified..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isApprovedCheck"
                checked={isApproved}
                onChange={(e) => setIsApproved(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="isApprovedCheck" className="text-zinc-300 font-semibold cursor-pointer flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Approved Manufacturer for Project BOQ Specs
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-[11px]">Active</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Register Brand"}
          </button>
        </div>
      </div>
    </div>
  );
};
