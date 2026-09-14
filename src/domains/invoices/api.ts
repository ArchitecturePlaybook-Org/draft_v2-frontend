/**
 * Invoice Domain \u2014 API Client
 * Routes via the Next.js BFF proxy at /api/v1/ (catch-all)
 */

import { fetchFromBff } from "@/shared/api/fetchFromBff";
import type {
  Invoice,
  InvoiceListItem,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  BOQImportItem,
  CompanyProfile,
} from "./types";

const BASE = "/api/v1/invoices";
const ACCOUNTS_BASE = "/api/v1/accounts";

/** Handles both plain array and DRF paginated { count, results } responses */
function unpackArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const r = res as Record<string, unknown>;
  if (r && Array.isArray(r.results)) return r.results as T[];
  return [];
}

export const invoicesApi = {
  /** List all invoices for a project */
  async list(projectUid: string, statusFilter?: string): Promise<InvoiceListItem[]> {
    const params = new URLSearchParams({ project_uid: projectUid });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetchFromBff<unknown>(`${BASE}/invoices/?${params}`, { skipCache: true });
    return unpackArray<InvoiceListItem>(res);
  },

  /** Get full detail of a single invoice */
  get(id: number): Promise<Invoice> {
    return fetchFromBff<Invoice>(`${BASE}/invoices/${id}/`, { skipCache: true });
  },

  /** Create a new invoice */
  create(payload: CreateInvoicePayload): Promise<Invoice> {
    return fetchFromBff<Invoice>(`${BASE}/invoices/`, {
      method: "POST",
      body: JSON.stringify(payload),
      skipCache: true,
    });
  },

  /** Full / partial update */
  update(id: number, payload: UpdateInvoicePayload): Promise<Invoice> {
    return fetchFromBff<Invoice>(`${BASE}/invoices/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      skipCache: true,
    });
  },

  /** Update template choice only */
  updateTemplate(id: number, template: Invoice["template"]): Promise<Invoice> {
    return fetchFromBff<Invoice>(`${BASE}/invoices/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ template }),
      skipCache: true,
    });
  },

  /** Partial update */
  patch(id: number, payload: Partial<UpdateInvoicePayload>): Promise<Invoice> {
    return fetchFromBff<Invoice>(`${BASE}/invoices/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      skipCache: true,
    });
  },

  /** Delete an invoice */
  delete(id: number): Promise<void> {
    return fetchFromBff<void>(`${BASE}/invoices/${id}/`, {
      method: "DELETE",
      skipCache: true,
    });
  },

  // \u2500\u2500 Status Transitions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  markSent(id: number): Promise<InvoiceListItem> {
    return fetchFromBff<InvoiceListItem>(`${BASE}/invoices/${id}/mark-sent/`, { method: "POST", skipCache: true });
  },
  markPaid(id: number): Promise<InvoiceListItem> {
    return fetchFromBff<InvoiceListItem>(`${BASE}/invoices/${id}/mark-paid/`, { method: "POST", skipCache: true });
  },
  markCancelled(id: number): Promise<InvoiceListItem> {
    return fetchFromBff<InvoiceListItem>(`${BASE}/invoices/${id}/mark-cancelled/`, { method: "POST", skipCache: true });
  },
  markOverdue(id: number): Promise<InvoiceListItem> {
    return fetchFromBff<InvoiceListItem>(`${BASE}/invoices/${id}/mark-overdue/`, { method: "POST", skipCache: true });
  },
  duplicate(id: number): Promise<Invoice> {
    return fetchFromBff<Invoice>(`${BASE}/invoices/${id}/duplicate/`, { method: "POST", skipCache: true });
  },

  // \u2500\u2500 PDF Download \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  async downloadPDF(id: number, invoiceNumber: string): Promise<void> {
    const url = `/api/v1/invoices/invoices/${id}/pdf/`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("PDF generation failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

  // \u2500\u2500 BOQ Import Helper \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  getBOQItems(projectUid: string): Promise<BOQImportItem[]> {
    return fetchFromBff<BOQImportItem[]>(
      `${BASE}/invoices/boq-items/?project_uid=${projectUid}`,
      { skipCache: true }
    );
  },
};

// \u2500\u2500 Company Profile API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export const companyProfileApi = {
  get(): Promise<CompanyProfile> {
    return fetchFromBff<CompanyProfile>(`${ACCOUNTS_BASE}/company-profile/`, { skipCache: true });
  },

  /** Patch supports FormData for logo upload */
  async patch(data: {
    name?: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    gst_number?: string;
    logo?: File;
  }): Promise<CompanyProfile> {
    const fd = new FormData();
    if (data.name !== undefined) fd.append("name", data.name);
    if (data.address !== undefined) fd.append("address", data.address ?? "");
    if (data.email !== undefined) fd.append("email", data.email ?? "");
    if (data.phone !== undefined) fd.append("phone", data.phone ?? "");
    if (data.gst_number !== undefined) fd.append("gst_number", data.gst_number);
    if (data.logo instanceof File) fd.append("logo", data.logo);

    return fetchFromBff<CompanyProfile>(`${ACCOUNTS_BASE}/company-profile/`, {
      method: "PATCH",
      body: fd,
      skipCache: true,
    });
  },
};
