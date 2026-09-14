"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, CheckCircle, XCircle,
  Loader2, AlertCircle, Edit3, X, Printer, Palette, Check, Copy, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { invoicesApi, companyProfileApi } from "@/domains/invoices/api";
import { projectsApi } from "@/domains/projects/api";
import type { Invoice, CompanyProfile, InvoiceTemplate, InvoiceStatus } from "@/domains/invoices/types";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { InvoiceTransitionConfirmModal } from "@/components/invoices/InvoiceTransitionConfirmModal";
import { InvoiceEditorForm } from "@/components/invoices/InvoiceEditorForm";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));
}

function fmtINR(v: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

type ActionState = "idle" | "loading" | "error";

export default function InvoiceDetailPage() {
  const params = useParams();
  const projectUid = params.id as string;
  const invoiceId = parseInt(params.invoiceId as string, 10);
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate>("classic");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [projectInfo, setProjectInfo] = useState<{ title?: string; project_code?: string; location?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, prof, proj] = await Promise.all([
        invoicesApi.get(invoiceId),
        companyProfileApi.get().catch(() => null),
        projectsApi.getProjectDetails(projectUid).catch(() => null),
      ]);
      setInvoice(data);
      if (data.template) {
        setCurrentTemplate(data.template as InvoiceTemplate);
      }
      if (prof) setProfile(prof);
      if (proj) {
        setProjectInfo({
          title: proj.title,
          project_code: proj.project_code,
          location: proj.location,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, projectUid]);

  useEffect(() => { load(); }, [load]);

  const [pendingTarget, setPendingTarget] = useState<InvoiceStatus | null>(null);

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionState("loading");
    setActionError(null);
    try {
      await fn();
      await load();
      setActionState("idle");
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Action failed");
      setActionState("error");
    }
  };

  const handleConfirmTransition = async () => {
    if (!pendingTarget) return;
    const target = pendingTarget;
    setPendingTarget(null);
    if (target === "SENT") await runAction(() => invoicesApi.markSent(invoiceId));
    else if (target === "PAID") await runAction(() => invoicesApi.markPaid(invoiceId));
    else if (target === "OVERDUE") await runAction(() => invoicesApi.markOverdue(invoiceId));
    else if (target === "CANCELLED") await runAction(() => invoicesApi.markCancelled(invoiceId));
  };

  const handleCancelTransition = () => {
    setPendingTarget(null);
  };

  const handleMarkSent = () => setPendingTarget("SENT");
  const handleMarkPaid = () => setPendingTarget("PAID");
  const handleMarkOverdue = () => setPendingTarget("OVERDUE");
  const handleMarkCancelled = () => setPendingTarget("CANCELLED");

  const handleDuplicate = async () => {
    if (!invoice) return;
    setActionState("loading");
    try {
      const cloned = await invoicesApi.duplicate(invoice.id);
      router.push(`/dashboard/projects/${projectUid}/invoices/${cloned.id}/edit`);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Duplication failed");
      setActionState("idle");
    }
  };

  const handleTemplateChange = async (newT: InvoiceTemplate) => {
    setCurrentTemplate(newT);
    setTemplateSaving(true);
    try {
      await invoicesApi.updateTemplate(invoiceId, newT);
      if (invoice) {
        setInvoice({ ...invoice, template: newT });
      }
    } catch {
      // Non-critical, state already updated locally
    } finally {
      setTemplateSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-red-500">
        <AlertCircle className="w-10 h-10" />
        <p className="font-bold">{error || "Invoice not found"}</p>
        <Link href={`/dashboard/projects/${projectUid}/invoices`} className="text-xs text-accent hover:underline">
          ← Back to Invoices
        </Link>
      </div>
    );
  }

  // If in Edit Mode, render the two-column split layout via InvoiceEditorForm
  if (isEditing) {
    return (
      <InvoiceEditorForm
        mode="edit"
        projectUid={projectUid}
        initialInvoice={invoice}
        onSaveSuccess={(updated) => {
          setInvoice(updated);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const canMarkSent = invoice.status === "DRAFT";
  const canMarkPaid = invoice.status === "SENT" || invoice.status === "OVERDUE";
  const canCancel = invoice.status !== "PAID" && invoice.status !== "CANCELLED";
  const canEdit = invoice.status !== "PAID" && invoice.status !== "CANCELLED";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <InvoiceTransitionConfirmModal
        open={pendingTarget !== null}
        invoice={invoice}
        targetStatus={pendingTarget}
        loading={actionState === "loading"}
        onConfirm={handleConfirmTransition}
        onCancel={handleCancelTransition}
      />

      {/* ── Top Bar ── */}
      <div className="no-print sticky top-0 z-30 bg-surface-card/90 backdrop-blur-xl border-b border-surface-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectUid}/invoices`}
            className="p-1.5 rounded-lg text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-foreground font-mono">{invoice.invoice_number}</h1>
            <InvoiceStatusBadge status={invoice.status} pulse />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Duplicate Button */}
          <button
            onClick={handleDuplicate}
            disabled={actionState === "loading"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-xs font-bold text-foreground hover:bg-surface-100 transition-colors shadow-xs"
            title="Duplicate as new draft"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-xs font-bold text-foreground hover:bg-surface-100 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          {/* Edit Button (Toggles two-column Edit Mode) */}
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:opacity-90 text-background text-xs font-bold transition-all shadow-md shadow-accent/20"
            >
              <Edit3 className="w-3.5 h-3.5 text-background" />
              Edit Invoice
            </button>
          )}

          {/* Mark Overdue */}
          {invoice.status === "SENT" && (
            <button
              onClick={handleMarkOverdue}
              disabled={actionState === "loading"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-colors shadow-xs"
              title="Move to Overdue"
            >
              <Clock className="w-3.5 h-3.5" />
              Mark Overdue
            </button>
          )}

          {/* Mark as Sent */}
          {canMarkSent && (
            <button
              onClick={handleMarkSent}
              disabled={actionState === "loading"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {actionState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Mark Sent
            </button>
          )}

          {/* Mark as Paid */}
          {canMarkPaid && (
            <button
              onClick={handleMarkPaid}
              disabled={actionState === "loading"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-md shadow-emerald-500/20"
            >
              {actionState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Mark Paid
            </button>
          )}

          {/* Cancel */}
          {canCancel && (
            <button
              onClick={handleMarkCancelled}
              disabled={actionState === "loading"}
              className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Cancel Invoice"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Action Error Banner ── */}
      {actionError && (
        <div className="no-print mx-6 mt-4 flex items-center justify-between gap-2 bg-red-500/10 border border-red-500/25 text-red-500 px-4 py-2.5 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
          <button onClick={() => setActionError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── View Mode: ONLY the Invoice Preview mounted on a clean Drafting Mat ── */}
      <div className="p-6 max-w-4xl mx-auto print-layout print:p-0 print:m-0 print:max-w-none print:w-full">
        {/* 1-Click Interactive Template Switcher Bar */}
        <div className="no-print flex items-center justify-between bg-surface-card border border-surface-200 rounded-xl px-4 py-2.5 mb-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-foreground">Select Template:</span>
              {templateSaving && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
            </div>
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-100 text-surface-400 border border-surface-200">
              A4 Sheet · 210 × 297 mm
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "classic", label: "Ledger" },
                { id: "modern", label: "Studio" },
                { id: "minimal", label: "Editorial" },
              ] as const
            ).map((t) => {
              const active = currentTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-accent text-background shadow-sm"
                      : "bg-surface-100 text-surface-400 hover:text-foreground hover:bg-surface-200"
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-background" />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* The Clean Invoice Document Presentation Canvas */}
        <div className="bg-surface-100/40 border border-surface-200/80 rounded-xl p-4 sm:p-8 shadow-inner flex justify-center items-start print:p-0 print:border-none print:bg-transparent print:shadow-none">
          <div className="w-full flex justify-center print:w-full">
            <InvoicePreview
              invoice={invoice}
              isDraft={invoice.status === "DRAFT"}
              template={currentTemplate}
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
  );
}
