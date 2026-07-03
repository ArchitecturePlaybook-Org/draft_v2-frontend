"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchPublicTemplates, fetchTemplateByShareToken, rateTemplate, saveTemplateToLibrary, type TemplateAsset, type TemplateRating, fetchTemplateRatings } from "@/domains/marketplace/api";

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-50 text-green-700 border-green-200",
  INTERMEDIATE: "bg-amber-50 text-amber-700 border-amber-200",
  EXPERT: "bg-red-50 text-red-600 border-red-200",
};

function StarRating({ rating, count, large }: { rating: number; count: number; large?: boolean }) {
  const size = large ? "w-6 h-6" : "w-4 h-4";
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star} className={`${size} ${star <= Math.round(rating) ? "text-amber-400" : "text-surface-200"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className={`font-bold text-primary ${large ? 'text-2xl' : 'text-sm'}`}>{rating > 0 ? rating.toFixed(1) : "No ratings"}</span>
      {count > 0 && <span className="text-surface-400 text-sm">({count} review{count !== 1 ? 's' : ''})</span>}
    </div>
  );
}

function RateWidget({ uid, userRating, onRated }: { uid: string; userRating?: number | null; onRated: (score: number) => void }) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(userRating || 0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!!userRating);

  const handleRate = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await rateTemplate(uid, selected, review);
      setDone(true);
      onRated(selected);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-sm text-green-700 font-medium">
        ⭐ You rated this template {selected}/5. Thank you!
      </div>
    );
  }

  return (
    <div className="bg-surface-50 border border-surface-200 rounded-xl p-5">
      <h4 className="text-sm font-bold text-primary mb-3">Rate this Template</h4>
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setSelected(star)}
            className="transition-transform hover:scale-110"
          >
            <svg className={`w-8 h-8 ${star <= (hover || selected) ? "text-amber-400" : "text-surface-200"} transition-colors`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {selected > 0 && (
        <>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            placeholder="Write a short review (optional)..."
            className="w-full mb-3 px-3 py-2 border border-surface-200 rounded-lg text-sm text-primary placeholder:text-surface-400 focus:outline-none focus:border-accent resize-none"
          />
          <button
            onClick={handleRate}
            disabled={loading}
            className="w-full py-2.5 bg-primary text-background text-xs font-bold rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </>
      )}
    </div>
  );
}

export default function TemplateDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [template, setTemplate] = useState<TemplateAsset | null>(null);
  const [ratings, setRatings] = useState<TemplateRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!assetId) return;
    // Try fetching by share token first, fallback to UID search
    Promise.all([
      fetchTemplateByShareToken(assetId).catch(() => null),
    ]).then(([tmpl]) => {
      if (tmpl) {
        setTemplate(tmpl);
        setSaved(tmpl.is_in_library || false);
        // Fetch ratings separately
        if (tmpl.uid) {
          fetchTemplateRatings(tmpl.uid).then(setRatings).catch(() => {});
        }
      }
    }).finally(() => setLoading(false));
  }, [assetId]);

  const handleSave = async () => {
    if (!template?.share_token) return;
    setSaving(true);
    try {
      await saveTemplateToLibrary(template.share_token);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 pt-topbar">
        <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
          <div className="h-8 bg-surface-200 rounded w-1/2" />
          <div className="h-64 bg-surface-100 rounded-2xl" />
          <div className="flex gap-8">
            <div className="flex-1 space-y-4"><div className="h-4 bg-surface-100 rounded"/><div className="h-4 bg-surface-100 rounded w-5/6"/></div>
            <div className="w-72 h-48 bg-surface-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-surface-50 pt-topbar flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">📐</p>
          <h2 className="text-2xl font-bold text-primary mb-2">Template Not Found</h2>
          <p className="text-surface-500 mb-6">This template may have been removed or made private.</p>
          <Link href="/marketplace" className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block text-sm">
            Browse Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      {/* Hero */}
      <div className="bg-surface-card border-b border-surface-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Templates Hub
          </Link>

          {/* Thumbnail */}
          {template.template_thumbnail && (
            <div className="relative h-72 w-full rounded-2xl overflow-hidden bg-surface-100 mb-8">
              <img src={template.template_thumbnail} alt={template.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {template.template_category && (
                  <span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full border border-surface-200">
                    {template.template_category}
                  </span>
                )}
                {template.template_building_type && (
                  <span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full border border-surface-200">
                    {template.template_building_type}
                  </span>
                )}
                {template.template_difficulty && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${DIFFICULTY_COLORS[template.template_difficulty]}`}>
                    {template.template_difficulty.charAt(0) + template.template_difficulty.slice(1).toLowerCase()}
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight leading-tight mb-4">
                {template.title}
              </h1>

              {template.description && (
                <p className="text-surface-600 text-base leading-relaxed mb-6">{template.description}</p>
              )}

              <div className="flex items-center gap-6 flex-wrap">
                <StarRating rating={template.avg_rating} count={template.rating_count} large />
                <div className="flex items-center gap-4 text-sm text-surface-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    {template.task_count} tasks
                  </span>
                  {template.template_est_duration_days && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      ~{template.template_est_duration_days} days
                    </span>
                  )}
                  <span>by <strong className="text-primary">{template.author_name}</strong></span>
                </div>
              </div>

              {/* Tags */}
              {template.template_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {template.template_tags.map((tag) => (
                    <span key={tag} className="text-xs font-medium text-accent bg-accent/8 border border-accent/20 px-3 py-1 rounded-lg">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Panel */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-surface-card border border-surface-200 rounded-2xl p-6 shadow-sm lg:sticky lg:top-24">
                {/* Cost Range */}
                {(template.template_est_cost_min || template.template_est_cost_max) && (
                  <div className="mb-4 pb-4 border-b border-surface-100">
                    <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Est. Project Cost</p>
                    <p className="text-2xl font-black text-primary">
                      {template.template_est_cost_min && `$${Number(template.template_est_cost_min).toLocaleString()}`}
                      {template.template_est_cost_min && template.template_est_cost_max && " – "}
                      {template.template_est_cost_max && `$${Number(template.template_est_cost_max).toLocaleString()}`}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all mb-3 ${saved
                    ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                    : 'bg-primary text-background hover:bg-accent disabled:opacity-50'
                  }`}
                >
                  {saving ? "Saving..." : saved ? "✓ Saved to Library" : "Save to My Library"}
                </button>

                <Link
                  href="/dashboard/templates"
                  className="block w-full text-center py-3 rounded-xl border border-surface-200 text-sm font-bold text-surface-600 hover:bg-surface-50 hover:border-accent transition-colors"
                >
                  Use in a Project
                </Link>

                <div className="mt-5 pt-4 border-t border-surface-100 space-y-2.5 text-sm text-surface-500">
                  <div className="flex justify-between"><span>Version</span><span className="font-medium text-primary">v{template.template_version}</span></div>
                  <div className="flex justify-between"><span>License</span><span className="font-medium text-primary">{template.template_license || "Free"}</span></div>
                  {template.template_country && <div className="flex justify-between"><span>Country</span><span className="font-medium text-primary">{template.template_country}</span></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-primary">Community Reviews</h2>
          {ratings.length === 0 ? (
            <div className="bg-surface-card border border-surface-200 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">💬</p>
              <p className="text-surface-500 text-sm">No reviews yet. Be the first to rate this template!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((r) => (
                <div key={r.id} className="bg-surface-card border border-surface-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-xs font-bold text-surface-500">
                        {r.user_name.charAt(0)}
                      </div>
                      <span className="font-bold text-primary text-sm">{r.user_name}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <svg key={s} className={`w-4 h-4 ${s <= r.score ? 'text-amber-400' : 'text-surface-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {r.review && <p className="text-surface-600 text-sm leading-relaxed">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating Widget */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-bold text-primary mb-4">Leave a Review</h3>
          <RateWidget uid={template.uid} userRating={template.user_rating} onRated={(score) => setTemplate((t) => t ? { ...t, user_rating: score } : t)} />
        </div>
      </div>
    </div>
  );
}
