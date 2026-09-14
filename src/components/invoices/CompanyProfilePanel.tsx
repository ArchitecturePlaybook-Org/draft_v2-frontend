"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Building2, Camera, ChevronDown, ChevronUp, Save, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { companyProfileApi } from "@/domains/invoices/api";
import type { CompanyProfile } from "@/domains/invoices/types";

interface Props {
  onProfileLoaded?: (profile: CompanyProfile) => void;
}

export const CompanyProfilePanel: React.FC<Props> = ({ onProfileLoaded }) => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState({ name: "", address: "", email: "", phone: "", gst_number: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const p = await companyProfileApi.get();
      setProfile(p);
      setForm({
        name: p.name ?? "",
        address: p.address ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        gst_number: p.gst_number ?? "",
      });
      if (p.logo) setLogoPreview(p.logo);
      onProfileLoaded?.(p);
    } catch {}
  }, [onProfileLoaded]);

  useEffect(() => { load(); }, [load]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await companyProfileApi.patch({
        ...form,
        ...(logoFile ? { logo: logoFile } : {}),
      });
      setProfile(updated);
      if (updated.logo) setLogoPreview(updated.logo);
      setLogoFile(null);
      onProfileLoaded?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const set = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const isPopulated = !!profile?.name;

  return (
    <div className={`rounded-xl border transition-all shadow-xs ${
      isPopulated
        ? "border-emerald-500/30 bg-surface-card"
        : "border-amber-500/30 bg-surface-card"
    } mb-4`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isPopulated ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          }`}>
            {logoPreview ? (
              <img src={logoPreview} alt="logo" className="w-7 h-7 object-contain rounded" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-black text-foreground">
              {isPopulated ? profile?.name : "Set Up Your Company Profile"}
            </p>
            <p className="text-[10px] text-surface-400">
              {isPopulated
                ? `${profile?.address ?? ""} ${profile?.gst_number ? "· GSTIN: " + profile.gst_number : ""}`.trim() || "Click to edit"
                : "Company name, address & logo appear on all invoices — set this once"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPopulated && (
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Required
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
        </div>
      </button>

      {/* Expanded form */}
      {open && (
        <div className="px-4 pb-4 border-t border-surface-200 pt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
            </div>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
            {/* Logo upload */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-700 flex flex-col items-center justify-center gap-1 text-surface-400 hover:border-accent hover:text-accent transition-colors overflow-hidden bg-surface-50 dark:bg-surface-800"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] font-semibold">Logo</span>
                  </>
                )}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                  className="mt-1 text-[9px] text-red-500 hover:text-red-400 w-full text-center"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Company Name *", field: "name", span: true },
                { label: "Address", field: "address", span: true, textarea: true },
                { label: "Email", field: "email" },
                { label: "Phone", field: "phone" },
                { label: "GSTIN", field: "gst_number" },
              ].map(({ label, field, span, textarea }) => (
                <div key={field} className={span ? "col-span-2" : ""}>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-surface-400 mb-0.5">{label}</label>
                  {textarea ? (
                    <textarea
                      value={form[field as keyof typeof form]}
                      onChange={e => set(field, e.target.value)}
                      rows={2}
                      className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent transition-colors resize-none"
                    />
                  ) : (
                    <input
                      value={form[field as keyof typeof form]}
                      onChange={e => set(field, e.target.value)}
                      className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:opacity-90 text-background text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-accent/20 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? "Saved!" : "Save Profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
