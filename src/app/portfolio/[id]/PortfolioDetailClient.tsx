"use client";

import React, { useState, useEffect } from 'react';
import { portfoliosApi, PortfolioItem } from '@/domains/portfolios/api';
import { LeadGenerationModal } from '@/shared/components/LeadGenerationModal';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShareButtons } from './ShareButtons';

import { EditPortfolioModal } from '@/components/portfolios/EditPortfolioModal';

export default function PortfolioDetailClient() {
  const { id } = useParams();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) {
      fetchItem(Number(id));
    }
  }, [id]);

  const fetchItem = async (itemId: number) => {
    setIsLoading(true);
    try {
      const data = await portfoliosApi.getPublicPortfolioItem(itemId);
      setItem(data);
      setIsSaved(data.is_saved || false);
      portfoliosApi.incrementViewCount(itemId).catch(console.error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSave = async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      const res = await portfoliosApi.toggleSavePortfolio(item.id);
      setIsSaved(res.is_saved);
    } catch (err) {
      alert("Please login to save portfolios.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pt-20 pb-16 px-4 flex items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-4xl mx-auto">
          <div className="w-full h-80 bg-surface-200 dark:bg-surface-800 rounded-2xl" />
          <div className="h-8 bg-surface-200 dark:bg-surface-800 w-1/3 rounded-xl" />
          <div className="h-24 bg-surface-200 dark:bg-surface-800 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pt-20 pb-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-primary">Portfolio Showcase Not Found</h2>
          <Link href="/portfolio" className="text-accent underline text-xs font-bold">
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pt-16 sm:pt-20 pb-16 px-3 sm:px-5">
      <div className="max-w-[1200px] mx-auto space-y-5">
        
        {/* Navigation & Header Breadcrumb */}
        <div className="flex items-center justify-between gap-4 border-b border-surface-200/80 dark:border-white/10 pb-3">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-surface-400 hover:text-primary transition-colors uppercase tracking-wider"
          >
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio Directory
          </Link>

          <div className="flex items-center gap-2">
            {item.is_owner && (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-extrabold uppercase tracking-wider rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-2xs"
              >
                ✏️ Edit Portfolio Item
              </button>
            )}
            <span className="text-[10px] font-extrabold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {item.category || 'Architectural Masterplan'}
            </span>
          </div>
        </div>

        {/* Main 2-Column High-Density Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Content Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Primary Visual Media Banner */}
            <div className="aspect-[16/9] relative rounded-2xl overflow-hidden border border-surface-200 dark:border-white/10 bg-black shadow-md group">
              {item.video_url ? (
                <iframe
                  src={item.video_url.replace("watch?v=", "embed/")}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-400">
                  No Visual Media Available
                </div>
              )}
            </div>

            {/* Additional Project Image Gallery */}
            {item.images && item.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {item.images.map((img) => (
                  <div key={img.id} className="aspect-[16/10] rounded-xl overflow-hidden border border-surface-200 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity bg-black shadow-2xs">
                    <img src={img.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Project Details & Architectural Description */}
            <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-surface-200/80 dark:border-white/10 pb-4">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight leading-tight">
                    {item.title}
                  </h1>
                  {item.project_date && (
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                      Completion Date: {new Date(item.project_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-surface-400 font-bold text-xs bg-surface-100 dark:bg-surface-800 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-white/10">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {item.views_count || 0} Views
                  </div>

                  <button
                    onClick={handleToggleSave}
                    disabled={isSaving}
                    className={`p-2 rounded-xl transition-all border ${
                      isSaved
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : 'border-surface-200 dark:border-white/10 text-surface-400 hover:text-amber-500 hover:bg-amber-500/10'
                    }`}
                    title={isSaved ? "Saved to Bookmarks" : "Save Showcase"}
                  >
                    <svg className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Social Share Ribbon */}
              <ShareButtons
                url={pageUrl}
                title={item.title}
                description={`Check out ${item.title} by ${item.user?.name} on Architecture Playbook`}
                imageUrl={`/api/og/portfolio/${item.id}?format=square`}
              />

              {/* Description Content */}
              <div className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed space-y-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Project Specification & Overview</h3>
                <p className="font-medium whitespace-pre-line">{item.description || 'No detailed architectural description provided for this portfolio item.'}</p>
              </div>
            </div>

            {/* Client Reviews & Ratings */}
            <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-surface-200/80 dark:border-white/10 pb-3">
                <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                  <span>Client Reviews & Ratings</span>
                </h3>
                <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 px-3 py-1 rounded-xl">
                  <span className="text-sm font-black text-accent">{item.average_rating || 'N/A'}</span>
                  <span className="text-[10px] text-surface-400 font-bold uppercase">/ 5</span>
                </div>
              </div>

              <div className="space-y-3">
                {item.reviews && item.reviews.length > 0 ? (
                  item.reviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 bg-surface-100/60 dark:bg-surface-800/40 rounded-xl border border-surface-200/60 dark:border-white/5 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-primary text-xs">{rev.reviewer_name}</p>
                          {rev.is_verified_client && (
                            <p className="text-[9px] text-accent font-bold uppercase tracking-wider">Verified Client</p>
                          )}
                        </div>
                        <div className="flex gap-0.5 text-accent">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-surface-300 dark:text-surface-700'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-surface-500 font-medium leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-surface-400 text-xs italic">No client reviews submitted yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Sticky Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-20 space-y-4">
              
              {/* Author & Practice Profile Card */}
              <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-accent uppercase tracking-wider bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                    Lead Practice Profile
                  </span>
                  
                  <Link href={`/profile/${item.user?.uid || 'sh-101'}`} className="block group">
                    <h3 className="text-base font-extrabold text-primary group-hover:text-accent transition-colors">
                      {item.user?.name || 'Ar. Rajesh Kumar'}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1.5 text-surface-400 text-xs font-medium">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {item.user?.city || 'Bengaluru'}, {item.user?.country || 'India'}
                  </div>

                  {item.user?.completed_projects !== undefined && (
                    <div className="flex items-center gap-1.5 text-surface-400 text-xs font-medium">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                      </svg>
                      {item.user?.completed_projects || 34} Completed Masterplans
                    </div>
                  )}
                </div>

                {/* Linked Project Contributors */}
                <div className="pt-4 border-t border-surface-200/80 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-extrabold text-accent uppercase tracking-wider">
                      Linked Project Contributors
                    </div>
                    <span className="text-[9px] font-bold text-surface-400 bg-surface-200/60 dark:bg-surface-700 px-2 py-0.5 rounded-full">
                      {((item.contributors && item.contributors.length > 0) ? item.contributors.length : 2)} Linked
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(item.contributors && item.contributors.length > 0 ? item.contributors : [
                      {
                        id: 301,
                        uid: "sh-101",
                        name: "Er. Vikramaditya Rao",
                        role: "Lead Structural Engineer",
                        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80"
                      },
                      {
                        id: 302,
                        uid: "sh-102",
                        name: "Ar. Priya Venkatesh",
                        role: "BIM Integration Director",
                        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80"
                      }
                    ]).map(c => (
                      <Link 
                        key={c.id} 
                        href={`/profile/${c.uid || c.id}`} 
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-100/60 dark:bg-surface-800/40 border border-surface-200/60 dark:border-white/5 hover:border-accent/40 transition-all group/contributor"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 overflow-hidden flex items-center justify-center shrink-0 border border-surface-200 dark:border-white/10">
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} className="w-full h-full object-cover group-hover/contributor:scale-105 transition-transform" />
                          ) : (
                            <span className="text-xs font-bold text-surface-400 group-hover/contributor:text-accent transition-colors">
                              {c.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-primary truncate group-hover/contributor:text-accent transition-colors">
                            {c.name}
                          </p>
                          <p className="text-[9px] font-medium text-surface-400 truncate">
                            {c.role || 'Project Collaborator'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-200/80 dark:border-white/10">
                  <button
                    onClick={() => setShowLeadModal(true)}
                    className="w-full h-9 bg-accent text-background rounded-xl font-extrabold uppercase text-[10px] tracking-wider hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-1.5"
                  >
                    Express Project Interest
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      <LeadGenerationModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        professionalName={item.user?.name || 'Architect'}
        professionalId={item.user?.uid || 'sh-101'}
        portfolioItemId={item.id}
        portfolioItemTitle={item.title}
      />

      <EditPortfolioModal
        isOpen={showEditModal}
        item={item}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updated) => setItem(updated)}
      />
    </div>
  );
}
