"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Send, Loader2, Import, AlertCircle, CheckCircle, Palette, X, Eye,
} from "lucide-react";
import { invoicesApi, companyProfileApi } from "@/domains/invoices/api";
import { projectsApi } from "@/domains/projects/api";
import type {
  CreateInvoicePayload, UpdateInvoicePayload, GSTType, BOQImportItem,
  CompanyProfile, InvoiceTemplate, Invoice,
} from "@/domains/invoices/types";
import { GST_TYPE_LABELS } from "@/domains/invoices/types";
import {
  InvoiceLineItemsEditor,
  type LineItem,
  newItem,
  computeLineItemTotals,
} from "@/components/invoices/InvoiceLineItemsEditor";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { InvoiceTemplatePicker } from "@/components/invoices/InvoiceTemplatePicker";

export interface InvoiceEditorFormProps {
  mode: "create" | "edit";
  projectUid: string;
  initialInvoice?: Invoice;
  onSaveSuccess?: (invoice: Invoice) => void;
  onCancel?: () => void;
}

type FormData = {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  subject: string;
  issue_date: string;
  due_date: string;
  gst_type: GSTType;
  discount_amount: string;
  notes: string;
  payment_terms: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  account_holder: string;
  upi_id: string;
};

const today = () => new Date().toISOString().split("T")[0];
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

function invoiceToFormData(inv: Invoice): FormData {
  const bd = inv.bank_details ?? {};
  return {
    client_name: inv.client_name || "",
    client_email: inv.client_email || "",
    client_phone: inv.client_phone || "",
    client_address: inv.client_address || "",
    subject: inv.subject || "",
    issue_date: inv.issue_date || today(),
    due_date: inv.due_date || "",
    gst_type: inv.gst_type || "CGST_SGST",
    discount_amount: String(inv.discount_amount || 0),
    notes: inv.notes || "",
    payment_terms: inv.payment_terms || "Payment due within 30 days of invoice date.",
    bank_name: (bd.bank_name as string) || "",
    account_number: (bd.account_number as string) || "",
    ifsc_code: (bd.ifsc_code as string) || "",
    branch: (bd.branch as string) || "",
    account_holder: (bd.account_holder as string) || "",
    upi_id: (bd.upi_id as string) || "",
  };
}

