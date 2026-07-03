"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { fetchSocialFeed, toggleSavePost, type SocialPost } from "@/domains/social/api";

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORTS = [
  { value: "-posted_at", label: "Most Recent" },
  { value: "-likes_count", label: "Most Liked" },
  { value: "-comments_count", label: "Most Discussed" },
];

// ─── Helper: format large numbers ────────────────────────────────────────────
function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Helper: extract hashtags to highlight ───────────────────────────────────
function highlightHashtags(text: string) {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="text-pink-400 font-semibold">{part}</span>
    ) : part
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({
  post,
  onSaveToggle,
}: {
  post: SocialPost;
  onSaveToggle: (id: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(post.is_saved);
  const [showCaption, setShowCaption] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      const res = await toggleSavePost(post.id);
      setSaved(res.is_saved);
      onSaveToggle(post.id);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border border-surface-200/60 bg-surface-card cursor-pointer">
      {/* Image */}
      <div className="relative w-full overflow-hidden bg-surface-100">
        <img
          src={post.image_url}
          alt={post.author_name}
          className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />

        {/* Featured badge */}
        {post.is_featured && (
          <div className="absolute top-3 left-3 bg-amber-400/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-amber-900 shadow-sm">
            ✦ Featured
          </div>
        )}

        {/* Carousel indicator */}
        {post.image_count > 1 && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {post.image_count}
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-8 group-hover:translate-x-0 transition-transform duration-300">
          {/* Save */}
          <button
            onClick={handleSave}
            title={saved ? "Unsave" : "Save post"}
            className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-lg ${saved ? 'bg-accent border-accent text-primary' : 'bg-surface-card/10 border-white/20 text-white hover:bg-accent hover:border-accent hover:text-primary'}`}
          >
            <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Open on Instagram */}
          {post.original_post_url && (
            <a
              href={post.original_post_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="View on Instagram"
              className="w-9 h-9 rounded-full bg-surface-card/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-surface-card hover:text-primary transition-all shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          )}
        </div>

        {/* Bottom content */}
        <div className="p-4">
          {/* Caption */}
          {post.caption && (
            <p
              className={`text-white/90 text-xs leading-relaxed mb-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ${showCaption ? '' : 'line-clamp-2'}`}
              onClick={(e) => { e.stopPropagation(); setShowCaption(!showCaption); }}
            >
              {highlightHashtags(post.caption)}
            </p>
          )}

          {/* Author + Stats */}
          <div className="flex items-center justify-between translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
            <a
              href={post.author_profile_url || `https://instagram.com/${post.author_username.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 group/author"
            >
              <div className="relative">
                {post.author_avatar_url ? (
                  <img
                    src={post.author_avatar_url}
                    alt={post.author_name}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-400 border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                    {post.author_name.charAt(0)}
                  </div>
                )}
                {/* Instagram ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 opacity-0 group-hover/author:opacity-70 -z-10 scale-110" />
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-none group-hover/author:text-accent transition-colors">{post.author_name}</p>
                <p className="text-white/60 text-[10px] leading-none mt-0.5">{post.author_username}</p>
              </div>
            </a>

            {/* Stats */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-surface-card/20 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                {formatCount(post.likes_count)}
              </div>
              {post.comments_count > 0 && (
                <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-surface-card/20 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {formatCount(post.comments_count)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="break-inside-avoid rounded-2xl border border-surface-200 bg-surface-card overflow-hidden animate-pulse">
      <div className="bg-surface-100" style={{ height: `${220 + Math.random() * 200}px` }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("-posted_at");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (pageNum: number, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetchSocialFeed({
        search: search || undefined,
        sort,
        featured: featuredOnly || undefined,
        page: pageNum,
      });
      const newPosts = res.results || [];
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setTotal(res.count || 0);
      setHasMore(!!res.next);
    } catch {
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, sort, featuredOnly]);

  // Initial load
  useEffect(() => {
    setPage(1);
    loadPosts(1, true);
  }, [search, sort, featuredOnly]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage);
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, page, loadPosts]);

  const handleSaveToggle = (_id: number) => {
    // Optimistic UI already handled inside PostCard
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#0D0D0D] via-[#1a1a1a] to-[#0D0D0D] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          {/* Instagram gradient icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">
            Inspiration <span className="bg-gradient-to-r from-pink-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">Feed</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto mb-8">
            Every post tagged{" "}
            <span className="inline-flex items-center gap-1 bg-surface-card/10 border border-white/20 px-3 py-1 rounded-full text-white font-bold text-sm">
              #architectureplaybook
            </span>{" "}
            on Instagram appears here automatically.
          </p>

          {/* Search + filters */}
          <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
                placeholder="Search captions, creators..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-card/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-accent backdrop-blur-sm"
              />
              <button
                onClick={() => setSearch(searchInput)}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Search
              </button>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-surface-card/10 border border-white/20 text-white rounded-xl text-sm px-3 py-2.5 focus:outline-none backdrop-blur-sm"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value} className="bg-[#1a1a1a]">{s.label}</option>)}
            </select>
            <button
              onClick={() => setFeaturedOnly(!featuredOnly)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${featuredOnly ? 'bg-amber-400 text-amber-900 border-amber-400' : 'bg-surface-card/10 text-white border-white/20 hover:border-amber-400'}`}
            >
              ✦ Featured
            </button>
          </div>

          {/* Post count */}
          {!loading && (
            <p className="text-white/30 text-xs mt-5 uppercase tracking-widest font-bold">
              {total.toLocaleString()} posts from the community
            </p>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* How it works banner */}
        <div className="mb-10 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/60 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}>
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.44" fill="white" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-black text-primary text-sm">How to get featured</p>
            <p className="text-xs text-surface-500 mt-0.5">Post your architecture work on Instagram and include <strong className="text-primary">#architectureplaybook</strong> in your caption. Your post will automatically appear in this feed within minutes.</p>
          </div>
          <a
            href="https://instagram.com/architectureplaybook"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}
          >
            Follow @architectureplaybook
          </a>
        </div>

        {loading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 space-y-5">
            {Array.from({ length: 15 }).map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-20 text-center">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}>
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-primary mb-2">The Feed is Empty</h3>
            <p className="text-surface-500 mb-6 max-w-md mx-auto">
              {search ? `No posts matching "${search}"` : "No posts yet. Be the first to share your work on Instagram with #architectureplaybook!"}
            </p>
            {search && (
              <button onClick={() => { setSearch(""); setSearchInput(""); }} className="px-6 py-3 bg-primary text-background font-bold rounded-xl text-sm hover:bg-accent transition-colors">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 space-y-5">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onSaveToggle={handleSaveToggle} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="mt-12 flex justify-center pb-12">
              {loadingMore ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Loading more...</span>
                </div>
              ) : hasMore ? (
                <button
                  onClick={() => { const next = page + 1; setPage(next); loadPosts(next); }}
                  className="px-8 py-3 border border-surface-200 text-sm font-bold text-surface-600 rounded-xl hover:bg-surface-50 hover:border-surface-300 transition-colors"
                >
                  Load More
                </button>
              ) : (
                <p className="text-xs font-bold text-surface-300 uppercase tracking-widest">You've seen all {total} posts</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
