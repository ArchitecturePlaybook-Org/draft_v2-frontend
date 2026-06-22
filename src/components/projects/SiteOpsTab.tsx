"use client";

import React, { useState, useEffect } from "react";
import HSEScorecard from "@/components/HSEScorecard";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const MasterFieldDiary = dynamic(
  () => import("@/components/projects/MasterFieldDiary").then((mod) => mod.MasterFieldDiary),
  { loading: () => <div className="p-8 text-center text-surface-500 animate-pulse bg-white rounded-2xl border border-surface-200">Loading Master Field Diary...</div> }
);

interface SiteOpsTabProps {
  projectUid: string;
  projectTasks: any[]; // Or proper Task[] type
  fetchProject: () => void;
  // Temporary pass-through of the old issues render function
  renderIssues?: () => React.ReactNode;
}

export const SiteOpsTab: React.FC<SiteOpsTabProps> = ({ projectUid, projectTasks, fetchProject, renderIssues }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subtabParam = searchParams.get("subtab");

  const [activeSubTab, setActiveSubTab] = useState<"issues" | "hse" | "diary">(
    (subtabParam as any) || "issues"
  );

  useEffect(() => {
    if (subtabParam && subtabParam !== activeSubTab) {
      setActiveSubTab(subtabParam as any);
    }
  }, [subtabParam]);

  const handleTabChange = (tab: "issues" | "hse" | "diary") => {
    setActiveSubTab(tab);
    // Deep linking update
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "site_ops");
    params.set("subtab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Sub-Navigation Pills */}
      <div className="tab-pills mb-6">
        <button 
          onClick={() => handleTabChange("issues")}
          className={`tab-pill ${activeSubTab === "issues" ? "active" : ""}`}
        >
          🔴 Issues & Punch List
        </button>
        <button 
          onClick={() => handleTabChange("hse")}
          className={`tab-pill ${activeSubTab === "hse" ? "active" : ""}`}
        >
          🛡️ HSE Scorecard
        </button>
        <button 
          onClick={() => handleTabChange("diary")}
          className={`tab-pill ${activeSubTab === "diary" ? "active" : ""}`}
        >
          📖 Diaries
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeSubTab === "issues" && (
          <div>
            {renderIssues ? renderIssues() : <div className="p-8 bg-white rounded-2xl border border-surface-200">Issues Tracker Loading...</div>}
          </div>
        )}

        {activeSubTab === "hse" && (
          <div>
            <HSEScorecard projectId={projectUid} />
          </div>
        )}

        {activeSubTab === "diary" && (
          <div className="animate-fade-in">
            <MasterFieldDiary projectId={projectUid} />
          </div>
        )}
      </div>
    </div>
  );
};
