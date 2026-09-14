// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Invoice Domain \u2014 TypeScript Types
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export type GSTType = "CGST_SGST" | "IGST" | "NONE";

export type InvoiceTemplate = "classic" | "modern" | "minimal";

export type InvoiceItemUnit =
  | "m3" | "m2" | "m" | "kg" | "nos" | "ls" | "mt" | "sqft" | "rft" | "hr" | "day";

export interface InvoiceItem {
  id: number;
  description: string;
  unit: InvoiceItemUnit;
  quantity: number;
  unit_rate: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  sort_order: number;
}

export interface InvoiceTaxLine {
  id: number;
  tax_name: string;
  rate: number;
  amount: number;
}

export interface BankDetails {
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch?: string;
  account_holder?: string;
  upi_id?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  project: number;
  account: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  currency: "INR";
  gst_type: GSTType;
  subject: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  payment_terms: string;
  bank_details: BankDetails;
  template: InvoiceTemplate;
  items: InvoiceItem[];
  tax_lines: InvoiceTaxLine[];
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight shape returned by list endpoint */
export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  project: number;
  client_name: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: "INR";
  created_at: string;
}

/** Company profile fetched from /api/v1/accounts/company-profile/ */
export interface CompanyProfile {
  id: number;
  name: string;
  address: string | null;
  logo: string | null;  // URL
  email: string | null;
  phone: string | null;
  gst_number: string;
}

// \u2500\u2500 Create / Update Payloads \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export type CreateInvoiceItemPayload = Omit<InvoiceItem, "id" | "amount" | "tax_amount">;

export interface CreateInvoicePayload {
  project: number;
  status?: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  gst_type?: GSTType;
  subject?: string;
  discount_amount?: number;
  notes?: string;
  payment_terms?: string;
  bank_details?: BankDetails;
  template?: InvoiceTemplate;
  items: CreateInvoiceItemPayload[];
}

export type UpdateInvoicePayload = Partial<CreateInvoicePayload>;

/** BOQ item returned from boq-items helper endpoint */
export interface BOQImportItem {
  description: string;
  unit: InvoiceItemUnit;
  quantity: number;
  unit_rate: number;
  tax_rate: number;
}

// \u2500\u2500 UI Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<
  InvoiceStatus,
  { bg: string; text: string; border: string }
> = {
  DRAFT:     { bg: "bg-surface-100",    text: "text-surface-400",               border: "border-surface-200" },
  SENT:      { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/25" },
  PAID:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/25" },
  OVERDUE:   { bg: "bg-red-500/10",     text: "text-red-600 dark:text-red-400", border: "border-red-500/25" },
  CANCELLED: { bg: "bg-surface-100/50", text: "text-surface-400",               border: "border-surface-200/60" },
};

export const GST_TYPE_LABELS: Record<GSTType, string> = {
  CGST_SGST: "CGST + SGST (Intra-State)",
  IGST:      "IGST (Inter-State)",
  NONE:      "No GST",
};

export const UNIT_OPTIONS: { value: InvoiceItemUnit; label: string }[] = [
  { value: "m3",   label: "m\u00b3 (Cubic Metre)" },
  { value: "m2",   label: "m\u00b2 (Sq. Metre)" },
  { value: "m",    label: "m (Running Metre)" },
  { value: "kg",   label: "kg" },
  { value: "nos",  label: "Nos." },
  { value: "ls",   label: "LS (Lump Sum)" },
  { value: "mt",   label: "MT (Metric Tonne)" },
  { value: "sqft", label: "Sq. Ft." },
  { value: "rft",  label: "RFT" },
  { value: "hr",   label: "Hours" },
  { value: "day",  label: "Days" },
];
