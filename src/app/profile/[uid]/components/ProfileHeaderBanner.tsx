"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileHeaderBannerProps {
  profile: PublicProfile;
  onOpenLeadModal: () => void;
  onOpenContactModal: () => void;
  onOpenMessageModal: () => void;
}

export function ProfileHeaderBanner({
  profile,
  onOpenLeadModal,
  onOpenContactModal,
  onOpenMessageModal,
}: ProfileHeaderBannerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const headline = profile.metadata?.headline || `${profile.category || 'Senior Architectural Consultant'} & BIM Specialist | Urban Masterplanning & Sustainable Design`;
  const connections = profile.metadata?.connections || 500;
  const followers = profile.metadata?.followers || 1420;
  const company = profile.metadata?.current_company || "Apex Architectural Studio";
  const university = profile.metadata?.education_summary || "School of Planning and Architecture";
  const coverImage = profile.metadata?.cover_image || null;

  const handleConnectToggle = () => {
    if (isConnected) {
      setIsConnected(false);
    } else if (!isPending) {
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsConnected(true);
      }, 500);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert("Profile URL copied to clipboard!");
      setShowMoreMenu(false);
    }
  };

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 shadow-md overflow-hidden relative">
      {/* Scaled-down Compact Cover Banner */}
      <div className="h-36 sm:h-44 md:h-48 w-full relative overflow-hidden bg-gradient-to-r from-slate-900 via-primary to-slate-800">
        {coverImage ? (
          <img src={coverImage} alt="Cover Banner" className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-56 h-56 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />
          </div>
        )}

        {/* Verified Badge Pill */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="bg-black/50 backdrop-blur-md text-white border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Verified Architecture Playbook
          </span>
        </div>
      </div>

      {/* Profile Header Content Container */}
      <div className="px-5 sm:px-6 pb-6 pt-0 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between -mt-12 sm:-mt-14 md:-mt-16 mb-4 gap-3">
          
          {/* Compact Avatar with Status Ring */}
          <div className="relative inline-block group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full p-0.5 bg-gradient-to-tr from-accent via-emerald-400 to-blue-500 shadow-lg">
              <div className="w-full h-full rounded-full overflow-hidden bg-surface-200 border-2 border-surface-100 relative">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-3xl text-surface-400 bg-surface-200">
                    {profile.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Status Ring Icon */}
            <div className="absolute bottom-0.5 right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-surface-100 shadow text-[10px]" title="Open to Work">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Quick Company / Education Pills (Right on desktop) */}
          <div className="hidden md:flex flex-col gap-1.5 text-right mb-1">
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-primary hover:text-accent cursor-pointer transition-colors">
              <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-accent text-xs">🏛️</span>
              <span className="truncate max-w-[220px]">{company}</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-surface-500 hover:text-accent cursor-pointer transition-colors">
              <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-accent text-xs">🎓</span>
              <span className="truncate max-w-[220px]">{university}</span>
            </div>
          </div>
        </div>

        {/* Name, Headline & Meta */}
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              {profile.name}
            </h1>
            <span className="text-blue-500 shrink-0" title="Verified Professional">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </span>
            <span className="text-[11px] font-semibold text-surface-500 bg-surface-200/80 px-2 py-0.5 rounded">
              He/Him
            </span>
          </div>

          {/* Headline */}
          <p className="text-xs sm:text-sm font-medium text-surface-700 leading-snug max-w-3xl">
            {headline}
          </p>

          {/* Location & Contact Info */}
          <div className="flex items-center flex-wrap gap-y-1 gap-x-3 text-[11px] font-semibold text-surface-500 pt-0.5">
            {(profile.city || profile.country || profile.location) && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{profile.city ? `${profile.city}, ` : ''}{profile.country || profile.location || 'Global'}</span>
              </div>
            )}

            <button
              onClick={onOpenContactModal}
              className="text-blue-600 hover:text-blue-700 font-bold hover:underline flex items-center gap-1"
            >
              Contact Info
            </button>
          </div>

          {/* Connections & Followers */}
          <div className="flex items-center gap-3 pt-0.5 text-[11px] font-bold">
            <span className="text-blue-600 hover:underline cursor-pointer">
              {connections}+ connections
            </span>
            <span className="text-surface-300">•</span>
            <span className="text-surface-600">
              {followers.toLocaleString()} followers
            </span>
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 pt-4 border-t border-surface-200/60 mt-4">
          <button
            onClick={handleConnectToggle}
            className={`px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              isConnected
                ? 'bg-surface-200 text-surface-700 hover:bg-surface-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10'
            }`}
          >
            {isPending ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : isConnected ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Connect
              </>
            )}
          </button>

          <button
            onClick={onOpenMessageModal}
            className="px-4 py-1.5 rounded-full font-bold text-xs border border-blue-600 text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </button>

          <button
            onClick={onOpenLeadModal}
            className="px-4 py-1.5 rounded-full font-extrabold text-[11px] uppercase tracking-wider bg-gradient-to-r from-accent to-amber-500 text-background hover:shadow-md transition-all"
          >
            Express Interest
          </button>

          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`p-1.5 rounded-full border border-surface-300 transition-all ${
              isSaved ? 'bg-amber-500/10 text-amber-600 border-amber-400' : 'hover:bg-surface-200 text-surface-600'
            }`}
            title={isSaved ? "Saved" : "Save Profile"}
          >
            <svg className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-full border border-surface-300 hover:bg-surface-200 text-surface-600 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-surface-50 border border-surface-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                <button
                  onClick={handleCopyLink}
                  className="w-full px-3 py-1.5 text-left font-semibold text-primary hover:bg-surface-100 flex items-center gap-2"
                >
                  🔗 Copy Profile Link
                </button>
                <button
                  onClick={() => {
                    alert("Profile link shared!");
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left font-semibold text-primary hover:bg-surface-100 flex items-center gap-2"
                >
                  📢 Share Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Open To Work Banner */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="font-bold text-xs text-primary">Open to work</h4>
            </div>
            <p className="text-[11px] text-surface-600 font-medium">
              Architectural Consulting, BIM Modeling, Site Operations & Sustainable Masterplanning
            </p>
          </div>
          <button
            onClick={onOpenLeadModal}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0"
          >
            See details
          </button>
        </div>

      </div>
    </div>
  );
}
