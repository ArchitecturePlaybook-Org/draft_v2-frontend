"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchTemplateDetail, fetchTemplateRatings, generateShareLink, type TemplateAsset, type TemplateRating } from "@/domains/marketplace/api";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs font-bold text-accent hover:underline ml-2 transition-colors"
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

export default function TemplateStatsPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [template, setTemplate] = useState<TemplateAsset | null>(null);
  const [ratings, setRatings] = useState<TemplateRating[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (!assetId) return;
    Promise.all([
      fetchTemplateDetail(assetId),
      fetchTemplateRatings(assetId).catch(() => []),
    ]).then(([tmpl, rtgs]) => {
      setTemplate(tmpl);
      setRatings(rtgs);
      if (tmpl.share_token) {
        setShareUrl(`${window.location.origin}/marketplace/${tmpl.share_token}`);
      }
    }).catch(() => setTemplate(null))
      .finally(() => setLoading(false));
  }, [assetId]);

  const handleGenerateLink = async () => {
    if (!template) return;
    setGeneratingLink(true);
    try {
      const res = await generateShareLink(template.uid);
      setShareUrl(res.share_url);
      setTemplate((t) => t ? { ...t, share_token: res.share_token } : t);
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 pt-topbar animate-pulse">
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <div className="h-8 bg-surface-200 rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-surface-card border border-surface-200 rounded-2xl h-28" />)}
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
          <h2 className="text-xl font-bold text-primary mb-2">Template Not Found</h2>
          <Link href="/marketplace/dashboard" className="text-sm text-accent hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const ratingDist = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: ratings.filter((r) => r.score === score).length,
    pct: ratings.length > 0 ? Math.round((ratings.filter((r) => r.score === score).length / ratings.length) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-surface-50 pt-topbar">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link href="/marketplace/dashboard" className="text-sm text-surface-500 hover:text-primary mb-2 block transition-colors">← Creator Dashboard</Link>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-primary truncate">{template.title}</h1>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  template.template_status === "PUBLISHED" ? "bg-green-50 text-green-700 border-green-200"
                  : template.template_status === "ARCHIVED" ? "bg-surface-50 text-surface-400 border-surface-200"
                  : "bg-surface-100 text-surface-500 border-surface-200"
                }`}>
                  {template.template_status}
                </span>
              </div>
              <p className="text-surface-500 text-sm">{template.template_category} · v{template.template_version}</p>
            </div>
            {template.template_status === "PUBLISHED" && (
              <Link href={`/marketplace/${template.uid}`} className="px-5 py-2.5 bg-accent/10 text-accent text-xs font-bold rounded-xl hover:bg-accent hover:text-primary transition-colors">
                View Live Page →
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-5 text-center">
            <p className="text-4xl font-black text-primary mb-1">{template.task_count}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Tasks</p>
          </div>
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-5 text-center">
            <p className="text-4xl font-black text-primary mb-1">{template.rating_count}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Reviews</p>
          </div>
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-5 text-center">
            <p className="text-4xl font-black text-amber-500 mb-1">
              {template.avg_rating > 0 ? template.avg_rating.toFixed(1) : "—"}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Avg Rating</p>
          </div>
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-5 text-center">
            <p className="text-4xl font-black text-primary mb-1">{template.template_version}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Version</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Distribution */}
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-primary mb-5">Rating Distribution</h2>
            {ratings.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">No ratings yet.</p>
            ) : (
              <div className="space-y-3">
                {ratingDist.map(({ score, count, pct }) => (
                  <div key={score} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-surface-500 w-4 shrink-0">{score}</span>
                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-surface-400 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share Link */}
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-primary mb-5">Share Link</h2>
            {shareUrl ? (
              <div>
                <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 flex items-center gap-2 mb-3">
                  <p className="text-xs text-surface-600 font-mono truncate flex-1">{shareUrl}</p>
                  <CopyButton text={shareUrl} label="Copy" />
                </div>
                <p className="text-xs text-surface-400">Anyone with this link can view and save this template.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-surface-500 mb-5 leading-relaxed">
                  Generate a shareable link so anyone — even outside the platform — can access and save this template.
                </p>
                <button
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="w-full py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {generatingLink ? "Generating..." : "Generate Share Link"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        {ratings.length > 0 && (
          <div className="mt-6 bg-surface-card border border-surface-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-primary mb-5">Recent Reviews</h2>
            <div className="space-y-4">
              {ratings.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-start gap-4 pb-4 border-b border-surface-100 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-xs font-bold text-surface-500 shrink-0">
                    {r.user_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-primary">{r.user_name}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <svg key={s} className={`w-3 h-3 ${s <= r.score ? 'text-amber-400' : 'text-surface-200'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {r.review && <p className="text-xs text-surface-500 leading-relaxed">{r.review}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
