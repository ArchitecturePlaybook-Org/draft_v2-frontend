"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/domains/projects/api";
import { reportsApi } from "@/domains/reports/api";
import type {
  ReportType,
  ReportAggregatePayload,
  ProjectReportSnapshot,
} from "@/domains/reports/types";
import { ProjectDetail } from "@/types/projects";
import { A4ReportView } from "@/components/reports/A4ReportView";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

export default function ProjectReportsHubPage() {
  const { id } = useParams();
  const router = useRouter();
  const projectUid = id as string;

  // Project meta
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [activeTab, setActiveTab] = useState<ReportType | "history">("daily");

  // Date filters
  const todayStr = new Date().toISOString().split("T")[0];
  const lastWeekStr = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];

  const [dailyDate, setDailyDate] = useState<string>(todayStr);
  const [weeklyStart, setWeeklyStart] = useState<string>(lastWeekStr);
  const [weeklyEnd, setWeeklyEnd] = useState<string>(todayStr);
  const [monthlyYear, setMonthlyYear] = useState<number>(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState<number>(new Date().getMonth() + 1);

  // Live aggregated data (~25KB payload)
  const [reportData, setReportData] = useState<ReportAggregatePayload | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  // Snapshot & History state
  const [snapshots, setSnapshots] = useState<ProjectReportSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<ProjectReportSnapshot | null>(null);

  // Modals
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveIsPublic, setSaveIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareSnapshot, setSelectedShareSnapshot] = useState<ProjectReportSnapshot | null>(null);
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);

  // 1. Initial Load: Project Details & History
  useEffect(() => {
    if (!projectUid) return;

    const loadProject = async () => {
      try {
        const p = await projectsApi.getProjectDetails(projectUid);
        setProject(p);
      } catch (err) {
        console.error("Failed to load project", err);
        toast.error("Failed to load project details");
      }
    };

    loadProject();
    loadSnapshots();
  }, [projectUid]);

  const loadSnapshots = async () => {
    if (!projectUid) return;
    setIsLoadingSnapshots(true);
    try {
      const list = await reportsApi.listSnapshots(projectUid);
      setSnapshots(list);
    } catch (err) {
      console.warn("Could not load snapshots", err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  // 2. Fetch Live Aggregated Report Data when tab or dates change
  const fetchAggregatedData = useCallback(async () => {
    if (!projectUid || activeTab === "history") return;
    setIsLoadingReport(true);
    try {
      let res;
      if (activeTab === "daily") {
        res = await reportsApi.getAggregate(projectUid, { type: "daily", date: dailyDate });
      } else if (activeTab === "weekly") {
        res = await reportsApi.getAggregate(projectUid, {
          type: "weekly",
          start_date: weeklyStart,
          end_date: weeklyEnd,
        });
      } else if (activeTab === "monthly") {
        res = await reportsApi.getAggregate(projectUid, {
          type: "monthly",
          year: monthlyYear,
          month: monthlyMonth,
        });
      } else if (activeTab === "overall") {
        res = await reportsApi.getAggregate(projectUid, { type: "overall" });
      }

      if (res?.data) {
        setReportData(res.data);
        setActiveSnapshot(null); // Return to live view
      }
    } catch (err: any) {
      console.error("Failed to fetch aggregate report", err);
      toast.error(err?.message || "Failed to aggregate report data");
    } finally {
      setIsLoadingReport(false);
    }
  }, [projectUid, activeTab, dailyDate, weeklyStart, weeklyEnd, monthlyYear, monthlyMonth]);

  useEffect(() => {
    fetchAggregatedData();
  }, [fetchAggregatedData]);

  // Pre-fill save title when opening save modal
  const handleOpenSaveModal = () => {
    const periodLabel = reportData?.period_label || todayStr;
    const typeLabel = activeTab.toUpperCase();
    setSaveTitle(`${project?.title || "Project"} - ${typeLabel} (${periodLabel})`);
    setSaveIsPublic(true);
    setIsSaveModalOpen(true);
  };

  // Save live report as persistent snapshot
  const handleSaveSnapshot = async () => {
    if (!reportData || !projectUid) return;
    setIsSaving(true);
    try {
      let pStart = todayStr;
      let pEnd = todayStr;
      if (activeTab === "daily") {
        pStart = dailyDate;
        pEnd = dailyDate;
      } else if (activeTab === "weekly") {
        pStart = weeklyStart;
        pEnd = weeklyEnd;
      } else if (activeTab === "monthly") {
        pStart = `${monthlyYear}-${String(monthlyMonth).padStart(2, "0")}-01`;
        pEnd = `${monthlyYear}-${String(monthlyMonth).padStart(2, "0")}-28`;
      }

      const created = await reportsApi.createSnapshot(projectUid, {
        report_type: activeTab as ReportType,
        title: saveTitle.trim() || `${activeTab.toUpperCase()} Snapshot`,
        period_start: pStart,
        period_end: pEnd,
        summary_data: reportData,
        is_public: saveIsPublic,
      });

      toast.success("Report snapshot saved successfully!");
      setIsSaveModalOpen(false);
      await loadSnapshots();

      // Open share modal immediately for user convenience
      setSelectedShareSnapshot(created);
      setIsShareModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save snapshot");
    } finally {
      setIsSaving(false);
    }
  };

  // 1-Click Access Toggle (Restrict vs Public)
  const handleToggleAccess = async (snapshot: ProjectReportSnapshot) => {
    setIsTogglingAccess(true);
    try {
      const res = await reportsApi.toggleAccess(projectUid, snapshot.id, !snapshot.is_public);
      const updatedSnapshots = snapshots.map((s) =>
        s.id === snapshot.id ? { ...s, is_public: res.is_public } : s
      );
      setSnapshots(updatedSnapshots);

      if (selectedShareSnapshot?.id === snapshot.id) {
        setSelectedShareSnapshot({ ...selectedShareSnapshot, is_public: res.is_public });
      }

      if (res.is_public) {
        toast.success("Client link is now PUBLIC and accessible.");
      } else {
        toast.warning("Access RESTRICTED. Clients will see 'Access Restricted' screen.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle access restriction");
    } finally {
      setIsTogglingAccess(false);
    }
  };

  // Copy share URL to clipboard
  const handleCopyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/share/report/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Public report link copied to clipboard!");
  };

  // Delete snapshot
  const handleDeleteSnapshot = async (id: number) => {
    if (!confirm("Are you sure you want to delete this saved snapshot?")) return;
    try {
      await reportsApi.deleteSnapshot(projectUid, id);
      toast.success("Snapshot deleted");
      if (activeSnapshot?.id === id) {
        setActiveSnapshot(null);
      }
      loadSnapshots();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete snapshot");
    }
  };

  // View historical snapshot in preview
  const handleViewSnapshot = (snapshot: ProjectReportSnapshot) => {
    setActiveSnapshot(snapshot);
    setReportData(snapshot.summary_data);
    setActiveTab(snapshot.report_type);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ─────────────────────────────────────────────────────────────
          TOP APP BAR (Hidden on print)
          ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 print:hidden">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Breadcrumbs & Title */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
              <Link href="/dashboard/projects" className="hover:text-slate-600 transition-colors">
                Projects
              </Link>
              <span>/</span>
              <Link href={`/dashboard/projects/${projectUid}`} className="hover:text-slate-600 transition-colors truncate max-w-[200px]">
                {project?.title || "Project"}
              </Link>
              <span>/</span>
              <span className="text-slate-700">Multi-Period Reports</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Project Report Hub</h1>
              {activeSnapshot && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  <span>Viewing Saved Snapshot:</span>
                  <span className="truncate max-w-[200px]">{activeSnapshot.title}</span>
                  <button
                    onClick={() => {
                      setActiveSnapshot(null);
                      fetchAggregatedData();
                    }}
                    className="ml-1 text-amber-700 hover:text-amber-900 font-black cursor-pointer"
                    title="Return to Live Data"
                  >
                    × Return to Live
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Save Snapshot Button */}
            {!activeSnapshot && (
              <button
                onClick={handleOpenSaveModal}
                disabled={isLoadingReport || !reportData}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                title="Save current report data snapshot to database"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Snapshot
              </button>
            )}

            {/* Share Client Link Button */}
            {activeSnapshot ? (
              <button
                onClick={() => {
                  setSelectedShareSnapshot(activeSnapshot);
                  setIsShareModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Client Share Link
              </button>
            ) : (
              snapshots.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedShareSnapshot(snapshots[0]);
                    setIsShareModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Latest Share Link
                </button>
              )
            )}

            {/* Vector PDF / Print Button */}
            <button
              onClick={() => window.print()}
              disabled={isLoadingReport || !reportData}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              title="Print or Save vector PDF via browser with zero server egress"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Download PDF / Print
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          PERIOD TABS & DATE SELECTOR BAR (Hidden on print)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 print:hidden">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveSnapshot(null);
                setReportData(null);
                setActiveTab("daily");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "daily" && !activeSnapshot
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📋 Daily (DPR)
            </button>
            <button
              onClick={() => {
                setActiveSnapshot(null);
                setReportData(null);
                setActiveTab("weekly");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "weekly" && !activeSnapshot
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📊 Weekly (WPR)
            </button>
            <button
              onClick={() => {
                setActiveSnapshot(null);
                setReportData(null);
                setActiveTab("monthly");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "monthly" && !activeSnapshot
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📈 Monthly (MPR)
            </button>
            <button
              onClick={() => {
                setActiveSnapshot(null);
                setReportData(null);
                setActiveTab("overall");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "overall" && !activeSnapshot
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🌐 Overall (OSR)
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                loadSnapshots();
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🕒 Snapshots</span>
              {snapshots.length > 0 && (
                <span className="inline-block px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-black">
                  {snapshots.length}
                </span>
              )}
            </button>
          </div>

          {/* Contextual Date Controls */}
          {activeTab !== "history" && !activeSnapshot && (
            <div className="flex items-center gap-2 text-xs">
              {activeTab === "daily" && (
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-semibold">Report Date:</label>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              )}

              {activeTab === "weekly" && (
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-semibold">Week Period:</label>
                  <input
                    type="date"
                    value={weeklyStart}
                    onChange={(e) => setWeeklyStart(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={weeklyEnd}
                    onChange={(e) => setWeeklyEnd(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              {activeTab === "monthly" && (
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-semibold">Month / Year:</label>
                  <select
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={monthlyYear}
                    onChange={(e) => setMonthlyYear(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              {activeTab === "overall" && (
                <div className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-md">
                  Inception to Date Live Synthesis
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT AREA
          ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        {/* SNAPSHOTS HISTORY TAB */}
        {activeTab === "history" ? (
          <div className="max-w-[900px] mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Saved Report Snapshots</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable records with public client sharing and restrict access control.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {snapshots.length} Snapshots
              </span>
            </div>

            {isLoadingSnapshots ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" label="Loading snapshots..." />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">
                  📁
                </div>
                <h3 className="text-sm font-bold text-slate-800">No snapshots saved yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click "Save Snapshot" on any Daily, Weekly, Monthly, or Overall report to persist an audit record.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {snapshots.map((s) => (
                  <div key={s.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                          {s.report_type}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">{s.title}</h4>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Period: {s.period_start} {s.period_start !== s.period_end ? `– ${s.period_end}` : ""}</span>
                        <span>•</span>
                        <span>Saved {new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Snapshot Actions & Access Toggle */}
                    <div className="flex items-center gap-2">
                      {/* Access Status Badge with Toggle */}
                      <button
                        onClick={() => handleToggleAccess(s)}
                        disabled={isTogglingAccess}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          s.is_public
                            ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                        }`}
                        title={s.is_public ? "Click to restrict client access" : "Click to allow public client access"}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.is_public ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span>{s.is_public ? "Public Access" : "Restricted"}</span>
                      </button>

                      {/* Share Link Button */}
                      <button
                        onClick={() => {
                          setSelectedShareSnapshot(s);
                          setIsShareModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        title="Share link"
                      >
                        Share
                      </button>

                      {/* View in Preview */}
                      <button
                        onClick={() => handleViewSnapshot(s)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Preview
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteSnapshot(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Delete snapshot"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* REPORT PREVIEW (A4 DOCUMENT) */
          <div>
            {isLoadingReport ? (
              <div className="py-24 flex justify-center">
                <Spinner size="lg" label={`Synthesizing ${activeTab.toUpperCase()} Data...`} />
              </div>
            ) : reportData ? (
              <A4ReportView
                reportType={activeTab as ReportType}
                data={reportData}
                projectMeta={{
                  title: project?.title || "Architecture Project",
                  project_code: project?.project_code,
                  client_name: project?.client_name,
                  location: project?.location,
                  status: project?.status,
                }}
              />
            ) : (
              <div className="text-center py-20 text-slate-500">
                Failed to load report data. Please select another date.
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: SAVE SNAPSHOT DIALOG
          ───────────────────────────────────────────────────────────── */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-1">
              Save Report Snapshot
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Persist this report as an immutable audit snapshot with an auto-generated client share token.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Snapshot Title</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Public access toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Make Publicly Shareable</span>
                  <span className="text-[11px] text-slate-500 block">
                    Clients can view via share link. You can restrict access anytime.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={saveIsPublic}
                  onChange={(e) => setSaveIsPublic(e.target.checked)}
                  className="w-4 h-4 text-slate-900 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSnapshot}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save Snapshot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: CLIENT SHARE LINK & RESTRICT ACCESS TOGGLE
          ───────────────────────────────────────────────────────────── */}
      {isShareModalOpen && selectedShareSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Public Client Share Link
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share this verified progress snapshot directly with clients or investors.
                </p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Access Restriction Toggle Banner */}
            <div className={`p-4 rounded-xl border mb-5 flex items-center justify-between ${
              selectedShareSnapshot.is_public
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-amber-50/70 border-amber-200"
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    selectedShareSnapshot.is_public ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`} />
                  <span className="text-xs font-black text-slate-900">
                    {selectedShareSnapshot.is_public ? "Link Status: Active & Public" : "Link Status: Access Restricted"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {selectedShareSnapshot.is_public
                    ? "Clients with the link can view and download this report."
                    : "Clients who open this link will see the 'Access Restricted' screen."}
                </p>
              </div>

              {/* 1-Click Toggle Button */}
              <button
                onClick={() => handleToggleAccess(selectedShareSnapshot)}
                disabled={isTogglingAccess}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  selectedShareSnapshot.is_public
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                }`}
              >
                {selectedShareSnapshot.is_public ? "Restrict Access" : "Enable Access"}
              </button>
            </div>

            {/* URL Display with Copy Button */}
            <div className="space-y-2 mb-6">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Shareable URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/report/${selectedShareSnapshot.share_token}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 select-all focus:outline-none"
                />
                <button
                  onClick={() => handleCopyShareLink(selectedShareSnapshot.share_token)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* Open in New Tab Button */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <a
                href={`/share/report/${selectedShareSnapshot.share_token}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Test Client View in New Tab</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
