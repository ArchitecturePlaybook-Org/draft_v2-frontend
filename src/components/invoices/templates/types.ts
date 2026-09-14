import type { Invoice, InvoiceTaxLine } from "@/domains/invoices/types";
import type { InvoicePageChunk } from "./pagination";

export interface TemplateProps {
  invoice: Partial<Invoice> & {
    invoice_number?: string;
    client_name?: string;
    items?: Invoice["items"];
    tax_lines?: InvoiceTaxLine[];
    subtotal?: number;
    tax_amount?: number;
    discount_amount?: number;
    total_amount?: number;
  };
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyGST?: string;
  companyLogoUrl?: string;
  isDraft?: boolean;
  projectTitle?: string;
  projectCode?: string;
  projectLocation?: string;
  pageChunk?: InvoicePageChunk;
}

export const BANK_LABELS: Record<string, string> = {
  bank_name: "Bank Name",
  account_holder: "Account Holder",
  account_number: "Account No.",
  ifsc_code: "IFSC Code",
  branch: "Branch",
  upi_id: "UPI ID",
};

export function fmtINR(v: number | string | undefined | null): string {
  const n = parseFloat(String(v ?? 0));
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(n) ? 0 : n);
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "\u2014";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(d));
  } catch { return d; }
}

/**
 * Builds standard NPCI UPI payment URI compatible with GPay, PhonePe, Paytm, etc.
 */
export function buildUpiUri(
  upiId: string,
  payeeName: string,
  amount: number,
  invoiceNumber?: string
): string {
  if (!upiId) return "";
  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: payeeName.trim() || "Merchant",
    am: Number(amount).toFixed(2),
    cu: "INR",
  });
  if (invoiceNumber) {
    params.set("tn", `Inv-${invoiceNumber}`);
  }
  return `upi://pay?${params.toString()}`;
}
