"use client";

import React from "react";
import { Check, ChevronLeft } from "lucide-react";
import { useTurnkeyStore } from "@/store/turnkey-store";

// ─── Stage Definitions ────────────────────────────────────────────────────────

const STAGES: { id: 1 | 2 | 3 | 4; label: string; shortLabel: string; icon: string; description: string }[] = [
  { id: 1, label: "Calibrate",        shortLabel: "Scale",     icon: "📐", description: "Set drawing scale" },
  { id: 2, label: "Building Shell",   shortLabel: "Shell",     icon: "🏗️", description: "Trace outer footprint" },
  { id: 3, label: "Room Finishes",    shortLabel: "Rooms",     icon: "🛋️", description: "Trace individual rooms" },
  { id: 4, label: "Full Estimate",    shortLabel: "Estimate",  icon: "📊", description: "Turnkey BOQ output" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TurnkeyStepperHeader() {
  const { currentStage, setStage, calibrationDone, shellDone } = useTurnkeyStore();

  const isStageAccessible = (id: number) => {
    if (id === 1) return true;
    if (id === 2) return calibrationDone;
    if (id === 3) return shellDone;
    if (id === 4) return shellDone;
    return false;
  };

  return (
    <div className="w-full border-b border-surface-200 dark:border-white/10 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-xl px-4 py-3 shrink-0">
      <div className="max-w-4xl mx-auto flex items-center gap-2">

        {/* Back button */}
        {currentStage > 1 && (
          <button
            onClick={() => setStage((currentStage - 1) as 1 | 2 | 3 | 4)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-surface-400 hover:text-foreground hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer shrink-0 mr-1"
            title="Go to previous step"
          >
            <ChevronLeft size={13} />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {/* Step Pills */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {STAGES.map((stage, idx) => {
            const isCompleted  = stage.id < currentStage;
            const isCurrent    = stage.id === currentStage;
            const isAccessible = isStageAccessible(stage.id);
            const isFuture     = stage.id > currentStage;

            return (
              <React.Fragment key={stage.id}>
                {/* Stage pill */}
                <button
                  onClick={() => {
                    if (isAccessible && !isFuture) setStage(stage.id);
                  }}
                  disabled={isFuture || !isAccessible}
                  title={stage.description}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
                    transition-all duration-200 shrink-0
                    ${isCurrent
                      ? 'bg-accent text-background shadow-md shadow-accent/20'
                      : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 cursor-pointer'
                        : 'text-surface-400 cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  {isCompleted
                    ? <Check size={11} className="stroke-[3px] shrink-0" />
                    : <span className="text-[12px] leading-none shrink-0">{stage.icon}</span>
                  }
                  <span className="hidden sm:inline truncate max-w-[80px]">{stage.label}</span>
                  <span className="sm:hidden">{stage.shortLabel}</span>
                </button>

                {/* Connector line */}
                {idx < STAGES.length - 1 && (
                  <div className={`h-px flex-1 min-w-[8px] max-w-[40px] rounded transition-colors duration-300 ${
                    isCompleted ? 'bg-emerald-400' : 'bg-surface-200 dark:bg-surface-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Stage description (right side) */}
        <div className="hidden md:flex flex-col items-end shrink-0 ml-2">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-surface-400">
            Step {currentStage} of 4
          </span>
          <span className="text-[11px] font-bold text-foreground">
            {STAGES.find(s => s.id === currentStage)?.description}
          </span>
        </div>

      </div>
    </div>
  );
}
