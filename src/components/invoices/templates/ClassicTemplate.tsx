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

export const ClassicTemplate: React.FC<TemplateProps> = ({
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
    <div className="relative bg-white text-neutral-900 font-sans text-sm leading-relaxed shadow-sm rounded-none border-2 border-neutral-900 min-h-[297mm] flex flex-col justify-between print:min-h-0 print:border-2 print:border-neutral-900">
      {/* Draft Watermark */}
      {showDraft && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none"
          style={{ transform: "rotate(-32deg)" }}
        >
          <span
            className="text-8xl font-black uppercase tracking-widest"
            style={{ color: "rgba(0, 0, 0, 0.03)" }}
          >
            DRAFT
          </span>
        </div>
      )}

      {/* Top Architectural Ruler Bar */}
      <div className="bg-neutral-900 text-white px-8 py-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest shrink-0">
        <span>
          {chunk.isFirstPage
            ? "ARCHITECTURAL TAX INVOICE // OFFICIAL LEDGER"
            : "ARCHITECTURAL TAX INVOICE // CONTINUATION"}
        </span>
        <span>
          REF: {invoice.invoice_number || "INV-0000"}
          {chunk.totalPages > 1 && (
            <span className="ml-3 text-neutral-300 font-bold">
              [PAGE {chunk.pageNumber} OF {chunk.totalPages}]
            </span>
          )}
        </span>
      </div>

      <div className="p-8 flex-1 flex flex-col justify-between">
        <div className="space-y-6 flex-1 flex flex-col">
          {chunk.isFirstPage ? (
            <>
              {/* Header Block with Grid Lines */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-neutral-900">
                <div className="space-y-2">
                  {companyLogoUrl && (
                    <img
                      src={companyLogoUrl}
                      alt="logo"
                      className="h-11 w-auto object-contain mb-2 grayscale"
                    />
                  )}
                  <h1 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">
                    {companyName}
                  </h1>
                  {companyAddress && (
                    <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed max-w-md">
                      {companyAddress}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 text-xs text-neutral-500 font-mono pt-1">
                    {companyGST && <span>GSTIN: <strong>{companyGST}</strong></span>}
                    {companyEmail && <span>{companyEmail}</span>}
                    {companyPhone && <span>{companyPhone}</span>}
                  </div>
                </div>

                <div className="text-right space-y-1.5 shrink-0">
                  <div className="inline-block border border-neutral-900 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-900">
                    {STATUS_TEXT[invoice.status ?? "DRAFT"] ?? invoice.status}
                  </div>
                  <p className="text-3xl font-black font-mono tracking-tight text-neutral-900">
                    {invoice.invoice_number || "INV-XXXX"}
                  </p>
                  <div className="text-[11px] font-mono text-neutral-500 space-y-0.5 pt-1">
                    <div>ISSUE: <strong className="text-neutral-900">{fmtDate(invoice.issue_date)}</strong></div>
                    {invoice.due_date && <div>DUE: <strong className="text-neutral-900">{fmtDate(invoice.due_date)}</strong></div>}
                    {invoice.gst_type && <div>TAX: {GST_TYPE_LABELS[invoice.gst_type]}</div>}
                  </div>
                </div>
              </div>

              {/* 2-Column Boxed Architectural Dossier */}
              <div className="grid grid-cols-2 border border-neutral-900 divide-x divide-neutral-900 text-xs">
                {/* Box 1: Billed To */}
                <div className="p-4 space-y-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-neutral-400 block border-b border-neutral-200 pb-1.5">
                    01 // BILLED TO (CLIENT)
                  </span>
                  <p className="font-black text-sm text-neutral-900">
                    {invoice.client_name || "\u2014"}
                  </p>
                  {invoice.client_email && (
                    <p className="text-neutral-600 font-mono">{invoice.client_email}</p>
                  )}
                  {invoice.client_phone && (
                    <p className="text-neutral-600">{invoice.client_phone}</p>
                  )}
                  {invoice.client_address && (
                    <p className="text-neutral-600 whitespace-pre-line leading-relaxed pt-1">
                      {invoice.client_address}
                    </p>
                  )}
                </div>

                {/* Box 2: Project & Contract Reference */}
                <div className="p-4 space-y-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-neutral-400 block border-b border-neutral-200 pb-1.5">
                    02 // COMMISSION & SITE LOCATION
                  </span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Project:</span>
                      <span className="font-bold text-neutral-900">{projectTitle || "Architecture Project"}</span>
                    </div>
                    {projectCode && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Project Code:</span>
                        <span className="font-mono text-neutral-900">{projectCode}</span>
                      </div>
                    )}
                    {projectLocation && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Site Location:</span>
                        <span className="text-neutral-800">{projectLocation}</span>
                      </div>
                    )}
                    {invoice.subject && (
                      <div className="pt-2 mt-2 border-t border-neutral-200">
                        <span className="text-neutral-500 block text-[10px] uppercase font-mono">Scope Note:</span>
                        <p className="text-neutral-800 font-medium italic mt-0.5">{invoice.subject}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Continuation Header for Page 2+ */
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-900 font-mono text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <span className="font-black text-neutral-900 uppercase tracking-tight">{companyName}</span>
                <span className="text-neutral-400">&bull;</span>
                <span>CLIENT: <strong className="text-neutral-900">{invoice.client_name || "\u2014"}</strong></span>
                {projectTitle && (
                  <>
                    <span className="text-neutral-400">&bull;</span>
                    <span>PROJECT: <strong className="text-neutral-900">{projectTitle}</strong></span>
                  </>
                )}
              </div>
              <div className="text-right font-bold text-neutral-900 uppercase tracking-wider">
                PAGE {chunk.pageNumber} OF {chunk.totalPages}
              </div>
            </div>
          )}

          {/* Structured Architectural Grid Table */}
          <div className="border border-neutral-900 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-900 font-mono text-[11px]">
                  <th className="py-2.5 px-3 text-left w-8 text-neutral-500 border-r border-neutral-300">#</th>
                  <th className="py-2.5 px-3 text-left text-neutral-800 border-r border-neutral-300">DESCRIPTION OF SERVICES & DELIVERABLES</th>
                  <th className="py-2.5 px-2 text-center w-14 text-neutral-500 border-r border-neutral-300">SAC</th>
                  <th className="py-2.5 px-2 text-center w-12 text-neutral-500 border-r border-neutral-300">UNIT</th>
                  <th className="py-2.5 px-2 text-right w-14 text-neutral-500 border-r border-neutral-300">QTY</th>
                  <th className="py-2.5 px-3 text-right w-24 text-neutral-500 border-r border-neutral-300">RATE (₹)</th>
                  <th className="py-2.5 px-2 text-right w-14 text-neutral-500 border-r border-neutral-300">GST%</th>
                  <th className="py-2.5 px-3 text-right w-28 text-neutral-900 font-bold">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-400 italic font-mono">
                      No deliverables recorded
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const amount = item.amount ?? item.quantity * item.unit_rate;
                    const itemNumber = chunk.startIndex + idx + 1;
                    return (
                      <tr key={item.id ?? idx} className={idx % 2 === 1 ? "bg-neutral-50/50" : "bg-white"}>
                        <td className="py-2.5 px-3 text-neutral-400 font-mono border-r border-neutral-200">{itemNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-neutral-900 border-r border-neutral-200">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-neutral-400 border-r border-neutral-200">9983</td>
                        <td className="py-2.5 px-2 text-center text-neutral-600 border-r border-neutral-200">{item.unit}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-neutral-700 border-r border-neutral-200">
                          {fmtINR(item.quantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-700 border-r border-neutral-200">
                          {fmtINR(item.unit_rate)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-neutral-500 border-r border-neutral-200">
                          {fmtINR(item.tax_rate)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                          ₹{fmtINR(amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {!chunk.isLastPage && (
              <div className="bg-neutral-100 border-t-2 border-neutral-900 px-4 py-2.5 flex items-center justify-between font-mono text-[11px] text-neutral-800">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-neutral-700">
                  <span className="w-1.5 h-1.5 bg-neutral-900 inline-block"></span>
                  <span>DELIVERABLES CONTINUED ON NEXT PAGE</span>
                </div>
                <span className="font-black uppercase tracking-widest text-neutral-900 bg-white px-2.5 py-0.5 border border-neutral-900 shadow-xs">
                  CONTINUED ON PAGE {chunk.pageNumber + 1} &rarr;
                </span>
              </div>
            )}
          </div>

          {chunk.isLastPage && (
            <>
              {/* Full-Width Amount in Words Ribbon */}
              <div className="border border-neutral-900 bg-neutral-50 px-4 py-2.5 flex items-center gap-2 text-xs">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-500 shrink-0">
                  AMOUNT IN WORDS:
                </span>
                <span className="font-semibold text-neutral-900 italic">
                  {numberToWordsINR(liveTotal)}
                </span>
              </div>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end">
                <div className="w-80 border border-neutral-900 divide-y divide-neutral-200 text-xs font-mono">
                  <div className="p-2.5 flex justify-between text-neutral-600">
                    <span>SUBTOTAL:</span>
                    <span className="text-neutral-900 font-semibold">₹{fmtINR(liveSubtotal)}</span>
                  </div>

                  {taxLines.length > 0 ? (
                    taxLines.map((tl) => (
                      <div key={tl.id} className="p-2.5 flex justify-between text-neutral-600">
                        <span>{tl.tax_name} ({fmtINR(tl.rate)}%):</span>
                        <span className="text-neutral-900 font-semibold">₹{fmtINR(tl.amount)}</span>
                      </div>
                    ))
                  ) : liveTax > 0 ? (
                    <div className="p-2.5 flex justify-between text-neutral-600">
                      <span>GST:</span>
                      <span className="text-neutral-900 font-semibold">₹{fmtINR(liveTax)}</span>
                    </div>
                  ) : null}

                  {discount > 0 && (
                    <div className="p-2.5 flex justify-between text-rose-600">
                      <span>DISCOUNT:</span>
                      <span>- ₹{fmtINR(discount)}</span>
                    </div>
                  )}

                  <div className="p-3 bg-neutral-900 text-white flex justify-between items-center text-sm font-black">
                    <span className="text-xs uppercase tracking-widest">NET PAYABLE:</span>
                    <span className="font-mono text-base">₹{fmtINR(liveTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer: Remittance Slip & Signatory on Last Page OR Page Numbering on non-last page */}
        {chunk.isLastPage ? (
          <div className="grid grid-cols-2 gap-8 border-t-2 border-neutral-900 pt-6 mt-auto break-inside-avoid totals-block signature-block">
            {/* Left: Banking & QR */}
            <div className="space-y-4 text-xs">
              {hasBankDetails && (
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 border-b border-neutral-200 pb-1">
                    SETTLEMENT / BANK WIRE DETAILS
                  </p>
                  <div className="space-y-1 font-mono text-neutral-700">
                    {Object.entries(bankDetails).map(([key, val]) =>
                      val && key !== "upi_id" ? (
                        <div key={key} className="flex gap-2">
                          <span className="text-neutral-400 min-w-[105px]">
                            {BANK_LABELS[key] ?? key}:
                          </span>
                          <span className="text-neutral-900 font-medium">{val as string}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {upiId && upiUri && (
                <div className="flex items-center gap-3 border border-neutral-900 p-2.5 w-fit">
                  <div className="p-1 bg-white border border-neutral-200">
                    <QRCodeSVG value={upiUri} size={64} level="M" />
                  </div>
                  <div className="text-[10px] font-mono">
                    <span className="bg-neutral-900 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider block w-fit mb-1">
                      UPI SCAN & PAY
                    </span>
                    <p className="text-neutral-900 font-bold">{upiId}</p>
                    <p className="text-neutral-500">Scan via GPay / PhonePe / Paytm</p>
                  </div>
                </div>
              )}

              {invoice.payment_terms && (
                <p className="text-[11px] text-neutral-500 italic">
                  Terms: {invoice.payment_terms}
                </p>
              )}
            </div>

            {/* Right: Notes & Signatory Box */}
            <div className="flex flex-col justify-between text-right text-xs">
              {invoice.notes ? (
                <div className="border border-neutral-200 p-3 bg-neutral-50 text-left">
                  <span className="font-mono text-[9px] uppercase font-bold text-neutral-400 block mb-1">Remarks</span>
                  <p className="text-neutral-600 italic whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                </div>
              ) : <div />}

              <div className="pt-6">
                <p className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                  For {companyName}
                </p>
                <div className="h-16 flex items-end justify-end">
                  <div className="w-36 border-b border-dashed border-neutral-400 pb-1 text-center">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Seal & Sign</span>
                  </div>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-neutral-200 pt-3 flex justify-between items-center text-[10px] font-mono text-neutral-400 mt-auto">
            <span>{invoice.invoice_number || "INV-XXXX"} &middot; {companyName}</span>
            <span>PAGE {chunk.pageNumber} OF {chunk.totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
};
