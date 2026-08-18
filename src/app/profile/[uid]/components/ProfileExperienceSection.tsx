"use client";

import React from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileExperienceSectionProps {
  profile: PublicProfile;
}

export function ProfileExperienceSection({ profile }: ProfileExperienceSectionProps) {
  const experiences = profile.metadata?.experiences || [
    {
      id: 1,
      title: "Principal Architectural Consultant",
      company: "Apex Architectural Studio",
      type: "Full-time",
      dates: "Jan 2021 - Present • 3 yrs 8 mos",
      location: "San Francisco, CA",
      logo: "🏢",
      description: "Directing principal design teams on high-rise commercial developments (₹120 Cr+ project valuation). Leading BIM implementation across 14 active site teams.",
      skills: ["Revit", "BIM Management", "LEED AP BD+C"]
    },
    {
      id: 2,
      title: "Senior Project Architect",
      company: "Metropolitan Urban Design Group",
      type: "Full-time",
      dates: "Mar 2017 - Dec 2020 • 3 yrs 10 mos",
      location: "New York, NY",
      logo: "🏛️",
      description: "Managed structural layout designs and municipal zoning compliance for mixed-use residential towers.",
      skills: ["Navisworks", "Urban Planning", "Rhino 3D"]
    }
  ];

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-primary">Experience</h2>
      </div>

      <div className="space-y-6 relative before:absolute before:left-5 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-200">
        {experiences.map((exp: any, idx: number) => (
          <div key={exp.id || idx} className="relative flex items-start gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-surface-50 border border-surface-300 flex items-center justify-center text-lg shrink-0 z-10 shadow-2xs group-hover:border-accent transition-colors">
              {exp.logo || "🏢"}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-primary group-hover:text-accent transition-colors">
                  {exp.title}
                </h3>
                <span className="text-[11px] font-semibold text-surface-500">
                  {exp.dates}
                </span>
              </div>

              <p className="text-[11px] font-bold text-surface-600 flex items-center gap-1.5">
                <span>{exp.company}</span>
                <span className="text-surface-300">•</span>
                <span className="font-normal text-surface-500">{exp.type}</span>
              </p>

              {exp.description && (
                <p className="text-xs font-medium text-surface-700 leading-relaxed pt-0.5">
                  {exp.description}
                </p>
              )}

              {exp.skills && exp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {exp.skills.map((skill: string, sIdx: number) => (
                    <span
                      key={sIdx}
                      className="bg-surface-200/60 text-surface-700 text-[10px] font-bold px-2 py-0.5 rounded border border-surface-300/40"
                    >
                      🎯 {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
