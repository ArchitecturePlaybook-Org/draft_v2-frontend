"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchSocialPostDetail, toggleSavePost, type SocialPost } from "@/domains/social/api";

function highlightHashtags(text: string) {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="text-pink-500 font-semibold hover:underline cursor-pointer">{part}</span>
    ) : part
  );
}

export default function SocialPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchSocialPostDetail(Number(id))
      .then((p) => {
        setPost(p);
        setSaved(p.is_saved);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!post || saving) return;
    setSaving(true);
    try {
      const res = await toggleSavePost(post.id);
      setSaved(res.is_saved);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 bg-surface-200 rounded w-1/4 mb-8" />
        <div className="h-96 bg-surface-100 rounded-2xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">📷</p>
        <h2 className="text-2xl font-bold text-primary mb-2">Post Not Found</h2>
        <Link href="/social" className="text-sm text-accent hover:underline">← Back to Feed</Link>
      </div>
    );
  }

  const allImages = [post.image_url, ...(post.additional_images || [])];

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/social" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Feed
        </Link>

        <div className="bg-surface-card border border-surface-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image */}
            <div className="relative bg-black flex items-center justify-center aspect-square md:aspect-auto min-h-[400px]">
              <img
                src={allImages[activeImg]}
                alt={post.author_name}
                className="w-full h-full object-cover"
              />
              {/* Carousel dots */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImg ? 'bg-surface-card w-4' : 'bg-surface-card/50'}`}
                    />
                  ))}
                </div>
              )}
              {/* Nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => Math.max(0, i - 1))}
                    disabled={activeImg === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/60 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => Math.min(allImages.length - 1, i + 1))}
                    disabled={activeImg === allImages.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/60 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </>
              )}
            </div>

            {/* Content Panel */}
            <div className="flex flex-col h-full p-6">
              {/* Author */}
              <div className="flex items-center justify-between pb-5 border-b border-surface-100">
                <a
                  href={post.author_profile_url || `https://instagram.com/${post.author_username.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0"
                    style={{ borderImage: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888) 1' }}>
                    {post.author_avatar_url ? (
                      <img src={post.author_avatar_url} alt={post.author_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-200 flex items-center justify-center font-bold text-primary">{post.author_name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm group-hover:text-pink-500 transition-colors">{post.author_name}</p>
                    <p className="text-xs text-surface-400">{post.author_username}</p>
                  </div>
                </a>
                {/* Instagram icon */}
                <a href={post.original_post_url || "#"} target="_blank" rel="noopener noreferrer" className="text-surface-400 hover:text-pink-500 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>

              {/* Caption + hashtags */}
              <div className="flex-1 py-5 overflow-y-auto">
                {post.caption && (
                  <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-line">
                    <span className="font-bold text-primary mr-1">{post.author_username}</span>
                    {highlightHashtags(post.caption)}
                  </p>
                )}

                {/* Posted time */}
                {post.posted_at && (
                  <p className="text-[10px] text-surface-300 uppercase tracking-widest font-bold mt-5">
                    {new Date(post.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-5 border-t border-surface-100 space-y-4">
                {/* Engagement */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 font-bold text-surface-600">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                    {post.likes_count.toLocaleString()} likes
                  </div>
                  {post.comments_count > 0 && (
                    <div className="flex items-center gap-1.5 font-bold text-surface-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      {post.comments_count.toLocaleString()} comments
                    </div>
                  )}
                </div>

                {/* Save + View on Instagram */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${saved ? 'bg-accent text-primary border-accent' : 'bg-surface-card border-surface-200 text-surface-600 hover:border-surface-300'}`}
                  >
                    <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {saved ? "Saved" : "Save Post"}
                  </button>
                  {post.original_post_url && (
                    <a
                      href={post.original_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}
                    >
                      View on Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
