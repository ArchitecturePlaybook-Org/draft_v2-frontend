"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fetchJobApplicants, updateApplicationStatus, type Application } from "@/domains/jobs/api";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  shortlisted: { label: "Shortlisted ⭐", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  rejected: { label: "Not Proceeding", bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  hired: { label: "Hired 🎉", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

export default function ApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    fetchJobApplicants(Number(jobId))
      .then((data) => {
        setApplications(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleStatusChange = async (appId: number, newStatus: Application['status']) => {
    setUpdating(true);
    try {
      const updated = await updateApplicationStatus(appId, newStatus);
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
      if (selected?.id === appId) setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link href="/jobs/dashboard" className="text-sm text-surface-500 hover:text-primary mb-2 block transition-colors">← My Dashboard</Link>
          <h1 className="text-3xl font-black text-primary">Applicants</h1>
          <p className="text-surface-500 mt-1">
            {loading ? 'Loading...' : `${applications.length} application${applications.length !== 1 ? 's' : ''} received`}
          </p>
        </div>

        {/* Status summary pills */}
        {!loading && applications.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {(Object.keys(STATUS_CONFIG) as Application['status'][]).map((s) => {
              const count = applications.filter((a) => a.status === s).length;
              if (count === 0) return null;
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className={`px-4 py-2 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}: {count}
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-12 text-center animate-pulse">
            <div className="h-6 bg-surface-200 rounded w-1/3 mx-auto" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-12 text-center">
            <p className="text-5xl mb-4">📭</p>
            <h3 className="text-xl font-bold text-primary mb-2">No applicants yet</h3>
            <p className="text-surface-500">Share your job posting to attract candidates.</p>
            <Link href={`/jobs/${jobId}`} className="inline-block mt-6 px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors text-sm">
              View Job Posting
            </Link>
          </div>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-280px)]">

            {/* Left: Applicant List */}
            <div className="w-80 shrink-0 overflow-y-auto space-y-2">
              {applications.map((app) => {
                const cfg = STATUS_CONFIG[app.status];
                const isSelected = selected?.id === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelected(app)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? 'bg-primary text-background border-primary' : 'bg-surface-card border-surface-200 hover:border-accent/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {app.applicant_avatar ? (
                          <img src={app.applicant_avatar} alt={app.applicant_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-surface-400'}`}>
                            {app.applicant_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-background' : 'text-primary'}`}>
                          {app.applicant_name}
                        </p>
                        <p className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-surface-400'}`}>
                          {app.applicant_email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isSelected ? 'bg-surface-card/20 text-white border-white/30' : `${cfg.bg} ${cfg.text} ${cfg.border}`}`}>
                        {cfg.label}
                      </span>
                      <span className={`text-[10px] ${isSelected ? 'text-white/60' : 'text-surface-400'}`}>
                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Applicant Detail */}
            {selected && (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-surface-card border border-surface-200 rounded-2xl p-8 h-full">
                  {/* Applicant Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-surface-100 border border-surface-200 overflow-hidden flex items-center justify-center">
                        {selected.applicant_avatar ? (
                          <img src={selected.applicant_avatar} alt={selected.applicant_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-surface-300">
                            {selected.applicant_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-primary">{selected.applicant_name}</h2>
                        <p className="text-surface-500 text-sm">{selected.applicant_email}</p>
                        <p className="text-surface-400 text-xs mt-1">
                          Applied {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div>
                      {(() => {
                        const cfg = STATUS_CONFIG[selected.status];
                        return (
                          <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Cover Message */}
                  <div className="mb-8 p-6 bg-surface-50 rounded-xl border border-surface-200">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">Cover Message</h3>
                    <p className="text-surface-700 leading-relaxed whitespace-pre-wrap text-sm">{selected.cover_message}</p>
                  </div>

                  {/* Action Buttons */}
                  <div>
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Update Status</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(Object.entries(STATUS_CONFIG) as [Application['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([s, cfg]) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(selected.id, s)}
                          disabled={updating || selected.status === s}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
                            ${selected.status === s
                              ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ${s === 'shortlisted' ? 'ring-green-400' : s === 'hired' ? 'ring-blue-400' : s === 'rejected' ? 'ring-red-400' : 'ring-amber-400'}`
                              : 'border-surface-200 text-surface-600 hover:border-primary hover:text-primary'}`}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
