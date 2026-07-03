"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createJob } from "@/domains/jobs/api";

const AEC_TAGS = [
  "Revit", "AutoCAD", "Rhino", "SketchUp", "ArchiCAD", "Vectorworks",
  "Grasshopper", "Dynamo", "Navisworks", "BIM 360", "Lumion", "V-Ray",
  "3ds Max", "Blender", "Adobe Suite", "LEED", "WELL", "Passive House",
  "Structural", "MEP", "Landscape", "Interior Design", "Urban Design",
  "Project Management", "Construction Administration", "Master Planning",
];

const STEP_LABELS = ["Basics", "Role Details", "Requirements", "Preview & Post"];

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    company_name: "",
    company_logo: "",
    location: "",
    is_remote: false,
    job_type: "full_time",
    experience_level: "mid",
    salary_range: "",
    responsibilities: "",
    requirements: "",
    tags: [] as string[],
    contact_email: "",
  });

  const set = (key: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (tag: string) =>
    set("tags", form.tags.includes(tag)
      ? form.tags.filter((t) => t !== tag)
      : [...form.tags, tag]
    );

  const canProceed = () => {
    if (step === 0) return form.title && form.company_name && form.location;
    if (step === 1) return form.job_type && form.experience_level;
    if (step === 2) return form.responsibilities && form.requirements;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const job = await createJob(form);
      router.push(`/jobs/${job.id}`);
    } catch (err: any) {
      const msgs = Object.values(err?.data || {}).flat().join(", ");
      setError(msgs || "Failed to post the job. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Jobs
          </Link>
          <h1 className="text-4xl font-black text-primary tracking-tight mb-2">Post a Job</h1>
          <p className="text-surface-500">Reach thousands of AEC professionals. Listings auto-expire after 30 days.</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-0 mb-10">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-accent text-primary' : i === step ? 'bg-primary text-background ring-4 ring-primary/20' : 'bg-surface-200 text-surface-400'}`}>
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : i + 1}
                </div>
                <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider whitespace-nowrap ${i === step ? 'text-primary' : 'text-surface-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${i < step ? 'bg-accent' : 'bg-surface-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-surface-card border border-surface-200 rounded-3xl p-8 shadow-sm">

          {/* Step 0: Basics */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-primary mb-6">Basic Information</h2>
              <Field label="Job Title" required>
                <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Senior Project Architect" className={inputCls} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Company Name" required>
                  <input type="text" value={form.company_name} onChange={(e) => set("company_name", e.target.value)}
                    placeholder="Your firm name" className={inputCls} />
                </Field>
                <Field label="Company Logo URL">
                  <input type="url" value={form.company_logo} onChange={(e) => set("company_logo", e.target.value)}
                    placeholder="https://..." className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Location" required>
                  <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)}
                    placeholder="City, Country or 'Remote'" className={inputCls} />
                </Field>
                <Field label="Salary Range">
                  <input type="text" value={form.salary_range} onChange={(e) => set("salary_range", e.target.value)}
                    placeholder="e.g. $80k–$100k / £60k–£75k" className={inputCls} />
                </Field>
              </div>
              <Field label="Contact Email (optional)">
                <input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)}
                  placeholder="hr@yourfirm.com" className={inputCls} />
                <p className="text-xs text-surface-400 mt-1.5">If blank, applicants will apply through the platform.</p>
              </Field>
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-surface-200 hover:border-accent/40 transition-colors">
                <input type="checkbox" checked={form.is_remote} onChange={(e) => set("is_remote", e.target.checked)}
                  className="w-5 h-5 rounded border-surface-300 text-accent focus:ring-accent" />
                <div>
                  <span className="font-bold text-primary text-sm">Remote-friendly position</span>
                  <p className="text-xs text-surface-400 mt-0.5">This role can be done fully or partially remotely</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 1: Role Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-primary mb-6">Role Details</h2>
              <Field label="Job Type" required>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'full_time', label: 'Full-time' },
                    { value: 'part_time', label: 'Part-time' },
                    { value: 'contract', label: 'Contract' },
                    { value: 'freelance', label: 'Freelance' },
                    { value: 'internship', label: 'Internship' },
                  ].map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => set("job_type", value)}
                      className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${form.job_type === value ? 'bg-primary text-background border-primary' : 'border-surface-200 text-surface-600 hover:border-accent hover:text-accent'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Experience Level" required>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'junior', label: 'Junior' },
                    { value: 'mid', label: 'Mid-level' },
                    { value: 'senior', label: 'Senior' },
                    { value: 'principal', label: 'Principal' },
                  ].map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => set("experience_level", value)}
                      className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${form.experience_level === value ? 'bg-primary text-background border-primary' : 'border-surface-200 text-surface-600 hover:border-accent hover:text-accent'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Software & Skills Tags">
                <div className="flex flex-wrap gap-2 p-4 border border-surface-200 rounded-xl min-h-[80px]">
                  {AEC_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${form.tags.includes(tag) ? 'bg-primary text-background border-primary' : 'border-surface-200 text-surface-500 hover:border-accent hover:text-accent'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-surface-400 mt-1.5">{form.tags.length} selected</p>
              </Field>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-primary mb-6">Job Description</h2>
              <Field label="Key Responsibilities" required>
                <textarea value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)}
                  rows={8} placeholder={"- Lead design development from concept to construction\n- Collaborate with engineers and consultants\n- Mentor junior designers"}
                  className={`${inputCls} resize-y`} />
                <p className="text-xs text-surface-400 mt-1.5">Use bullet points (- item) for clarity.</p>
              </Field>
              <Field label="Requirements" required>
                <textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)}
                  rows={8} placeholder={"- 5+ years of experience in architectural design\n- Proficiency in Revit and AutoCAD\n- ARB/RIBA registration preferred"}
                  className={`${inputCls} resize-y`} />
              </Field>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-primary mb-6">Preview & Publish</h2>
              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Job Title</p>
                  <p className="font-bold text-lg text-primary">{form.title || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-surface-400 font-bold uppercase tracking-wider mb-1">Company</p><p className="text-surface-700 font-medium">{form.company_name || '—'}</p></div>
                  <div><p className="text-xs text-surface-400 font-bold uppercase tracking-wider mb-1">Location</p><p className="text-surface-700 font-medium">{form.location}{form.is_remote ? ' (Remote)' : ''}</p></div>
                  <div><p className="text-xs text-surface-400 font-bold uppercase tracking-wider mb-1">Job Type</p><p className="text-surface-700 font-medium">{form.job_type.replace('_', '-')}</p></div>
                  <div><p className="text-xs text-surface-400 font-bold uppercase tracking-wider mb-1">Experience</p><p className="text-surface-700 font-medium">{form.experience_level}</p></div>
                </div>
                {form.salary_range && <div><p className="text-xs text-surface-400 font-bold uppercase tracking-wider mb-1">Salary</p><p className="text-surface-700 font-medium">{form.salary_range}</p></div>}
                {form.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-surface-400 font-bold uppercase tracking-wider mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.tags.map((t) => <span key={t} className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
                ⏰ This posting will automatically expire <strong>30 days</strong> from today.
              </div>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-surface-100">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-6 py-3 text-sm font-bold text-surface-500 hover:text-primary transition-colors disabled:opacity-0"
            >
              ← Back
            </button>

            {step < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="px-8 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-accent text-primary text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Publishing..." : "🚀 Publish Job"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper components
const inputCls = "w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-primary placeholder:text-surface-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
