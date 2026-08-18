"use client";

import React from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfile;
}

export function ContactInfoModal({ isOpen, onClose, profile }: ContactInfoModalProps) {
  if (!isOpen) return null;

  const email = profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '.')}@architectureplaybook.com`;
  const phone = profile.metadata?.phone || "+1 (555) 382-9104";
  const website = profile.website || `https://${profile.name.toLowerCase().replace(/\s+/g, '')}studio.com`;
  const socialLinks = profile.social_links || {
    linkedin: `https://linkedin.com/in/${profile.uid}`,
    twitter: `https://twitter.com/${profile.name.toLowerCase().replace(/\s+/g, '')}`,
    instagram: `https://instagram.com/${profile.name.toLowerCase().replace(/\s+/g, '_')}`
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-50 w-full max-w-lg rounded-3xl border border-surface-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-surface-100 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-primary text-base">{profile.name}</h3>
              <p className="text-xs text-surface-500 font-medium">Contact Information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-200 flex items-center justify-center text-surface-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Profile Card Snippet */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-100/50 border border-surface-200/50">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-200 shrink-0 border border-surface-300">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-xl text-surface-400">
                  {profile.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">{profile.name}</h4>
              <p className="text-xs text-surface-500 line-clamp-1">{profile.category || 'Architectural Specialist'}</p>
              <p className="text-[11px] font-semibold text-accent mt-0.5">Architecture Playbook Verified Profile</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Email Address</p>
              <a href={`mailto:${email}`} className="text-sm font-semibold text-blue-600 hover:underline break-all">
                {email}
              </a>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Direct Phone</p>
              <p className="text-sm font-semibold text-primary">{phone}</p>
            </div>
          </div>

          {/* Website */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Portfolio & Website</p>
              <a href={website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-purple-600 hover:underline break-all">
                {website}
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Office Location</p>
              <p className="text-sm font-semibold text-primary">
                {profile.city ? `${profile.city}, ` : ''}{profile.country || 'Global'}
              </p>
            </div>
          </div>

          {/* Social Profiles */}
          <div className="border-t border-surface-200 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">Social Profiles</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-xl text-xs font-bold text-primary capitalize flex items-center gap-2 transition-all hover:scale-105"
                >
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  {platform}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-100 border-t border-surface-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-background font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
