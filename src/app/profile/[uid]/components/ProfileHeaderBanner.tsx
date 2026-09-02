"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicProfile } from '@/domains/users/api';
import { useAuthStore } from '@/store/auth-store';

interface ProfileHeaderBannerProps {
  profile: PublicProfile;
  onOpenLeadModal: () => void;
  onOpenContactModal: () => void;
  onOpenMessageModal: () => void;
  onOpenEditModal: () => void;
}

export function ProfileHeaderBanner({
  profile,
  onOpenLeadModal,
  onOpenContactModal,
  onOpenMessageModal,
  onOpenEditModal,
}: ProfileHeaderBannerProps) {
  const { isAuthenticated } = useAuthStore();
  const [isSaved, setIsSaved] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const headline = profile.metadata?.headline || profile.category || '';
  const company = profile.metadata?.current_company;
  const yearsExp = profile.metadata?.years_of_experience;
  const credentials = profile.metadata?.credentials || (profile.category ? profile.category : null);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert("Profile URL copied to clipboard!");
      setShowMoreMenu(false);
    }
  };

  return (
    <div className="bg-surface-900 text-white rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Blueprint Grid & Ambient Accent Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[70px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Left Side: Avatar + Core Professional Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
          
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
              {profile.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const parent = (e.currentTarget as HTMLImageElement).parentElement;
                    if (parent && !parent.querySelector('.fallback-initial')) {
                      const div = document.createElement('div');
                      div.className = 'fallback-initial w-full h-full flex items-center justify-center font-black text-2xl text-white/60 bg-surface-800';
                      div.innerText = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
                      parent.appendChild(div);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-2xl text-white/40 bg-surface-800">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-surface-900 shadow text-[9px]" title="Available for Consultation">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Identity & Credentials */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                {profile.name}
              </h1>
              {credentials && (
                <span className="bg-accent/20 border border-accent/40 text-accent text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {credentials}
                </span>
              )}
            </div>

            {headline && (
              <p className="text-xs sm:text-sm text-white/80 font-medium leading-snug">
                {headline}
              </p>
            )}

            <div className="flex items-center flex-wrap gap-3 text-[11px] text-white/60 font-medium pt-0.5">
              {company && (
                <span className="flex items-center gap-1 text-white/90 font-semibold">
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 6h4m1 5h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {company}
                </span>
              )}
              {(profile.city || profile.country) && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {profile.city ? `${profile.city}, ` : ''}{profile.country || ''}
                </span>
              )}
              {yearsExp && (
                <span className="text-emerald-400 font-semibold">{yearsExp} Years Experience</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Professional CTAs */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
          <button
            onClick={onOpenLeadModal}
            className="px-5 py-2 rounded-xl bg-accent text-background font-extrabold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Request RFP / Consultation
          </button>

          <div className="flex items-center gap-2 w-full justify-end flex-wrap sm:flex-nowrap">
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-lg bg-accent text-background font-extrabold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>📊</span> Dashboard
              </Link>
            )}

            <button
              onClick={onOpenEditModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              title="Edit Profile Specifications"
            >
              <span>✏️</span> Edit Profile
            </button>

            <button
              onClick={onOpenMessageModal}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>

            <button
              onClick={onOpenContactModal}
              className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white font-bold text-xs transition-all"
            >
              Contact
            </button>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-lg border transition-all ${
                isSaved ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'border-white/20 text-white/70 hover:bg-white/10'
              }`}
              title="Bookmark Practice Profile"
            >
              <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
