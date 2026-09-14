"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { reportsApi } from "@/domains/reports/api";
import type { PublicReportResponse } from "@/domains/reports/types";
import { A4ReportView } from "@/components/reports/A4ReportView";
import { Spinner } from "@/components/ui/Spinner";

export default function PublicReportSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [report, setReport] = useState<PublicReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchReport = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await reportsApi.getPublicReport(token);
        if (data.restricted) {
          setIsRestricted(true);
        } else {
          setReport(data);
          if (typeof document !== "undefined") {
            document.title = `${data.title} - ${data.project_code || "Report"}`;
          }
        }
      } catch (err: any) {
        if (err?.status === 403 || err?.message?.includes("restricted")) {
          setIsRestricted(true);
        } else {
          setErrorMsg(err?.message || "Report could not be loaded or token is invalid.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" label="Loading Project Report..." />
      </div>
    );
  }

  // Restricted Access State
  if (isRestricted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Access Restricted</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Access to this project report has been temporarily restricted by the Project Manager.
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
            Please contact the architectural team or project coordinator if you require access to this document.
          </div>
        </div>
      </div>
    );
  }

  // Not Found / Error State
  if (errorMsg || !report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Report Not Available</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {errorMsg || "This report link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  // Active Public Report View
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 sm:py-8 px-4 sm:px-6 transition-colors">
      {/* Dedicated Client Top Header Bar (hidden when printing) */}
      <header className="max-w-[900px] mx-auto mb-6 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Verified Client Document
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                {report.project_code}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {report.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Project: <span className="font-semibold text-slate-700 dark:text-slate-300">{report.project_title}</span>
              {report.client_name ? ` • Prepared for: ${report.client_name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Download PDF / Print
            </button>
          </div>
        </div>
      </header>

      {/* A4 Report Presentation */}
      <A4ReportView
        reportType={report.report_type}
        data={report.summary_data}
        projectMeta={{
          title: report.project_title,
          project_code: report.project_code,
          client_name: report.client_name,
        }}
      />
    </div>
  );
}
