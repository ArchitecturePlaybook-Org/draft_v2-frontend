"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileAboutSectionProps {
  profile: PublicProfile;
}

export function ProfileAboutSection({ profile }: ProfileAboutSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultBio = profile.bio || 
    `Passionate and vision-driven Architectural Consultant & Principal Designer with over 10+ years of comprehensive experience in conceptualizing, detailing, and delivering high-impact commercial, residential, and urban planning projects. Specialized in BIM workflows (Revit & Navisworks), sustainable architectural masterplanning, and high-performance building envelopes.\n\nThroughout my career, I have collaborated with multi-disciplinary engineering teams, site operations managers, real estate developers, and municipal authorities to transform complex architectural briefs into iconic structural realities. Dedicated to incorporating sustainable design principles, energy-efficient HVAC integration, and modern biophilic design into every project space.`;

  const designPhilosophy = profile.metadata?.design_philosophy ||
    "Architecture is not merely about shaping physical spaces, but crafting sustainable habitats that harmonize human experience, environmental stewardship, and structural elegance.";

  const services: string[] = profile.metadata?.services_offered || [
    "BIM & 3D Architectural Design",
    "Sustainable Masterplanning",
    "Facade & Building Envelope Engineering",
    "Interior Spatial Design",
    "Site Operations Management",
    "LEED Consulting"
  ];

  const experienceYears = profile.metadata?.years_of_experience || 10;

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-primary">About</h2>
      </div>

      <div className="relative">
        <p className={`text-xs sm:text-sm text-surface-700 leading-relaxed font-medium transition-all ${
          !isExpanded ? 'line-clamp-3' : ''
        }`}>
          {defaultBio}
        </p>

        {defaultBio.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-xs font-bold text-blue-600 hover:underline"
          >
            {isExpanded ? 'Show less ▲' : '...see more'}
          </button>
        )}
      </div>

      <div className="bg-accent/5 border-l-3 border-accent p-3.5 rounded-r-xl space-y-0.5">
        <p className="text-[9px] font-extrabold uppercase tracking-widest text-accent">
          Design Philosophy
        </p>
        <p className="text-xs font-semibold italic text-surface-800">
          "{designPhilosophy}"
        </p>
      </div>

      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-2">
          Top Specializations
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {services.map((service, idx) => (
            <span
              key={idx}
              className="bg-surface-200/70 hover:bg-surface-300/80 text-primary text-[11px] font-bold px-2.5 py-1 rounded-lg border border-surface-300/50 shadow-2xs transition-all hover:scale-102 cursor-pointer"
            >
              ✨ {service}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-surface-200/60 pt-4">
        <div>
          <p className="text-lg sm:text-xl font-black text-primary">{experienceYears}+ <span className="text-[10px] font-bold text-surface-400">Yrs</span></p>
          <p className="text-[10px] font-medium text-surface-500">Experience</p>
        </div>
        <div>
          <p className="text-lg sm:text-xl font-black text-primary">{profile.completed_projects || 24} <span className="text-[10px] font-bold text-surface-400">Projects</span></p>
          <p className="text-[10px] font-medium text-surface-500">Completed</p>
        </div>
        <div>
          <p className="text-lg sm:text-xl font-black text-emerald-600">100%</p>
          <p className="text-[10px] font-medium text-surface-500">Satisfaction</p>
        </div>
      </div>

    </div>
  );
}
