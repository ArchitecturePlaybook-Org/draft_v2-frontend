"use client";

import React, { useState, useEffect } from "react";
import { 
  type Product, 
  type ProductStatus, 
  createProduct, 
  updateProduct,
  uploadShowroomFile
} from "@/domains/showroom/api";
import { toast } from "sonner";

interface VendorProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: () => void;
}

interface MediaUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  fileType: "cover" | "3d" | "bim" | "spec_sheet";
  accept: string;
  hint: string;
}

function MediaUploader({ label, value, onChange, fileType, accept, hint }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadShowroomFile(file, fileType);
      onChange(res.url);
      toast.success(`Uploaded '${file.name}' to storage!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file to storage.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5 p-3 bg-surface-card border border-surface-200 dark:border-surface-700/80 rounded-xl">
      <div className="flex items-center justify-between">
        <label className="font-extrabold text-primary text-xs">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
          >
            Remove File ✕
          </button>
        )}
      </div>

      {value ? (
        <div className="flex items-center gap-2 p-2 bg-surface-100 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 text-xs">
          {fileType === "cover" && (
            <img src={value} alt="Preview" className="w-9 h-9 object-cover rounded-md border border-surface-300 shadow-2xs shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-primary truncate text-[11px]">{value}</p>
            <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Stored in Media Database</p>
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-surface-card border border-surface-200 dark:border-surface-700 rounded text-[10px] font-bold text-accent hover:underline shrink-0"
          >
            Preview ↗
          </a>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-accent rounded-xl cursor-pointer bg-surface-100/40 dark:bg-surface-900/30 transition-colors group">
          {uploading ? (
            <div className="flex items-center gap-2 py-1 text-xs font-bold text-accent">
              <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span>Uploading File to Storage...</span>
            </div>
          ) : (
            <div className="text-center space-y-0.5">
              <span className="text-base block group-hover:scale-110 transition-transform">
                {fileType === "cover" ? "🖼️" : fileType === "3d" ? "📦" : fileType === "bim" ? "📐" : "📄"}
              </span>
              <p className="text-[11px] font-black text-primary">Click to Upload File to Storage</p>
              <p className="text-[9px] text-surface-400 font-semibold">{hint}</p>
            </div>
          )}
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

const CATEGORIES = [
  "Furniture",
  "Lighting",
  "Finishes",
  "Fixtures",
  "Acoustics",
  "Outdoor",
  "Structural",
  "MEP",
  "Technology",
  "Soft Furnishings",
];

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "ACTIVE", label: "🟢 Active (Public Showroom)" },
  { value: "DRAFT", label: "✏️ Draft (Hidden)" },
  { value: "PAUSED", label: "⏸️ Paused (Temporarily Unavailable)" },
  { value: "SOLD_OUT", label: "🔴 Sold Out" },
];

export function VendorProductModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: VendorProductModalProps) {
  const isEditing = Boolean(product && product.id);

  const [formData, setFormData] = useState({
    name: "",
    category: "Furniture",
    subcategory: "",
    description: "",
    tagsInput: "",
    price_display: "",
    price_min: "",
    price_max: "",
    price_unit: "per unit",
    cover_image_url: "",
    has_3d_model: false,
    model_3d_url: "",
    has_bim_file: false,
    bim_file_url: "",
    spec_sheet_url: "",
    lead_time_days: "14",
    country_of_origin: "",
    status: "ACTIVE" as ProductStatus,
    is_featured: false,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "Furniture",
        subcategory: product.subcategory || "",
        description: product.description || "",
        tagsInput: Array.isArray(product.tags) ? product.tags.join(", ") : "",
        price_display: product.price_display || "",
        price_min: product.price_min ? String(product.price_min) : "",
        price_max: product.price_max ? String(product.price_max) : "",
        price_unit: product.price_unit || "per unit",
        cover_image_url: product.cover_image_url || "",
        has_3d_model: Boolean(product.has_3d_model),
        model_3d_url: product.model_3d_url || "",
        has_bim_file: Boolean(product.has_bim_file),
        bim_file_url: product.bim_file_url || "",
        spec_sheet_url: product.spec_sheet_url || "",
        lead_time_days: product.lead_time_days ? String(product.lead_time_days) : "14",
        country_of_origin: product.country_of_origin || "",
        status: product.status || "ACTIVE",
        is_featured: Boolean(product.is_featured),
      });
    } else {
      setFormData({
        name: "",
        category: "Furniture",
        subcategory: "",
        description: "",
        tagsInput: "",
        price_display: "",
        price_min: "",
        price_max: "",
        price_unit: "per unit",
        cover_image_url: "",
        has_3d_model: false,
        model_3d_url: "",
        has_bim_file: false,
        bim_file_url: "",
        spec_sheet_url: "",
        lead_time_days: "14",
        country_of_origin: "",
        status: "ACTIVE",
        is_featured: false,
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product name is required.");
      return;
    }

    setSaving(true);
    try {
      const tags = formData.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Partial<Product> = {
        name: formData.name.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim(),
        description: formData.description.trim(),
        tags,
        price_display: formData.price_display.trim(),
        price_min: formData.price_min ? String(parseFloat(formData.price_min)) : null,
        price_max: formData.price_max ? String(parseFloat(formData.price_max)) : null,
        price_unit: formData.price_unit,
        cover_image_url: formData.cover_image_url.trim(),
        has_3d_model: formData.has_3d_model,
        model_3d_url: formData.model_3d_url.trim(),
        has_bim_file: formData.has_bim_file,
        bim_file_url: formData.bim_file_url.trim(),
        spec_sheet_url: formData.spec_sheet_url.trim(),
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days, 10) : null,
        country_of_origin: formData.country_of_origin.trim(),
        status: formData.status,
        is_featured: formData.is_featured,
      };

      if (isEditing && product?.id) {
        await updateProduct(product.id, payload);
        toast.success(`Product listing '${formData.name}' updated!`);
      } else {
        await createProduct(payload);
        toast.success(`New product listing '${formData.name}' created!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-sm border border-accent/30 shadow-2xs">
              {isEditing ? "✏️" : "➕"}
            </div>
            <div>
              <h2 className="text-sm font-black text-primary tracking-tight">
                {isEditing ? `Edit Product Listing (#${product?.id})` : "Create New Showroom Listing"}
              </h2>
              <p className="text-[11px] font-medium text-surface-400">
                List architectural materials, furniture, or fixtures in the public catalog
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-3 p-3.5 bg-surface-100/40 dark:bg-surface-900/30 border border-surface-200/60 dark:border-surface-800 rounded-xl">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
              <span>📋</span> Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-extrabold text-primary">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Italian Carrera Marble Tile 60x60"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-primary">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-primary">Subcategory</label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="e.g. Natural Stone Floor Tiles"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-extrabold text-primary">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe material specifications, finish options, and architectural use cases..."
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl p-2.5 font-medium outline-none focus:border-accent text-primary leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-extrabold text-primary">Search Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.tagsInput}
                  onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                  placeholder="e.g. Marble, Natural Stone, Flooring, Luxury, Custom"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Units */}
          <div className="space-y-3 p-3.5 bg-surface-100/40 dark:bg-surface-900/30 border border-surface-200/60 dark:border-surface-800 rounded-xl">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
              <span>💰</span> Pricing &amp; Units
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-primary">Display Price Text</label>
                <input
                  type="text"
                  value={formData.price_display}
                  onChange={(e) => setFormData({ ...formData, price_display: e.target.value })}
                  placeholder="e.g. ₹1,200 per sqm or POA"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-primary">Min Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_min}
                  onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                  placeholder="1200.00"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-primary">Price Unit</label>
                <select
                  value={formData.price_unit}
                  onChange={(e) => setFormData({ ...formData, price_unit: e.target.value })}
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                >
                  <option value="per unit">per unit</option>
                  <option value="per sqm">per sqm</option>
                  <option value="per sqft">per sqft</option>
                  <option value="per set">per set</option>
                  <option value="per lot">per lot</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Technical Assets & File Uploads (S3 & Media Storage) */}
          <div className="space-y-3 p-3.5 bg-surface-100/40 dark:bg-surface-900/30 border border-surface-200/60 dark:border-surface-800 rounded-xl">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
              <span>🖼️</span> Media &amp; CAD/3D File Storage (S3 / DB)
            </h3>

            <div className="space-y-3">
              {/* Cover Image Upload */}
              <MediaUploader
                label="Cover Image *"
                value={formData.cover_image_url}
                onChange={(url) => setFormData({ ...formData, cover_image_url: url })}
                fileType="cover"
                accept="image/*"
                hint="PNG, JPG, WEBP (Max 10MB)"
              />

              {/* 3D Model & BIM Upload Checkboxes & Dropzones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 3D Model */}
                <div className="space-y-2 p-2.5 bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-primary">
                    <input
                      type="checkbox"
                      checked={formData.has_3d_model}
                      onChange={(e) => setFormData({ ...formData, has_3d_model: e.target.checked })}
                      className="rounded accent-accent"
                    />
                    <span>Include 3D Model Asset</span>
                  </label>
                  {formData.has_3d_model && (
                    <MediaUploader
                      label="Upload 3D File (.gltf, .glb)"
                      value={formData.model_3d_url}
                      onChange={(url) => setFormData({ ...formData, model_3d_url: url })}
                      fileType="3d"
                      accept=".gltf,.glb,.obj,.zip"
                      hint="GLTF, GLB 3D files (Max 100MB)"
                    />
                  )}
                </div>

                {/* BIM File */}
                <div className="space-y-2 p-2.5 bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-primary">
                    <input
                      type="checkbox"
                      checked={formData.has_bim_file}
                      onChange={(e) => setFormData({ ...formData, has_bim_file: e.target.checked })}
                      className="rounded accent-accent"
                    />
                    <span>Include BIM / CAD File</span>
                  </label>
                  {formData.has_bim_file && (
                    <MediaUploader
                      label="Upload BIM File (.rvt, .ifc, .dwg)"
                      value={formData.bim_file_url}
                      onChange={(url) => setFormData({ ...formData, bim_file_url: url })}
                      fileType="bim"
                      accept=".rvt,.ifc,.dwg,.dxf,.zip"
                      hint="Revit RVT, IFC, DWG files (Max 100MB)"
                    />
                  )}
                </div>
              </div>

              {/* Technical Spec Sheet PDF Upload */}
              <MediaUploader
                label="Technical Spec Sheet (PDF Document)"
                value={formData.spec_sheet_url}
                onChange={(url) => setFormData({ ...formData, spec_sheet_url: url })}
                fileType="spec_sheet"
                accept=".pdf"
                hint="Official Data Sheet PDF Document (Max 25MB)"
              />
            </div>
          </div>

          {/* Section 4: Status & Logistics */}
          <div className="space-y-3 p-3.5 bg-surface-100/40 dark:bg-surface-900/30 border border-surface-200/60 dark:border-surface-800 rounded-xl">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
              <span>⚙️</span> Visibility &amp; Logistics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-primary">Listing Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-primary">Lead Time (Days)</label>
                <input
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                  placeholder="14"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-primary">Country of Origin</label>
                <input
                  type="text"
                  value={formData.country_of_origin}
                  onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                  placeholder="e.g. Italy, India, Germany"
                  className="w-full bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5 font-medium outline-none focus:border-accent text-primary"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-200/60 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 font-extrabold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-accent text-background font-black rounded-xl hover:opacity-95 transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
              ) : (
                <span>{isEditing ? "Save Changes →" : "Create Product →"}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
