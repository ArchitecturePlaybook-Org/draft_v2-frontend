"use client";
import React from "react";
import { Check, Columns3, Grid3X3, SplitSquareVertical } from "lucide-react";
import type { InvoiceTemplate } from "@/domains/invoices/types";
export type { InvoiceTemplate };

const TEMPLATES: {
  id: InvoiceTemplate;
  name: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "classic",
    name: "Ledger",
    badge: "Architectural Grid",
    description: "Boxed structural lines, 2-column dossier, SAC codes, Amount in Words & Signatory seal.",
    icon: <Grid3X3 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />,
  },
  {
    id: "modern",
    name: "Studio",
    badge: "Asymmetric Bauhaus",
    description: "Bold asymmetric header, financial metric strip, airy tabular lines & UPI QR module.",
    icon: <SplitSquareVertical className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />,
  },
  {
    id: "minimal",
    name: "Editorial",
    badge: "Columnar Monograph",
    description: "Stark 3-column index, generous whitespace, border-y table & understated typography.",
    icon: <Columns3 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />,
  },
];

interface Props {
  selected: InvoiceTemplate;
  onChange: (t: InvoiceTemplate) => void;
}

export const InvoiceTemplatePicker: React.FC<Props> = ({ selected, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {TEMPLATES.map((t) => {
        const isSelected = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
              isSelected
                ? "border-accent bg-accent/10 shadow-sm ring-1 ring-accent/20"
                : "border-surface-200 hover:border-surface-300 bg-surface-50"
            }`}
          >
            {isSelected && (
              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center shadow-sm">
                <Check className="w-2.5 h-2.5 text-background" />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-surface-card border border-surface-200 text-foreground">
                {t.icon}
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-200 text-foreground">
                {t.badge}
              </span>
            </div>
            <p className="text-xs font-black text-foreground mt-0.5">{t.name}</p>
            <p className="text-[10px] text-surface-400 leading-snug">
              {t.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
