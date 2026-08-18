"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileRecommendationsSectionProps {
  profile: PublicProfile;
}

export function ProfileRecommendationsSection({ profile }: ProfileRecommendationsSectionProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  const receivedRecommendations = [
    {
      id: 1,
      name: "Marcus Vance",
      role: "VP Real Estate Dev",
      company: "Vance Global",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      relationship: "Managed candidate on Skyline Tower",
      date: "Feb 2026",
      text: `${profile.name} is one of the most talented architectural minds I have collaborated with. Mastery of BIM workflows turned a challenging brief into award-winning execution.`
    },
    {
      id: 2,
      name: "Elena Rostova",
      role: "Senior MEP Lead",
      company: "Arup Consultancy",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      relationship: "Worked alongside on masterplans",
      date: "Nov 2025",
      text: `Working alongside ${profile.name} was an absolute breeze. Exceptional spatial clash detection saving millions in rework.`
    }
  ];

  const givenRecommendations = [
    {
      id: 101,
      name: "David Chen",
      role: "BIM Manager",
      company: "Apex Studio",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      relationship: "Managed David directly",
      date: "Jan 2026",
      text: `David is an outstanding BIM Manager whose dedication elevated our studio's delivery speed by 35%.`
    }
  ];

  const currentList = activeTab === 'received' ? receivedRecommendations : givenRecommendations;

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            Recommendations
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {receivedRecommendations.length} Received
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-surface-200/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'received'
                ? 'bg-surface-50 text-primary shadow-2xs'
                : 'text-surface-600 hover:text-primary'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'given'
                ? 'bg-surface-50 text-primary shadow-2xs'
                : 'text-surface-600 hover:text-primary'
            }`}
          >
            Given
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {currentList.map((rec) => (
          <div
            key={rec.id}
            className="bg-surface-50 border border-surface-200/70 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-200 shrink-0">
                <img src={rec.avatar} alt={rec.name} className="w-full h-full object-cover" />
              </div>

              <div>
                <h3 className="font-bold text-primary text-xs flex items-center gap-1.5">
                  {rec.name}
                  <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    Colleague
                  </span>
                </h3>
                <p className="text-[10px] font-semibold text-surface-500">
                  {rec.role} • {rec.company} ({rec.date})
                </p>
              </div>
            </div>

            <p className="text-xs font-medium text-surface-700 leading-relaxed italic bg-surface-100/50 p-3 rounded-lg border border-surface-200/50">
              "{rec.text}"
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
