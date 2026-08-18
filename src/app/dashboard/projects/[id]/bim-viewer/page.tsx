"use client";

import React from "react";
import dynamic from "next/dynamic";

const BimViewerPageClient = dynamic(
  () => import("@/components/bim/BimViewerPageClient"),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-[#07090e] flex flex-col items-center justify-center text-amber-400 font-sans gap-3">
        <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
        <p className="text-sm font-bold tracking-wider uppercase">Loading OpenBIM 3D Engine…</p>
      </div>
    ),
  }
);

export default function BimViewerPage() {
  return <BimViewerPageClient />;
}
