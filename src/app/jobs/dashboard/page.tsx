"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fetchMyPostings, fetchDashboardStats, type JobPosting, type DashboardStats } from "@/domains/jobs/api";

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-surface-card border border-surface-200 rounded-2xl p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-1">{label}</p>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
  freelance: "Freelance", internship: "Internship",
};

export default function JobsDashboardPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMyPostings(), fetchDashboardStats()])
      .then(([jobsData, statsData]) => {
        setJobs(jobsData);
        setStats(statsData);
      })
      .catch(() => {
        setJobs([]);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link href="/jobs" className="text-sm text-surface-500 hover:text-primary mb-2 block transition-colors">← Back to Jobs</Link>
            <h1 className="text-3xl font-black text-primary tracking-tight">My Jobs Dashboard</h1>
            <p className="text-surface-500 mt-1">Manage your postings and review applicants.</p>
          </div>
          <Link
            href="/jobs/post"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Post a Job
          </Link>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-surface-card border border-surface-200 rounded-2xl p-6 h-28" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            <StatCard label="Total Postings" value={stats.total_postings} color="text-primary" />
            <StatCard label="Active" value={stats.active_postings} sub="live now" color="text-accent" />
            <StatCard label="Applications" value={stats.total_applications} sub="all time" color="text-blue-600" />
            <StatCard label="Pending" value={stats.pending_applications} sub="needs review" color="text-amber-600" />
            <StatCard label="Shortlisted" value={stats.shortlisted} sub="candidates" color="text-green-600" />
          </div>
        )}

        {/* My Postings Table */}
        <div>
          <h2 className="text-xl font-bold text-primary mb-5">My Postings</h2>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2].map(i => <div key={i} className="bg-surface-card border border-surface-200 rounded-2xl h-24" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-surface-card border border-surface-200 rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">📋</p>
              <h3 className="text-xl font-bold text-primary mb-2">No postings yet</h3>
              <p className="text-surface-500 mb-6">Create your first job posting and start finding talent.</p>
              <Link href="/jobs/post" className="px-8 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block">
                Post a Job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="bg-surface-card border border-surface-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div>
                        <h3 className="font-bold text-primary text-base">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 text-sm text-surface-500 mt-0.5">
                          <span>{JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                          <span>•</span>
                          <span>{job.location}{job.is_remote ? ' (Remote)' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-6 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-black text-2xl text-primary">{job.applications_count}</p>
                      <p className="text-xs text-surface-400 uppercase tracking-wider">Applicants</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-black text-2xl ${job.days_remaining <= 5 ? 'text-red-500' : 'text-surface-600'}`}>
                        {job.days_remaining}d
                      </p>
                      <p className="text-xs text-surface-400 uppercase tracking-wider">Left</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/jobs/dashboard/${job.id}/applicants`}
                        className="px-4 py-2 bg-accent/10 text-accent text-xs font-bold rounded-lg hover:bg-accent hover:text-primary transition-colors text-center"
                      >
                        View Applicants
                      </Link>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="px-4 py-2 bg-surface-100 text-surface-600 text-xs font-bold rounded-lg hover:bg-surface-200 transition-colors text-center"
                      >
                        View Posting
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