export const InvoiceEditorForm: React.FC<InvoiceEditorFormProps> = ({
  mode,
  projectUid,
  initialInvoice,
  onSaveSuccess,
  onCancel,
}) => {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(() => {
    if (initialInvoice) {
      return invoiceToFormData(initialInvoice);
    }
    return {
      client_name: "", client_email: "", client_phone: "", client_address: "",
      subject: "", issue_date: today(), due_date: in30Days(),
      gst_type: "CGST_SGST", discount_amount: "0", notes: "",
      payment_terms: "Payment due within 30 days of invoice date.",
      bank_name: "", account_number: "", ifsc_code: "", branch: "", account_holder: "", upi_id: "",
    };
  });

  const [items, setItems] = useState<LineItem[]>(() => {
    if (initialInvoice && initialInvoice.items?.length) {
      return initialInvoice.items.map(item => ({
        _key: `item-${item.id}-${Math.random()}`,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        tax_rate: item.tax_rate,
      }));
    }
    return [newItem()];
  });

  const [template, setTemplate] = useState<InvoiceTemplate>(() => {
    return (initialInvoice?.template as InvoiceTemplate) ?? "classic";
  });

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(initialInvoice?.project ?? null);
  const [boqLoading, setBOQLoading] = useState(false);
  const [boqImported, setBOQImported] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [projectInfo, setProjectInfo] = useState<{ title?: string; project_code?: string; location?: string } | null>(null);

  // Load project details & company profile
  useEffect(() => {
    if (!projectUid) return;
    projectsApi.getProjectDetails(projectUid).then((proj: any) => {
      if (proj) {
        setProjectId(proj.id);
        setProjectInfo({
          title: proj.title,
          project_code: proj.project_code,
          location: proj.location,
        });
        if (mode === "create") {
          setForm(f => ({
            ...f,
            client_name: f.client_name || proj.client_name || "",
            client_email: f.client_email || proj.client_email || "",
            client_phone: f.client_phone || proj.client_phone || "",
          }));
        }
      }
    }).catch(() => {});

    companyProfileApi.get().then(setProfile).catch(() => {});
  }, [projectUid, mode]);

  const set = useCallback((field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  const importFromBOQ = async () => {
    setBOQLoading(true);
    try {
      const boqItems: BOQImportItem[] = await invoicesApi.getBOQItems(projectUid);
      if (boqItems.length > 0) {
        const mapped: LineItem[] = boqItems.map(b => ({
          _key: `boq-${Date.now()}-${Math.random()}`,
          description: b.description, unit: b.unit,
          quantity: b.quantity, unit_rate: b.unit_rate, tax_rate: b.tax_rate,
        }));
        setItems(mapped);
        setBOQImported(true);
      }
    } catch {}
    setBOQLoading(false);
  };

  const handleSave = async (asDraft = true) => {
    if (mode === "create" && !projectId) {
      setError("Project not loaded yet.");
      return;
    }
    if (!form.client_name.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!form.issue_date) {
      setError("Issue date is required.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);

    const itemsPayload = items.map((item, idx) => ({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      tax_rate: item.tax_rate,
      sort_order: idx,
    }));

    try {
      if (mode === "create") {
        const payload: CreateInvoicePayload = {
          project: projectId!,
          status: asDraft ? "DRAFT" : "SENT",
          issue_date: form.issue_date,
          due_date: form.due_date || null,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          client_address: form.client_address,
          gst_type: form.gst_type,
          subject: form.subject,
          discount_amount: parseFloat(form.discount_amount) || 0,
          notes: form.notes,
          payment_terms: form.payment_terms,
          template,
          bank_details: {
            bank_name: form.bank_name, account_number: form.account_number,
            ifsc_code: form.ifsc_code, branch: form.branch,
            account_holder: form.account_holder, upi_id: form.upi_id,
          },
          items: itemsPayload,
        };

        const created = await invoicesApi.create(payload);
        if (onSaveSuccess) {
          onSaveSuccess(created);
        } else {
          router.push(`/dashboard/projects/${projectUid}/invoices/${created.id}`);
        }
      } else if (mode === "edit" && initialInvoice) {
        const payload: UpdateInvoicePayload = {
          issue_date: form.issue_date,
          due_date: form.due_date || null,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          client_address: form.client_address,
          gst_type: form.gst_type,
          subject: form.subject,
          discount_amount: parseFloat(form.discount_amount) || 0,
          notes: form.notes,
          payment_terms: form.payment_terms,
          template,
          bank_details: {
            bank_name: form.bank_name, account_number: form.account_number,
            ifsc_code: form.ifsc_code, branch: form.branch,
            account_holder: form.account_holder, upi_id: form.upi_id,
          },
          items: itemsPayload,
        };

        const updated = await invoicesApi.update(initialInvoice.id, payload);
        setSaved(true);
        if (onSaveSuccess) {
          onSaveSuccess(updated);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, taxTotal, grandTotal } = computeLineItemTotals(items);

  const previewInvoice: Invoice = {
    id: initialInvoice?.id ?? 0,
    invoice_number: initialInvoice?.invoice_number ?? "INV-PREVIEW",
    status: initialInvoice?.status ?? "DRAFT",
    client_name: form.client_name || "Client Name",
    client_email: form.client_email,
    client_phone: form.client_phone,
    client_address: form.client_address,
    issue_date: form.issue_date,
    due_date: form.due_date || null,
    gst_type: form.gst_type,
    subject: form.subject,
    discount_amount: parseFloat(form.discount_amount) || 0,
    notes: form.notes,
    payment_terms: form.payment_terms,
    bank_details: {
      bank_name: form.bank_name, account_number: form.account_number,
      ifsc_code: form.ifsc_code, branch: form.branch,
      account_holder: form.account_holder, upi_id: form.upi_id,
    },
    subtotal,
    tax_amount: taxTotal,
    total_amount: grandTotal,
    items: items.map((item, idx) => ({
      id: idx,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      amount: item.quantity * item.unit_rate,
      tax_rate: item.tax_rate,
      tax_amount: item.quantity * item.unit_rate * (item.tax_rate / 100),
      sort_order: idx,
    })),
    tax_lines: [],
    currency: "INR",
    sent_at: initialInvoice?.sent_at ?? null,
    paid_at: initialInvoice?.paid_at ?? null,
    created_at: initialInvoice?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: projectId ?? 0,
    account: initialInvoice?.account ?? 0,
    template,
  };

  const TEMPLATE_NAMES: Record<InvoiceTemplate, string> = {
    classic: "Ledger",
    modern: "Studio",
    minimal: "Editorial",
  };

  const Field = ({
    label, field, type = "text", placeholder = "", required = false,
  }: {
    label: string; field: keyof FormData; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-50 border border-surface-200 text-foreground placeholder:text-surface-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
      />
    </div>
  );

  const Textarea = ({
    label, field, placeholder = "", rows = 3,
  }: {
    label: string; field: keyof FormData; placeholder?: string; rows?: number;
  }) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">{label}</label>
      <textarea
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-surface-50 border border-surface-200 text-foreground placeholder:text-surface-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors resize-none"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-30 bg-surface-card/90 backdrop-blur-xl border-b border-surface-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors"
              title="Cancel editing"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={`/dashboard/projects/${projectUid}/invoices`}
              className="p-1.5 rounded-lg text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className="text-base font-black text-foreground">
              {mode === "create" ? "New Invoice" : `Edit Invoice ${initialInvoice?.invoice_number || ""}`}
            </h1>
            <p className="text-[10px] text-surface-400">
              {mode === "create"
                ? "Draft a professional architectural invoice with real-time live preview"
                : "Update line items, pricing, notes, and layout styles"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Switcher button */}
          <button
            type="button"
            onClick={() => setShowTemplatePicker(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-xs font-semibold text-foreground hover:bg-surface-100 transition-colors shadow-xs"
          >
            <Palette className="w-3.5 h-3.5 text-accent" />
            <span>{TEMPLATE_NAMES[template]}</span>
          </button>

          {mode === "create" ? (
            <>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-100 border border-surface-200 text-xs font-bold text-foreground hover:bg-surface-200 transition-colors disabled:opacity-50 shadow-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:opacity-90 text-background text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-accent/20"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-background" /> : <Send className="w-3.5 h-3.5" />}
                Create &amp; Send
              </button>
            </>
          ) : (
            <>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-xs font-bold text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors shadow-xs"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving || saved}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:opacity-90 text-background text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-accent/20"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-background" /> : saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Template picker dropdown */}
      {showTemplatePicker && (
        <div className="mx-6 mt-3 bg-surface-card border border-surface-200 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-wider text-surface-400">Choose Invoice Template</p>
            <button type="button" onClick={() => setShowTemplatePicker(false)}>
              <X className="w-3.5 h-3.5 text-surface-400 hover:text-foreground" />
            </button>
          </div>
          <InvoiceTemplatePicker selected={template} onChange={t => { setTemplate(t); setShowTemplatePicker(false); }} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 flex items-center justify-between gap-2 bg-red-500/10 border border-red-500/25 text-red-500 px-4 py-2.5 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Two-Column Split Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6 max-w-[1700px] mx-auto">
        {/* ── Left Column: Form Cards ── */}
        <div className="space-y-5 overflow-y-auto">
          {/* Client Information */}
          <section className="bg-surface-card rounded-xl border border-surface-200 p-5 shadow-xs">
            <h2 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Client Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Name" field="client_name" placeholder="e.g. Ramesh Builders" required />
              <Field label="Client Email" field="client_email" type="email" placeholder="client@email.com" />
              <Field label="Client Phone" field="client_phone" placeholder="+91 98765 43210" />
              <div className="col-span-2">
                <Textarea label="Client Address" field="client_address" placeholder="Billing address…" rows={2} />
              </div>
            </div>
          </section>

          {/* Invoice Details */}
          <section className="bg-surface-card rounded-xl border border-surface-200 p-5 shadow-xs">
            <h2 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Issue Date" field="issue_date" type="date" required />
              <Field label="Due Date" field="due_date" type="date" />
              <div className="col-span-2">
                <Field label="Subject / Work Description" field="subject" placeholder="e.g. Structural Work — Phase 2" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">GST Type</label>
                <select
                  value={form.gst_type}
                  onChange={e => set("gst_type", e.target.value as GSTType)}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                >
                  {(Object.entries(GST_TYPE_LABELS) as [GSTType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <Field label="Discount (₹)" field="discount_amount" type="number" placeholder="0" />
            </div>
          </section>

          {/* Line Items */}
          <section className="bg-surface-card rounded-xl border border-surface-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-surface-400">Line Items</h2>
              <button
                type="button"
                onClick={importFromBOQ}
                disabled={boqLoading || boqImported}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  boqImported
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "border-accent/40 text-accent hover:bg-accent/10"
                } disabled:opacity-50`}
              >
                {boqLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : boqImported ? <CheckCircle className="w-3.5 h-3.5" /> : <Import className="w-3.5 h-3.5" />}
                {boqImported ? "BOQ Imported" : "Import from BOQ"}
              </button>
            </div>
            <InvoiceLineItemsEditor items={items} onChange={setItems} defaultTaxRate={18} />
          </section>

          {/* Notes & Terms */}
          <section className="bg-surface-card rounded-xl border border-surface-200 p-5 shadow-xs">
            <h2 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Notes &amp; Terms</h2>
            <div className="space-y-3">
              <Textarea label="Notes" field="notes" placeholder="e.g. Price exclusive of material escalation charges…" />
              <Textarea label="Payment Terms" field="payment_terms" placeholder="e.g. Payment due within 30 days…" rows={2} />
            </div>
          </section>

          {/* Bank Details */}
          <section className="bg-surface-card rounded-xl border border-surface-200 p-5 shadow-xs">
            <h2 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Bank Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank Name" field="bank_name" placeholder="e.g. State Bank of India" />
              <Field label="Account Holder" field="account_holder" placeholder="Name on account" />
              <Field label="Account Number" field="account_number" placeholder="XXXXXXXX" />
              <Field label="IFSC Code" field="ifsc_code" placeholder="SBIN0XXXXXX" />
              <Field label="Branch" field="branch" placeholder="Branch name" />
              <Field label="UPI ID" field="upi_id" placeholder="name@upi" />
            </div>
          </section>
        </div>

        {/* ── Right Column: Live Sticky Preview (Drafting Mat) ── */}
        <div className="sticky top-16 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="bg-surface-card border border-surface-200 rounded-xl p-4 shadow-sm flex flex-col h-full">
            <div className="mb-3 flex items-center justify-between pb-2 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                <span className="text-xs font-black uppercase tracking-wider text-foreground">Live Document Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-100 text-surface-400 border border-surface-200">
                  A4 · 210×297mm
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-100 text-surface-400 border border-surface-200">
                  {TEMPLATE_NAMES[template]}
                </span>
              </div>
            </div>

            {/* Architectural Drafting Mat Area */}
            <div className="flex-1 bg-surface-100/40 border border-surface-200/80 rounded-lg p-4 overflow-y-auto flex justify-center items-start shadow-inner">
              <div className="w-full max-w-2xl shadow-2xl rounded-sm">
                <InvoicePreview
                  invoice={previewInvoice}
                  template={template}
                  isDraft={previewInvoice.status === "DRAFT"}
                  companyName={profile?.name}
                  companyAddress={profile?.address ?? undefined}
                  companyEmail={profile?.email ?? undefined}
                  companyPhone={profile?.phone ?? undefined}
                  companyGST={profile?.gst_number}
                  companyLogoUrl={profile?.logo ?? undefined}
                  projectTitle={projectInfo?.title}
                  projectCode={projectInfo?.project_code}
                  projectLocation={projectInfo?.location}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
