"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct } from "@/domains/showroom/api";

const CATEGORIES = [
  "Furniture", "Lighting", "Finishes", "Fixtures",
  "Acoustics", "Outdoor", "Structural", "MEP", "Technology", "Soft Furnishings",
];

export function NewProductPageOriginal() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: CATEGORIES[0],
    subcategory: "",
    price_display: "",
    price_unit: "",
    cover_image_url: "",
    has_3d_model: false,
    has_bim_file: false,
    spec_sheet_url: "",
    lead_time_days: "",
    country_of_origin: "",
    status: "ACTIVE" as "ACTIVE" | "DRAFT",
    tags: [] as string[],
  });

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => set("tags", form.tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.lead_time_days) payload.lead_time_days = Number(form.lead_time_days);
      else delete payload.lead_time_days;
      await createProduct(payload as any);
      router.push("/showroom/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/showroom/dashboard" className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-primary mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Dashboard
      </Link>

      <h1 className="text-3xl font-black text-primary mb-8">New Product Listing</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Core Info ───────────────────────────────────────────── */}
        <section className="bg-surface-card border border-surface-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-surface-100 pb-3">Core Information</h2>

          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Product Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
              placeholder="e.g. Acoustic Wall Panel Series 7"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent resize-none"
              placeholder="Describe materials, applications, and key benefits..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Category *</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent bg-surface-card"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Subcategory</label>
              <input
                value={form.subcategory}
                onChange={(e) => set("subcategory", e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. Task Chairs"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className="flex-1 px-4 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                placeholder="Type tag + Enter"
              />
              <button type="button" onClick={addTag} className="px-4 py-2 bg-surface-100 text-surface-600 rounded-xl text-sm font-bold hover:bg-surface-200">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs font-bold bg-accent/10 text-accent border border-accent/20 px-3 py-1.5 rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-accent/60 hover:text-accent leading-none">×</button>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────── */}
        <section className="bg-surface-card border border-surface-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-surface-100 pb-3">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Price (Display)</label>
              <input
                value={form.price_display}
                onChange={(e) => set("price_display", e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. From ₹1,200 or POA"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Price Unit</label>
              <input
                value={form.price_unit}
                onChange={(e) => set("price_unit", e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. per sqm, per unit"
              />
            </div>
          </div>
        </section>

        {/* ── Media & Specs ───────────────────────────────────────── */}
        <section className="bg-surface-card border border-surface-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-surface-100 pb-3">Media & Specs</h2>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Cover Image URL</label>
            <input
              type="url"
              value={form.cover_image_url}
              onChange={(e) => set("cover_image_url", e.target.value)}
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Spec Sheet URL (PDF)</label>
            <input
              type="url"
              value={form.spec_sheet_url}
              onChange={(e) => set("spec_sheet_url", e.target.value)}
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${form.has_3d_model ? 'bg-accent border-accent' : 'border-surface-300 group-hover:border-accent'}`} onClick={() => set("has_3d_model", !form.has_3d_model)}>
                {form.has_3d_model && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-bold text-primary">3D Model Available</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${form.has_bim_file ? 'bg-primary border-primary' : 'border-surface-300 group-hover:border-primary'}`} onClick={() => set("has_bim_file", !form.has_bim_file)}>
                {form.has_bim_file && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-bold text-primary">BIM File Available</span>
            </label>
          </div>
        </section>

        {/* ── Logistics ───────────────────────────────────────────── */}
        <section className="bg-surface-card border border-surface-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-surface-100 pb-3">Logistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Lead Time (days)</label>
              <input
                type="number"
                min={1}
                value={form.lead_time_days}
                onChange={(e) => set("lead_time_days", e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. 14"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Country of Origin</label>
              <input
                value={form.country_of_origin}
                onChange={(e) => set("country_of_origin", e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. Italy"
              />
            </div>
          </div>
        </section>

        {/* ── Visibility ──────────────────────────────────────────── */}
        <section className="bg-surface-card border border-surface-200 rounded-2xl p-6">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-surface-100 pb-3 mb-4">Visibility</h2>
          <div className="flex gap-4">
            {(["ACTIVE", "DRAFT"] as const).map((s) => (
              <label key={s} className={`flex-1 border-2 rounded-xl p-4 cursor-pointer transition-all ${form.status === s ? 'border-primary bg-primary/5' : 'border-surface-200 hover:border-surface-300'}`}>
                <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => set("status", s)} className="sr-only" />
                <p className="font-bold text-primary text-sm">{s === "ACTIVE" ? "Publish Now" : "Save as Draft"}</p>
                <p className="text-xs text-surface-400 mt-1">{s === "ACTIVE" ? "Immediately visible to all buyers." : "Only you can see this."}</p>
              </label>
            ))}
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/showroom/dashboard" className="flex-1 py-3.5 text-center border border-surface-200 rounded-xl text-sm font-bold text-surface-600 hover:bg-surface-50 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !form.name}
            className="flex-1 py-3.5 bg-primary text-background rounded-xl text-sm font-bold hover:bg-accent transition-colors disabled:opacity-50 uppercase tracking-widest"
          >
            {saving ? "Publishing..." : form.status === "ACTIVE" ? "Publish Product" : "Save Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-accent/30">
        🚧
      </div>
      <h1 className="text-4xl font-black text-primary tracking-tight mb-4">NewProduct</h1>
      <p className="text-surface-500 font-medium max-w-md mb-8">
        We are actively building out this section of the architectural products marketplace. Check back soon for updates!
      </p>
      <div className="px-6 py-2 bg-surface-card border border-surface-200 rounded-full shadow-sm text-sm font-bold text-accent uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );
}
