"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fetchJob, applyToJob, type JobPosting } from "@/domains/jobs/api";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
  freelance: "Freelance", internship: "Internship",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: "Junior", mid: "Mid-level", senior: "Senior", principal: "Principal / Director",
};

function ApplyPanel({ job, onApplied }: { job: JobPosting; onApplied: () => void }) {
  const router = useRouter();
  const [coverMessage, setCoverMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApply = async () => {
    if (!coverMessage.trim()) {
      setError("Please write a short cover message.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await applyToJob(job.id, coverMessage);
      setSuccess(true);
      onApplied();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.data?.cover_message?.[0] || "Failed to submit application.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  if (job.has_applied || success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-green-800 mb-2">Application Sent!</h3>
        <p className="text-sm text-green-700 mb-4">The hiring team will review your application and get back to you.</p>
        <Link href="/jobs" className="text-sm font-bold text-green-700 hover:underline">Browse more jobs →</Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-surface-200 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-primary mb-1">Apply Now</h3>
      <p className="text-sm text-surface-500 mb-6">Your profile information will be shared with the hiring team.</p>

      <div className="mb-5">
        <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
          Cover Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={coverMessage}
          onChange={(e) => setCoverMessage(e.target.value)}
          rows={6}
          placeholder="Introduce yourself and explain why you'd be a great fit for this role..."
          className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-primary placeholder:text-surface-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
        />
        <p className="text-xs text-surface-400 mt-1">{coverMessage.length} characters</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full py-4 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
      >
        {loading ? "Submitting..." : "Submit Application"}
      </button>

      <p className="text-xs text-center text-surface-400 mt-4">
        By applying, you agree to share your profile with the employer.
      </p>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple renderer: converts markdown-ish text to HTML
  const formatted = content
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h3 class="text-base font-bold text-primary mt-5 mb-2">${line.slice(3)}</h3>`;
      if (line.startsWith('# ')) return `<h2 class="text-lg font-bold text-primary mt-6 mb-3">${line.slice(2)}</h2>`;
      if (line.startsWith('- ')) return `<li class="text-surface-600 text-sm leading-relaxed ml-4 list-disc">${line.slice(2)}</li>`;
      if (line.trim() === '') return '<br/>';
      return `<p class="text-surface-600 text-sm leading-relaxed">${line}</p>`;
    })
    .join('');
  return <div dangerouslySetInnerHTML={{ __html: formatted }} className="prose-sm" />;
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    fetchJob(Number(jobId))
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleApplied = () => {
    setJob((prev) => prev ? { ...prev, has_applied: true } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 pt-topbar">
        <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
          <div className="h-10 bg-surface-200 rounded w-1/2" />
          <div className="h-6 bg-surface-100 rounded w-1/3" />
          <div className="flex gap-8 mt-8">
            <div className="flex-1 space-y-4">
              <div className="h-4 bg-surface-100 rounded" />
              <div className="h-4 bg-surface-100 rounded w-5/6" />
              <div className="h-4 bg-surface-100 rounded w-4/6" />
            </div>
            <div className="w-80 h-64 bg-surface-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-surface-50 pt-topbar flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <h2 className="text-2xl font-bold text-primary mb-2">Job Not Found</h2>
          <p className="text-surface-500 mb-6">This posting may have expired or been removed.</p>
          <Link href="/jobs" className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      {/* Hero */}
      <div className="bg-surface-card border-b border-surface-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-primary mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            All Jobs
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl border border-surface-200 bg-surface-50 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
              {job.company_logo ? (
                <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-surface-300">{job.company_name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight leading-tight mb-2">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-surface-500 text-sm font-medium mb-4">
                <span className="font-bold text-surface-700 text-base">{job.company_name}</span>
                <span>•</span>
                <span>{job.location}</span>
                {job.is_remote && (
                  <span className="bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">Remote</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full">
                  {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                </span>
                <span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full">
                  {EXPERIENCE_LABELS[job.experience_level] || job.experience_level}
                </span>
                {job.salary_range && (
                  <span className="text-xs font-bold bg-accent/10 text-accent px-3 py-1.5 rounded-full">
                    {job.salary_range}
                  </span>
                )}
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${job.days_remaining <= 5 ? 'bg-red-50 text-red-600' : 'bg-surface-100 text-surface-500'}`}>
                  {job.days_remaining}d remaining
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-surface-100">
              <span className="text-xs text-surface-400 font-bold uppercase tracking-wider self-center">Skills:</span>
              {job.tags.map((tag) => (
                <span key={tag} className="text-xs font-bold text-surface-500 bg-surface-50 border border-surface-200 px-3 py-1.5 rounded-md uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body: 2-column */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10">
        {/* Left: Job Details */}
        <div className="flex-1 min-w-0 space-y-8">
          {job.responsibilities && (
            <section className="bg-surface-card border border-surface-200 rounded-2xl p-8">
              <h2 className="text-xl font-black text-primary mb-5">Key Responsibilities</h2>
              <MarkdownContent content={job.responsibilities} />
            </section>
          )}
          {job.requirements && (
            <section className="bg-surface-card border border-surface-200 rounded-2xl p-8">
              <h2 className="text-xl font-black text-primary mb-5">Requirements</h2>
              <MarkdownContent content={job.requirements} />
            </section>
          )}

          {/* Posted info */}
          <div className="text-sm text-surface-400 flex items-center gap-4">
            <span>Posted by <strong className="text-surface-600">{job.poster_name}</strong></span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
            <span>•</span>
            <span>{job.applications_count} applicant{job.applications_count !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Right: Apply Panel (sticky) */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <ApplyPanel job={job} onApplied={handleApplied} />
            {job.contact_email && (
              <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 text-sm text-surface-500 text-center">
                Or email directly at{" "}
                <a href={`mailto:${job.contact_email}`} className="text-accent font-bold hover:underline">
                  {job.contact_email}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
