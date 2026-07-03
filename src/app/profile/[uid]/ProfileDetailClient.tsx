"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usersApi, PublicProfile } from '@/domains/users/api';
import { LeadGenerationModal } from '@/shared/components/LeadGenerationModal';
import { portfoliosApi } from '@/domains/portfolios/api';

export default function ProfileDetailClient() {
  const { uid } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);

  useEffect(() => {
    if (uid) {
      fetchProfile(uid as string);
    }
  }, [uid]);

  const fetchProfile = async (profileUid: string) => {
    setIsLoading(true);
    try {
      const data = await usersApi.getPublicProfile(profileUid);
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent, portfolioId: number, isSaved: boolean) => {
    e.preventDefault();
    try {
      await portfoliosApi.toggleSavePortfolio(portfolioId);
      // Optimistic or re-fetch wouldn't be simple without separate state per item, 
      // but we can just let it silently save or show a toast
      alert("Save action triggered");
    } catch (err) {
      alert("Please login to save portfolios.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="animate-pulse space-y-8 w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-surface-100 rounded-full" />
            <div className="space-y-4">
              <div className="h-10 bg-surface-100 w-64 rounded-xl" />
              <div className="h-4 bg-surface-100 w-48 rounded-xl" />
            </div>
          </div>
          <div className="h-64 bg-surface-100 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-primary">Profile Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto space-y-16">
        
        {/* Profile Header */}
        <div className="bg-surface-100/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-surface-200/50 shadow-2xl shadow-primary/5 flex flex-col md:flex-row gap-10 items-center md:items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="w-40 h-40 shrink-0 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl bg-surface-200 flex items-center justify-center relative z-10">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-black text-surface-400">{profile.name.charAt(0)}</span>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4 z-10 relative">
            <div className="inline-block px-4 py-2 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest rounded-xl">
              {profile.category || 'Professional'}
            </div>
            
            <h1 className="text-5xl font-black text-primary tracking-tight">{profile.name}</h1>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-surface-500 font-medium">
              {(profile.city || profile.country) && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.city ? `${profile.city}, ` : ''}{profile.country || 'Global'}
                </div>
              )}
              {profile.completed_projects > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  {profile.completed_projects} Completed Projects
                </div>
              )}
            </div>
            
            {profile.bio && (
              <p className="text-surface-600 max-w-2xl leading-relaxed mt-4">{profile.bio}</p>
            )}
            
            {profile.metadata?.design_philosophy && (
              <div className="mt-6 border-l-4 border-accent pl-4 text-left max-w-2xl mx-auto md:mx-0">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Design Philosophy</p>
                <p className="text-surface-700 italic text-sm">{profile.metadata.design_philosophy}</p>
              </div>
            )}
          </div>
          
          <div className="shrink-0 z-10 w-full md:w-auto">
            <button
              onClick={() => setShowLeadModal(true)}
              className="w-full md:w-auto px-8 h-14 bg-gradient-to-r from-accent to-accent/90 text-background rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:shadow-[0_0_30px_rgba(255,186,8,0.4)] hover:-translate-y-1 transition-all"
            >
              Express Interest
            </button>
          </div>
        </div>

        {/* Professional Details Section */}
        {(profile.metadata?.years_of_experience || profile.metadata?.licenses_and_certifications?.length > 0 || profile.metadata?.services_offered?.length > 0 || profile.metadata?.awards?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 duration-700">
            {profile.metadata?.years_of_experience && (
              <div className="bg-surface-100/50 p-6 rounded-3xl border border-surface-200/50">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Experience</p>
                <p className="text-3xl font-black text-primary">{profile.metadata.years_of_experience} <span className="text-sm font-bold text-surface-400">Years</span></p>
              </div>
            )}
            
            {(profile.metadata?.licenses_and_certifications?.length ?? 0) > 0 && (
              <div className="bg-surface-100/50 p-6 rounded-3xl border border-surface-200/50">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Credentials</p>
                <ul className="space-y-2">
                  {(profile.metadata?.licenses_and_certifications ?? []).map((lic: string, idx: number) => (
                    <li key={idx} className="text-sm font-bold text-primary flex items-center gap-2">
                      <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {lic}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(profile.metadata?.services_offered?.length ?? 0) > 0 && (
              <div className="bg-surface-100/50 p-6 rounded-3xl border border-surface-200/50 lg:col-span-2">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Services Offered</p>
                <div className="flex flex-wrap gap-2">
                  {(profile.metadata?.services_offered ?? []).map((srv: string, idx: number) => (
                    <span key={idx} className="bg-surface-200/50 border border-surface-300/50 px-3 py-1.5 rounded-lg text-xs font-bold text-primary shadow-sm">
                      {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {(profile.metadata?.awards?.length ?? 0) > 0 && (
              <div className="bg-surface-100/50 p-6 rounded-3xl border border-surface-200/50 lg:col-span-4">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Awards & Recognition</p>
                <div className="flex flex-wrap gap-4">
                  {(profile.metadata?.awards ?? []).map((award: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-surface-200/50 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                      </div>
                      <span className="text-sm font-bold text-primary">{award}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stakeholders Section */}
        {profile.stakeholders && profile.stakeholders.length > 0 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-100">
            <h2 className="text-2xl font-black text-primary flex items-center gap-4">
              Collaborators & Stakeholders
              <span className="text-sm font-bold text-accent bg-accent/10 px-3 py-1 rounded-full">{profile.stakeholders.length}</span>
            </h2>
            <div className="flex flex-wrap gap-4">
              {profile.stakeholders.map(sh => (
                <Link key={sh.id} href={`/profile/${sh.uid}`} className="flex items-center gap-3 bg-surface-100/50 hover:bg-surface-100 border border-surface-200/50 p-2 pr-6 rounded-full transition-all group hover:border-accent/30 hover:shadow-md">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-200 flex items-center justify-center border-2 border-white shadow-sm">
                    {sh.avatar ? (
                      <img src={sh.avatar} alt={sh.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-surface-500 group-hover:text-accent transition-colors">{sh.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{sh.name}</p>
                    {sh.category && <p className="text-[10px] font-bold text-surface-400 uppercase">{sh.category}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Created Projects */}
        {profile.portfolios && profile.portfolios.length > 0 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-200">
            <h2 className="text-2xl font-black text-primary">Authored Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {profile.portfolios.map(item => (
                <Link key={item.id} href={`/portfolio/${item.id}`} className="group bg-surface-100 border border-surface-200 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-accent/30 transition-all duration-500 flex flex-col hover:-translate-y-1">
                  <div className="aspect-[16/10] relative overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-200 flex items-center justify-center text-xs text-surface-400 font-bold uppercase tracking-widest">No Visuals</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-white font-bold text-lg leading-tight mb-2 drop-shadow-md">{item.title}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold tracking-wider uppercase">
                        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {item.views_count || 0} Views
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Contributed Projects */}
        {profile.contributed_portfolios && profile.contributed_portfolios.length > 0 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-300">
            <h2 className="text-2xl font-black text-primary">Contributions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {profile.contributed_portfolios.map(item => (
                <Link key={item.id} href={`/portfolio/${item.id}`} className="group bg-surface-100 border border-surface-200 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-accent/30 transition-all duration-500 flex flex-col hover:-translate-y-1">
                  <div className="aspect-[16/10] relative overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-200 flex items-center justify-center text-xs text-surface-400 font-bold uppercase tracking-widest">No Visuals</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    
                    <div className="absolute top-4 left-4">
                      <span className="bg-accent/20 backdrop-blur-md text-accent border border-accent/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                        Contributor
                      </span>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-white font-bold text-lg leading-tight mb-2 drop-shadow-md">{item.title}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold tracking-wider uppercase">
                        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.views_count || 0} Views
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
        professionalName={profile.name}
        professionalId={profile.uid}
      />
    </div>
  );
}
