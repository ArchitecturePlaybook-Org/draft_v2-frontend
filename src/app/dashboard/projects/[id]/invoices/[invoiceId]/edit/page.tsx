"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { invoicesApi } from "@/domains/invoices/api";
import type { Invoice } from "@/domains/invoices/types";
import { InvoiceEditorForm } from "@/components/invoices/InvoiceEditorForm";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function EditInvoicePage() {
  const params = useParams();
  const projectUid = params.id as string;
  const invoiceId = parseInt(params.invoiceId as string, 10);
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoicesApi.get(invoiceId)
      .then(setInvoice)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [invoiceId]);

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

  return (
    <InvoiceEditorForm
      mode="edit"
      projectUid={projectUid}
      initialInvoice={invoice}
      onSaveSuccess={() => router.push(`/dashboard/projects/${projectUid}/invoices/${invoiceId}`)}
      onCancel={() => router.push(`/dashboard/projects/${projectUid}/invoices/${invoiceId}`)}
    />
  );
}
