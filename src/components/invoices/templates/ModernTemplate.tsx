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
  PAID: "SETTLED / PAID",
  OVERDUE: "PAYMENT OVERDUE",
  CANCELLED: "CANCELLED",
};

export const ModernTemplate: React.FC<TemplateProps> = ({
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
            style={{ color: "rgba(0, 0, 0, 0.03)" }}
          >
            DRAFT
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-6 flex-1 flex flex-col">
          {chunk.isFirstPage ? (
            <>
              {/* Asymmetric Studio Header */}
              <div className="p-10 pb-6">
                <div className="grid grid-cols-[1.3fr_1fr] gap-8 items-start">
                  {/* Left: Studio Identity & Project Narrative */}
                  <div className="space-y-3">
                    {companyLogoUrl && (
                      <img
                        src={companyLogoUrl}
                        alt="logo"
                        className="h-10 w-auto object-contain mb-2 grayscale"
                      />
                    )}
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                        PRACTICE & STUDIO
                      </span>
                      <h1 className="text-3xl font-black tracking-tighter text-neutral-950 uppercase leading-none">
                        {companyName}
                      </h1>
                    </div>
                    {companyAddress && (
                      <p className="text-xs text-neutral-500 whitespace-pre-line leading-relaxed max-w-sm">
                        {companyAddress}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 text-xs text-neutral-400 font-mono">
                      {companyGST && <span>GSTIN: {companyGST}</span>}
                      {companyEmail && <span>{companyEmail}</span>}
                      {companyPhone && <span>{companyPhone}</span>}
                    </div>
                  </div>

                  {/* Right: Stark Architectural Meta & Status */}
                  <div className="text-right space-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block">
                      TAX INVOICE // SPECIFICATION
                    </span>
                    <p className="text-4xl font-light font-mono tracking-tighter text-neutral-950">
                      {invoice.invoice_number || "INV-0000"}
                    </p>
                    <div className="inline-block bg-neutral-100 border border-neutral-300 px-2.5 py-1 font-mono text-[10px] font-bold text-neutral-800 uppercase tracking-wider">
                      {STATUS_TEXT[invoice.status ?? "DRAFT"] ?? invoice.status}
                    </div>
                    <div className="font-mono text-xs text-neutral-500 space-y-0.5 pt-1">
                      <div>ISSUED // <strong>{fmtDate(invoice.issue_date)}</strong></div>
                      {invoice.due_date && <div>DUE // <strong>{fmtDate(invoice.due_date)}</strong></div>}
                    </div>
                  </div>
                </div>

                {/* 2px Solid Line */}
                <div className="mt-8 h-0.5 bg-neutral-950" />
              </div>

              {/* Asymmetric Client & Project Overview */}
              <div className="px-10 pb-6 grid grid-cols-[1.2fr_1fr] gap-8 text-xs">
                {/* Client Block */}
                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                    CLIENT & BILLING ADDRESS
                  </span>
                  <p className="font-bold text-base text-neutral-950">
                    {invoice.client_name || "\u2014"}
                  </p>
                  {invoice.client_email && (
                    <p className="text-neutral-500 font-mono">{invoice.client_email}</p>
                  )}
                  {invoice.client_phone && (
                    <p className="text-neutral-500">{invoice.client_phone}</p>
                  )}
                  {invoice.client_address && (
                    <p className="text-neutral-500 whitespace-pre-line leading-relaxed pt-1">
                      {invoice.client_address}
                    </p>
                  )}
                </div>

                {/* Project Commission */}
                <div className="space-y-2 border-l border-neutral-200 pl-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                    PROJECT COMMISSION
                  </span>
                  <p className="font-bold text-sm text-neutral-900">
                    {projectTitle || "Architecture Project"}
                  </p>
                  {projectCode && (
                    <p className="font-mono text-neutral-500">Project Reference: {projectCode}</p>
                  )}
                  {projectLocation && (
                    <p className="text-neutral-500">Site Location: {projectLocation}</p>
                  )}
                  {invoice.subject && (
                    <div className="pt-2 border-t border-neutral-200">
                      <p className="text-neutral-700 italic font-medium">{invoice.subject}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist Key Metric Strip */}
              <div className="mx-10 mb-6 bg-neutral-50 border-y border-neutral-300 py-2.5 px-4 flex items-center justify-between font-mono text-xs">
                <div className="flex gap-8">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Subtotal</span>
                    <span className="font-bold text-neutral-800">₹{fmtINR(liveSubtotal)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">GST / Tax</span>
                    <span className="font-bold text-neutral-800">₹{fmtINR(liveTax)}</span>
                  </div>
                  {discount > 0 && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-rose-500 block">Discount</span>
                      <span className="font-bold text-rose-600">- ₹{fmtINR(discount)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Net Payable</span>
                  <span className="font-black text-sm text-neutral-950">₹{fmtINR(liveTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            /* Studio Continuation Header for Page 2+ */
            <div className="px-10 pt-8 pb-4 border-b-2 border-neutral-950 flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">
                  STUDIO SPECIFICATIONS // CONTINUATION
                </span>
                <h2 className="text-base font-black tracking-tight text-neutral-950 uppercase">
                  {companyName} <span className="text-neutral-300">&bull;</span> {invoice.client_name || "\u2014"}
                </h2>
              </div>
              <div className="text-right font-mono text-xs text-neutral-500">
                <p className="font-bold text-neutral-950">{invoice.invoice_number || "INV-0000"}</p>
                <p className="font-bold uppercase tracking-wider text-neutral-800">PAGE {chunk.pageNumber} OF {chunk.totalPages}</p>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="px-10 pb-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-950 font-mono text-[11px]">
                  <th className="py-2.5 text-left w-8 text-neutral-400 font-bold">#</th>
                  <th className="py-2.5 text-left text-neutral-800 font-bold">DELIVERABLE / SPECIFICATION</th>
                  <th className="py-2.5 text-center w-16 text-neutral-500 font-bold">UNIT</th>
                  <th className="py-2.5 text-right w-16 text-neutral-500 font-bold">QTY</th>
                  <th className="py-2.5 text-right w-24 text-neutral-500 font-bold">RATE</th>
                  <th className="py-2.5 text-right w-16 text-neutral-500 font-bold">GST%</th>
                  <th className="py-2.5 text-right w-28 text-neutral-950 font-bold">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400 italic font-mono">
                      No deliverables recorded
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const amount = item.amount ?? item.quantity * item.unit_rate;
                    const itemNumber = chunk.startIndex + idx + 1;
                    return (
                      <tr key={item.id ?? idx}>
                        <td className="py-3.5 text-neutral-400 font-mono">{itemNumber}</td>
                        <td className="py-3.5 font-medium text-neutral-900">{item.description}</td>
                        <td className="py-3.5 text-center font-mono text-neutral-500">{item.unit}</td>
                        <td className="py-3.5 text-right font-mono text-neutral-600">{fmtINR(item.quantity)}</td>
                        <td className="py-3.5 text-right font-mono text-neutral-600">₹{fmtINR(item.unit_rate)}</td>
                        <td className="py-3.5 text-right font-mono text-neutral-400">{fmtINR(item.tax_rate)}%</td>
                        <td className="py-3.5 text-right font-mono font-bold text-neutral-950">₹{fmtINR(amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!chunk.isLastPage ? (
            /* Continuation indicator for non-final pages */
            <div className="mx-10 mt-4 pt-3 border-t border-dashed border-neutral-300 flex items-center justify-between font-mono text-xs text-neutral-500">
              <span className="uppercase tracking-wider">SPECIFICATIONS SCHEDULE CARRIED OVER</span>
              <span className="font-bold uppercase tracking-widest text-neutral-950 bg-neutral-100 px-3 py-1 border border-neutral-300">
                CONTINUED ON PAGE {chunk.pageNumber + 1} &rarr;
              </span>
            </div>
          ) : (
            <>
              {/* Amount in Words */}
              <div className="mx-10 mb-6 border-t border-neutral-200 pt-3 flex items-baseline gap-2 text-xs">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                  AMOUNT IN WORDS //
                </span>
                <span className="text-neutral-800 italic">
                  {numberToWordsINR(liveTotal)}
                </span>
              </div>

              {/* Totals Section */}
              <div className="px-10 pb-8 flex justify-end">
                <div className="w-72 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-neutral-500">
                    <span>SUBTOTAL:</span>
                    <span className="text-neutral-900 font-medium">₹{fmtINR(liveSubtotal)}</span>
                  </div>

                  {taxLines.length > 0 ? (
                    taxLines.map((tl) => (
                      <div key={tl.id} className="flex justify-between text-neutral-500">
                        <span>{tl.tax_name} ({fmtINR(tl.rate)}%):</span>
                        <span className="text-neutral-900 font-medium">₹{fmtINR(tl.amount)}</span>
                      </div>
                    ))
                  ) : liveTax > 0 ? (
                    <div className="flex justify-between text-neutral-500">
                      <span>TAX (GST):</span>
                      <span className="text-neutral-900 font-medium">₹{fmtINR(liveTax)}</span>
                    </div>
                  ) : null}

                  {discount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>DISCOUNT:</span>
                      <span>- ₹{fmtINR(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t-2 border-neutral-950 pt-2 text-sm font-black text-neutral-950">
                    <span className="uppercase tracking-widest text-xs">TOTAL PAYABLE:</span>
                    <span>₹{fmtINR(liveTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modern Footer: Split Settlement & Studio Verification on Last Page OR Sub-bar on non-last page */}
        {chunk.isLastPage ? (
          <div className="mx-10 pb-10 border-t border-neutral-300 pt-8 grid grid-cols-2 gap-10 text-xs mt-auto break-inside-avoid totals-block signature-block">
            {/* Left: Wire Details & QR Code */}
            <div className="space-y-4">
              {hasBankDetails && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
                    SETTLEMENT & WIRE TRANSFER
                  </p>
                  <div className="space-y-1 font-mono text-neutral-600">
                    {Object.entries(bankDetails).map(([key, val]) =>
                      val && key !== "upi_id" ? (
                        <div key={key} className="flex gap-2">
                          <span className="text-neutral-400 min-w-[100px]">{BANK_LABELS[key] ?? key}:</span>
                          <span className="text-neutral-900">{val as string}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {upiId && upiUri && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="p-1 border border-neutral-900 bg-white">
                    <QRCodeSVG value={upiUri} size={64} level="M" />
                  </div>
                  <div className="font-mono text-[10px] space-y-0.5">
                    <span className="bg-neutral-950 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider block w-fit">
                      UPI SCAN & PAY
                    </span>
                    <p className="text-neutral-900 font-bold">{upiId}</p>
                    <p className="text-neutral-500">Instant scan via GPay / PhonePe / Paytm</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Notes & Studio Verification */}
            <div className="flex flex-col justify-between text-right">
              {invoice.notes && (
                <p className="text-neutral-500 italic whitespace-pre-line leading-relaxed">
                  {invoice.notes}
                </p>
              )}

              <div className="pt-8">
                <div className="w-48 ml-auto border-b border-neutral-400 pb-1" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
                  Studio Lead / Principal Architect
                </p>
                <p className="font-mono text-[9px] text-neutral-400 mt-0.5">
                  Digitally verified & approved for release
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-10 pb-6 pt-3 flex justify-between items-center text-[10px] font-mono text-neutral-400 border-t border-neutral-200 mt-auto">
            <span>{invoice.invoice_number || "INV-0000"} &middot; {companyName}</span>
            <span>PAGE {chunk.pageNumber} OF {chunk.totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
};
