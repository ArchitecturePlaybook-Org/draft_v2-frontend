"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicProfile, Stakeholder } from '@/domains/users/api';

interface ProfileSidebarProps {
  profile: PublicProfile;
  onOpenContactModal: () => void;
}

export function ProfileSidebar({ profile, onOpenContactModal }: ProfileSidebarProps) {
  const [connectedState, setConnectedState] = useState<Record<number, boolean>>({});

  const stakeholders: Stakeholder[] = profile.stakeholders || [];

  const toggleConnect = (id: number) => {
    setConnectedState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">

      {/* Profile URL Card */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary text-xs">Public profile & URL</h3>
          <button
            onClick={onOpenContactModal}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-[11px] text-surface-500 font-medium break-all">
          architectureplaybook.com/profile/{profile.uid}
        </p>
      </div>

      {/* Project Collaborators */}
      {stakeholders.length > 0 && (
        <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-primary text-xs flex items-center justify-between">
            <span>Project Collaborators</span>
            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {stakeholders.length}
            </span>
          </h3>

          <div className="space-y-2">
            {stakeholders.map((sh) => (
              <Link
                key={sh.id}
                href={`/profile/${sh.uid}`}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-200/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-surface-200 shrink-0 border border-surface-300">
                  {sh.avatar ? (
                    <img 
                      src={sh.avatar} 
                      alt={sh.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const parent = (e.currentTarget as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector('.fallback-initial')) {
                          const div = document.createElement('div');
                          div.className = 'fallback-initial w-full h-full flex items-center justify-center font-bold text-xs text-primary/60 bg-surface-200';
                          div.innerText = sh.name ? sh.name.charAt(0).toUpperCase() : '?';
                          parent.appendChild(div);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary/60 bg-surface-200">
                      {sh.name ? sh.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-primary text-xs truncate group-hover:text-accent transition-colors">
                    {sh.name}
                  </p>
                  {sh.category && (
                    <p className="text-[10px] text-surface-500 font-medium truncate">
                      {sh.category}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Compact Pro Banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-accent/20 via-amber-500/10 to-primary/20 border border-accent/30 text-center space-y-2 shadow-sm">
        <span className="text-[9px] font-black uppercase tracking-wider bg-accent text-background px-2 py-0.5 rounded inline-block">
          Pro Showcase
        </span>
        <h4 className="font-bold text-primary text-xs">
          Showcase Architectural Portfolios Globally
        </h4>
        <button
          onClick={() => alert("Redirecting to Pro Membership...")}
          className="w-full py-1.5 bg-primary text-background rounded-lg font-bold text-xs hover:opacity-90 transition-opacity"
        >
          Try 1 Month Free
        </button>
      </div>

    </div>
  );
}
