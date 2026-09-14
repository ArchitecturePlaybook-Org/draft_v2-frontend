"use client";

import React from "react";
import type {
  ReportType,
  DailyReportData,
  WeeklyReportData,
  MonthlyReportData,
  OverallReportData,
  ReportAggregatePayload,
} from "@/domains/reports/types";

interface A4ReportViewProps {
  reportType: ReportType;
  data: ReportAggregatePayload;
  projectMeta?: {
    title: string;
    project_code?: string;
    client_name?: string;
    client_email?: string;
    location?: string;
    status?: string;
  };
}

export const A4ReportView: React.FC<A4ReportViewProps> = ({
  reportType,
  data,
  projectMeta,
}) => {
  const meta = {
    title: projectMeta?.title || "Architecture Project",
    code: projectMeta?.project_code || "PROJ-001",
    client: projectMeta?.client_name || "Client",
    location: projectMeta?.location || "Site Location",
    status: projectMeta?.status || "Active",
  };



  const getReportTitle = () => {
    switch (reportType) {
      case "daily":
        return "DAILY PROGRESS REPORT (DPR)";
      case "weekly":
        return "WEEKLY PROGRESS REPORT (WPR)";
      case "monthly":
        return "MONTHLY EXECUTIVE STATUS REPORT (MPR)";
      case "overall":
        return "OVERALL PROJECT AUDIT & STATUS (OSR)";
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="report-root w-full max-w-[900px] mx-auto text-slate-800 bg-white">
      {/* ─────────────────────────────────────────────────────────────
          PAGE 1: HEADER & EXECUTIVE SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="pdf-page bg-white p-8 sm:p-12 mb-8 shadow-md border border-slate-200 rounded-lg print:shadow-none print:border-none print:m-0 print:p-0 print:mb-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-6 mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse print:hidden"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                ARCHITECTURE PLAYBOOK \ REPORT SYSTEM
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight uppercase">
              {getReportTitle()}
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {meta.title} — <span className="font-mono text-slate-800">{meta.code}</span>
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded tracking-wide mb-1">
              {data.period_label}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Status: <span className="font-bold text-slate-800 uppercase">{meta.status}</span>
            </div>
          </div>
        </div>

        {/* Project Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 mb-8 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">Client</span>
            <span className="font-bold text-slate-800 truncate block">{meta.client}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">Location</span>
            <span className="font-bold text-slate-800 truncate block">{meta.location}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">Overall Progress</span>
            <span className="font-black text-emerald-600 text-sm">
              {data.kpis?.overall_progress_percent ?? 0}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">Generated Date</span>
            <span className="font-bold text-slate-800 block">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            PERIOD-SPECIFIC RENDERINGS
            ───────────────────────────────────────────────────────────── */}

        {/* 1. DAILY PROGRESS REPORT (DPR) */}
        {reportType === "daily" && (
          <DailyView data={data as DailyReportData} />
        )}

        {/* 2. WEEKLY PROGRESS REPORT (WPR) */}
        {reportType === "weekly" && (
          <WeeklyView data={data as WeeklyReportData} formatCurrency={formatCurrency} />
        )}

        {/* 3. MONTHLY PROGRESS REPORT (MPR) */}
        {reportType === "monthly" && (
          <MonthlyView data={data as MonthlyReportData} formatCurrency={formatCurrency} />
        )}

        {/* 4. OVERALL STATUS REPORT (OSR) */}
        {reportType === "overall" && (
          <OverallView data={data as OverallReportData} formatCurrency={formatCurrency} />
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-400 font-medium text-center sm:text-left">
          <span>Architecture Playbook • Cloud Reports Engine</span>
          <span className="hidden sm:inline">•</span>
          <span>Confidential Project Summary</span>
          <span className="hidden sm:inline">•</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: DAILY VIEW
   ───────────────────────────────────────────────────────────────────────── */
function DailyView({ data }: { data: DailyReportData }) {
  if (!data || data.report_type !== "daily") return null;

  const weather = data.weather || {
    weather: "Clear",
    sky_conditions: "Clear",
    site_conditions: "Normal",
    weather_delay: false,
    diary_status: "No Diary",
    notes: "",
  };
  const labor = data.labor || { total_headcount: 0, total_man_hours: 0, entries: [] };
  const equipment = data.equipment || [];
  const materials = data.materials || [];
  const delays = data.delays || [];
  const tasks = data.tasks || [];
  const photos = data.photos || [];

  return (
    <div className="space-y-6">
      {/* DPR Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Today's Manpower</span>
          <span className="text-xl font-black text-emerald-950">{labor.total_headcount}</span>
          <span className="text-[10px] text-emerald-700 block font-medium">Headcount on site</span>
        </div>
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Total Hours</span>
          <span className="text-xl font-black text-blue-950">{labor.total_man_hours}</span>
          <span className="text-[10px] text-blue-700 block font-medium">Productive Man-hours</span>
        </div>
        <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Active Tasks</span>
          <span className="text-xl font-black text-purple-950">{tasks.length}</span>
          <span className="text-[10px] text-purple-700 block font-medium">Logged in execution</span>
        </div>
        <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Site Status</span>
          <span className="text-sm font-black text-amber-950 truncate block mt-1">
            {weather.weather_delay ? "Weather Delay" : (weather.site_conditions || "Normal Ops")}
          </span>
          <span className="text-[10px] text-amber-700 block font-medium">{weather.sky_conditions || "Clear"}</span>
        </div>
      </div>

      {/* Weather & Site Conditions Bar */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Weather</span>
            <span className="font-bold text-slate-800">{weather.weather || "Clear / Sunny"}</span>
          </div>
          {weather.temperature_c !== null && weather.temperature_c !== undefined && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Temp</span>
              <span className="font-bold text-slate-800">{weather.temperature_c}°C</span>
            </div>
          )}
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Sky</span>
            <span className="font-bold text-slate-800">{weather.sky_conditions || "Clear"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Diary Logged</span>
            <span className={`font-bold ${weather.diary_status?.toLowerCase().includes("no") ? "text-slate-500" : "text-emerald-700"}`}>
              {weather.diary_status}
            </span>
          </div>
        </div>
        {weather.notes && (
          <div className="w-full pt-2 border-t border-slate-200 text-slate-600 italic">
            "{weather.notes}"
          </div>
        )}
      </div>

      {/* Delays Alert if any */}
      {delays.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-xs font-black text-red-700 uppercase tracking-wide block mb-1">
            ⚠️ Site Delays Recorded ({delays.length})
          </span>
          <div className="space-y-1">
            {delays.map((d, i) => (
              <div key={i} className="text-xs text-red-900 flex justify-between">
                <span><strong>{d.delay_type}</strong>: {d.impacted_path || "Site activity impacted"}</span>
                <span className="font-bold">{d.duration_hours} hrs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manpower & Labor Table */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex justify-between">
          <span>Manpower & Crew Allocation</span>
          <span className="text-slate-500 font-medium">Headcount: {labor.total_headcount}</span>
        </h3>
        {labor.entries.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Crew / Subcontractor</th>
                  <th className="py-2 px-3">Trade</th>
                  <th className="py-2 px-3">Headcount</th>
                  <th className="py-2 px-3">Hours</th>
                  <th className="py-2 px-3">Zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labor.entries.map((lab, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{lab.crew_name || "General Crew"}</td>
                    <td className="py-2 px-3 text-slate-600">{lab.trade_type}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{lab.headcount}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{lab.total_hours}</td>
                    <td className="py-2 px-3 text-slate-500">{lab.zone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded text-center text-xs text-slate-400">
            No specific labor breakdown entries logged for this date.
          </div>
        )}
      </div>

      {/* Equipment & Material Deliveries (Split 2-col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Equipment */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Equipment & Plant ({equipment.length})
          </h3>
          {equipment.length > 0 ? (
            <div className="space-y-1.5 border border-slate-200 rounded-lg p-2.5 bg-white">
              {equipment.map((eq, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="font-semibold text-slate-800">{eq.equipment_id}</span>
                  <div className="text-[11px] text-slate-500 font-mono">
                    <span className="text-emerald-600 font-bold">{eq.hours_operated}h run</span> /{" "}
                    <span className="text-slate-400">{eq.hours_idle}h idle</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center text-[11px] text-slate-400">
              No heavy plant activity today.
            </div>
          )}
        </div>

        {/* Material Deliveries */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Material Deliveries ({materials.length})
          </h3>
          {materials.length > 0 ? (
            <div className="space-y-1.5 border border-slate-200 rounded-lg p-2.5 bg-white">
              {materials.map((mat, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="font-semibold text-slate-800 block">{mat.description}</span>
                    <span className="text-[10px] text-slate-400">{mat.supplier || "Supplier"} • #{mat.ticket_number || "N/A"}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {mat.quantity} {mat.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center text-[11px] text-slate-400">
              No deliveries logged today.
            </div>
          )}
        </div>
      </div>

      {/* Tasks Worked On Today */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex justify-between items-center">
          <span>Active & Completed Tasks ({tasks.length})</span>
          <span className="text-[11px] text-slate-500 font-medium">Milestone Matrix Links</span>
        </h3>
        {tasks.length > 0 ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3">Task Title</th>
                  <th className="py-2 px-3">Phase / Zone</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500 text-[11px]">{t.task_code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{t.title}</td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {t.phase_name} {t.zone_name ? `• ${t.zone_name}` : ""}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === "DONE"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.status === "WIP"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded text-center text-xs text-slate-400">
            No specific tasks logged for this day.
          </div>
        )}
      </div>

      {/* Geotagged Site Verification Photos */}
      {photos.length > 0 && (
        <div className="break-inside-avoid">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Site Grid Verification Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img src={p.url} alt={p.caption || "Site photo"} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    Grid {p.grid_cell || "A1"}
                  </span>
                </div>
                <div className="p-2 text-[11px]">
                  <p className="font-semibold text-slate-800 truncate">{p.caption || "Site inspection verification"}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{p.floor_plan_title || "Floor Plan"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: WEEKLY VIEW
   ───────────────────────────────────────────────────────────────────────── */
function WeeklyView({ data, formatCurrency }: { data: WeeklyReportData; formatCurrency: (v: number) => string }) {
  if (!data || data.report_type !== "weekly") return null;

  const kpis = data.kpis || {
    overall_progress_percent: 0,
    weekly_delta_percent: 0,
    completed_this_week: 0,
    total_tasks: 0,
    weekly_man_hours: 0,
  };
  const phases = data.phases || [];
  const trades = data.trades || [];
  const tasks = data.tasks || [];
  const photos = data.photos || [];

  return (
    <div className="space-y-6">
      {/* Weekly KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Weekly Delta</span>
          <span className="text-xl font-black text-blue-950">+{kpis.weekly_delta_percent}%</span>
          <span className="text-[10px] text-blue-700 block font-medium">Sprint progress gain</span>
        </div>
        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Tasks Completed</span>
          <span className="text-xl font-black text-emerald-950">{kpis.completed_this_week}</span>
          <span className="text-[10px] text-emerald-700 block font-medium">Out of {kpis.total_tasks} total</span>
        </div>
        <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Weekly Man-Hours</span>
          <span className="text-xl font-black text-purple-950">{kpis.weekly_man_hours}</span>
          <span className="text-[10px] text-purple-700 block font-medium">Cumulative site work</span>
        </div>
        <div className="p-3 bg-slate-900 text-white rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Progress</span>
          <span className="text-xl font-black text-emerald-400">{kpis.overall_progress_percent}%</span>
          <span className="text-[10px] text-slate-400 block font-medium">Project status</span>
        </div>
      </div>

      {/* Milestone Phases Progress Bars */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
          Milestone Phases Breakdown
        </h3>
        <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          {phases.map((ph) => (
            <div key={ph.id}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-800">{ph.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {ph.completed_tasks} / {ph.total_tasks} tasks ({ph.progress_percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${ph.progress_percent}%`,
                    backgroundColor: ph.color_hex || "#3b82f6",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Allocation & Tasks Completed (Split 2-col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Trade Headcount & Hours */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Weekly Hours by Trade
          </h3>
          {trades.length > 0 ? (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
              {trades.map((tr, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="font-semibold text-slate-800">{tr.trade}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{tr.hours} hrs</span>
                    <span className="text-[10px] text-slate-400 block">({tr.headcount} workers)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded text-center text-xs text-slate-400">
              No trade labor entries logged for this period.
            </div>
          )}
        </div>

        {/* Tasks Done This Week */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Tasks in Focus This Week ({tasks.length})
          </h3>
          {tasks.length > 0 ? (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white max-h-[260px] overflow-y-auto">
              {tasks.map((t) => (
                <div key={t.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-900 truncate block">{t.title}</span>
                    <span className="text-[10px] text-slate-400">{t.phase_name || "General"}</span>
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    t.status === "DONE" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded text-center text-xs text-slate-400">
              No tasks updated during this week.
            </div>
          )}
        </div>
      </div>

      {/* Weekly Photo Highlights */}
      {photos.length > 0 && (
        <div className="break-inside-avoid">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Weekly Progress Verification Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((p, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img src={p.url} alt={p.caption || "Site photo"} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    Grid {p.grid_cell || "A1"}
                  </span>
                </div>
                <div className="p-2 text-[10px]">
                  <p className="font-semibold text-slate-800 truncate">{p.caption || "Weekly progress snapshot"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: MONTHLY VIEW
   ───────────────────────────────────────────────────────────────────────── */
function MonthlyView({ data, formatCurrency }: { data: MonthlyReportData; formatCurrency: (v: number) => string }) {
  if (!data || data.report_type !== "monthly") return null;

  const kpis = data.kpis || {
    overall_progress_percent: 0,
    tasks_completed_in_month: 0,
    total_tasks: 0,
    monthly_invoiced: 0,
    total_invoiced_cumulative: 0,
    total_paid_cumulative: 0,
    outstanding_balance: 0,
  };
  const compliance = data.compliance || {
    total_ncrs: 0,
    closed_ncrs: 0,
    open_ncrs: 0,
    safety_incidents: 0,
    safe_work_hours: "12,400+ Hours (Zero LTI)",
  };
  const phases = data.phases || [];
  const photos = data.photos || [];

  return (
    <div className="space-y-6">
      {/* Monthly Financial & Progress KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Month Invoiced</span>
          <span className="text-lg font-black text-emerald-950 truncate block mt-0.5">
            {formatCurrency(kpis.monthly_invoiced)}
          </span>
          <span className="text-[10px] text-emerald-700 block font-medium">Billed in {data.period_label}</span>
        </div>
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Cumulative Invoiced</span>
          <span className="text-lg font-black text-blue-950 truncate block mt-0.5">
            {formatCurrency(kpis.total_invoiced_cumulative)}
          </span>
          <span className="text-[10px] text-blue-700 block font-medium">Total billed to date</span>
        </div>
        <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Outstanding Balance</span>
          <span className="text-lg font-black text-purple-950 truncate block mt-0.5">
            {formatCurrency(kpis.outstanding_balance)}
          </span>
          <span className="text-[10px] text-purple-700 block font-medium">Receivables balance</span>
        </div>
        <div className="p-3 bg-slate-900 text-white rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Progress</span>
          <span className="text-xl font-black text-emerald-400">{kpis.overall_progress_percent}%</span>
          <span className="text-[10px] text-slate-400 block font-medium">
            {kpis.tasks_completed_in_month} tasks done this month
          </span>
        </div>
      </div>

      {/* Compliance & Quality Assurance (HSE & NCRs) */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
          Quality & HSE Compliance Matrix
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Quality NCRs Logged</span>
            <span className="text-sm font-bold text-slate-800">{compliance.total_ncrs} Non-conformances</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">NCRs Rectified</span>
            <span className="text-sm font-bold text-emerald-700">{compliance.closed_ncrs} Closed</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Safety Incidents</span>
            <span className="text-sm font-bold text-slate-800">{compliance.safety_incidents} Incidents</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Safety Record</span>
            <span className="text-sm font-bold text-emerald-700">{compliance.safe_work_hours}</span>
          </div>
        </div>
      </div>

      {/* Milestone Phases */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
          Milestone Phases Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {phases.map((ph) => (
            <div key={ph.id} className="p-3 border border-slate-200 rounded-lg bg-white">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-slate-800">{ph.name}</span>
                <span className="font-mono text-slate-600 font-bold">{ph.progress_percent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ph.progress_percent}%`, backgroundColor: ph.color_hex || "#3b82f6" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Verification Photos */}
      {photos.length > 0 && (
        <div className="break-inside-avoid">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Monthly Progress Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img src={p.url} alt={p.caption || "Site photo"} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    Grid {p.grid_cell || "A1"}
                  </span>
                </div>
                <div className="p-2 text-[10px]">
                  <p className="font-semibold text-slate-800 truncate">{p.caption || "Monthly milestone"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: OVERALL VIEW
   ───────────────────────────────────────────────────────────────────────── */
function OverallView({ data, formatCurrency }: { data: OverallReportData; formatCurrency: (v: number) => string }) {
  if (!data || data.report_type !== "overall") return null;

  const kpis = data.kpis || {
    overall_progress_percent: 0,
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    total_invoiced: 0,
    total_paid: 0,
    outstanding_balance: 0,
  };
  const phases = data.phases || [];
  const zones = data.zones || [];
  const floor_plans = data.floor_plans || [];
  const photos = data.photos || [];

  return (
    <div className="space-y-6">
      {/* High Level All-Time KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">All-Time Progress</span>
          <span className="text-2xl font-black text-emerald-950">{kpis.overall_progress_percent}%</span>
          <span className="text-[10px] text-emerald-700 block font-medium">
            {kpis.completed_tasks} / {kpis.total_tasks} tasks done
          </span>
        </div>
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Invoiced Total</span>
          <span className="text-lg font-black text-blue-950 truncate block mt-0.5">
            {formatCurrency(kpis.total_invoiced)}
          </span>
          <span className="text-[10px] text-blue-700 block font-medium">Billed across project</span>
        </div>
        <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Paid Total</span>
          <span className="text-lg font-black text-purple-950 truncate block mt-0.5">
            {formatCurrency(kpis.total_paid)}
          </span>
          <span className="text-[10px] text-purple-700 block font-medium">Collections to date</span>
        </div>
        <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Balance Due</span>
          <span className="text-lg font-black text-amber-950 truncate block mt-0.5">
            {formatCurrency(kpis.outstanding_balance)}
          </span>
          <span className="text-[10px] text-amber-700 block font-medium">Pending settlement</span>
        </div>
      </div>

      {/* Spatial Zones Breakdown */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
          Spatial Zones Execution Audit ({zones.length} Zones)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {zones.map((zn) => (
            <div key={zn.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-900">{zn.name}</span>
                <span className="font-mono text-slate-600 font-bold">{zn.progress_percent}%</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
                <span className="capitalize">{zn.zone_type || "Zone"}</span>
                <span>{zn.completed_tasks} / {zn.total_tasks} tasks</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full"
                  style={{ width: `${zn.progress_percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Phases Breakdown */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
          Master Milestone Phases
        </h3>
        <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-white">
          {phases.map((ph) => (
            <div key={ph.id} className="py-1">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-800">{ph.name}</span>
                <span className="font-mono text-slate-600 text-[11px] font-bold">
                  {ph.completed_tasks} / {ph.total_tasks} ({ph.progress_percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ph.progress_percent}%`, backgroundColor: ph.color_hex || "#10b981" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registered Blueprints / Floor Plans */}
      {floor_plans.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            CAD Blueprints & Floor Plans ({floor_plans.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {floor_plans.map((fp) => {
              const isTimestamp = /^\d{10,}$/.test(fp.title);
              const cleanTitle = isTimestamp ? `Blueprint Sheet #${fp.id}` : fp.title.replace(/[-_]/g, " ");
              return (
                <div key={fp.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-slate-800 truncate capitalize">{cleanTitle}</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded shrink-0">
                    {fp.photos_count > 0 ? `${fp.photos_count} photos` : "Plan Sheet"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All-Time Photos Gallery */}
      {photos.length > 0 && (
        <div className="break-inside-avoid">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Project Visual Archive ({photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((p, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img src={p.url} alt={p.caption || "Site photo"} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    Grid {p.grid_cell || "A1"}
                  </span>
                </div>
                <div className="p-2 text-[10px]">
                  <p className="font-semibold text-slate-800 truncate">{p.caption || "Site record"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
