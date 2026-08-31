"use client";

import React from "react";
import { useTurnkeyStore } from "@/store/turnkey-store";
import { TurnkeyStepperHeader } from "@/components/boq/turnkey/TurnkeyStepperHeader";
import { Stage1CalibrationView } from "@/components/boq/turnkey/Stage1CalibrationView";
import { Stage2ShellExtractor } from "@/components/boq/turnkey/Stage2ShellExtractor";
import { Stage3RoomAssembler } from "@/components/boq/turnkey/Stage3RoomAssembler";
import { Stage4TurnkeyResults } from "@/components/boq/turnkey/Stage4TurnkeyResults";

export default function BOQTurnkeyStudioPage() {
  const { currentStage } = useTurnkeyStore();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      {/* 1. Persistent 4-Stage Stepper Header */}
      <TurnkeyStepperHeader />

      {/* 2. Dynamic Progressive Stage View */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {currentStage === 1 && <Stage1CalibrationView />}
        {currentStage === 2 && <Stage2ShellExtractor />}
        {currentStage === 3 && <Stage3RoomAssembler />}
        {currentStage === 4 && <Stage4TurnkeyResults />}
      </main>
    </div>
  );
}
