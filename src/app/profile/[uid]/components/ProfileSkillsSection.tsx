"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileSkillsSectionProps {
  profile: PublicProfile;
}

export function ProfileSkillsSection({ profile }: ProfileSkillsSectionProps) {
  const initialSkills = [
    {
      id: 1,
      name: "BIM & Revit Architecture",
      category: "Technical",
      endorsements: 48,
    },
    {
      id: 2,
      name: "Sustainable Masterplanning",
      category: "Design",
      endorsements: 36,
    },
    {
      id: 3,
      name: "Parametric Facade Design",
      category: "Engineering",
      endorsements: 29,
    },
    {
      id: 4,
      name: "Urban Site Operations",
      category: "Management",
      endorsements: 24,
    }
  ];

  const [skills, setSkills] = useState(initialSkills);
  const [endorsedState, setEndorsedState] = useState<Record<number, boolean>>({});

  const handleEndorse = (id: number) => {
    setEndorsedState((prev) => {
      const isCurrentlyEndorsed = prev[id];
      const next = !isCurrentlyEndorsed;

      setSkills((prevSkills) =>
        prevSkills.map((sk) =>
          sk.id === id
            ? { ...sk, endorsements: sk.endorsements + (next ? 1 : -1) }
            : sk
        )
      );

      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            Skills & Endorsements
          </h2>
        </div>
      </div>

      <div className="space-y-2.5">
        {skills.map((skill) => {
          const isEndorsed = endorsedState[skill.id];

          return (
            <div
              key={skill.id}
              className="bg-surface-50 p-3 rounded-xl border border-surface-200/70 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-primary text-xs sm:text-sm truncate">
                    {skill.name}
                  </h3>
                  <span className="text-[9px] font-bold text-surface-500 bg-surface-200 px-1.5 py-0.5 rounded shrink-0">
                    {skill.category}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-surface-500">
                  {skill.endorsements} endorsements
                </p>
              </div>

              <button
                onClick={() => handleEndorse(skill.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  isEndorsed
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                    : 'bg-surface-200/80 hover:bg-blue-600 hover:text-white text-surface-700'
                }`}
              >
                {isEndorsed ? '✓ Endorsed' : '+ Endorse'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
