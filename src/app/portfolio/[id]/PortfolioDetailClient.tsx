"use client";

import React, { useState, useEffect } from 'react';
import { portfoliosApi, PortfolioItem } from '@/domains/portfolios/api';
import { LeadGenerationModal } from '@/shared/components/LeadGenerationModal';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShareButtons } from './ShareButtons';

export default function PortfolioDetailClient() {
  const { id } = useParams();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
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
      // Increment view count asynchronously
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
      <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="animate-pulse space-y-8 w-full max-w-4xl mx-auto">
          <div className="w-full h-[500px] bg-surface-100 rounded-3xl" />
          <div className="h-10 bg-surface-100 w-1/3 rounded-xl" />
          <div className="h-32 bg-surface-100 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-primary">Portfolio Not Found</h2>
          <Link href="/portfolio" className="text-accent underline">
            Back to Portfolios
          </Link>
        </div>
      </div>
    );
  }

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto space-y-12">
        {/* Back Link */}
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-sm font-bold text-surface-400 uppercase tracking-widest hover:text-primary transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </Link>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column (Image & Details) */}
          <div className="lg:col-span-2 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="aspect-[16/10] relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 bg-black group">
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
                  className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-surface-200 flex items-center justify-center text-surface-400">
                  No Visuals Available
                </div>
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem] pointer-events-none" />
            </div>

            {item.images && item.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {item.images.map((img) => (
                  <div key={img.id} className="aspect-[4/3] rounded-2xl overflow-hidden shadow-md cursor-pointer hover:opacity-90 transition-opacity bg-black">
                    <img src={img.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-surface-100/60 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-surface-200/50 shadow-xl shadow-primary/5 space-y-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface-100 to-transparent opacity-50 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <h1 className="text-4xl font-black text-primary leading-tight tracking-tight flex-1">{item.title}</h1>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-surface-400 font-bold text-sm bg-surface-50/80 backdrop-blur-md px-4 py-2 rounded-xl border border-surface-200/50">
                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {item.views_count || 0} Views
                  </div>
                  <button
                    onClick={handleToggleSave}
                    disabled={isSaving}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-surface-200/50 backdrop-blur-md ${isSaved ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-surface-50/80 text-surface-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 hover:scale-105'}`}
                    title={isSaved ? "Saved" : "Save"}
                  >
                    <svg className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Social Share Buttons */}
              <ShareButtons
                url={pageUrl}
                title={item.title}
                description={`Check out ${item.title} by ${item.user.name} on Architecture Playbook`}
                imageUrl={`/api/og/portfolio/${item.id}?format=square`}
              />

              <div className="flex gap-4">
                {item.project_date && (
                  <div className="text-xs font-bold text-surface-400 uppercase tracking-widest">
                    Project Date: {new Date(item.project_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="prose prose-lg text-surface-600 max-w-none">
                <p>{item.description || 'No description provided.'}</p>
              </div>
            </div>

            <div className="bg-surface-100/60 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-surface-200/50 shadow-xl shadow-primary/5 space-y-8 mt-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-primary">Reviews & Ratings</h3>
                <div className="flex items-center gap-2 bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-md px-4 py-2 rounded-xl border border-accent/20 shadow-[0_0_15px_rgba(255,186,8,0.15)]">
                  <span className="text-xl font-bold text-accent">{item.average_rating || 'N/A'}</span>
                  <span className="text-xs text-surface-500 font-bold uppercase">/ 5</span>
                </div>
              </div>
              <div className="space-y-6">
                {item.reviews && item.reviews.length > 0 ? (
                  item.reviews.map((rev) => (
                    <div key={rev.id} className="p-6 bg-surface-50 rounded-2xl border border-surface-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-primary">{rev.reviewer_name}</p>
                          {rev.is_verified_client && <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-1">Verified Client</p>}
                        </div>
                        <div className="flex gap-1 text-accent drop-shadow-[0_0_3px_rgba(255,186,8,0.5)]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < rev.rating ? 'fill-current' : 'text-surface-200 drop-shadow-none'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-surface-600 leading-relaxed font-medium">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-surface-500 text-sm italic">No reviews yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Author & CTA) */}
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-1000 delay-150 fill-mode-both">
            <div className="bg-surface-100/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-surface-200/50 shadow-2xl shadow-primary/5 space-y-8 sticky top-32">
              <div className="space-y-3">
                <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4">
                  Professional Profile
                </div>
                <Link href={`/profile/${item.user.uid}`} className="block group">
                  <h3 className="text-3xl font-black text-primary tracking-tight group-hover:text-accent transition-colors">{item.user.name}</h3>
                </Link>
                <div className="flex gap-2 items-center text-surface-500 text-sm font-medium">
                  <svg className="w-4 h-4 text-accent/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {item.user.city || 'Location Unknown'}, {item.user.country || 'Global'}
                </div>
                {item.user.completed_projects !== undefined && (
                  <div className="flex gap-2 items-center text-surface-500 text-sm font-medium">
                    <svg className="w-4 h-4 text-accent/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {item.user.completed_projects} Completed Projects
                  </div>
                )}
              </div>

              <div className="inline-block px-4 py-2 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest rounded-lg">
                {item.user.category || 'Professional'}
              </div>

              {item.contributors && item.contributors.length > 0 && (
                <div className="pt-6 border-t border-surface-100 space-y-4">
                  <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                    Project Stakeholders
                  </div>
                  <div className="space-y-3">
                    {item.contributors.map(c => (
                      <Link key={c.id} href={`/profile/${c.uid || c.id}`} className="flex items-center gap-3 group/contributor">
                        <div className="w-8 h-8 rounded-full bg-surface-100 overflow-hidden flex items-center justify-center shrink-0 group-hover/contributor:bg-accent/20 transition-colors">
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-surface-400 group-hover/contributor:text-accent transition-colors">{c.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-primary truncate group-hover/contributor:text-accent transition-colors">{c.name}</p>
                          {c.role && <p className="text-[10px] font-bold text-surface-400 uppercase truncate">{c.role}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-surface-200/50">
                <button
                  onClick={() => setShowLeadModal(true)}
                  className="w-full h-14 bg-gradient-to-r from-accent to-accent/80 text-background rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:shadow-[0_0_25px_rgba(255,186,8,0.4)] hover:-translate-y-1 transition-all shadow-lg shadow-accent/20"
                >
                  Express Interest
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Projects */}
        {item.related_items && item.related_items.length > 0 && (
          <div className="pt-20 space-y-8">
            <h2 className="text-3xl font-bold text-primary">More from this Professional</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {item.related_items.map(relatedItem => (
                <Link key={relatedItem.id} href={`/portfolio/${relatedItem.id}`} className="group bg-surface-100 border border-surface-200 rounded-3xl overflow-hidden hover:shadow-xl hover:border-accent/30 transition-all duration-500 flex flex-col">
                  <div className="aspect-[16/10] relative overflow-hidden">
                    {relatedItem.image ? (
                      <img
                        src={relatedItem.image}
                        alt={relatedItem.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-100 flex items-center justify-center text-xs text-surface-400">No Image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md">{relatedItem.title}</h3>
                      <div className="flex items-center gap-1 text-white/80 text-[10px] font-bold tracking-wider">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {relatedItem.views_count || 0}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <LeadGenerationModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        professionalName={item.user.name}
        professionalId={item.user.uid}
        portfolioItemId={item.id}
        portfolioItemTitle={item.title}
      />
    </div>
  );
}
