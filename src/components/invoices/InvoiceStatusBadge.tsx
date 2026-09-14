"use client";

import React from "react";
import type { InvoiceStatus } from "@/domains/invoices/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/domains/invoices/types";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: "sm" | "md";
  pulse?: boolean;
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({
  status,
  size = "md",
  pulse = false,
}) => {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  const sizeClasses =
    size === "sm"
      ? "text-[9px] px-1.5 py-0.5 gap-1"
      : "text-[10px] px-2 py-0.5 gap-1.5";

  const dotColors: Record<InvoiceStatus, string> = {
    DRAFT:     "bg-surface-400",
    SENT:      "bg-blue-500",
    PAID:      "bg-emerald-500",
    OVERDUE:   "bg-red-500",
    CANCELLED: "bg-surface-300",
  };

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[status]} ${
          pulse && status === "SENT" ? "animate-pulse" : ""
        }`}
      />
      {label}
    </span>
  );
};
