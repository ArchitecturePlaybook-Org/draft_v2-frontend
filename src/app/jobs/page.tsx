"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fetchJobs, type JobPosting } from "@/domains/jobs/api";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  principal: "Principal",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  full_time: "bg-blue-50 text-blue-700 border-blue-200",
  part_time: "bg-purple-50 text-purple-700 border-purple-200",
  contract: "bg-amber-50 text-amber-700 border-amber-200",
  freelance: "bg-green-50 text-green-700 border-green-200",
  internship: "bg-pink-50 text-pink-700 border-pink-200",
};

function JobCard({ job }: { job: JobPosting }) {
  const daysLeft = job.days_remaining;
  const isUrgent = daysLeft <= 5;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="bg-surface-card border border-surface-200/60 rounded-2xl p-6 hover:shadow-xl hover:border-accent/30 transition-all duration-300 group flex flex-col sm:flex-row sm:items-start gap-6 block"
    >
      {/* Logo */}
      <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden border border-surface-100 shadow-sm bg-surface-50 flex items-center justify-center">
        {job.company_logo ? (
          <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-black text-surface-300">
            {job.company_name.charAt(0)}
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors leading-tight">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-surface-500 font-medium mt-1.5">
              <span className="font-semibold text-surface-700">{job.company_name}</span>
              <span className="text-surface-300">•</span>
              <span>{job.location}</span>
              {job.is_remote && (
                <>
                  <span className="text-surface-300">•</span>
                  <span className="text-accent bg-accent/10 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">
                    Remote
                  </span>
                </>
              )}
            </div>
          </div>
          {job.salary_range && (
            <span className="text-sm font-bold text-surface-700 bg-surface-100 px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap">
              {job.salary_range}
            </span>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${JOB_TYPE_COLORS[job.job_type] || 'bg-surface-50 text-surface-500 border-surface-200'}`}>
            {JOB_TYPE_LABELS[job.job_type] || job.job_type}
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border bg-surface-50 text-surface-500 border-surface-200 uppercase tracking-wider">
            {EXPERIENCE_LABELS[job.experience_level] || job.experience_level}
          </span>
          {job.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] font-bold text-surface-500 bg-surface-50 border border-surface-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {tag}
            </span>
          ))}
          {job.tags.length > 4 && (
            <span className="text-[10px] font-medium text-surface-400">+{job.tags.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="shrink-0 flex flex-col items-end justify-between self-stretch gap-3">
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[11px] font-medium text-surface-400">
            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-surface-100 text-surface-500'}`}>
            {daysLeft}d left
          </span>
        </div>
        {job.applications_count > 0 && (
          <span className="text-[10px] text-surface-400 font-medium">
            {job.applications_count} applicant{job.applications_count !== 1 ? 's' : ''}
          </span>
        )}
        <div className="mt-auto px-5 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest rounded-xl group-hover:bg-accent transition-colors shadow-sm">
          View Job
        </div>
      </div>
    </Link>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    is_remote: false,
    job_type: "",
    experience_level: "",
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJobs({
        search: search || undefined,
        is_remote: filters.is_remote || undefined,
        job_type: filters.job_type || undefined,
        experience_level: filters.experience_level || undefined,
      });
      setJobs(res.results || []);
      setTotal(res.count || 0);
    } catch {
      // Fall back to empty state gracefully
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleSearch = () => setSearch(searchInput);

  const toggleFilter = (key: keyof typeof filters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? (typeof value === 'boolean' ? false : '') : value,
    }));
  };

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      {/* Header */}
      <div className="bg-primary text-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <p className="text-accent text-xs font-bold uppercase tracking-widest mb-3">AEC Opportunity Board</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                Find Your Next<br />Architecture Role
              </h1>
              <p className="text-surface-300 text-lg max-w-xl">
                Discover roles from top AEC firms. All postings auto-expire after 30 days.
              </p>
            </div>
            <Link
              href="/jobs/post"
              className="shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-accent text-primary font-bold rounded-2xl hover:opacity-90 transition-opacity text-sm uppercase tracking-widest shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Post a Job
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[280px] flex gap-3">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search roles, companies, software..."
                className="flex-1 px-5 py-3 rounded-xl bg-surface-card/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 rounded-xl bg-accent text-primary font-bold hover:opacity-90 transition-opacity text-sm"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex gap-8">

        {/* Sidebar Filters */}
        <div className="hidden md:flex flex-col w-60 shrink-0 gap-8">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-4">Work Style</h4>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => toggleFilter('is_remote', true)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${filters.is_remote ? 'bg-accent' : 'bg-surface-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-surface-card shadow transition-transform ${filters.is_remote ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-surface-600 group-hover:text-primary">Remote Only</span>
            </label>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-4">Job Type</h4>
            <div className="flex flex-col gap-1.5">
              {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => toggleFilter('job_type', value)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.job_type === value ? 'bg-primary text-background' : 'text-surface-600 hover:bg-surface-100 hover:text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-4">Experience</h4>
            <div className="flex flex-col gap-1.5">
              {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => toggleFilter('experience_level', value)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.experience_level === value ? 'bg-primary text-background' : 'text-surface-600 hover:bg-surface-100 hover:text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/jobs/dashboard"
            className="mt-4 flex items-center gap-2 px-4 py-3 bg-surface-100 border border-surface-200 rounded-xl text-sm font-bold text-surface-700 hover:bg-surface-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            My Dashboard
          </Link>
        </div>

        {/* Job List */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-primary">
              {loading ? 'Loading...' : `${total} Active Job${total !== 1 ? 's' : ''}`}
            </h2>
            {(filters.is_remote || filters.job_type || filters.experience_level || search) && (
              <button
                onClick={() => { setFilters({ is_remote: false, job_type: '', experience_level: '' }); setSearch(''); setSearchInput(''); }}
                className="text-xs font-bold text-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-card border border-surface-200 rounded-2xl p-6 animate-pulse">
                  <div className="flex gap-6">
                    <div className="w-16 h-16 rounded-xl bg-surface-200 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-surface-200 rounded w-1/2" />
                      <div className="h-4 bg-surface-100 rounded w-1/3" />
                      <div className="flex gap-2 mt-3">
                        <div className="h-6 bg-surface-100 rounded-md w-20" />
                        <div className="h-6 bg-surface-100 rounded-md w-16" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-24 bg-surface-card border border-surface-200 rounded-2xl">
              <p className="text-5xl mb-4">🏗️</p>
              <h3 className="text-xl font-bold text-primary mb-2">No Jobs Found</h3>
              <p className="text-surface-500 mb-8">Try adjusting your filters or be the first to post one!</p>
              <Link href="/jobs/post" className="px-8 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block">
                Post a Job
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
