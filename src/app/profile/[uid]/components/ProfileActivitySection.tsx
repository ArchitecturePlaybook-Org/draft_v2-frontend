"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileActivitySectionProps {
  profile: PublicProfile;
}

export function ProfileActivitySection({ profile }: ProfileActivitySectionProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'articles' | 'documents'>('all');
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});

  const activities = [
    {
      id: 1,
      type: 'posts',
      date: '2d ago',
      content: `Extremely proud to share our latest milestone on the Green Horizon Urban Complex! Parametric facade simulation achieved a 28% reduction in solar heat gain while maximizing daylighting. 🏢🌿 #Architecture #BIM`,
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      likes: 142,
      comments: 19,
      shares: 8,
    },
    {
      id: 2,
      type: 'articles',
      date: '1w ago',
      content: `Published Article: "The Future of BIM in High-Rise Structural Operations: Integrating AI and Real-time Sensor Telemetry".`,
      image: null,
      likes: 289,
      comments: 44,
      shares: 31,
    },
  ];

  const filteredActivities = activeTab === 'all' 
    ? activities 
    : activities.filter(a => a.type === activeTab);

  const toggleLike = (id: number) => {
    setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            Activity & Insights
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {profile.metadata?.followers || 1420} followers
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-surface-200/60 p-1 rounded-xl">
          {(['all', 'posts', 'articles', 'documents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-surface-50 text-primary shadow-2xs'
                  : 'text-surface-600 hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredActivities.map((act) => {
          const isLiked = likedPosts[act.id];
          const currentLikes = act.likes + (isLiked ? 1 : 0);

          return (
            <div
              key={act.id}
              className="bg-surface-50 border border-surface-200/70 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-200 shrink-0">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-surface-400">
                        {profile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-xs flex items-center gap-1">
                      {profile.name}
                      <span className="text-[10px] font-normal text-surface-400">• {act.date}</span>
                    </h3>
                  </div>
                </div>

                <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400 bg-surface-200 px-2 py-0.5 rounded">
                  {act.type}
                </span>
              </div>

              <p className="text-xs font-medium text-surface-800 leading-relaxed">
                {act.content}
              </p>

              {act.image && (
                <div className="rounded-lg overflow-hidden max-h-56 border border-surface-200">
                  <img src={act.image} alt="Attachment" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-surface-200/60 text-[11px] font-semibold text-surface-500">
                <span>👍 {currentLikes} likes</span>
                <span>{act.comments} comments • {act.shares} shares</span>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <button
                  onClick={() => toggleLike(act.id)}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                    isLiked ? 'bg-blue-50 text-blue-600' : 'hover:bg-surface-200/60 text-surface-600'
                  }`}
                >
                  👍 {isLiked ? 'Liked' : 'Like'}
                </button>
                <button
                  onClick={() => alert("Comment dialog")}
                  className="py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-200/60 text-surface-600"
                >
                  💬 Comment
                </button>
                <button
                  onClick={() => alert("Link copied")}
                  className="py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-200/60 text-surface-600"
                >
                  🔗 Share
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
