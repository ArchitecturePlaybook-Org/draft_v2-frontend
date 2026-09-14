"use client";
import React from "react";
import type { Invoice, InvoiceTaxLine, InvoiceTemplate } from "@/domains/invoices/types";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { ModernTemplate } from "./templates/ModernTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import type { TemplateProps } from "./templates/types";

import { FileText } from "lucide-react";
import { paginateInvoiceItems } from "./templates/pagination";

export interface InvoicePreviewProps {
  invoice: Partial<Invoice> & {
    invoice_number?: string;
    client_name?: string;
    items?: Invoice["items"];
    tax_lines?: InvoiceTaxLine[];
    subtotal?: number;
    tax_amount?: number;
    discount_amount?: number;
    total_amount?: number;
    template?: string;
  };
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyGST?: string;
  companyLogoUrl?: string;
  isDraft?: boolean;
  template?: InvoiceTemplate;
  projectTitle?: string;
  projectCode?: string;
  projectLocation?: string;
}

const TEMPLATE_MAP: Record<InvoiceTemplate, React.FC<TemplateProps>> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  companyName,
  companyAddress,
  companyEmail,
  companyPhone,
  companyGST,
  companyLogoUrl,
  isDraft,
  template,
  projectTitle,
  projectCode,
  projectLocation,
}) => {
  const resolvedTemplate: InvoiceTemplate =
    template ??
    (invoice.template as InvoiceTemplate) ??
    "classic";

  const TemplateComponent = TEMPLATE_MAP[resolvedTemplate] ?? ClassicTemplate;
  const items = invoice.items ?? [];
  const pages = paginateInvoiceItems(items);

  return (
    <div
      id="invoice-printable-area"
      className="w-full flex flex-col items-center space-y-8 print:space-y-0 print:block"
    >
      {pages.map((chunk) => (
        <React.Fragment key={chunk.pageNumber}>
          {chunk.pageNumber > 1 && (
            <div className="no-print page-break-divider flex items-center justify-center gap-3 w-full max-w-[210mm] py-2 text-[11px] font-mono font-bold text-surface-400 select-none">
              <div className="h-px bg-surface-300 dark:bg-surface-700 flex-1" />
              <span className="bg-surface-200 dark:bg-surface-800 px-3 py-1 rounded-full text-foreground/70 border border-surface-300 dark:border-surface-700 shadow-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                Page Break · Page {chunk.pageNumber} of {chunk.totalPages}
              </span>
              <div className="h-px bg-surface-300 dark:bg-surface-700 flex-1" />
            </div>
          )}

          <div className="a4-page-sheet w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-neutral-900 shadow-2xl transition-all print:max-w-none print:w-full print:min-h-0 print:shadow-none print:m-0 print:border-none print:p-0">
            <TemplateComponent
              invoice={invoice}
              companyName={companyName}
              companyAddress={companyAddress}
              companyEmail={companyEmail}
              companyPhone={companyPhone}
              companyGST={companyGST}
              companyLogoUrl={companyLogoUrl}
              isDraft={isDraft}
              projectTitle={projectTitle}
              projectCode={projectCode}
              projectLocation={projectLocation}
              pageChunk={chunk}
            />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
