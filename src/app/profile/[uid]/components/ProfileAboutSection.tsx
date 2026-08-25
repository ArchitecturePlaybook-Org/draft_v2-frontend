"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileAboutSectionProps {
  profile: PublicProfile;
}

export function ProfileAboutSection({ profile }: ProfileAboutSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const bioText = profile.bio || "No bio details provided yet.";
  const designPhilosophy = profile.metadata?.design_philosophy;

  // Use dynamic specializations from backend profile OR services_offered
  const specializationsList: string[] = profile.specializations && profile.specializations.length > 0
    ? profile.specializations.map((s: any) => typeof s === 'string' ? s : s.name)
    : (profile.metadata?.services_offered || []);

  const experienceYears = profile.metadata?.years_of_experience;

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-primary">About</h2>
      </div>

      <div className="relative">
        <p className={`text-xs sm:text-sm text-surface-700 leading-relaxed font-medium transition-all ${
          !isExpanded ? 'line-clamp-3' : ''
        }`}>
          {bioText}
        </p>

        {bioText.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-xs font-bold text-blue-600 hover:underline"
          >
            {isExpanded ? 'Show less ▲' : '...see more'}
          </button>
        )}
      </div>

      {designPhilosophy && (
        <div className="bg-accent/5 border-l-3 border-accent p-3.5 rounded-r-xl space-y-0.5">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-accent">
            Design Philosophy
          </p>
          <p className="text-xs font-semibold italic text-surface-800">
            "{designPhilosophy}"
          </p>
        </div>
      )}

      {specializationsList.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-2">
            Specializations
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {specializationsList.map((spec, idx) => (
              <span
                key={idx}
                className="bg-surface-200/70 text-primary text-[11px] font-bold px-2.5 py-1 rounded-lg border border-surface-300/50 shadow-2xs"
              >
                ✨ {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-surface-200/60 pt-4">
        {experienceYears ? (
          <div>
            <p className="text-lg sm:text-xl font-black text-primary">{experienceYears}+ <span className="text-[10px] font-bold text-surface-400">Yrs</span></p>
            <p className="text-[10px] font-medium text-surface-500">Experience</p>
          </div>
        ) : null}
        <div>
          <p className="text-lg sm:text-xl font-black text-primary">{profile.completed_projects || 0} <span className="text-[10px] font-bold text-surface-400">Projects</span></p>
          <p className="text-[10px] font-medium text-surface-500">Completed</p>
        </div>
        <div>
          <p className="text-lg sm:text-xl font-black text-accent">{profile.portfolios?.length || 0}</p>
          <p className="text-[10px] font-medium text-surface-500">Public Blueprints</p>
        </div>
      </div>
    </div>
  );
}
