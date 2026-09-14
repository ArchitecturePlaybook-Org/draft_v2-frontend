"use client";
import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { GST_TYPE_LABELS } from "@/domains/invoices/types";
import { numberToWordsINR } from "@/domains/invoices/inrWords";
import { fmtINR, fmtDate, BANK_LABELS, buildUpiUri } from "./types";
import type { TemplateProps } from "./types";

const STATUS_TEXT: Record<string, string> = {
  DRAFT: "DRAFT",
  SENT: "ISSUED / SENT",
  PAID: "PAID IN FULL",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
};

export const MinimalTemplate: React.FC<TemplateProps> = ({
  invoice,
  companyName = "Architecture Playbook",
  companyAddress = "",
  companyEmail = "",
  companyPhone = "",
  companyGST = "",
  companyLogoUrl,
  isDraft,
  projectTitle,
  projectCode,
  projectLocation,
  pageChunk,
}) => {
  const showDraft = isDraft ?? invoice.status === "DRAFT";
  const allItems = invoice.items ?? [];
  const chunk = pageChunk ?? {
    pageIndex: 0,
    pageNumber: 1,
    totalPages: 1,
    items: allItems,
    startIndex: 0,
    isFirstPage: true,
    isLastPage: true,
  };
  const items = chunk.items;
  const taxLines = invoice.tax_lines ?? [];
  const liveSubtotal =
    invoice.subtotal != null
      ? invoice.subtotal
      : allItems.reduce((a, i) => a + i.quantity * i.unit_rate, 0);
  const liveTax =
    invoice.tax_amount != null
      ? invoice.tax_amount
      : allItems.reduce((a, i) => a + i.quantity * i.unit_rate * (i.tax_rate / 100), 0);
  const discount = invoice.discount_amount ?? 0;
  const liveTotal =
    invoice.total_amount != null
      ? invoice.total_amount
      : liveSubtotal + liveTax - discount;

  const bankDetails = invoice.bank_details ?? {};
  const hasBankDetails = Object.values(bankDetails).some(Boolean);
  const upiId = bankDetails.upi_id as string | undefined;
  const upiUri = upiId
    ? buildUpiUri(upiId, companyName, liveTotal, invoice.invoice_number)
    : "";

  return (
    <div className="relative bg-white text-neutral-900 font-sans text-sm leading-relaxed shadow-sm rounded-none border border-neutral-300 min-h-[297mm] flex flex-col justify-between print:min-h-0 print:border-none">
      {/* Draft Watermark */}
      {showDraft && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none"
          style={{ transform: "rotate(-32deg)" }}
        >
          <span
            className="text-8xl font-black uppercase tracking-widest"
            style={{ color: "rgba(0,0,0,0.03)" }}
          >
            DRAFT
          </span>
        </div>
      )}

      <div className="p-10 flex-1 flex flex-col justify-between">
        <div className="space-y-8 flex-1 flex flex-col">
          {chunk.isFirstPage ? (
            <>
              {/* Stark Header */}
              <div className="flex items-start justify-between pb-8 border-b-2 border-neutral-900">
                <div className="space-y-2">
                  {companyLogoUrl && (
                    <img
                      src={companyLogoUrl}
                      alt="logo"
                      className="h-10 w-auto object-contain mb-3 grayscale"
                    />
                  )}
                  <h1 className="text-xl font-black tracking-tight uppercase text-neutral-900">
                    {companyName}
                  </h1>
                  {companyAddress && (
                    <p className="text-xs text-neutral-500 whitespace-pre-line leading-relaxed max-w-sm">
                      {companyAddress}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 text-xs text-neutral-400 font-mono pt-1">
                    {companyGST && <span>GSTIN {companyGST}</span>}
                    {companyEmail && <span>{companyEmail}</span>}
                    {companyPhone && <span>{companyPhone}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block">
                    TAX INVOICE
                  </span>
                  <p className="text-3xl font-light font-mono tracking-tight text-neutral-900 mt-1">
                    {invoice.invoice_number || "INV-0000"}
                  </p>
                  {invoice.status && (
                    <p className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-2">
                      [{STATUS_TEXT[invoice.status] ?? invoice.status}]
                    </p>
                  )}
                </div>
              </div>

              {/* 3-Column Architectural Metadata Grid */}
              <div className="grid grid-cols-3 gap-8 py-2 text-xs">
                {/* Column 1: Client */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-2">
                    01 / CLIENT
                  </span>
                  <p className="font-bold text-neutral-900 text-sm">
                    {invoice.client_name || "\u2014"}
                  </p>
                  {invoice.client_email && (
                    <p className="text-neutral-500 mt-0.5">{invoice.client_email}</p>
                  )}
                  {invoice.client_phone && (
                    <p className="text-neutral-500">{invoice.client_phone}</p>
                  )}
                  {invoice.client_address && (
                    <p className="text-neutral-500 mt-1 whitespace-pre-line leading-relaxed">
                      {invoice.client_address}
                    </p>
                  )}
                </div>

                {/* Column 2: Project Reference */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-2">
                    02 / PROJECT
                  </span>
                  <p className="font-bold text-neutral-900 text-sm">
                    {projectTitle || "Architecture Project"}
                  </p>
                  {projectCode && (
                    <p className="text-neutral-500 font-mono mt-0.5">Ref: {projectCode}</p>
                  )}
                  {projectLocation && (
                    <p className="text-neutral-500 mt-0.5">Site: {projectLocation}</p>
                  )}
                  {invoice.subject && (
                    <p className="text-neutral-600 italic mt-1.5 border-l border-neutral-300 pl-2">
                      {invoice.subject}
                    </p>
                  )}
                </div>

                {/* Column 3: Timeline & Dates */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-2">
                    03 / DATES & TERMS
                  </span>
                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Issue:</span>
                      <span className="text-neutral-800">{fmtDate(invoice.issue_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Due:</span>
                      <span className="text-neutral-800">
                        {invoice.due_date ? fmtDate(invoice.due_date) : "Upon receipt"}
                      </span>
                    </div>
                    {invoice.gst_type && (
                      <div className="flex justify-between text-[11px] pt-1">
                        <span className="text-neutral-400">Tax Type:</span>
                        <span className="text-neutral-600">{GST_TYPE_LABELS[invoice.gst_type]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Minimalist Continuation Header for Page 2+ */
            <div className="pb-4 border-b-2 border-neutral-900 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-black text-neutral-900 uppercase">{companyName}</span>
                <span className="text-neutral-400">/</span>
                <span className="text-neutral-700">{invoice.client_name || "\u2014"}</span>
                {projectTitle && (
                  <>
                    <span className="text-neutral-400">/</span>
                    <span className="text-neutral-500">{projectTitle}</span>
                  </>
                )}
              </div>
              <div className="text-right">
                <span className="font-bold text-neutral-900">{invoice.invoice_number || "INV-0000"}</span>
                <span className="text-neutral-400 mx-2">/</span>
                <span className="font-bold uppercase tracking-wider text-neutral-800">PAGE {chunk.pageNumber} OF {chunk.totalPages}</span>
              </div>
            </div>
          )}

          {/* Minimalist Line Items Table */}
          <div className="pt-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-y-2 border-neutral-900 font-mono text-[11px]">
                  <th className="py-2.5 text-left w-8 text-neutral-400">#</th>
                  <th className="py-2.5 text-left">ITEM / DESCRIPTION</th>
                  <th className="py-2.5 text-center w-16 text-neutral-500">UNIT</th>
                  <th className="py-2.5 text-right w-16 text-neutral-500">QTY</th>
                  <th className="py-2.5 text-right w-24 text-neutral-500">RATE</th>
                  <th className="py-2.5 text-right w-16 text-neutral-500">TAX%</th>
                  <th className="py-2.5 text-right w-28 text-neutral-900">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400 italic">
                      No items recorded
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const amount = item.amount ?? item.quantity * item.unit_rate;
                    const itemNumber = chunk.startIndex + idx + 1;
                    return (
                      <tr key={item.id ?? idx}>
                        <td className="py-3 text-neutral-400 font-mono">{itemNumber}</td>
                        <td className="py-3 font-medium text-neutral-800">
                          {item.description}
                        </td>
                        <td className="py-3 text-center text-neutral-500 font-mono">
                          {item.unit}
                        </td>
                        <td className="py-3 text-right font-mono text-neutral-600">
                          {fmtINR(item.quantity)}
                        </td>
                        <td className="py-3 text-right font-mono text-neutral-600">
                          ₹{fmtINR(item.unit_rate)}
                        </td>
                        <td className="py-3 text-right font-mono text-neutral-400">
                          {fmtINR(item.tax_rate)}%
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-neutral-900">
                          ₹{fmtINR(amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!chunk.isLastPage ? (
            /* Continuation indicator for non-final pages */
            <div className="mt-4 pt-3 border-t border-dashed border-neutral-300 flex items-center justify-between font-mono text-xs text-neutral-500">
              <span className="uppercase tracking-wider">SPECIFICATIONS CONTINUED</span>
              <span className="font-bold uppercase tracking-wider text-neutral-900 bg-neutral-100 px-3 py-1 border border-neutral-300">
                CONTINUED ON PAGE {chunk.pageNumber + 1} &rarr;
              </span>
            </div>
          ) : (
            <>
              {/* Amount in Words */}
              <div className="border-t border-neutral-200 pt-3 flex items-baseline gap-2 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  TOTAL IN WORDS:
                </span>
                <span className="text-neutral-800 italic">
                  {numberToWordsINR(liveTotal)}
                </span>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-neutral-500">
                    <span>SUBTOTAL:</span>
                    <span className="text-neutral-800">₹{fmtINR(liveSubtotal)}</span>
                  </div>

                  {taxLines.length > 0 ? (
                    taxLines.map((tl) => (
                      <div key={tl.id} className="flex justify-between text-neutral-500">
                        <span>{tl.tax_name} ({fmtINR(tl.rate)}%):</span>
                        <span className="text-neutral-800">₹{fmtINR(tl.amount)}</span>
                      </div>
                    ))
                  ) : liveTax > 0 ? (
                    <div className="flex justify-between text-neutral-500">
                      <span>GST:</span>
                      <span className="text-neutral-800">₹{fmtINR(liveTax)}</span>
                    </div>
                  ) : null}

                  {discount > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>DISCOUNT:</span>
                      <span className="text-neutral-800">- ₹{fmtINR(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-sm font-black text-neutral-900">
                    <span className="uppercase tracking-widest text-xs">TOTAL:</span>
                    <span>₹{fmtINR(liveTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Minimalist Footer & Remittance on Last Page OR Sub-bar on non-last page */}
        {chunk.isLastPage ? (
          <div className="grid grid-cols-2 gap-10 border-t border-neutral-200 pt-8 text-xs mt-auto break-inside-avoid totals-block signature-block">
            <div className="space-y-4">
              {hasBankDetails && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
                    SETTLEMENT / BANKING
                  </p>
                  <div className="space-y-1 text-neutral-600 font-mono">
                    {Object.entries(bankDetails).map(([key, val]) =>
                      val && key !== "upi_id" ? (
                        <div key={key} className="flex gap-2">
                          <span className="text-neutral-400 min-w-[100px]">
                            {BANK_LABELS[key] ?? key}:
                          </span>
                          <span className="text-neutral-800">{val as string}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {upiId && upiUri && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="p-1 border border-neutral-300 bg-white">
                    <QRCodeSVG value={upiUri} size={60} level="M" />
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">
                    <p className="font-bold text-neutral-800">UPI: {upiId}</p>
                    <p>Scan to settle</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between text-right">
              {invoice.notes && (
                <p className="text-xs text-neutral-500 italic whitespace-pre-line">
                  {invoice.notes}
                </p>
              )}

              <div className="pt-8">
                <div className="w-48 ml-auto border-b border-neutral-400 pb-1" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-2">
                  Authorized Studio Representative
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-3 flex justify-between items-center text-[10px] font-mono text-neutral-400 border-t border-neutral-200 mt-auto">
            <span>{invoice.invoice_number || "INV-0000"} &middot; {companyName}</span>
            <span>PAGE {chunk.pageNumber} OF {chunk.totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
};
