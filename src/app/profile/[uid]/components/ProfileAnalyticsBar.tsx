"use client";

import React from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileAnalyticsBarProps {
  profile: PublicProfile;
}

export function ProfileAnalyticsBar({ profile }: ProfileAnalyticsBarProps) {
  const profileViews = profile.metadata?.profile_views || 1284;
  const postImpressions = profile.metadata?.post_impressions || 8920;
  const searchAppearances = profile.metadata?.search_appearances || 342;
  const projectEngagements = profile.metadata?.project_engagements || 76;

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-primary flex items-center gap-2">
            <span>Analytics & Reach</span>
            <span className="text-[9px] font-bold text-surface-500 bg-surface-200 px-2 py-0.5 rounded uppercase tracking-wider">
              Private
            </span>
          </h2>
          <p className="text-[11px] text-surface-500 font-medium">
            👁️ Past 30 days metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-50 p-3 rounded-xl border border-surface-200/60 hover:border-accent/40 transition-colors group cursor-pointer">
          <p className="text-lg font-black text-primary group-hover:text-accent transition-colors">
            {profileViews.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-surface-500">Profile views</p>
          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
            ▲ +14%
          </span>
        </div>

        <div className="bg-surface-50 p-3 rounded-xl border border-surface-200/60 hover:border-blue-500/40 transition-colors group cursor-pointer">
          <p className="text-lg font-black text-primary group-hover:text-blue-500 transition-colors">
            {postImpressions.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-surface-500">Post impressions</p>
          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
            ▲ +32%
          </span>
        </div>

        <div className="bg-surface-50 p-3 rounded-xl border border-surface-200/60 hover:border-purple-500/40 transition-colors group cursor-pointer">
          <p className="text-lg font-black text-primary group-hover:text-purple-500 transition-colors">
            {searchAppearances.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-surface-500">Search appearances</p>
          <span className="text-[9px] font-bold text-purple-600 flex items-center gap-0.5 mt-1">
            🔍 Top result
          </span>
        </div>

        <div className="bg-surface-50 p-3 rounded-xl border border-surface-200/60 hover:border-amber-500/40 transition-colors group cursor-pointer">
          <p className="text-lg font-black text-primary group-hover:text-amber-500 transition-colors">
            {projectEngagements.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-surface-500">Project leads</p>
          <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5 mt-1">
            ⭐ High lead score
          </span>
        </div>
      </div>
    </div>
  );
}
