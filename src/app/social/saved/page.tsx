"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchSavedPosts, toggleSavePost, type SocialPost } from "@/domains/social/api";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedPosts()
      .then((data) => setPosts(data.results || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (id: number) => {
    await toggleSavePost(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/social" className="text-xs font-bold text-surface-400 hover:text-primary transition-colors uppercase tracking-wider">
            ← Back to Feed
          </Link>
          <h1 className="text-3xl font-black text-primary mt-2">Saved Posts</h1>
          <p className="text-surface-500 text-sm mt-1">Your collection of saved architecture inspiration.</p>
        </div>
      </div>

      {loading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="break-inside-avoid rounded-2xl bg-surface-100 h-48" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-surface-card border-2 border-dashed border-surface-200 rounded-2xl p-20 text-center">
          <p className="text-5xl mb-4">🔖</p>
          <h3 className="text-xl font-bold text-primary mb-2">No Saved Posts Yet</h3>
          <p className="text-surface-500 text-sm mb-6">Browse the feed and save posts that inspire you.</p>
          <Link href="/social" className="px-6 py-3 bg-primary text-background font-bold rounded-xl text-sm hover:bg-accent transition-colors inline-block">
            Browse Feed
          </Link>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden border border-surface-200 bg-surface-card shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/social/post/${post.id}`}>
                <img src={post.image_url} alt={post.author_name} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </Link>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleUnsave(post.id)}
                  title="Remove from saved"
                  className="w-8 h-8 bg-surface-card rounded-full shadow-md flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-primary truncate">{post.author_name}</p>
                <p className="text-[10px] text-surface-400">{post.author_username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
